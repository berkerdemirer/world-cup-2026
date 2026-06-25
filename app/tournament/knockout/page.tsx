import { AppShell } from "@/components/app-shell";
import { FullBleed } from "@/components/full-bleed";
import { TournamentNav } from "@/components/tournament-nav";
import { KnockoutBracket } from "@/components/knockout-bracket";
import { PageHeader } from "@/components/page-header";
import { LiveRefresh } from "@/components/live-refresh";
import { getKnockoutRounds } from "@/lib/queries";
import { getSettings } from "@/lib/scoring";

export default async function KnockoutPage() {
  const [rounds, settings] = await Promise.all([getKnockoutRounds(), getSettings()]);

  return (
    <AppShell>
      <LiveRefresh intervalMs={settings.liveSyncSeconds * 1000} />
      <PageHeader
        title="Knockout bracket"
        subtitle="Round of 32 through the final — real results as the tournament progresses."
      />
      <TournamentNav />

      {rounds.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-card/50 p-10 text-center text-muted-foreground">
          No knockout fixtures yet. Rounds will appear once the bracket is drawn and synced.
        </div>
      ) : (
        <FullBleed className="px-4 md:px-8 xl:px-12">
          <KnockoutBracket rounds={rounds} />
        </FullBleed>
      )}
    </AppShell>
  );
}
