import Link from "next/link";
import { ensureDemoProject } from "@/server/app";

export default async function ApprovalsPage() {
  const snapshot = await ensureDemoProject();
  return (
    <main className="mx-auto max-w-5xl px-6 py-6">
      <Link href="/" className="text-sm text-slate-600">Back to project room</Link>
      <h1 className="mt-4 text-2xl font-semibold">Approval Inbox</h1>
      <div className="mt-4 rounded border border-slate-200 bg-white">
        {snapshot.approvals.length === 0 ? <p className="p-4 text-sm text-slate-500">No approvals yet.</p> : snapshot.approvals.map((approval) => (
          <div key={approval.id} className="grid gap-2 border-b border-slate-100 p-4 text-sm md:grid-cols-[1fr_160px]">
            <div>
              <div className="font-medium">Workflow {approval.workflowRunId}</div>
              <div className="text-slate-600">Status: {approval.status}</div>
            </div>
            <div className="text-slate-600">{approval.decidedAt ? approval.decidedAt.toLocaleString() : "Waiting"}</div>
          </div>
        ))}
      </div>
    </main>
  );
}
