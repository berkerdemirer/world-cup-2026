import { AppShell } from "@/components/app-shell";
import { requireAdmin } from "@/lib/session";
import { getMatchesWithTeams } from "@/lib/queries";
import { stageGroupHeading } from "@/lib/format";
import { ResultForm } from "./result-form";

export default async function AdminResultsPage() {
  await requireAdmin();
  const all = await getMatchesWithTeams();

  return (
    <AppShell>
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-slate-900">Enter / override results</h1>
        <p className="text-sm text-slate-500">
          Saving marks a match as <span className="font-medium">manual</span> — the API sync will
          never overwrite it afterwards.
        </p>
      </div>

      {all.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
          No matches yet — run a sync first.
        </p>
      ) : (
        <div className="space-y-2">
          {all.map((m) => (
            <div key={m.id}>
              <div className="mb-1 text-xs uppercase tracking-wide text-slate-400">
                {stageGroupHeading(m.stage, m.groupLabel, m.matchday)} ·{" "}
                {new Date(m.kickoffAt).toLocaleString()}
              </div>
              <ResultForm match={m} />
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}
