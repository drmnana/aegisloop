import { NextResponse } from "next/server";
import { ensureDemoProject, getApprovalService } from "@/server/app";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const snapshot = await ensureDemoProject();
  const body = await request.json();
  const user = snapshot.users.find((item) => item.id === body.userId) ?? snapshot.users[0];
  await getApprovalService().reject({
    actor: { type: "human", id: user.id },
    actorRole: user.role,
    workflowRunId: body.workflowRunId,
    note: body.note
  });
  return NextResponse.json({ ok: true });
}
