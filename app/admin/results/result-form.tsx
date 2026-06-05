"use client";

import { useActionState } from "react";
import { adminSetResult, type AdminActionResult } from "@/app/actions/admin";
import type { MatchWithTeams } from "@/lib/queries";

const initial: AdminActionResult = { ok: false };

export function ResultForm({ match }: { match: MatchWithTeams }) {
  const [state, action, pending] = useActionState(adminSetResult, initial);
  const isKnockout = match.stage !== "GROUP_STAGE";

  return (
    <form
      action={action}
      className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
    >
      <input type="hidden" name="matchId" value={match.id} />
      <span className="w-40 truncate font-medium text-slate-700">
        {match.homeTeam?.name ?? match.homePlaceholder ?? "TBD"}
      </span>
      <input
        name="homeScore"
        type="number"
        min={0}
        required
        defaultValue={match.homeScore ?? ""}
        className="w-12 rounded border border-slate-300 py-1 text-center"
      />
      <span className="text-slate-400">:</span>
      <input
        name="awayScore"
        type="number"
        min={0}
        required
        defaultValue={match.awayScore ?? ""}
        className="w-12 rounded border border-slate-300 py-1 text-center"
      />
      <span className="w-40 truncate font-medium text-slate-700">
        {match.awayTeam?.name ?? match.awayPlaceholder ?? "TBD"}
      </span>

      {isKnockout && (
        <>
          <span className="text-xs text-slate-400">pens</span>
          <input
            name="homePens"
            type="number"
            min={0}
            defaultValue={match.homePens ?? ""}
            placeholder="–"
            className="w-12 rounded border border-slate-300 py-1 text-center"
          />
          <input
            name="awayPens"
            type="number"
            min={0}
            defaultValue={match.awayPens ?? ""}
            placeholder="–"
            className="w-12 rounded border border-slate-300 py-1 text-center"
          />
          <select
            name="advancingTeamId"
            defaultValue={match.advancingTeamId ?? ""}
            className="rounded border border-slate-300 py-1 text-xs"
          >
            <option value="">advances…</option>
            {match.homeTeam && <option value={match.homeTeam.id}>{match.homeTeam.name}</option>}
            {match.awayTeam && <option value={match.awayTeam.id}>{match.awayTeam.name}</option>}
          </select>
        </>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-slate-900 px-3 py-1 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
      >
        {pending ? "…" : "Save"}
      </button>
      {match.source === "manual" && (
        <span className="text-xs text-amber-600">manual</span>
      )}
      {state.error && <span className="text-xs text-red-600">{state.error}</span>}
      {state.ok && <span className="text-xs text-green-600">✓</span>}
    </form>
  );
}
