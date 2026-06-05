import { AppShell } from "@/components/app-shell";
import { requireUser } from "@/lib/session";
import {
  getMatchesWithTeams,
  getUserScorePredictions,
  isMatchLocked,
  type MatchWithTeams,
} from "@/lib/queries";
import { stageGroupHeading } from "@/lib/format";
import { MatchRow } from "./match-row";

export default async function PredictMatchesPage() {
  const session = await requireUser();
  const [allMatches, predictions] = await Promise.all([
    getMatchesWithTeams(),
    getUserScorePredictions(session.userId),
  ]);

  // Group consecutive matches under a stage/group/matchday heading.
  const groups: { heading: string; matches: MatchWithTeams[] }[] = [];
  for (const m of allMatches) {
    const heading = stageGroupHeading(m.stage, m.groupLabel, m.matchday);
    const last = groups[groups.length - 1];
    if (last && last.heading === heading) last.matches.push(m);
    else groups.push({ heading, matches: [m] });
  }

  return (
    <AppShell>
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-slate-900">Predict Scores</h1>
        <p className="text-sm text-slate-500">
          Each match locks at kickoff. Exact 4 · goal difference 3 · correct result 2.
        </p>
      </div>

      {allMatches.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-6">
          {groups.map((g, i) => (
            <section key={i}>
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
                {g.heading}
              </h2>
              <div className="space-y-2">
                {g.matches.map((m) => (
                  <MatchRow
                    key={m.id}
                    match={m}
                    locked={isMatchLocked(m)}
                    prediction={predictions.get(m.id)}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </AppShell>
  );
}

function EmptyState() {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
      No fixtures loaded yet. An admin needs to run a data sync from the{" "}
      <span className="font-medium">Admin → Sync</span> panel.
    </div>
  );
}
