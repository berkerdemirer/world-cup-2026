import { Suspense } from "react";
import { AppShell } from "@/components/app-shell";
import { requireUser } from "@/lib/session";
import { getMatchesWithTeams, getUserScorePredictions, isMatchLocked } from "@/lib/queries";
import { isMatchUnplayed } from "@/lib/match-status";
import { buildPredictionHistory } from "@/lib/prediction-history";
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
  const totalUnplayed = rows.filter((r) => isMatchUnplayed(r.match)).length;
  const pickable = rows.filter((r) => !r.locked).length;
  const history = buildPredictionHistory(allMatches, predictions, settings);

  return (
    <AppShell>
      <LiveRefresh intervalMs={settings.liveSyncSeconds * 1000} />
      <PageHeader
        title="Fixtures"
        subtitle={
          allMatches.length === 0
            ? "No fixtures loaded yet"
            : totalUnplayed > 0
              ? pickable > 0
                ? `${totalUnplayed} upcoming · ${pickable} still open for picks`
                : `${totalUnplayed} upcoming match${totalUnplayed === 1 ? "" : "es"}`
              : "No upcoming matches — browse results in History"
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
        <Suspense fallback={<FixturesLoading />}>
          <FixturesView rows={rows} points={points} history={history} unplayedCount={totalUnplayed} />
        </Suspense>
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

function FixturesLoading() {
  return (
    <div className="flex flex-col gap-4">
      <div className="h-12 animate-pulse rounded-2xl bg-card ring-1 ring-black/5" />
      <div className="h-40 animate-pulse rounded-2xl bg-card ring-1 ring-black/5" />
    </div>
  );
}
