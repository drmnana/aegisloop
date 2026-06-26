import { NextResponse } from "next/server";
import { getWorkflowEngine } from "@/server/app";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.json();
  if (!body.workflowRunId) {
    return NextResponse.json({ error: "workflowRunId is required" }, { status: 400 });
  }
  const result = await getWorkflowEngine().runNext(body.workflowRunId);
  return NextResponse.json(result);
}
