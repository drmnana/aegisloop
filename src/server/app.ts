import { ApprovalService, createServices, ProjectService, WorkflowEngine } from "./services";

export const services = createServices();

export const projectService = new ProjectService(services);
export const workflowEngine = new WorkflowEngine(services);
export const approvalService = new ApprovalService(services);

export async function ensureDemoProject() {
  try {
    return await projectService.getSnapshot();
  } catch {
    return projectService.createProject({
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
