import { NextResponse } from "next/server";
import { ensureDemoProject, workflowEngine } from "@/server/app";

export async function POST(request: Request) {
  const snapshot = await ensureDemoProject();
  const body = await request.json().catch(() => ({}));
  const user = snapshot.users[0];
  const run = await workflowEngine.startWorkflow({
    actor: { type: "human", id: user.id },
    actorRole: user.role,
    organizationId: snapshot.organization.id,
    workspaceId: snapshot.workspace.id,
    projectId: snapshot.project.id,
    threadId: snapshot.thread.id,
    objective: body.objective || snapshot.project.objective,
    maxAiCalls: body.maxAiCalls,
    maxEstimatedTokens: body.maxEstimatedTokens,
    maxEstimatedCost: body.maxEstimatedCost
  });
  return NextResponse.json({ run });
}
