import Link from "next/link";
import { ensureDemoProject } from "@/server/app";
import { WorkflowControls } from "./WorkflowControls";

export default async function Home() {
  const snapshot = await ensureDemoProject();
  const latestRun = snapshot.workflowRuns.at(-1);
  return (
    <main className="mx-auto flex max-w-7xl flex-col gap-6 px-6 py-6">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-semibold">AegisLoop</h1>
          <p className="text-sm text-slate-600">{snapshot.project.name}</p>
        </div>
        <nav className="flex flex-wrap gap-2 text-sm">
          <Link className="rounded border border-slate-300 bg-white px-3 py-2" href="/">Project Room</Link>
          <Link className="rounded border border-slate-300 bg-white px-3 py-2" href="/workflows">Workflow</Link>
          <Link className="rounded border border-slate-300 bg-white px-3 py-2" href="/approvals">Approvals</Link>
          <Link className="rounded border border-slate-300 bg-white px-3 py-2" href="/decisions">Decisions</Link>
          <Link className="rounded border border-slate-300 bg-white px-3 py-2" href="/audit">Audit</Link>
        </nav>
      </header>

      <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded border border-slate-200 bg-white p-4">
          <h2 className="text-lg font-semibold">Project Objective</h2>
          <p className="mt-2 text-sm text-slate-700">{snapshot.project.objective}</p>
          <WorkflowControls latestRunId={latestRun?.id} />
        </div>
        <div className="rounded border border-slate-200 bg-white p-4">
          <h2 className="text-lg font-semibold">AI Agents</h2>
          <div className="mt-3 grid gap-2">
            {snapshot.agents.map((agent) => (
              <div key={agent.id} className="rounded border border-slate-200 p-3 text-sm">
                <div className="font-medium">{agent.name}</div>
                <div className="text-slate-600">{agent.role} · {agent.provider} · cannot approve</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <Panel title="Thread Messages">
          {snapshot.messages.length === 0 ? <Empty text="No messages yet." /> : snapshot.messages.map((message) => (
            <div key={message.id} className="border-b border-slate-100 py-2 text-sm">
              <span className="font-medium">{message.actorType}</span>: {message.body}
            </div>
          ))}
        </Panel>
        <Panel title="Workflow Runs">
          {snapshot.workflowRuns.length === 0 ? <Empty text="No workflow runs yet." /> : snapshot.workflowRuns.map((run) => (
            <div key={run.id} className="border-b border-slate-100 py-2 text-sm">
              <div className="font-medium">{run.status}</div>
              <div className="text-slate-600">{run.objective}</div>
              <div className="text-xs text-slate-500">AI calls: {run.aiCallsUsed}/{run.maxAiCalls}</div>
            </div>
          ))}
        </Panel>
        <Panel title="Pending Approvals">
          {snapshot.approvals.filter((item) => item.status === "pending").length === 0 ? <Empty text="No pending approvals." /> : snapshot.approvals.filter((item) => item.status === "pending").map((approval) => (
            <div key={approval.id} className="border-b border-slate-100 py-2 text-sm">
              <div className="font-medium">Approval waiting</div>
              <div className="text-slate-600">Workflow {approval.workflowRunId}</div>
            </div>
          ))}
        </Panel>
        <Panel title="Recent Decisions">
          {snapshot.decisions.length === 0 ? <Empty text="No decisions yet." /> : snapshot.decisions.map((decision) => (
            <div key={decision.id} className="border-b border-slate-100 py-2 text-sm">
              <div className="font-medium">{decision.title}</div>
              <div className="text-slate-600">{decision.status} · {decision.approvedOutputReference}</div>
            </div>
          ))}
        </Panel>
      </section>

      <Panel title="Recent Audit Events">
        {snapshot.auditEvents.slice(-8).map((event) => (
          <div key={event.id} className="grid gap-1 border-b border-slate-100 py-2 text-sm md:grid-cols-[180px_1fr_120px]">
            <span className="font-medium">{event.action}</span>
            <span className="text-slate-600">{event.targetType}: {event.targetId}</span>
            <span className="text-slate-500">{event.result}</span>
          </div>
        ))}
      </Panel>
    </main>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded border border-slate-200 bg-white p-4">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="text-sm text-slate-500">{text}</p>;
}
