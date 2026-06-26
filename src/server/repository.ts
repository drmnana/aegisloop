import { createId } from "./ids";
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

export interface CreateProjectInput {
  organizationName: string;
  workspaceName: string;
  projectName: string;
  objective: string;
  threadTitle: string;
  user: Pick<User, "email" | "name" | "role">;
}

export interface Repository {
  seedProject(input: CreateProjectInput): Promise<ProjectSnapshot>;
  getSnapshot(projectId?: string): Promise<ProjectSnapshot>;
  getUser(userId: string): Promise<User | undefined>;
  getAgentForStep(organizationId: string, stepType: string): Promise<Agent>;
  createWorkflowRun(input: Partial<WorkflowRun> & Pick<WorkflowRun, "organizationId" | "workspaceId" | "projectId" | "threadId" | "objective">): Promise<WorkflowRun>;
  createWorkflowSteps(workflowRunId: string): Promise<WorkflowStep[]>;
  getWorkflowRun(id: string): Promise<WorkflowRun | undefined>;
  updateWorkflowRun(id: string, patch: Partial<WorkflowRun>): Promise<WorkflowRun>;
  getWorkflowSteps(workflowRunId: string): Promise<WorkflowStep[]>;
  updateWorkflowStep(id: string, patch: Partial<WorkflowStep>): Promise<WorkflowStep>;
  createMessage(message: Omit<Message, "id" | "createdAt">): Promise<Message>;
  createModelCall(call: Omit<ModelCall, "id" | "createdAt">): Promise<ModelCall>;
  createApproval(approval: Omit<Approval, "id" | "createdAt">): Promise<Approval>;
  getPendingApproval(workflowRunId: string): Promise<Approval | undefined>;
  updateApproval(id: string, patch: Partial<Approval>): Promise<Approval>;
  createDecision(decision: Omit<Decision, "id" | "createdAt">): Promise<Decision>;
  createAuditEvent(event: Omit<AuditEvent, "id" | "createdAt">): Promise<AuditEvent>;
}

export class InMemoryRepository implements Repository {
  private organizations: Organization[] = [];
  private users: User[] = [];
  private workspaces: Workspace[] = [];
  private projects: Project[] = [];
  private threads: ProjectThread[] = [];
  private messages: Message[] = [];
  private agents: Agent[] = [];
  private workflowRuns: WorkflowRun[] = [];
  private workflowSteps: WorkflowStep[] = [];
  private modelCalls: ModelCall[] = [];
  private approvals: Approval[] = [];
  private decisions: Decision[] = [];
  private auditEvents: AuditEvent[] = [];

  async seedProject(input: CreateProjectInput): Promise<ProjectSnapshot> {
    const now = new Date();
    const organization: Organization = { id: createId("org"), name: input.organizationName, createdAt: now };
    const user: User = { id: createId("usr"), email: input.user.email, name: input.user.name, role: input.user.role as Role };
    const workspace: Workspace = { id: createId("wsp"), organizationId: organization.id, name: input.workspaceName, createdAt: now };
    const project: Project = {
      id: createId("prj"),
      organizationId: organization.id,
      workspaceId: workspace.id,
      name: input.projectName,
      objective: input.objective,
      createdAt: now
    };
    const thread: ProjectThread = { id: createId("thr"), projectId: project.id, title: input.threadTitle, createdAt: now };
    const agents = createDefaultAgents(organization.id);

    this.organizations.push(organization);
    this.users.push(user);
    this.workspaces.push(workspace);
    this.projects.push(project);
    this.threads.push(thread);
    this.agents.push(...agents);
    await this.createAuditEvent({
      organizationId: organization.id,
      workspaceId: workspace.id,
      projectId: project.id,
      actorType: "human",
      actorId: user.id,
      action: "project.created",
      targetType: "project",
      targetId: project.id,
      result: "success"
    });
    return this.getSnapshot(project.id);
  }

  async getSnapshot(projectId?: string): Promise<ProjectSnapshot> {
    const project = projectId ? this.projects.find((item) => item.id === projectId) : this.projects[0];
    if (!project) {
      throw new Error("No project exists. Create a project first.");
    }
    const organization = this.organizations.find((item) => item.id === project.organizationId)!;
    const workspace = this.workspaces.find((item) => item.id === project.workspaceId)!;
    const thread = this.threads.find((item) => item.projectId === project.id)!;
    const runs = this.workflowRuns.filter((item) => item.projectId === project.id);
    return {
      organization,
      workspace,
      project,
      thread,
      users: this.users,
      agents: this.agents.filter((item) => item.organizationId === organization.id),
      messages: this.messages.filter((item) => item.threadId === thread.id),
      workflowRuns: runs,
      workflowSteps: this.workflowSteps.filter((step) => runs.some((run) => run.id === step.workflowRunId)),
      approvals: this.approvals.filter((item) => item.projectId === project.id),
      decisions: this.decisions.filter((item) => item.projectId === project.id),
      auditEvents: this.auditEvents.filter((item) => item.projectId === project.id),
      modelCalls: this.modelCalls.filter((item) => item.projectId === project.id)
    };
  }

  async getUser(userId: string): Promise<User | undefined> {
    return this.users.find((user) => user.id === userId);
  }

  async getAgentForStep(organizationId: string, stepType: string): Promise<Agent> {
    const agent = this.agents.find((item) => item.organizationId === organizationId && item.role === stepType);
    if (!agent) throw new Error(`No agent configured for ${stepType}.`);
    return agent;
  }

  async createWorkflowRun(input: Partial<WorkflowRun> & Pick<WorkflowRun, "organizationId" | "workspaceId" | "projectId" | "threadId" | "objective">): Promise<WorkflowRun> {
    const now = new Date();
    const run: WorkflowRun = {
      id: createId("run"),
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
      createdAt: now,
      updatedAt: now
    };
    this.workflowRuns.push(run);
    return run;
  }

  async createWorkflowSteps(workflowRunId: string): Promise<WorkflowStep[]> {
    const steps: WorkflowStep[] = [
      { id: createId("step"), workflowRunId, type: "draft", status: "pending", sequence: 1 },
      { id: createId("step"), workflowRunId, type: "critique", status: "pending", sequence: 2 },
      { id: createId("step"), workflowRunId, type: "revise", status: "pending", sequence: 3 },
      { id: createId("step"), workflowRunId, type: "human_approve", status: "pending", sequence: 4 }
    ];
    this.workflowSteps.push(...steps);
    return steps;
  }

  async getWorkflowRun(id: string): Promise<WorkflowRun | undefined> {
    return this.workflowRuns.find((run) => run.id === id);
  }

  async updateWorkflowRun(id: string, patch: Partial<WorkflowRun>): Promise<WorkflowRun> {
    return this.patch(this.workflowRuns, id, { ...patch, updatedAt: new Date() });
  }

  async getWorkflowSteps(workflowRunId: string): Promise<WorkflowStep[]> {
    return this.workflowSteps.filter((step) => step.workflowRunId === workflowRunId).sort((a, b) => a.sequence - b.sequence);
  }

  async updateWorkflowStep(id: string, patch: Partial<WorkflowStep>): Promise<WorkflowStep> {
    return this.patch(this.workflowSteps, id, patch);
  }

  async createMessage(message: Omit<Message, "id" | "createdAt">): Promise<Message> {
    const item = { ...message, id: createId("msg"), createdAt: new Date() };
    this.messages.push(item);
    return item;
  }

  async createModelCall(call: Omit<ModelCall, "id" | "createdAt">): Promise<ModelCall> {
    const item = { ...call, id: createId("mc"), createdAt: new Date() };
    this.modelCalls.push(item);
    return item;
  }

  async createApproval(approval: Omit<Approval, "id" | "createdAt">): Promise<Approval> {
    const item = { ...approval, id: createId("app"), createdAt: new Date() };
    this.approvals.push(item);
    return item;
  }

  async getPendingApproval(workflowRunId: string): Promise<Approval | undefined> {
    return this.approvals.find((approval) => approval.workflowRunId === workflowRunId && approval.status === "pending");
  }

  async updateApproval(id: string, patch: Partial<Approval>): Promise<Approval> {
    return this.patch(this.approvals, id, patch);
  }

  async createDecision(decision: Omit<Decision, "id" | "createdAt">): Promise<Decision> {
    const item = { ...decision, id: createId("dec"), createdAt: new Date() };
    this.decisions.push(item);
    return item;
  }

  async createAuditEvent(event: Omit<AuditEvent, "id" | "createdAt">): Promise<AuditEvent> {
    const item = { ...event, id: createId("aud"), createdAt: new Date() };
    this.auditEvents.push(item);
    return item;
  }

  private patch<T extends { id: string }>(items: T[], id: string, patch: Partial<T>): T {
    const index = items.findIndex((item) => item.id === id);
    if (index === -1) throw new Error(`Record not found: ${id}`);
    items[index] = { ...items[index], ...patch };
    return items[index];
  }
}

export function createDefaultAgents(organizationId: string): Agent[] {
  return [
    {
      id: createId("agt"),
      organizationId,
      name: "Draft Agent",
      role: "draft",
      provider: "openai",
      model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
      systemPrompt: "Create a clear initial draft for the requested project objective.",
      canDraft: true,
      canCritique: false,
      canRevise: false,
      canRecommend: true,
      canApprove: false
    },
    {
      id: createId("agt"),
      organizationId,
      name: "Critique Agent",
      role: "critique",
      provider: "openai",
      model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
      systemPrompt: "Critique the draft for gaps, risks, clarity, and approval readiness.",
      canDraft: false,
      canCritique: true,
      canRevise: false,
      canRecommend: true,
      canApprove: false
    },
    {
      id: createId("agt"),
      organizationId,
      name: "Revise Agent",
      role: "revise",
      provider: "openai",
      model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
      systemPrompt: "Revise the draft using critique feedback and prepare it for human approval.",
      canDraft: false,
      canCritique: false,
      canRevise: true,
      canRecommend: true,
      canApprove: false
    }
  ];
}
