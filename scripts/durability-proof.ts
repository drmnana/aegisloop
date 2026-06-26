import { spawn, type ChildProcess } from "child_process";
import path from "path";

const root = path.resolve(__dirname, "..");
const port = Number(process.env.DURABILITY_PROOF_PORT ?? 3010);
const baseUrl = `http://127.0.0.1:${port}`;

function assertEnv() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required for the durability proof.");
  }
}

function runNodeScript(scriptPath: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [scriptPath, ...args], {
      cwd: root,
      env: {
        ...process.env,
        NEXT_TELEMETRY_DISABLED: "1"
      },
      stdio: "inherit"
    });
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${path.basename(scriptPath)} ${args.join(" ")} failed with exit code ${code}.`));
    });
    child.on("error", reject);
  });
}

function startServer(): ChildProcess {
  const nextBin = path.join(root, "node_modules", "next", "dist", "bin", "next");
  return spawn(process.execPath, [nextBin, "dev", "-p", String(port), "-H", "127.0.0.1"], {
    cwd: root,
    env: {
      ...process.env,
      NEXT_TELEMETRY_DISABLED: "1",
      LOCAL_STORAGE_ROOT: process.env.LOCAL_STORAGE_ROOT ?? "./storage/durability-proof"
    },
    stdio: ["ignore", "pipe", "pipe"]
  });
}

async function stopServer(child: ChildProcess): Promise<void> {
  if (child.exitCode !== null) return;
  if (process.platform === "win32" && child.pid) {
    await new Promise<void>((resolve) => {
      const killer = spawn("taskkill", ["/pid", String(child.pid), "/T", "/F"], { stdio: "ignore" });
      killer.on("exit", () => resolve());
      killer.on("error", () => resolve());
    });
    return;
  }
  child.kill("SIGTERM");
  await new Promise<void>((resolve) => child.once("exit", () => resolve()));
}

async function waitForServer(child: ChildProcess): Promise<void> {
  let lastError = "";
  const started = Date.now();
  while (Date.now() - started < 90_000) {
    if (child.exitCode !== null) {
      throw new Error(`Next server exited early with code ${child.exitCode}. ${lastError}`);
    }
    try {
      const response = await fetch(`${baseUrl}/api/projects`, { cache: "no-store" });
      if (response.ok) return;
      lastError = `${response.status} ${await response.text()}`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error(`Timed out waiting for Next server. Last error: ${lastError}`);
}

async function postJson<T>(pathName: string, body: Record<string, unknown>): Promise<T> {
  const response = await fetch(`${baseUrl}${pathName}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
  if (!response.ok) {
    throw new Error(`${pathName} failed: ${response.status} ${await response.text()}`);
  }
  return response.json() as Promise<T>;
}

async function getJson<T>(pathName: string): Promise<T> {
  const response = await fetch(`${baseUrl}${pathName}`, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`${pathName} failed: ${response.status} ${await response.text()}`);
  }
  return response.json() as Promise<T>;
}

async function main() {
  assertEnv();
  const prismaCli = path.join(root, "node_modules", "prisma", "build", "index.js");
  await runNodeScript(prismaCli, ["migrate", "deploy"]);

  let server = startServer();
  try {
    await waitForServer(server);
    const start = await postJson<{ run: { id: string } }>("/api/workflows/start", {
      objective: "Manual durability proof: resume after server restart."
    });
    const runId = start.run.id;
    await postJson("/api/workflows/runNext", { workflowRunId: runId });
    await postJson("/api/workflows/runNext", { workflowRunId: runId });

    await stopServer(server);
    server = startServer();
    await waitForServer(server);

    const resumed = await postJson<{ step?: { type: string }; run: { status: string } }>("/api/workflows/runNext", { workflowRunId: runId });
    if (resumed.step?.type !== "revise") {
      throw new Error(`Expected revise step after restart, got ${resumed.step?.type ?? "none"}.`);
    }
    const paused = await postJson<{ run: { status: string } }>("/api/workflows/runNext", { workflowRunId: runId });
    if (paused.run.status !== "waiting_for_human") {
      throw new Error(`Expected waiting_for_human after approval step, got ${paused.run.status}.`);
    }
    await postJson("/api/approvals/approve", { workflowRunId: runId });

    const snapshot = await getJson<{
      workflowRuns: Array<{ id: string; status: string }>;
      modelCalls: Array<{ workflowRunId: string }>;
      approvals: Array<{ workflowRunId: string; status: string }>;
      decisions: Array<{ workflowRunId: string; approvedOutputReference: string }>;
      auditEvents: Array<{ workflowRunId?: string; action: string }>;
    }>("/api/projects");
    const run = snapshot.workflowRuns.find((item) => item.id === runId);
    const decision = snapshot.decisions.find((item) => item.workflowRunId === runId);
    if (run?.status !== "approved") throw new Error(`Expected approved run, got ${run?.status ?? "missing"}.`);
    if (snapshot.modelCalls.filter((item) => item.workflowRunId === runId).length !== 3) throw new Error("Expected three persisted model calls.");
    if (!snapshot.approvals.some((item) => item.workflowRunId === runId && item.status === "approved")) throw new Error("Expected persisted approved approval.");
    if (!decision) throw new Error("Expected persisted decision.");
    if (!decision.approvedOutputReference.endsWith("approved-output.md")) throw new Error("Decision did not store the approved output reference.");
    if (decision.approvedOutputReference.includes("Revised approved-ready output")) throw new Error("Decision stored output content instead of a reference.");
    if (!snapshot.auditEvents.some((item) => item.workflowRunId === runId && item.action === "approval.approved")) throw new Error("Expected persisted approval audit event.");

    console.log("Durability proof passed.");
    console.log(`Workflow run: ${runId}`);
    console.log(`Approved output reference: ${decision.approvedOutputReference}`);
  } finally {
    await stopServer(server);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
