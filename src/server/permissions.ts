import type { Actor, Role } from "./types";

export type Permission =
  | "create_project"
  | "start_workflow"
  | "view_workflow"
  | "approve_output"
  | "reject_output"
  | "view_audit_log"
  | "view_decision_log";

const rolePermissions: Record<Role, Permission[]> = {
  owner: ["create_project", "start_workflow", "view_workflow", "approve_output", "reject_output", "view_audit_log", "view_decision_log"],
  admin: ["create_project", "start_workflow", "view_workflow", "approve_output", "reject_output", "view_audit_log", "view_decision_log"],
  editor: ["create_project", "start_workflow", "view_workflow", "view_decision_log"],
  approver: ["view_workflow", "approve_output", "reject_output", "view_audit_log", "view_decision_log"],
  viewer: ["view_workflow", "view_audit_log", "view_decision_log"]
};

export class PermissionDeniedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PermissionDeniedError";
  }
}

export function can(role: Role, permission: Permission): boolean {
  return rolePermissions[role].includes(permission);
}

export function assertHumanPermission(actor: Actor, role: Role, permission: Permission): void {
  if (actor.type !== "human") {
    throw new PermissionDeniedError("AI and system actors cannot perform human-only approval actions.");
  }

  if (!can(role, permission)) {
    throw new PermissionDeniedError(`Role ${role} cannot ${permission}.`);
  }
}
