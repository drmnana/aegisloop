"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function WorkflowControls({ latestRunId }: { latestRunId?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function call(path: string, body: Record<string, unknown>) {
    setBusy(true);
    try {
      await fetch(path, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body)
      });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-4 flex flex-wrap gap-2">
      <button
        onClick={() => call("/api/workflows/start", {})}
        disabled={busy}
        className="rounded bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        Start Workflow
      </button>
      <button
        onClick={() => latestRunId && call("/api/workflows/runNext", { workflowRunId: latestRunId })}
        disabled={busy || !latestRunId}
        className="rounded border border-slate-300 bg-white px-3 py-2 text-sm font-medium disabled:opacity-50"
      >
        Run Next Step
      </button>
      <button
        onClick={() => latestRunId && call("/api/approvals/approve", { workflowRunId: latestRunId })}
        disabled={busy || !latestRunId}
        className="rounded border border-emerald-500 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800 disabled:opacity-50"
      >
        Approve
      </button>
    </div>
  );
}
