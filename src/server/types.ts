export type ActorType = "human" | "ai" | "system";
export type Role = "owner" | "admin" | "editor" | "approver" | "viewer";
export type WorkflowStatus = "pending" | "running" | "waiting_for_human" | "approved" | "rejected" | "failed";
export type StepType = "draft" | "critique" | "revise" | "human_approve";
export type StepStatus = "pending" | "running" | "completed" | "waiting_for_human" | "failed" | "skipped";
export type ApprovalStatus = "pending" | "approved" | "rejected";
export type DecisionStatus = "proposed" | "approved" | "rejected" | "superseded" | "archived";

export interface Actor {
  type: ActorType;
  id: string;
}

export interface Organization {
  id: string;
  name: string;
  createdAt: Date;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
}

export interface Workspace {
  id: string;
  organizationId: string;
  name: string;
  createdAt: Date;
}

export interface Project {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  objective: string;
  createdAt: Date;
}

export interface ProjectThread {
  id: string;
  projectId: string;
  title: string;
  createdAt: Date;
}

export interface Message {
  id: string;
  threadId: string;
  userId?: string;
  actorType: ActorType;
  body: string;
  createdAt: Date;
}

export interface Agent {
  id: string;
  organizationId: string;
  name: string;
  role: StepType;
  provider: string;
  model: string;
  systemPrompt: string;
  canDraft: boolean;
  canCritique: boolean;
  canRevise: boolean;
  canRecommend: boolean;
  canApprove: boolean;
}

export interface WorkflowRun {
  id: string;
  organizationId: string;
  workspaceId: string;
  projectId: string;
  threadId: string;
  objective: string;
  status: WorkflowStatus;
  maxAiCalls: number;
  maxEstimatedTokens: number;
  maxEstimatedCost: number;
  estimatedTokensUsed: number;
  estimatedCostUsed: number;
  aiCallsUsed: number;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkflowStep {
  id: string;
  workflowRunId: string;
  type: StepType;
  status: StepStatus;
  sequence: number;
  inputSummary?: string;
  output?: string;
  errorMessage?: string;
  startedAt?: Date;
  completedAt?: Date;
}

export interface ModelCall {
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
  estimatedCost: number;
  latencyMs: number;
  status: "succeeded" | "failed";
  errorMessage?: string;
  createdAt: Date;
}

export interface Approval {
  id: string;
  organizationId: string;
  workspaceId: string;
  projectId: string;
  workflowRunId: string;
  status: ApprovalStatus;
  requestedBy: string;
  approvedById?: string;
  rejectionNote?: string;
  createdAt: Date;
  decidedAt?: Date;
}

export interface Decision {
  id: string;
  organizationId: string;
  workspaceId: string;
  projectId: string;
  title: string;
  approvedOutputReference: string;
  status: DecisionStatus;
  proposedBy: string;
  approvedByHumanUserId?: string;
  workflowRunId: string;
  supersedesDecisionId?: string;
  supersededByDecisionId?: string;
  createdAt: Date;
  approvedAt?: Date;
}

export interface AuditEvent {
  id: string;
  organizationId: string;
  workspaceId?: string;
  projectId?: string;
  actorType: ActorType;
  actorId: string;
  action: string;
  targetType: string;
  targetId: string;
  workflowRunId?: string;
  workflowStepId?: string;
  provider?: string;
  model?: string;
  estimatedTokens?: number;
  estimatedCost?: number;
  result: string;
  errorCode?: string;
  createdAt: Date;
}

export interface ProjectSnapshot {
  organization: Organization;
  workspace: Workspace;
  project: Project;
  thread: ProjectThread;
  users: User[];
  agents: Agent[];
  messages: Message[];
  workflowRuns: WorkflowRun[];
  workflowSteps: WorkflowStep[];
  approvals: Approval[];
  decisions: Decision[];
  auditEvents: AuditEvent[];
  modelCalls: ModelCall[];
}
