import { ApprovalService, createServices, ProjectService, WorkflowEngine } from "./services";

let runtimeServices: ReturnType<typeof createServices> | undefined;

export function getServices() {
  runtimeServices ??= createServices();
  return runtimeServices;
}

export function getProjectService() {
  return new ProjectService(getServices());
}

export function getWorkflowEngine() {
  return new WorkflowEngine(getServices());
}

export function getApprovalService() {
  return new ApprovalService(getServices());
}

export async function ensureDemoProject() {
  try {
    return await getProjectService().getSnapshot();
  } catch {
    return getProjectService().createProject({
      organizationName: "AegisLoop Demo Org",
      workspaceName: "Phase 1 Workspace",
      projectName: "Phase 1 Controlled Workflow",
      objective: "Prepare an approval-ready project decision memo.",
      threadTitle: "Draft, Critique, Revise, Approve",
      user: {
        email: "owner@example.com",
        name: "Demo Owner",
        role: "owner"
      }
    });
  }
}
