import { NextResponse } from "next/server";
import { approvalService, ensureDemoProject, services } from "@/server/app";
import { recordPermissionDenied } from "@/server/services";

export async function POST(request: Request) {
  const snapshot = await ensureDemoProject();
  const body = await request.json();
  const user = snapshot.users.find((item) => item.id === body.userId) ?? snapshot.users[0];
  try {
    await approvalService.approve({
      actor: body.actorType === "ai" ? { type: "ai", id: "ai-agent" } : { type: "human", id: user.id },
      actorRole: user.role,
      workflowRunId: body.workflowRunId
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    await recordPermissionDenied(
      services,
      { type: body.actorType === "ai" ? "ai" : "human", id: user.id },
      snapshot.organization.id,
      snapshot.project.id,
      error
    );
    return NextResponse.json({ error: error instanceof Error ? error.message : "Approval failed" }, { status: 400 });
  }
}
