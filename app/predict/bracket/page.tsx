import { AppShell } from "@/components/app-shell";
import { requireUser } from "@/lib/session";
import { getAllTeams, getUserBracketPicks } from "@/lib/queries";
import { getSettings, getBracketLockAt, isBracketLocked } from "@/lib/scoring";
import { BracketPicker, type RoundConfig } from "./bracket-picker";

const ROUNDS: RoundConfig[] = [
  { round: "WINNER", label: "🏆 Champion", pick: 1 },
  { round: "FINAL", label: "Finalists", pick: 2 },
  { round: "SEMI_FINALS", label: "Semi-finalists", pick: 4 },
  { round: "QUARTER_FINALS", label: "Quarter-finalists", pick: 8 },
  { round: "LAST_16", label: "Round of 16", pick: 16 },
];

export default async function BracketPage() {
  const session = await requireUser();
  const [teams, picks, settings] = await Promise.all([
    getAllTeams(),
    getUserBracketPicks(session.userId),
    getSettings(),
  ]);
  const lockAt = await getBracketLockAt(settings);
  const locked = isBracketLocked(lockAt);

  return (
    <AppShell>
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-slate-900">Bracket</h1>
        <p className="text-sm text-slate-500">
          Pick which teams reach each round. Points escalate: R16 {settings.ptsBracketR16} ·
          QF {settings.ptsBracketQf} · SF {settings.ptsBracketSf} · Final {settings.ptsBracketFinal} ·
          Champion {settings.ptsBracketWinner}.
        </p>
        {lockAt && (
          <p className="mt-1 text-sm font-medium text-slate-600">
            {locked
              ? "🔒 Bracket locked — the knockout stage has begun."
              : `Locks at ${lockAt.toLocaleString()} (knockout kickoff).`}
          </p>
        )}
      </div>

      {teams.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
          No teams loaded yet. An admin needs to run a data sync first.
        </div>
      ) : (
        <BracketPicker rounds={ROUNDS} teams={teams} initialPicks={picks} locked={locked} />
      )}
    </AppShell>
  );
}
