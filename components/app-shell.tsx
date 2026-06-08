import { requireUser } from "@/lib/session";
import { getLeaderboard } from "@/lib/queries";
import { TopNav } from "./top-nav";

export async function AppShell({ children }: { children: React.ReactNode }) {
  const session = await requireUser();
  const leaderboard = await getLeaderboard();
  const me = leaderboard.find((r) => r.userId === session.userId);

  return (
    <div className="flex min-h-screen flex-col bg-cream">
      <TopNav
        displayName={session.displayName}
        isAdmin={!!session.isAdmin}
        rank={me?.rank ?? null}
        points={me?.totalPoints ?? 0}
      />
      <main className="dotted-bg flex-1">
        <div className="mx-auto w-full max-w-6xl px-4 py-8 md:px-6 md:py-10">
          {children}
        </div>
      </main>
    </div>
  );
}
