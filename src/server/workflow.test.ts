import { mkdtemp, readFile, rm } from "fs/promises";
import { tmpdir } from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { MockAIProvider } from "./ai";
import { InMemoryRepository } from "./repository";
import { ApprovalService, createServices, ProjectService, WorkflowEngine } from "./services";
import { LocalDiskProvider } from "./storage";
import type { ProjectSnapshot, User, WorkflowRun } from "./types";

let storageRoot: string;
let repo: InMemoryRepository;
let projectService: ProjectService;
let workflowEngine: WorkflowEngine;
let approvalService: ApprovalService;
let snapshot: ProjectSnapshot;
let owner: User;

beforeEach(async () => {
  storageRoot = await mkdtemp(path.join(tmpdir(), "aegisloop-"));
  repo = new InMemoryRepository();
  const services = createServices({
    repo,
    ai: new MockAIProvider(),
    storage: new LocalDiskProvider(storageRoot)
  });
  projectService = new ProjectService(services);
  workflowEngine = new WorkflowEngine(services);
  approvalService = new ApprovalService(services);
  snapshot = await projectService.createProject({
    organizationName: "Test Org",
    workspaceName: "Test Workspace",
    projectName: "Test Project",
    objective: "Write a controlled approval memo.",
    threadTitle: "Main Thread",
    user: {
      email: "owner@example.com",
      name: "Owner",
      role: "owner"
    }
  });
  owner = snapshot.users[0];
});

afterEach(async () => {
  await rm(storageRoot, { recursive: true, force: true });
});

async function startRun(overrides: Partial<WorkflowRun> = {}) {
  return workflowEngine.startWorkflow({
    actor: { type: "human", id: owner.id },
    actorRole: owner.role,
    organizationId: snapshot.organization.id,
    workspaceId: snapshot.workspace.id,
    projectId: snapshot.project.id,
    threadId: snapshot.thread.id,
    objective: snapshot.project.objective,
    maxAiCalls: overrides.maxAiCalls,
    maxEstimatedTokens: overrides.maxEstimatedTokens,
    maxEstimatedCost: overrides.maxEstimatedCost
  });
}

async function advanceToApproval(runId: string) {
  await workflowEngine.runNext(runId);
  await workflowEngine.runNext(runId);
  await workflowEngine.runNext(runId);
  return workflowEngine.runNext(runId);
}

describe("Phase 1 workflow", () => {
  it("records audit event when workflow starts", async () => {
    await startRun();
    const next = await repo.getSnapshot(snapshot.project.id);
    expect(next.auditEvents.some((event) => event.action === "workflow.started")).toBe(true);
  });

  it("records a model call for an AI step", async () => {
    const run = await startRun();
    await workflowEngine.runNext(run.id);
    const next = await repo.getSnapshot(snapshot.project.id);
    expect(next.modelCalls).toHaveLength(1);
    expect(next.modelCalls[0].provider).toBe("mock");
  });

  it("pauses for human approval after draft, critique, and revise", async () => {
    const run = await startRun();
    const result = await advanceToApproval(run.id);
    expect(result.run.status).toBe("waiting_for_human");
    const next = await repo.getSnapshot(snapshot.project.id);
    expect(next.approvals[0].status).toBe("pending");
  });

  it("human approver can approve and resume the workflow", async () => {
    const run = await startRun();
    await advanceToApproval(run.id);
    await approvalService.approve({
      actor: { type: "human", id: owner.id },
      actorRole: "owner",
      workflowRunId: run.id
    });
    const next = await repo.getSnapshot(snapshot.project.id);
    expect(next.workflowRuns[0].status).toBe("approved");
    expect(next.approvals[0].status).toBe("approved");
    expect(next.auditEvents.some((event) => event.action === "approval.approved")).toBe(true);
  });

  it("AI cannot approve final output", async () => {
    const run = await startRun();
    await advanceToApproval(run.id);
    await expect(approvalService.approve({
      actor: { type: "ai", id: "agent" },
      actorRole: "owner",
      workflowRunId: run.id
    })).rejects.toThrow(/cannot perform human-only/);
  });

  it("viewer cannot approve final output", async () => {
    const run = await startRun();
    await advanceToApproval(run.id);
    await expect(approvalService.approve({
      actor: { type: "human", id: "viewer" },
      actorRole: "viewer",
      workflowRunId: run.id
    })).rejects.toThrow(/viewer cannot approve_output/);
  });

  it("creates a decision only after approval and stores a reference instead of content", async () => {
    const run = await startRun();
    await advanceToApproval(run.id);
    let next = await repo.getSnapshot(snapshot.project.id);
    expect(next.decisions).toHaveLength(0);
    await approvalService.approve({
      actor: { type: "human", id: owner.id },
      actorRole: "owner",
      workflowRunId: run.id
    });
    next = await repo.getSnapshot(snapshot.project.id);
    expect(next.decisions).toHaveLength(1);
    expect(next.decisions[0].approvedOutputReference).toMatch(/approved-output\.md$/);
    expect(next.decisions[0].approvedOutputReference).not.toContain("Revised approved-ready output");
  });

  it("writes approved output through LocalDiskProvider", async () => {
    const run = await startRun();
    await advanceToApproval(run.id);
    await approvalService.approve({
      actor: { type: "human", id: owner.id },
      actorRole: "owner",
      workflowRunId: run.id
    });
    const next = await repo.getSnapshot(snapshot.project.id);
    const content = await readFile(path.join(storageRoot, next.decisions[0].approvedOutputReference), "utf8");
    expect(content).toContain("Revised approved-ready output");
  });

  it("stops the workflow when the AI call limit is exceeded", async () => {
    const run = await startRun({ maxAiCalls: 1 });
    await workflowEngine.runNext(run.id);
    const result = await workflowEngine.runNext(run.id);
    expect(result.run.status).toBe("failed");
    expect(result.message).toContain("max AI calls");
  });
});
