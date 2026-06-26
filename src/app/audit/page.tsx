import Link from "next/link";
import { ensureDemoProject } from "@/server/app";

export const dynamic = "force-dynamic";

export default async function AuditPage() {
  const snapshot = await ensureDemoProject();
  return (
    <main className="mx-auto max-w-6xl px-6 py-6">
      <Link href="/" className="text-sm text-slate-600">Back to project room</Link>
      <h1 className="mt-4 text-2xl font-semibold">Audit Log Viewer</h1>
      <div className="mt-4 rounded border border-slate-200 bg-white">
        {snapshot.auditEvents.map((event) => (
          <div key={event.id} className="grid gap-2 border-b border-slate-100 p-4 text-sm lg:grid-cols-[180px_120px_1fr_120px]">
            <div className="font-medium">{event.action}</div>
            <div className="text-slate-600">{event.actorType}</div>
            <div className="text-slate-600">{event.targetType}: {event.targetId}</div>
            <div className="text-slate-600">{event.result}</div>
          </div>
        ))}
      </div>
    </main>
  );
}
