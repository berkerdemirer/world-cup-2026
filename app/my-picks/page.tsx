/* eslint-disable @next/next/no-img-element */
import { AppShell } from "@/components/app-shell";
import { LiveRefresh } from "@/components/live-refresh";
import { PageHeader } from "@/components/page-header";
import { requireUser } from "@/lib/session";
import {
  getLeaderboard,
  getMatchesWithTeams,
  getUserScorePredictions,
  type MatchWithTeams,
} from "@/lib/queries";
import { getSettings, pointsForTier } from "@/lib/scoring";
import { scoreTier, type ScoreTier } from "@/lib/score-tier";
import { Flame } from "lucide-react";
import type { Team } from "@/db/schema";

type PredPick = { homeScore: number; awayScore: number };

type HistoryItem = {
  match: MatchWithTeams;
  prediction: PredPick;
  tier: ScoreTier;
  points: number;
};

export default async function MyPicksPage() {
  const session = await requireUser();
  const [allMatches, predictions, leaderboard, settings] = await Promise.all([
    getMatchesWithTeams(),
    getUserScorePredictions(session.userId),
    getLeaderboard(),
    getSettings(),
  ]);

  const me = leaderboard.find((r) => r.userId === session.userId);

  // Settled predictions, newest kickoff first — this is the prediction history.
  const history: HistoryItem[] = allMatches
    .filter(
      (m) =>
        m.status === "FINISHED" &&
        m.homeScore != null &&
        m.awayScore != null &&
        predictions.has(m.id),
    )
    .sort((a, b) => new Date(b.kickoffAt).getTime() - new Date(a.kickoffAt).getTime())
    .map((m) => {
      const prediction = predictions.get(m.id)!;
      const tier = scoreTier(
        prediction.homeScore,
        prediction.awayScore,
        m.homeScore!,
        m.awayScore!,
      );
      return { match: m, prediction, tier, points: pointsForTier(tier, settings) };
    });

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
      <LiveRefresh intervalMs={60000} />
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
      {history.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-card/50 p-10 text-center text-muted-foreground">
          No settled predictions yet. Your scored picks will show up here once matches finish.
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {history.map((h) => (
            <HistoryRow key={h.match.id} item={h} />
          ))}
        </div>
      )}
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

function HistoryRow({ item }: { item: HistoryItem }) {
  const { match, prediction, tier, points } = item;
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-card px-4 py-3 shadow-sm ring-1 ring-black/5 md:px-5">
      <div className="flex shrink-0 items-center -space-x-1.5">
        <MiniCrest team={match.homeTeam} placeholder={match.homePlaceholder} />
        <MiniCrest team={match.awayTeam} placeholder={match.awayPlaceholder} />
      </div>

      <div className="display shrink-0 text-2xl text-ink">
        {match.homeScore}&ndash;{match.awayScore}
      </div>

      <div className="min-w-0 flex-1 truncate text-sm text-muted-foreground">
        called{" "}
        <span className="font-semibold text-ink">
          {prediction.homeScore}&ndash;{prediction.awayScore}
        </span>
      </div>

      <ScorePill tier={tier} points={points} />
    </div>
  );
}

function MiniCrest({
  team,
  placeholder,
}: {
  team?: Pick<Team, "name" | "tla" | "crestUrl"> | null;
  placeholder?: string | null;
}) {
  const label = team?.tla ?? placeholder?.slice(0, 3).toUpperCase() ?? "TBD";
  return (
    <span className="grid size-9 place-items-center overflow-hidden rounded-full bg-white ring-2 ring-card">
      {team?.crestUrl ? (
        <img src={team.crestUrl} alt={team?.name ?? ""} className="h-full w-full object-cover" />
      ) : (
        <span className="text-[9px] font-bold text-muted-foreground">{label}</span>
      )}
    </span>
  );
}

function ScorePill({ tier, points }: { tier: ScoreTier; points: number }) {
  const p = {
    exact: { cls: "bg-brand text-brand-foreground", pts: `+${points}`, label: "Exact" },
    goal_diff: { cls: "bg-royal text-white", pts: `+${points}`, label: "+GD" },
    outcome: { cls: "bg-line text-ink", pts: `+${points}`, label: "Result" },
    none: { cls: "bg-line/70 text-muted-foreground", pts: "0", label: "Miss" },
  }[tier];
  return (
    <span
      className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold uppercase tracking-wide ${p.cls}`}
    >
      <span className="text-sm font-black normal-case">{p.pts}</span>
      {p.label}
    </span>
  );
}
