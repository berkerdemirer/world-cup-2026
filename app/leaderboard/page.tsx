import { AppShell } from "@/components/app-shell";
import { requireUser } from "@/lib/session";
import { getLeaderboard } from "@/lib/queries";
import { LiveRefresh } from "@/components/live-refresh";

export default async function LeaderboardPage() {
  const session = await requireUser();
  const rows = await getLeaderboard();

  return (
    <AppShell>
      <LiveRefresh intervalMs={60000} />
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-slate-900">Leaderboard</h1>
        <p className="text-sm text-slate-500">
          Ranked by total points, then exact scores, then who joined first.
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-2.5">#</th>
              <th className="px-4 py-2.5">Player</th>
              <th className="px-4 py-2.5 text-right">Match</th>
              <th className="px-4 py-2.5 text-right">Bracket</th>
              <th className="px-4 py-2.5 text-right">Exact</th>
              <th className="px-4 py-2.5 text-right">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((r) => {
              const isMe = r.userId === session.userId;
              return (
                <tr key={r.userId} className={isMe ? "bg-amber-50" : ""}>
                  <td className="px-4 py-2.5 font-mono text-slate-500">{r.rank}</td>
                  <td className="px-4 py-2.5 font-medium text-slate-800">
                    {r.displayName}
                    {isMe && <span className="ml-1 text-xs text-amber-600">(you)</span>}
                  </td>
                  <td className="px-4 py-2.5 text-right text-slate-600">{r.matchPoints}</td>
                  <td className="px-4 py-2.5 text-right text-slate-600">{r.bracketPoints}</td>
                  <td className="px-4 py-2.5 text-right text-slate-600">{r.exactCount}</td>
                  <td className="px-4 py-2.5 text-right font-bold text-slate-900">
                    {r.totalPoints}
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                  No players yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
