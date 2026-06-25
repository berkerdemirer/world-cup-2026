import { AppShell } from "@/components/app-shell";
import { requireUser } from "@/lib/session";
import { getMatchesWithTeams, getUserScorePredictions, isMatchLocked } from "@/lib/queries";
import { isFixtureActive, isMatchLive, isMatchUnplayed } from "@/lib/match-status";
import { getSettings } from "@/lib/scoring";
import { PageHeader } from "@/components/page-header";
import { LiveRefresh } from "@/components/live-refresh";
import { FixturesView } from "./fixtures-view";
import { type MatchPoints } from "./match-table";
import Link from "next/link";
import { BookOpen } from "lucide-react";

export default async function FixturesPage() {
  const session = await requireUser();
  const [allMatches, predictions, settings] = await Promise.all([
    getMatchesWithTeams(),
    getUserScorePredictions(session.userId),
    getSettings(),
  ]);

  const points: MatchPoints = {
    exact: settings.ptsExact,
    goalDiff: settings.ptsGoalDiff,
    outcome: settings.ptsOutcome,
  };

  const rows = allMatches.map((m) => ({
    match: m,
    prediction: predictions.get(m.id) ?? null,
    locked: isMatchLocked(m),
  }));
  const totalActive = rows.filter((r) => isFixtureActive(r.match)).length;
  const totalUnplayed = rows.filter((r) => isMatchUnplayed(r.match)).length;
  const liveCount = rows.filter((r) => isMatchLive(r.match)).length;
  const pickable = rows.filter((r) => !r.locked).length;

  return (
    <AppShell>
      <LiveRefresh intervalMs={settings.liveSyncSeconds * 1000} />
      <PageHeader
        title="Fixtures"
        subtitle={
          allMatches.length === 0
            ? "No fixtures loaded yet"
            : totalActive > 0
              ? [
                  liveCount > 0 ? `${liveCount} live` : null,
                  totalUnplayed > 0
                    ? `${totalUnplayed} upcoming`
                    : null,
                  pickable > 0 ? `${pickable} open for picks` : null,
                ]
                  .filter(Boolean)
                  .join(" · ")
              : "No upcoming matches — see your results in My Picks"
        }
        right={
          <Link
            href="/how-to-play"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-card px-3.5 py-2 text-sm font-semibold text-ink shadow-sm ring-1 ring-black/5 transition-colors hover:bg-line/50"
          >
            <BookOpen className="size-4" strokeWidth={2.25} />
            Rules
          </Link>
        }
      />

      {allMatches.length === 0 ? (
        <EmptyState />
      ) : (
        <FixturesView rows={rows} points={points} />
      )}
    </AppShell>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-dashed border-line bg-card/50 p-10 text-center text-muted-foreground">
      No fixtures loaded yet. An admin needs to run a data sync from the{" "}
      <span className="font-medium text-ink">Admin → Sync</span> panel.
    </div>
  );
}
