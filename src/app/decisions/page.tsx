import Link from "next/link";
import { ensureDemoProject } from "@/server/app";

export default async function DecisionsPage() {
  const snapshot = await ensureDemoProject();
  return (
    <main className="mx-auto max-w-6xl px-6 py-6">
      <Link href="/" className="text-sm text-slate-600">Back to project room</Link>
      <h1 className="mt-4 text-2xl font-semibold">Decision Log</h1>
      <div className="mt-4 rounded border border-slate-200 bg-white">
        {snapshot.decisions.length === 0 ? <p className="p-4 text-sm text-slate-500">No decisions yet.</p> : snapshot.decisions.map((decision) => (
          <div key={decision.id} className="border-b border-slate-100 p-4 text-sm">
            <div className="font-medium">{decision.title}</div>
            <div className="mt-1 text-slate-600">Status: {decision.status}</div>
            <div className="mt-1 text-slate-600">Stored output reference: {decision.approvedOutputReference}</div>
          </div>
        ))}
      </div>
    </main>
  );
}
