import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { requireUser } from "@/lib/session";
import { getAllTeams, getUserBracketPicks } from "@/lib/queries";
import { getSettings, getBracketLockAt, isBracketLocked } from "@/lib/scoring";
import { Lock } from "lucide-react";
import { BracketPicker, type RoundConfig } from "./bracket-picker";

export default async function BracketPage() {
  const session = await requireUser();
  const [teams, picks, settings] = await Promise.all([
    getAllTeams(),
    getUserBracketPicks(session.userId),
    getSettings(),
  ]);
  const lockAt = await getBracketLockAt(settings);
  const locked = isBracketLocked(lockAt);

  const rounds: RoundConfig[] = [
    { round: "LAST_16", label: "Round of 16", pick: 16, points: settings.ptsBracketR16 },
    { round: "QUARTER_FINALS", label: "Quarter-finalists", pick: 8, points: settings.ptsBracketQf },
    { round: "SEMI_FINALS", label: "Semi-finalists", pick: 4, points: settings.ptsBracketSf },
    { round: "FINAL", label: "Finalists", pick: 2, points: settings.ptsBracketFinal },
    { round: "WINNER", label: "Champion", pick: 1, points: settings.ptsBracketWinner },
  ];

  return (
    <AppShell>
      <PageHeader
        title="Bracket"
        subtitle="Pick which teams reach each round. Later rounds score more per correct team."
      />

      {lockAt && (
        <div
          className={`mb-6 flex items-center gap-2.5 rounded-2xl px-4 py-3 text-sm font-medium ${
            locked
              ? "bg-ink text-white"
              : "bg-amber-50 text-amber-900 ring-1 ring-amber-200"
          }`}
        >
          <Lock className="size-4 shrink-0" />
          {locked ? (
            <span>Bracket locked — the knockout stage has begun.</span>
          ) : (
            <span>
              Picks lock on{" "}
              <span className="font-bold">
                {lockAt.toLocaleDateString("en-US", { month: "short", day: "numeric" })} at{" "}
                {lockAt.toLocaleTimeString("en-US", {
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: false,
                })}
              </span>{" "}
              (knockout kickoff). Make your picks before then.
            </span>
          )}
        </div>
      )}

      {teams.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-card/50 p-10 text-center text-muted-foreground">
          No teams loaded yet. An admin needs to run a data sync first.
        </div>
      ) : (
        <BracketPicker rounds={rounds} teams={teams} initialPicks={picks} locked={locked} />
      )}
    </AppShell>
  );
}
