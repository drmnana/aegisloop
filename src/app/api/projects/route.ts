import { NextResponse } from "next/server";
import { ensureDemoProject } from "@/server/app";

export const dynamic = "force-dynamic";

export async function GET() {
  const snapshot = await ensureDemoProject();
  return NextResponse.json(snapshot);
}
