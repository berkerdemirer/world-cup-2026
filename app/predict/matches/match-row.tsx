"use client";

import { useActionState } from "react";
import { submitScorePrediction, type ActionResult } from "@/app/actions/predictions";
import { TeamBadge } from "@/components/team-badge";
import type { MatchWithTeams } from "@/lib/queries";

const initial: ActionResult = { ok: false };

export function MatchRow({
  match,
  locked,
  prediction,
}: {
  match: MatchWithTeams;
  locked: boolean;
  prediction?: { homeScore: number; awayScore: number };
}) {
  const [state, formAction, pending] = useActionState(submitScorePrediction, initial);
  const saved = state.ok && !pending;

  const kickoff = new Date(match.kickoffAt);
  const finished = match.status === "FINISHED";

  return (
    <form
      action={formAction}
      className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2.5"
    >
      <input type="hidden" name="matchId" value={match.id} />

      <div className="min-w-0 justify-self-end">
        <TeamBadge team={match.homeTeam} placeholder={match.homePlaceholder} align="right" />
      </div>

      <div className="flex flex-col items-center">
        {locked ? (
          <div className="flex items-center gap-1 font-mono text-sm">
            <span className="w-7 rounded bg-slate-100 py-1 text-center">
              {prediction ? prediction.homeScore : "–"}
            </span>
            <span className="text-slate-400">:</span>
            <span className="w-7 rounded bg-slate-100 py-1 text-center">
              {prediction ? prediction.awayScore : "–"}
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-1">
            <input
              name="homeScore"
              type="number"
              min={0}
              max={30}
              defaultValue={prediction?.homeScore ?? ""}
              required
              className="w-12 rounded border border-slate-300 py-1 text-center font-mono"
            />
            <span className="text-slate-400">:</span>
            <input
              name="awayScore"
              type="number"
              min={0}
              max={30}
              defaultValue={prediction?.awayScore ?? ""}
              required
              className="w-12 rounded border border-slate-300 py-1 text-center font-mono"
            />
          </div>
        )}
        <span className="mt-1 text-[11px] text-slate-400">
          {finished
            ? `Final ${match.homeScore}–${match.awayScore}`
            : kickoff.toLocaleString(undefined, {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
        </span>
      </div>

      <div className="flex min-w-0 items-center gap-2 justify-self-start">
        <TeamBadge team={match.awayTeam} placeholder={match.awayPlaceholder} align="left" />
      </div>

      {!locked && (
        <div className="col-span-3 flex items-center justify-end gap-2">
          {state.error && <span className="text-xs text-red-600">{state.error}</span>}
          {saved && <span className="text-xs text-green-600">Saved ✓</span>}
          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-slate-900 px-3 py-1 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
          >
            {pending ? "Saving…" : "Save"}
          </button>
        </div>
      )}
    </form>
  );
}
