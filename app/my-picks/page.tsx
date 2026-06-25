import { AppShell } from "@/components/app-shell";
import { LiveRefresh } from "@/components/live-refresh";
import { PageHeader } from "@/components/page-header";
import { PredictionHistoryList } from "@/components/prediction-history-list";
import { requireUser } from "@/lib/session";
import { getLeaderboard, getMatchesWithTeams, getUserScorePredictions } from "@/lib/queries";
import { buildPredictionHistory } from "@/lib/prediction-history";
import { getSettings } from "@/lib/scoring";
import { Flame } from "lucide-react";

export default async function MyPicksPage() {
  const session = await requireUser();
  const [allMatches, predictions, leaderboard, settings] = await Promise.all([
    getMatchesWithTeams(),
    getUserScorePredictions(session.userId),
    getLeaderboard(),
    getSettings(),
  ]);

  const me = leaderboard.find((r) => r.userId === session.userId);

  const history = buildPredictionHistory(allMatches, predictions, settings);

  const settled = history.length;
  const hits = history.filter((h) => h.tier !== "none").length;
  const hitRate = settled > 0 ? Math.round((hits / settled) * 100) : 0;

  // Scoring streak = leading run of most-recent settled picks that scored.
  let streak = 0;
  for (const h of history) {
    if (h.tier === "none") break;
    streak += 1;
  }

  const initials = session.displayName.slice(0, 2).toUpperCase();

  return (
    <AppShell>
      <LiveRefresh intervalMs={settings.liveSyncSeconds * 1000} />
      <PageHeader title="My Picks" subtitle="Your points, accuracy, and prediction history." />

      {/* Profile banner */}
      <div className="relative mb-6 overflow-hidden rounded-3xl bg-ink px-6 py-6 text-white md:px-8">
        <div className="absolute inset-y-0 right-0 w-2/3 bg-gradient-to-l from-brand/20 to-transparent" />
        <div className="relative flex items-center gap-5">
          <span className="grid size-16 shrink-0 place-items-center rounded-full bg-orange-500 text-xl font-bold ring-4 ring-brand md:size-20">
            {initials}
          </span>
          <div className="min-w-0 flex-1">
            <div className="display text-3xl uppercase leading-none md:text-4xl">
              {session.displayName}
            </div>
            <div className="mt-2 flex items-center gap-1.5 text-sm font-semibold text-brand">
              <Flame className="size-4" strokeWidth={2.5} />
              {streak > 0 ? `${streak}-match scoring streak` : "No active streak"}
            </div>
          </div>
          <div className="shrink-0 rounded-2xl bg-white/5 px-4 py-3 text-center ring-1 ring-white/10">
            <div className="text-[10px] font-bold uppercase tracking-widest text-white/60">Rank</div>
            <div className="display text-3xl leading-none">{me?.rank ? `#${me.rank}` : "—"}</div>
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard value={me?.totalPoints ?? 0} label="Total points" />
        <StatCard value={me?.exactCount ?? 0} label="Exact scores" />
        <StatCard value={`${hitRate}%`} label="Hit rate" />
        <StatCard value={settled} label="Predictions scored" />
      </div>

      {/* Prediction history */}
      <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-muted-foreground">
        Prediction History
      </h2>
      <PredictionHistoryList items={history} />
    </AppShell>
  );
}

function StatCard({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="rounded-2xl bg-card p-4 shadow-sm ring-1 ring-black/5">
      <div className="display text-4xl leading-none text-ink">{value}</div>
      <div className="mt-1.5 text-xs font-medium text-muted-foreground">{label}</div>
    </div>
  );
}
