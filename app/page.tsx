import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { requireUser } from "@/lib/session";
import {
  getMatchesWithTeams,
  getUserScorePredictions,
  getLeaderboard,
  isMatchLocked,
} from "@/lib/queries";
import { TeamBadge } from "@/components/team-badge";
import { LiveRefresh } from "@/components/live-refresh";

export default async function DashboardPage() {
  const session = await requireUser();
  const [allMatches, predictions, leaderboard] = await Promise.all([
    getMatchesWithTeams(),
    getUserScorePredictions(session.userId),
    getLeaderboard(),
  ]);

  const me = leaderboard.find((r) => r.userId === session.userId);

  // Matches currently being played (live scores update as the sync runs).
  const live = allMatches.filter((m) => m.status === "IN_PLAY" || m.status === "PAUSED");

  // Not locked => scheduled and not yet kicked off, i.e. still open to predict.
  const upcoming = allMatches.filter((m) => !isMatchLocked(m)).slice(0, 6);
  const missingCount = upcoming.filter((m) => !predictions.has(m.id)).length;

  const recent = allMatches
    .filter((m) => m.status === "FINISHED")
    .slice(-5)
    .reverse();

  return (
    <AppShell>
      {/* Refresh faster while matches are live, slower otherwise. */}
      <LiveRefresh intervalMs={live.length > 0 ? 20000 : 60000} />

      <h1 className="mb-4 text-2xl font-bold text-slate-900">
        Hi {session.displayName} 👋
      </h1>

      {live.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
            </span>
            Live now
          </h2>
          <ul className="space-y-2">
            {live.map((m) => (
              <li
                key={m.id}
                className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2"
              >
                <div className="justify-self-end">
                  <TeamBadge team={m.homeTeam} placeholder={m.homePlaceholder} align="right" />
                </div>
                <Link
                  href={`/matches/${m.id}`}
                  className="rounded bg-white px-2 py-0.5 text-center font-mono text-sm font-bold text-slate-900 ring-1 ring-red-200"
                >
                  {m.homeScore ?? 0}:{m.awayScore ?? 0}
                </Link>
                <div className="justify-self-start">
                  <TeamBadge team={m.awayTeam} placeholder={m.awayPlaceholder} align="left" />
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Your rank" value={me ? `#${me.rank}` : "–"} />
        <StatCard label="Total points" value={me ? String(me.totalPoints) : "0"} />
        <StatCard
          label="Open matches to pick"
          value={String(missingCount)}
          accent={missingCount > 0}
        />
      </div>

      <section className="mb-6">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Upcoming matches
          </h2>
          <Link href="/predict/matches" className="text-sm font-medium text-slate-600 hover:underline">
            Predict all →
          </Link>
        </div>
        {upcoming.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-400">
            No upcoming matches to predict right now.
          </p>
        ) : (
          <ul className="space-y-2">
            {upcoming.map((m) => (
              <li
                key={m.id}
                className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2"
              >
                <div className="justify-self-end">
                  <TeamBadge team={m.homeTeam} placeholder={m.homePlaceholder} align="right" />
                </div>
                <div className="text-center text-xs text-slate-400">
                  {predictions.has(m.id) ? (
                    <span className="font-mono text-slate-700">
                      {predictions.get(m.id)!.homeScore}:{predictions.get(m.id)!.awayScore}
                    </span>
                  ) : (
                    <span className="rounded bg-amber-100 px-1.5 py-0.5 text-amber-700">pick</span>
                  )}
                </div>
                <div className="justify-self-start">
                  <TeamBadge team={m.awayTeam} placeholder={m.awayPlaceholder} align="left" />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {recent.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Recent results
          </h2>
          <ul className="space-y-2">
            {recent.map((m) => (
              <li
                key={m.id}
                className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2"
              >
                <div className="justify-self-end">
                  <TeamBadge team={m.homeTeam} placeholder={m.homePlaceholder} align="right" />
                </div>
                <Link
                  href={`/matches/${m.id}`}
                  className="rounded bg-slate-100 px-2 py-0.5 text-center font-mono text-sm text-slate-800 hover:bg-slate-200"
                >
                  {m.homeScore}:{m.awayScore}
                </Link>
                <div className="justify-self-start">
                  <TeamBadge team={m.awayTeam} placeholder={m.awayPlaceholder} align="left" />
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </AppShell>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border bg-white p-4 ${
        accent ? "border-amber-300 ring-1 ring-amber-200" : "border-slate-200"
      }`}
    >
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-2xl font-bold text-slate-900">{value}</div>
    </div>
  );
}
