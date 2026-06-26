import { NextResponse } from "next/server";
import { ensureDemoProject } from "@/server/app";

export async function GET() {
  const snapshot = await ensureDemoProject();
  return NextResponse.json(snapshot);
}
