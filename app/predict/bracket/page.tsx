import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { requireUser } from "@/lib/session";
import { getAllTeams, getUserBracketPicks, getMatchesWithTeams } from "@/lib/queries";
import {
  getSettings,
  getBracketLockAt,
  isBracketLocked,
  teamsReachingRounds,
  teamsEliminatedFromKnockout,
  teamsOutOfBracketRound,
} from "@/lib/scoring";
import type { BracketRound } from "@/db/schema";
import { BracketPicker, type RoundConfig } from "./bracket-picker";
import { BracketLockBanner } from "./bracket-lock-banner";

export default async function BracketPage() {
  const session = await requireUser();
  const [teams, picks, settings, matches] = await Promise.all([
    getAllTeams(),
    getUserBracketPicks(session.userId),
    getSettings(),
    getMatchesWithTeams(),
  ]);
  const lockAt = await getBracketLockAt(settings);
  const locked = isBracketLocked(lockAt);

  const reachedMap = teamsReachingRounds(matches);
  const knockoutEliminated = teamsEliminatedFromKnockout(matches);
  const allTeamIds = teams.map((t) => t.id);

  const roundResults: Record<
    string,
    { reached: number[]; outOfRound: number[] }
  > = {};
  for (const round of [
    "LAST_16",
    "QUARTER_FINALS",
    "SEMI_FINALS",
    "FINAL",
    "WINNER",
  ] as BracketRound[]) {
    roundResults[round] = {
      reached: [...(reachedMap.get(round) ?? [])],
      outOfRound: [...teamsOutOfBracketRound(round, allTeamIds, reachedMap, knockoutEliminated)],
    };
  }

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

      {lockAt && <BracketLockBanner lockAt={lockAt.toISOString()} serverLocked={locked} />}

      {teams.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-card/50 p-10 text-center text-muted-foreground">
          No teams loaded yet. An admin needs to run a data sync first.
        </div>
      ) : (
        <BracketPicker
          rounds={rounds}
          teams={teams}
          initialPicks={picks}
          roundResults={roundResults}
          lockAt={lockAt?.toISOString() ?? null}
          serverLocked={locked}
        />
      )}
    </AppShell>
  );
}
