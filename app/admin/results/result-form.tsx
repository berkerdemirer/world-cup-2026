/* eslint-disable @next/next/no-img-element */
"use client";

import { useActionState } from "react";
import { Check } from "lucide-react";
import { adminSetResult, type AdminActionResult } from "@/app/actions/admin";
import type { MatchWithTeams } from "@/lib/queries";
import type { Team } from "@/db/schema";

const initial: AdminActionResult = { ok: false };

function Crest({ team }: { team?: Pick<Team, "name" | "tla" | "crestUrl"> | null }) {
  return (
    <span className="grid size-6 shrink-0 place-items-center overflow-hidden rounded-full bg-white ring-1 ring-black/5">
      {team?.crestUrl ? (
        <img src={team.crestUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        <span className="text-[8px] font-bold text-muted-foreground">{team?.tla ?? "?"}</span>
      )}
    </span>
  );
}

export function ResultForm({ match }: { match: MatchWithTeams }) {
  const [state, action, pending] = useActionState(adminSetResult, initial);
  const isKnockout = match.stage !== "GROUP_STAGE";
  const homeName = match.homeTeam?.name ?? match.homePlaceholder ?? "TBD";
  const awayName = match.awayTeam?.name ?? match.awayPlaceholder ?? "TBD";
  const kickoff = new Date(match.kickoffAt);

  // Keep the uncontrolled score/penalty inputs digit-only (0–99) — strip any
  // stray characters in place so no text can be submitted.
  const onlyDigits = (e: React.FormEvent<HTMLInputElement>) => {
    e.currentTarget.value = e.currentTarget.value.replace(/[^0-9]/g, "").slice(0, 2);
  };
  const numProps = {
    type: "text" as const,
    inputMode: "numeric" as const,
    pattern: "[0-9]*",
    maxLength: 2,
    onInput: onlyDigits,
  };

  const scoreBox =
    "score-box h-9 w-12 rounded-lg border border-line bg-cream text-center font-display text-xl text-ink outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/40";
  const pensBox =
    "score-box h-8 w-10 rounded-md border border-line bg-card text-center text-sm font-semibold text-ink outline-none transition-colors focus:border-ring";

  return (
    <form
      action={action}
      className="flex flex-wrap items-center gap-x-4 gap-y-3 rounded-2xl bg-card px-5 py-4 shadow-sm ring-1 ring-black/5 transition hover:ring-black/10"
    >
      <input type="hidden" name="matchId" value={match.id} />

      {/* Kickoff time/date (the round/day already shows in the section label). */}
      <div className="hidden w-14 shrink-0 sm:block">
        <div className="text-xs font-bold text-ink">
          {kickoff.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false })}
        </div>
        <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          {kickoff.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
        </div>
      </div>

      {/* Matchup: flags hug the scoreboard, names fan out to the sides. */}
      <div className="flex min-w-0 flex-1 items-center justify-center gap-2.5">
        {/* Home team — name then crest, hugging the score on the right. */}
        <div className="flex min-w-0 flex-1 items-center justify-end gap-2 text-right">
          <span className="truncate text-sm font-semibold text-ink">{homeName}</span>
          <Crest team={match.homeTeam} />
        </div>

        {/* Scoreline. */}
        <div className="flex shrink-0 items-center gap-1.5">
          <input
            name="homeScore"
            {...numProps}
            required
            defaultValue={match.homeScore ?? ""}
            aria-label={`${homeName} score`}
            className={scoreBox}
          />
          <span className="text-sm font-bold text-muted-foreground">:</span>
          <input
            name="awayScore"
            {...numProps}
            required
            defaultValue={match.awayScore ?? ""}
            aria-label={`${awayName} score`}
            className={scoreBox}
          />
        </div>

        {/* Away team — crest then name. */}
        <div className="flex min-w-0 flex-1 items-center justify-start gap-2">
          <Crest team={match.awayTeam} />
          <span className="truncate text-sm font-semibold text-ink">{awayName}</span>
        </div>
      </div>

      {/* Knockout extras: penalties + who advances. */}
      {isKnockout && (
        <div className="flex items-center gap-2 rounded-xl bg-cream px-2.5 py-1.5 ring-1 ring-line">
          <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Pens</span>
          <input
            name="homePens"
            {...numProps}
            defaultValue={match.homePens ?? ""}
            placeholder="–"
            aria-label={`${homeName} penalties`}
            className={pensBox}
          />
          <input
            name="awayPens"
            {...numProps}
            defaultValue={match.awayPens ?? ""}
            placeholder="–"
            aria-label={`${awayName} penalties`}
            className={pensBox}
          />
          <select
            name="advancingTeamId"
            defaultValue={match.advancingTeamId ?? ""}
            aria-label="Advancing team"
            className="h-8 rounded-md border border-line bg-card px-2 text-xs font-medium text-ink outline-none transition-colors focus:border-ring"
          >
            <option value="">advances…</option>
            {match.homeTeam && <option value={match.homeTeam.id}>{match.homeTeam.name}</option>}
            {match.awayTeam && <option value={match.awayTeam.id}>{match.awayTeam.name}</option>}
          </select>
        </div>
      )}

      {/* Status + save. */}
      <div className="flex items-center gap-2">
        {match.source === "manual" && (
          <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700 ring-1 ring-amber-200">
            manual
          </span>
        )}
        {state.error && (
          <span className="max-w-[140px] truncate text-xs font-semibold text-red-600" title={state.error}>
            {state.error}
          </span>
        )}
        {state.ok && !pending && (
          <span className="flex items-center gap-1 text-xs font-bold text-ink">
            <Check className="size-3.5" strokeWidth={3} />
            Saved
          </span>
        )}
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-ink px-4 py-2 text-xs font-bold text-white outline-none transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring/60 disabled:opacity-50"
        >
          {pending ? "…" : "Save"}
        </button>
      </div>
    </form>
  );
}
