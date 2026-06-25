import { AppShell } from "@/components/app-shell";
import { LeaderboardTable } from "@/components/leaderboard-table";
import { requireUser } from "@/lib/session";
import { getLeaderboard } from "@/lib/queries";
import { getSettings } from "@/lib/scoring";
import { PageHeader } from "@/components/page-header";
import { LiveRefresh } from "@/components/live-refresh";

export default async function LeaderboardPage() {
  const session = await requireUser();
  const [rows, settings] = await Promise.all([getLeaderboard(), getSettings()]);

  const leaderTotal = rows[0]?.totalPoints ?? 0;

  return (
    <AppShell>
      <LiveRefresh intervalMs={settings.liveSyncSeconds * 1000} />
      <PageHeader
        title="Leaderboard"
        subtitle="Ranked by total points, then exact scores, then who joined first."
      />

      <LeaderboardTable
        rows={rows}
        currentUserId={session.userId}
        leaderTotal={leaderTotal}
        pointValues={{
          exact: settings.ptsExact,
          goalDiff: settings.ptsGoalDiff,
          outcome: settings.ptsOutcome,
        }}
      />
    </AppShell>
  );
}
