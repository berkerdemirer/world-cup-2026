import { AppShell } from "@/components/app-shell";
import { FullBleed } from "@/components/full-bleed";
import { TournamentNav } from "@/components/tournament-nav";
import { KnockoutBracket } from "@/components/knockout-bracket";
import { KnockoutMatchRow } from "@/components/knockout-match-row";
import { PageHeader } from "@/components/page-header";
import { LiveRefresh } from "@/components/live-refresh";
import { buildKnockoutBracketLayout } from "@/lib/knockout-bracket-layout";
import { getKnockoutRounds } from "@/lib/queries";
import { getSettings } from "@/lib/scoring";

export default async function KnockoutPage() {
  const [rounds, settings] = await Promise.all([getKnockoutRounds(), getSettings()]);
  const layout = buildKnockoutBracketLayout(rounds);

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
      ) : layout ? (
        <FullBleed className="px-4 md:px-8 xl:px-12">
          <KnockoutBracket layout={layout} />
        </FullBleed>
      ) : (
        <div className="flex flex-col gap-6">
          {rounds.map((round) => (
            <section key={round.stage}>
              <div className="mb-3 flex items-center gap-3">
                <h2 className="display text-2xl uppercase text-ink">{round.label}</h2>
                <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  {round.matches.length} match{round.matches.length === 1 ? "" : "es"}
                </span>
                <span className="h-px flex-1 bg-line" />
              </div>
              <div className="overflow-hidden rounded-2xl bg-card shadow-sm ring-1 ring-black/5">
                <div className="divide-y divide-line">
                  {round.matches.map((m) => (
                    <KnockoutMatchRow key={m.id} match={m} />
                  ))}
                </div>
              </div>
            </section>
          ))}
        </div>
      )}
    </AppShell>
  );
}
