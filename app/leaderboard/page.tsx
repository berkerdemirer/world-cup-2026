import { AppShell } from "@/components/app-shell";
import { requireUser } from "@/lib/session";
import { getLeaderboard } from "@/lib/queries";
import { PageHeader } from "@/components/page-header";
import { LiveRefresh } from "@/components/live-refresh";

export default async function LeaderboardPage() {
  const session = await requireUser();
  const rows = await getLeaderboard();

  // Gap-to-leader is derived from the already-ordered rows so we can show how
  // far each player trails the top of the table.
  const leaderTotal = rows[0]?.totalPoints ?? 0;

  return (
    <AppShell>
      <LiveRefresh intervalMs={60000} />
      <PageHeader
        title="Leaderboard"
        subtitle="Ranked by total points, then exact scores, then who joined first."
      />

      <div className="overflow-hidden rounded-2xl bg-card shadow-sm ring-1 ring-black/5">
        <div className="overflow-x-auto">
        <table className="w-full min-w-[480px] text-sm">
          <thead>
            <tr className="border-b border-line text-left text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              <th className="px-3 py-3 sm:px-4">#</th>
              <th className="px-3 py-3 sm:px-4">Player</th>
              <th className="px-3 py-3 text-center sm:px-4">Match</th>
              <th className="px-3 py-3 text-center sm:px-4">Bracket</th>
              <th className="px-3 py-3 text-center sm:px-4">Exact</th>
              <th className="hidden px-3 py-3 text-center sm:table-cell sm:px-4">Behind</th>
              <th className="px-3 py-3 text-center sm:px-4">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((r) => {
              const isMe = r.userId === session.userId;
              // Gold / silver / bronze for the podium; muted for everyone else.
              const medal =
                r.rank === 1
                  ? "bg-gradient-to-br from-amber-300 to-yellow-500 text-amber-950 shadow-sm ring-1 ring-amber-400/60"
                  : r.rank === 2
                    ? "bg-gradient-to-br from-zinc-200 to-zinc-400 text-zinc-800 ring-1 ring-zinc-300/60"
                    : r.rank === 3
                      ? "bg-gradient-to-br from-orange-300 to-amber-600 text-orange-950 ring-1 ring-orange-400/60"
                      : "text-muted-foreground";
              const gap = leaderTotal - r.totalPoints;
              return (
                <tr key={r.userId} className={isMe ? "bg-brand/10" : ""}>
                  <td className="px-3 py-3 sm:px-4">
                    <span
                      className={`grid h-7 w-7 place-items-center rounded-full text-xs font-bold ${medal}`}
                    >
                      {r.rank}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 font-semibold text-ink sm:px-4">
                    {r.displayName}
                    {isMe && (
                      <span className="ml-1.5 rounded bg-brand px-1.5 py-0.5 text-[10px] font-bold uppercase text-brand-foreground">
                        You
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-center text-muted-foreground sm:px-4">{r.matchPoints}</td>
                  <td className="px-3 py-3 text-center text-muted-foreground sm:px-4">{r.bracketPoints}</td>
                  <td className="px-3 py-3 text-center text-muted-foreground sm:px-4">{r.exactCount}</td>
                  <td className="hidden px-3 py-3 text-center text-muted-foreground sm:table-cell sm:px-4">
                    {gap === 0 ? "—" : `-${gap}`}
                  </td>
                  <td className="px-3 py-3 text-center sm:px-4">
                    <span
                      className={`display text-lg ${r.rank === 1 ? "text-amber-500" : "text-ink"}`}
                    >
                      {r.totalPoints}
                    </span>
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                  No players yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
      </div>
    </AppShell>
  );
}
