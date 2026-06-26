import type { PrismaClient } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { createId } from "./ids";
import { createDefaultAgents, type CreateProjectInput, type Repository } from "./repository";
import type {
  Agent,
  Approval,
  AuditEvent,
  Decision,
  Message,
  ModelCall,
  Organization,
  Project,
  ProjectSnapshot,
  ProjectThread,
  Role,
  User,
  WorkflowRun,
  WorkflowStep,
  Workspace
} from "./types";

export class PrismaRepository implements Repository {
  constructor(private readonly client: PrismaClient) {}

  async seedProject(input: CreateProjectInput): Promise<ProjectSnapshot> {
    const snapshot = await this.client.$transaction(async (tx) => {
      const organization = await tx.organization.create({
        data: { name: input.organizationName }
      });
      const user = await tx.user.upsert({
        where: { email: input.user.email },
        update: { name: input.user.name },
        create: { email: input.user.email, name: input.user.name }
      });
      await tx.membership.upsert({
        where: {
          organizationId_userId: {
            organizationId: organization.id,
            userId: user.id
          }
        },
        update: { role: input.user.role },
        create: {
          organizationId: organization.id,
          userId: user.id,
          role: input.user.role
        }
      });
      const workspace = await tx.workspace.create({
        data: {
          organizationId: organization.id,
          name: input.workspaceName
        }
      });
      const project = await tx.project.create({
        data: {
          organizationId: organization.id,
          workspaceId: workspace.id,
          name: input.projectName,
          objective: input.objective
        }
      });
      const thread = await tx.thread.create({
        data: {
          projectId: project.id,
          title: input.threadTitle
        }
      });
      await tx.agent.createMany({
        data: createDefaultAgents(organization.id).map(({ id: _id, ...agent }) => agent)
      });
      await tx.auditEvent.create({
        data: {
          organizationId: organization.id,
          workspaceId: workspace.id,
          projectId: project.id,
          actorType: "human",
          actorId: user.id,
          action: "project.created",
          targetType: "project",
          targetId: project.id,
          result: "success"
        }
      });
      return project.id;
    });

    return this.getSnapshot(snapshot);
  }

  async getSnapshot(projectId?: string): Promise<ProjectSnapshot> {
    const project = projectId
      ? await this.client.project.findUnique({ where: { id: projectId } })
      : await this.client.project.findFirst({ orderBy: { createdAt: "asc" } });
    if (!project) {
      throw new Error("No project exists. Create a project first.");
    }

    const workspace = await this.client.workspace.findUniqueOrThrow({ where: { id: project.workspaceId } });
    const organization = await this.client.organization.findUniqueOrThrow({ where: { id: project.organizationId } });
    const thread = await this.client.thread.findFirstOrThrow({
      where: { projectId: project.id },
      orderBy: { createdAt: "asc" }
    });
    const memberships = await this.client.membership.findMany({
      where: { organizationId: organization.id },
      include: { user: true },
      orderBy: { createdAt: "asc" }
    });
    const workflowRuns = await this.client.workflowRun.findMany({
      where: { projectId: project.id },
      orderBy: { createdAt: "asc" }
    });
    const workflowRunIds = workflowRuns.map((run) => run.id);
    const [agents, messages, workflowSteps, approvals, decisions, auditEvents, modelCalls] = await Promise.all([
      this.client.agent.findMany({ where: { organizationId: organization.id }, orderBy: { name: "asc" } }),
      this.client.message.findMany({ where: { threadId: thread.id }, orderBy: { createdAt: "asc" } }),
      this.client.workflowStep.findMany({ where: { workflowRunId: { in: workflowRunIds } }, orderBy: { sequence: "asc" } }),
      this.client.approval.findMany({ where: { projectId: project.id }, orderBy: { createdAt: "asc" } }),
      this.client.decision.findMany({ where: { projectId: project.id }, orderBy: { createdAt: "asc" } }),
      this.client.auditEvent.findMany({ where: { projectId: project.id }, orderBy: { createdAt: "asc" } }),
      this.client.modelCall.findMany({ where: { projectId: project.id }, orderBy: { createdAt: "asc" } })
    ]);

    return {
      organization: this.mapOrganization(organization),
      workspace: this.mapWorkspace(workspace),
      project: this.mapProject(project),
      thread: this.mapThread(thread),
      users: memberships.map((membership) => this.mapUser(membership.user, membership.role as Role)),
      agents: agents.map(this.mapAgent),
      messages: messages.map(this.mapMessage),
      workflowRuns: workflowRuns.map(this.mapWorkflowRun),
      workflowSteps: workflowSteps.map(this.mapWorkflowStep),
      approvals: approvals.map(this.mapApproval),
      decisions: decisions.map(this.mapDecision),
      auditEvents: auditEvents.map(this.mapAuditEvent),
      modelCalls: modelCalls.map(this.mapModelCall)
    };
  }

  async getUser(userId: string): Promise<User | undefined> {
    const user = await this.client.user.findUnique({ where: { id: userId } });
    if (!user) return undefined;
    const membership = await this.client.membership.findFirst({ where: { userId } });
    return this.mapUser(user, (membership?.role ?? "viewer") as Role);
  }

  async getAgentForStep(organizationId: string, stepType: string): Promise<Agent> {
    const agent = await this.client.agent.findFirst({
      where: { organizationId, role: stepType },
      orderBy: { name: "asc" }
    });
    if (!agent) throw new Error(`No agent configured for ${stepType}.`);
    return this.mapAgent(agent);
  }

  async createWorkflowRun(input: Partial<WorkflowRun> & Pick<WorkflowRun, "organizationId" | "workspaceId" | "projectId" | "threadId" | "objective">): Promise<WorkflowRun> {
    const run = await this.client.workflowRun.create({
      data: {
        organizationId: input.organizationId,
        workspaceId: input.workspaceId,
        projectId: input.projectId,
        threadId: input.threadId,
        objective: input.objective,
        status: input.status ?? "pending",
        maxAiCalls: input.maxAiCalls ?? 3,
        maxEstimatedTokens: input.maxEstimatedTokens ?? 12000,
        maxEstimatedCost: input.maxEstimatedCost ?? 1,
        estimatedTokensUsed: input.estimatedTokensUsed ?? 0,
        estimatedCostUsed: input.estimatedCostUsed ?? 0,
        aiCallsUsed: input.aiCallsUsed ?? 0,
        errorMessage: input.errorMessage
      }
    });
    return this.mapWorkflowRun(run);
  }

  async createWorkflowSteps(workflowRunId: string): Promise<WorkflowStep[]> {
    await this.client.workflowStep.createMany({
      data: [
        { workflowRunId, type: "draft", status: "pending", sequence: 1 },
        { workflowRunId, type: "critique", status: "pending", sequence: 2 },
        { workflowRunId, type: "revise", status: "pending", sequence: 3 },
        { workflowRunId, type: "human_approve", status: "pending", sequence: 4 }
      ]
    });
    return this.getWorkflowSteps(workflowRunId);
  }

  async getWorkflowRun(id: string): Promise<WorkflowRun | undefined> {
    const run = await this.client.workflowRun.findUnique({ where: { id } });
    return run ? this.mapWorkflowRun(run) : undefined;
  }

  async updateWorkflowRun(id: string, patch: Partial<WorkflowRun>): Promise<WorkflowRun> {
    const run = await this.client.workflowRun.update({
      where: { id },
      data: this.cleanData({
        status: patch.status,
        maxAiCalls: patch.maxAiCalls,
        maxEstimatedTokens: patch.maxEstimatedTokens,
        maxEstimatedCost: patch.maxEstimatedCost,
        estimatedTokensUsed: patch.estimatedTokensUsed,
        estimatedCostUsed: patch.estimatedCostUsed,
        aiCallsUsed: patch.aiCallsUsed,
        errorMessage: patch.errorMessage
      })
    });
    return this.mapWorkflowRun(run);
  }

  async getWorkflowSteps(workflowRunId: string): Promise<WorkflowStep[]> {
    const steps = await this.client.workflowStep.findMany({
      where: { workflowRunId },
      orderBy: { sequence: "asc" }
    });
    return steps.map(this.mapWorkflowStep);
  }

  async updateWorkflowStep(id: string, patch: Partial<WorkflowStep>): Promise<WorkflowStep> {
    const step = await this.client.workflowStep.update({
      where: { id },
      data: this.cleanData({
        status: patch.status,
        inputSummary: patch.inputSummary,
        output: patch.output,
        errorMessage: patch.errorMessage,
        startedAt: patch.startedAt,
        completedAt: patch.completedAt
      })
    });
    return this.mapWorkflowStep(step);
  }

  async createMessage(message: Omit<Message, "id" | "createdAt">): Promise<Message> {
    const item = await this.client.message.create({ data: message });
    return this.mapMessage(item);
  }

  async createModelCall(call: Omit<ModelCall, "id" | "createdAt">): Promise<ModelCall> {
    const item = await this.client.modelCall.create({ data: call });
    return this.mapModelCall(item);
  }

  async createApproval(approval: Omit<Approval, "id" | "createdAt">): Promise<Approval> {
    const item = await this.client.approval.create({ data: approval });
    return this.mapApproval(item);
  }

  async getPendingApproval(workflowRunId: string): Promise<Approval | undefined> {
    const approval = await this.client.approval.findFirst({
      where: { workflowRunId, status: "pending" },
      orderBy: { createdAt: "asc" }
    });
    return approval ? this.mapApproval(approval) : undefined;
  }

  async updateApproval(id: string, patch: Partial<Approval>): Promise<Approval> {
    const approval = await this.client.approval.update({
      where: { id },
      data: this.cleanData({
        status: patch.status,
        approvedById: patch.approvedById,
        rejectionNote: patch.rejectionNote,
        decidedAt: patch.decidedAt
      })
    });
    return this.mapApproval(approval);
  }

  async createDecision(decision: Omit<Decision, "id" | "createdAt">): Promise<Decision> {
    const item = await this.client.decision.create({ data: decision });
    return this.mapDecision(item);
  }

  async createAuditEvent(event: Omit<AuditEvent, "id" | "createdAt">): Promise<AuditEvent> {
    const item = await this.client.auditEvent.create({ data: event });
    return this.mapAuditEvent(item);
  }

  private cleanData<T extends Record<string, unknown>>(data: T): T {
    return Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined)) as T;
  }

  private mapOrganization(item: { id: string; name: string; createdAt: Date }): Organization {
    return item;
  }

  private mapUser(item: { id: string; email: string; name: string }, role: Role): User {
    return { id: item.id, email: item.email, name: item.name, role };
  }

  private mapWorkspace(item: { id: string; organizationId: string; name: string; createdAt: Date }): Workspace {
    return item;
  }

  private mapProject(item: { id: string; organizationId: string; workspaceId: string; name: string; objective: string; createdAt: Date }): Project {
    return item;
  }

  private mapThread(item: { id: string; projectId: string; title: string; createdAt: Date }): ProjectThread {
    return item;
  }

  private mapAgent(item: {
    id: string;
    organizationId: string;
    name: string;
    role: string;
    provider: string;
    model: string;
    systemPrompt: string;
    canDraft: boolean;
    canCritique: boolean;
    canRevise: boolean;
    canRecommend: boolean;
    canApprove: boolean;
  }): Agent {
    return { ...item, role: item.role as Agent["role"] };
  }

  private mapMessage(item: {
    id: string;
    threadId: string;
    userId: string | null;
    actorType: string;
    body: string;
    createdAt: Date;
  }): Message {
    return {
      id: item.id,
      threadId: item.threadId,
      userId: item.userId ?? undefined,
      actorType: item.actorType as Message["actorType"],
      body: item.body,
      createdAt: item.createdAt
    };
  }

  private mapWorkflowRun(item: {
    id: string;
    organizationId: string;
    workspaceId: string;
    projectId: string;
    threadId: string;
    objective: string;
    status: string;
    maxAiCalls: number;
    maxEstimatedTokens: number;
    maxEstimatedCost: Prisma.Decimal | number;
    estimatedTokensUsed: number;
    estimatedCostUsed: Prisma.Decimal | number;
    aiCallsUsed: number;
    errorMessage: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): WorkflowRun {
    return {
      ...item,
      status: item.status as WorkflowRun["status"],
      maxEstimatedCost: Number(item.maxEstimatedCost),
      estimatedCostUsed: Number(item.estimatedCostUsed),
      errorMessage: item.errorMessage ?? undefined
    };
  }

  private mapWorkflowStep(item: {
    id: string;
    workflowRunId: string;
    type: string;
    status: string;
    sequence: number;
    inputSummary: string | null;
    output: string | null;
    errorMessage: string | null;
    startedAt: Date | null;
    completedAt: Date | null;
  }): WorkflowStep {
    return {
      id: item.id,
      workflowRunId: item.workflowRunId,
      type: item.type as WorkflowStep["type"],
      status: item.status as WorkflowStep["status"],
      sequence: item.sequence,
      inputSummary: item.inputSummary ?? undefined,
      output: item.output ?? undefined,
      errorMessage: item.errorMessage ?? undefined,
      startedAt: item.startedAt ?? undefined,
      completedAt: item.completedAt ?? undefined
    };
  }

  private mapModelCall(item: {
    id: string;
    organizationId: string;
    projectId: string;
    workflowRunId: string;
    workflowStepId: string;
    agentId: string;
    provider: string;
    model: string;
    inputSummary: string;
    outputSummary: string;
    estimatedInputTokens: number;
    estimatedOutputTokens: number;
    estimatedCost: Prisma.Decimal | number;
    latencyMs: number;
    status: string;
    errorMessage: string | null;
    createdAt: Date;
  }): ModelCall {
    return {
      ...item,
      estimatedCost: Number(item.estimatedCost),
      status: item.status as ModelCall["status"],
      errorMessage: item.errorMessage ?? undefined
    };
  }

  private mapApproval(item: {
    id: string;
    organizationId: string;
    workspaceId: string;
    projectId: string;
    workflowRunId: string;
    status: string;
    requestedBy: string;
    approvedById: string | null;
    rejectionNote: string | null;
    createdAt: Date;
    decidedAt: Date | null;
  }): Approval {
    return {
      ...item,
      status: item.status as Approval["status"],
      approvedById: item.approvedById ?? undefined,
      rejectionNote: item.rejectionNote ?? undefined,
      decidedAt: item.decidedAt ?? undefined
    };
  }

  private mapDecision(item: {
    id: string;
    organizationId: string;
    workspaceId: string;
    projectId: string;
    title: string;
    approvedOutputReference: string;
    status: string;
    proposedBy: string;
    approvedByHumanUserId: string | null;
    workflowRunId: string;
    supersedesDecisionId: string | null;
    supersededByDecisionId: string | null;
    createdAt: Date;
    approvedAt: Date | null;
  }): Decision {
    return {
      ...item,
      status: item.status as Decision["status"],
      approvedByHumanUserId: item.approvedByHumanUserId ?? undefined,
      supersedesDecisionId: item.supersedesDecisionId ?? undefined,
      supersededByDecisionId: item.supersededByDecisionId ?? undefined,
      approvedAt: item.approvedAt ?? undefined
    };
  }

  private mapAuditEvent(item: {
    id: string;
    organizationId: string;
    workspaceId: string | null;
    projectId: string | null;
    actorType: string;
    actorId: string;
    action: string;
    targetType: string;
    targetId: string;
    workflowRunId: string | null;
    workflowStepId: string | null;
    provider: string | null;
    model: string | null;
    estimatedTokens: number | null;
    estimatedCost: Prisma.Decimal | number | null;
    result: string;
    errorCode: string | null;
    createdAt: Date;
  }): AuditEvent {
    return {
      id: item.id,
      organizationId: item.organizationId,
      workspaceId: item.workspaceId ?? undefined,
      projectId: item.projectId ?? undefined,
      actorType: item.actorType as AuditEvent["actorType"],
      actorId: item.actorId,
      action: item.action,
      targetType: item.targetType,
      targetId: item.targetId,
      workflowRunId: item.workflowRunId ?? undefined,
      workflowStepId: item.workflowStepId ?? undefined,
      provider: item.provider ?? undefined,
      model: item.model ?? undefined,
      estimatedTokens: item.estimatedTokens ?? undefined,
      estimatedCost: item.estimatedCost === null ? undefined : Number(item.estimatedCost),
      result: item.result,
      errorCode: item.errorCode ?? undefined,
      createdAt: item.createdAt
    };
  }
}

export function createTransientId(prefix: string): string {
  return createId(prefix);
}
