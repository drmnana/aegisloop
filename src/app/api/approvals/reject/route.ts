import { NextResponse } from "next/server";
import { approvalService, ensureDemoProject } from "@/server/app";

export async function POST(request: Request) {
  const snapshot = await ensureDemoProject();
  const body = await request.json();
  const user = snapshot.users.find((item) => item.id === body.userId) ?? snapshot.users[0];
  await approvalService.reject({
    actor: { type: "human", id: user.id },
    actorRole: user.role,
    workflowRunId: body.workflowRunId,
    note: body.note
  });
  return NextResponse.json({ ok: true });
}
