import type { AIProvider } from "./ai";
import { MockAIProvider, OpenAIProvider } from "./ai";
import type { BlobStore } from "./storage";
import { LocalDiskProvider } from "./storage";
import { assertHumanPermission, PermissionDeniedError } from "./permissions";
import type { Actor, ProjectSnapshot, Role, WorkflowRun, WorkflowStep } from "./types";
import type { CreateProjectInput, Repository } from "./repository";
import { PrismaRepository } from "./prismaRepository";
import { prisma } from "./prisma";

export interface Services {
  repo: Repository;
  ai: AIProvider;
  storage: BlobStore;
}

export function createServices(overrides: Partial<Services> = {}): Services {
  const repo = overrides.repo ?? createRuntimeRepository();
  return {
    repo,
    ai: overrides.ai ?? (process.env.OPENAI_API_KEY ? new OpenAIProvider() : new MockAIProvider()),
    storage: overrides.storage ?? new LocalDiskProvider(),
  };
}

function createRuntimeRepository(): Repository {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required. Runtime services use Prisma/Postgres and cannot fall back to in-memory storage.");
  }
  return new PrismaRepository(prisma);
}

export class ProjectService {
  constructor(private readonly services: Services) {}

  async createProject(input: CreateProjectInput): Promise<ProjectSnapshot> {
    return this.services.repo.seedProject(input);
  }

  async getSnapshot(projectId?: string): Promise<ProjectSnapshot> {
    return this.services.repo.getSnapshot(projectId);
  }
}

export class WorkflowEngine {
  constructor(private readonly services: Services) {}

  async startWorkflow(input: {
    actor: Actor;
    actorRole: Role;
    organizationId: string;
    workspaceId: string;
    projectId: string;
    threadId: string;
    objective: string;
    maxAiCalls?: number;
    maxEstimatedTokens?: number;
    maxEstimatedCost?: number;
  }): Promise<WorkflowRun> {
    assertHumanPermission(input.actor, input.actorRole, "start_workflow");
    const run = await this.services.repo.createWorkflowRun({
      organizationId: input.organizationId,
      workspaceId: input.workspaceId,
      projectId: input.projectId,
      threadId: input.threadId,
      objective: input.objective,
      maxAiCalls: input.maxAiCalls,
      maxEstimatedTokens: input.maxEstimatedTokens,
      maxEstimatedCost: input.maxEstimatedCost
    });
    await this.services.repo.createWorkflowSteps(run.id);
    await this.audit(input.actor, run, "workflow.started", "workflow_run", run.id, "success");
    return run;
  }

  async runNext(workflowRunId: string): Promise<{ run: WorkflowRun; step?: WorkflowStep; message: string }> {
    const run = await this.requireRun(workflowRunId);
    if (["waiting_for_human", "approved", "rejected", "failed"].includes(run.status)) {
      return { run, message: `Workflow is ${run.status}; no AI step executed.` };
    }

    const steps = await this.services.repo.getWorkflowSteps(run.id);
    const step = steps.find((item) => item.status === "pending");
    if (!step) {
      const updated = await this.services.repo.updateWorkflowRun(run.id, { status: "waiting_for_human" });
      return { run: updated, message: "No pending step found." };
    }

    if (step.type === "human_approve") {
      const waitingStep = await this.services.repo.updateWorkflowStep(step.id, { status: "waiting_for_human", startedAt: new Date() });
      const approval = await this.services.repo.createApproval({
        organizationId: run.organizationId,
        workspaceId: run.workspaceId,
        projectId: run.projectId,
        workflowRunId: run.id,
        status: "pending",
        requestedBy: "workflow"
      });
      const updated = await this.services.repo.updateWorkflowRun(run.id, { status: "waiting_for_human" });
      await this.audit({ type: "system", id: "workflow" }, updated, "workflow.paused_for_approval", "approval", approval.id, "success", waitingStep.id);
      return { run: updated, step: waitingStep, message: "Workflow paused for human approval." };
    }

    if (run.aiCallsUsed + 1 > run.maxAiCalls) {
      return this.failRun(run, step, "Cost limit exceeded: max AI calls reached.");
    }

    const agent = await this.services.repo.getAgentForStep(run.organizationId, step.type);
    const context = steps
      .filter((item) => item.output)
      .map((item) => `${item.type}: ${item.output}`)
      .join("\n\n");

    const runningStep = await this.services.repo.updateWorkflowStep(step.id, { status: "running", startedAt: new Date(), inputSummary: `Objective: ${run.objective}` });
    await this.audit({ type: "ai", id: agent.id }, run, "workflow.step.started", "workflow_step", runningStep.id, "success", runningStep.id);

    try {
      const response = await this.services.ai.sendMessage({
        systemPrompt: agent.systemPrompt,
        objective: run.objective,
        step: step.type,
        context
      });
      const nextTokens = run.estimatedTokensUsed + response.estimatedInputTokens + response.estimatedOutputTokens;
      const nextCost = run.estimatedCostUsed + response.estimatedCost;
      if (nextTokens > run.maxEstimatedTokens || nextCost > run.maxEstimatedCost) {
        return this.failRun(run, runningStep, "Cost limit exceeded: estimated token or cost limit reached.");
      }

      const completedStep = await this.services.repo.updateWorkflowStep(runningStep.id, {
        status: "completed",
        output: response.output,
        completedAt: new Date()
      });
      await this.services.repo.createModelCall({
        organizationId: run.organizationId,
        projectId: run.projectId,
        workflowRunId: run.id,
        workflowStepId: completedStep.id,
        agentId: agent.id,
        provider: response.provider,
        model: response.model,
        inputSummary: `${step.type} step for workflow ${run.id}`,
        outputSummary: response.output.slice(0, 240),
        estimatedInputTokens: response.estimatedInputTokens,
        estimatedOutputTokens: response.estimatedOutputTokens,
        estimatedCost: response.estimatedCost,
        latencyMs: response.latencyMs,
        status: "succeeded"
      });
      const updatedRun = await this.services.repo.updateWorkflowRun(run.id, {
        status: "running",
        aiCallsUsed: run.aiCallsUsed + 1,
        estimatedTokensUsed: nextTokens,
        estimatedCostUsed: nextCost
      });
      await this.services.repo.createMessage({
        threadId: run.threadId,
        actorType: "ai",
        body: response.output
      });
      await this.audit({ type: "ai", id: agent.id }, updatedRun, "ai.model_called", "model_call", completedStep.id, "success", completedStep.id, response.provider, response.model, response.estimatedInputTokens + response.estimatedOutputTokens, response.estimatedCost);
      await this.audit({ type: "ai", id: agent.id }, updatedRun, "workflow.step.completed", "workflow_step", completedStep.id, "success", completedStep.id);
      return { run: updatedRun, step: completedStep, message: `Completed ${step.type} step.` };
    } catch (error) {
      return this.failRun(run, runningStep, error instanceof Error ? error.message : "Unknown workflow error.");
    }
  }

  private async failRun(run: WorkflowRun, step: WorkflowStep, message: string): Promise<{ run: WorkflowRun; step: WorkflowStep; message: string }> {
    const failedStep = await this.services.repo.updateWorkflowStep(step.id, { status: "failed", errorMessage: message, completedAt: new Date() });
    const failedRun = await this.services.repo.updateWorkflowRun(run.id, { status: "failed", errorMessage: message });
    await this.audit({ type: "system", id: "workflow" }, failedRun, "workflow.failed", "workflow_run", failedRun.id, "failure", failedStep.id, undefined, undefined, undefined, undefined, "WORKFLOW_FAILED");
    return { run: failedRun, step: failedStep, message };
  }

  private async requireRun(id: string): Promise<WorkflowRun> {
    const run = await this.services.repo.getWorkflowRun(id);
    if (!run) throw new Error(`Workflow run not found: ${id}`);
    return run;
  }

  private async audit(actor: Actor, run: WorkflowRun, action: string, targetType: string, targetId: string, result: string, workflowStepId?: string, provider?: string, model?: string, estimatedTokens?: number, estimatedCost?: number, errorCode?: string) {
    await this.services.repo.createAuditEvent({
      organizationId: run.organizationId,
      workspaceId: run.workspaceId,
      projectId: run.projectId,
      actorType: actor.type,
      actorId: actor.id,
      action,
      targetType,
      targetId,
      workflowRunId: run.id,
      workflowStepId,
      provider,
      model,
      estimatedTokens,
      estimatedCost,
      result,
      errorCode
    });
  }
}

export class ApprovalService {
  constructor(private readonly services: Services) {}

  async approve(input: { actor: Actor; actorRole: Role; workflowRunId: string }): Promise<void> {
    assertHumanPermission(input.actor, input.actorRole, "approve_output");
    const run = await this.services.repo.getWorkflowRun(input.workflowRunId);
    if (!run) throw new Error("Workflow run not found.");
    const approval = await this.services.repo.getPendingApproval(run.id);
    if (!approval) throw new Error("No pending approval exists for this workflow.");
    const steps = await this.services.repo.getWorkflowSteps(run.id);
    const finalOutput = [...steps].reverse().find((step) => step.type === "revise" && step.output)?.output;
    if (!finalOutput) throw new Error("Cannot approve without revised output.");

    const storagePath = `organizations/${run.organizationId}/projects/${run.projectId}/workflow-runs/${run.id}/approved-output.md`;
    await this.services.storage.writeBlob(storagePath, finalOutput);
    await this.services.repo.updateApproval(approval.id, { status: "approved", approvedById: input.actor.id, decidedAt: new Date() });
    await this.services.repo.updateWorkflowRun(run.id, { status: "approved" });
    const approvalStep = steps.find((step) => step.type === "human_approve");
    if (approvalStep) {
      await this.services.repo.updateWorkflowStep(approvalStep.id, { status: "completed", output: storagePath, completedAt: new Date() });
    }
    await this.services.repo.createDecision({
      organizationId: run.organizationId,
      workspaceId: run.workspaceId,
      projectId: run.projectId,
      title: `Approved output for ${run.objective}`,
      approvedOutputReference: storagePath,
      status: "approved",
      proposedBy: "workflow",
      approvedByHumanUserId: input.actor.id,
      workflowRunId: run.id,
      approvedAt: new Date()
    });
    await this.audit(input.actor, run, "approval.approved", "approval", approval.id, "success");
    await this.audit(input.actor, run, "storage.output_saved", "blob", storagePath, "success");
    await this.audit(input.actor, run, "decision.approved", "workflow_run", run.id, "success");
  }

  async reject(input: { actor: Actor; actorRole: Role; workflowRunId: string; note?: string }): Promise<void> {
    assertHumanPermission(input.actor, input.actorRole, "reject_output");
    const run = await this.services.repo.getWorkflowRun(input.workflowRunId);
    if (!run) throw new Error("Workflow run not found.");
    const approval = await this.services.repo.getPendingApproval(run.id);
    if (!approval) throw new Error("No pending approval exists for this workflow.");
    await this.services.repo.updateApproval(approval.id, { status: "rejected", rejectionNote: input.note, decidedAt: new Date() });
    await this.services.repo.updateWorkflowRun(run.id, { status: "rejected" });
    await this.audit(input.actor, run, "approval.rejected", "approval", approval.id, "success");
  }

  private async audit(actor: Actor, run: WorkflowRun, action: string, targetType: string, targetId: string, result: string) {
    await this.services.repo.createAuditEvent({
      organizationId: run.organizationId,
      workspaceId: run.workspaceId,
      projectId: run.projectId,
      actorType: actor.type,
      actorId: actor.id,
      action,
      targetType,
      targetId,
      workflowRunId: run.id,
      result
    });
  }
}

export async function recordPermissionDenied(services: Services, actor: Actor, organizationId: string, projectId: string | undefined, error: unknown): Promise<void> {
  if (!(error instanceof PermissionDeniedError)) return;
  await services.repo.createAuditEvent({
    organizationId,
    projectId,
    actorType: actor.type,
    actorId: actor.id,
    action: "permission.denied",
    targetType: "permission",
    targetId: "approval",
    result: "failure",
    errorCode: "PERMISSION_DENIED"
  });
}
