import Link from "next/link";
import { ensureDemoProject } from "@/server/app";

export default async function WorkflowsPage() {
  const snapshot = await ensureDemoProject();
  return (
    <main className="mx-auto max-w-6xl px-6 py-6">
      <Link href="/" className="text-sm text-slate-600">Back to project room</Link>
      <h1 className="mt-4 text-2xl font-semibold">Workflow Run Page</h1>
      <div className="mt-4 grid gap-4">
        {snapshot.workflowRuns.map((run) => (
          <section key={run.id} className="rounded border border-slate-200 bg-white p-4">
            <div className="flex flex-wrap justify-between gap-2">
              <h2 className="font-semibold">{run.objective}</h2>
              <span className="text-sm text-slate-600">{run.status}</span>
            </div>
            <div className="mt-3 grid gap-2">
              {snapshot.workflowSteps.filter((step) => step.workflowRunId === run.id).map((step) => (
                <div key={step.id} className="rounded border border-slate-200 p-3 text-sm">
                  <div className="font-medium">{step.sequence}. {step.type} · {step.status}</div>
                  {step.output ? <p className="mt-1 text-slate-700">{step.output}</p> : null}
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
