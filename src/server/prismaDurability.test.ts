import { mkdtemp, rm } from "fs/promises";
import { tmpdir } from "os";
import path from "path";
import { PrismaClient } from "@prisma/client";
import { afterEach, describe, expect, it } from "vitest";
import { MockAIProvider } from "./ai";
import { PrismaRepository } from "./prismaRepository";
import { ApprovalService, createServices, ProjectService, WorkflowEngine } from "./services";
import { LocalDiskProvider } from "./storage";

const testDatabaseUrl = process.env.TEST_DATABASE_URL;

describe.runIf(testDatabaseUrl)("PrismaRepository durability", () => {
  let storageRoot = "";
  const clients: PrismaClient[] = [];

  afterEach(async () => {
    await Promise.all(clients.map((client) => client.$disconnect()));
    clients.length = 0;
    if (storageRoot) {
      await rm(storageRoot, { recursive: true, force: true });
    }
  });

  function createHarness() {
    const client = new PrismaClient({
      datasources: {
        db: {
          url: testDatabaseUrl
        }
      }
    });
    clients.push(client);
    const repo = new PrismaRepository(client);
    const services = createServices({
      repo,
      ai: new MockAIProvider(),
      storage: new LocalDiskProvider(storageRoot)
    });
    return {
      projectService: new ProjectService(services),
      workflowEngine: new WorkflowEngine(services),
      approvalService: new ApprovalService(services)
    };
  }

  it("resumes workflow state with a new PrismaClient", async () => {
    storageRoot = await mkdtemp(path.join(tmpdir(), "aegisloop-prisma-"));
    const first = createHarness();
    const created = await first.projectService.createProject({
      organizationName: `Durability Test Org ${Date.now()}`,
      workspaceName: "Durability Workspace",
      projectName: "Durability Project",
      objective: "Prove persisted workflow resume.",
      threadTitle: "Durability Thread",
      user: {
        email: `durability-${Date.now()}@example.com`,
        name: "Durability Owner",
        role: "owner"
      }
    });
    const owner = created.users[0];
    const run = await first.workflowEngine.startWorkflow({
      actor: { type: "human", id: owner.id },
      actorRole: owner.role,
      organizationId: created.organization.id,
      workspaceId: created.workspace.id,
      projectId: created.project.id,
      threadId: created.thread.id,
      objective: created.project.objective
    });
    await first.workflowEngine.runNext(run.id);

    const second = createHarness();
    const resumed = await second.workflowEngine.runNext(run.id);
    expect(resumed.step?.type).toBe("critique");
    await second.workflowEngine.runNext(run.id);
    const paused = await second.workflowEngine.runNext(run.id);
    expect(paused.run.status).toBe("waiting_for_human");

    await second.approvalService.approve({
      actor: { type: "human", id: owner.id },
      actorRole: owner.role,
      workflowRunId: run.id
    });

    const finalSnapshot = await second.projectService.getSnapshot(created.project.id);
    expect(finalSnapshot.workflowRuns[0].status).toBe("approved");
    expect(finalSnapshot.modelCalls).toHaveLength(3);
    expect(finalSnapshot.approvals[0].status).toBe("approved");
    expect(finalSnapshot.decisions).toHaveLength(1);
    expect(finalSnapshot.decisions[0].approvedOutputReference).toMatch(/approved-output\.md$/);
    expect(finalSnapshot.auditEvents.some((event) => event.action === "approval.approved")).toBe(true);
  });
});
