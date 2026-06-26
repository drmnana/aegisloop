import { NextResponse } from "next/server";
import { workflowEngine } from "@/server/app";

export async function POST(request: Request) {
  const body = await request.json();
  if (!body.workflowRunId) {
    return NextResponse.json({ error: "workflowRunId is required" }, { status: 400 });
  }
  const result = await workflowEngine.runNext(body.workflowRunId);
  return NextResponse.json(result);
}
