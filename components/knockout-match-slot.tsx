/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { LiveBadge } from "@/components/live-badge";
import { isMatchLive } from "@/lib/match-status";
import type { MatchWithTeams } from "@/lib/queries";

function fmtTime(d: Date): string {
  return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
}

function fmtDate(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function TeamLine({
  team,
  placeholder,
  score,
  pens,
  isWinner,
}: {
  team: MatchWithTeams["homeTeam"];
  placeholder: string | null;
  score: number | null;
  pens?: number | null;
  isWinner: boolean;
}) {
  const name = team?.shortName ?? team?.name ?? placeholder ?? "TBD";

  return (
    <div
      className={`flex min-w-0 items-center gap-1.5 rounded-md px-1.5 py-1 ${
        isWinner ? "bg-brand/15 font-bold text-ink" : "text-ink/85"
      }`}
    >
      <span className="grid size-5 shrink-0 place-items-center overflow-hidden rounded-full bg-white ring-1 ring-black/5">
        {team?.crestUrl ? (
          <img src={team.crestUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="text-[7px] font-bold text-muted-foreground">{team?.tla ?? "?"}</span>
        )}
      </span>
      <span className="min-w-0 flex-1 truncate text-xs">{name}</span>
      {score != null && (
        <span className="display shrink-0 text-sm tabular-nums">
          {score}
          {pens != null && (
            <span className="ml-0.5 text-[9px] font-bold text-muted-foreground">({pens})</span>
          )}
        </span>
      )}
    </div>
  );
}

export function KnockoutMatchSlot({ match }: { match: MatchWithTeams }) {
  const kickoff = new Date(match.kickoffAt);
  const live = isMatchLive(match);
  const hasScore = match.homeScore != null && match.awayScore != null;
  const finished = match.status === "FINISHED" && hasScore;
  const homeWinner =
    finished &&
    (match.advancingTeamId === match.homeTeamId ||
      (match.advancingTeamId == null && match.homeScore! > match.awayScore!));
  const awayWinner =
    finished &&
    (match.advancingTeamId === match.awayTeamId ||
      (match.advancingTeamId == null && match.awayScore! > match.homeScore!));

  return (
    <Link
      href={`/matches/${match.id}`}
      className={`block w-full rounded-xl bg-card p-2.5 shadow-sm ring-1 ring-black/5 transition hover:ring-brand/40 ${
        live ? "bg-brand/10 ring-brand/30" : ""
      }`}
    >
      <div className="mb-1.5 flex items-center justify-between gap-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
        {live ? (
          <LiveBadge minute={match.minute} injuryTime={match.injuryTime} />
        ) : (
          <span>
            {fmtDate(kickoff)} · {fmtTime(kickoff)}
          </span>
        )}
        {finished && (
          <span className="rounded-full bg-line px-1.5 py-0.5 text-[9px] text-ink">FT</span>
        )}
      </div>
      <div className="flex flex-col gap-0.5">
        <TeamLine
          team={match.homeTeam}
          placeholder={match.homePlaceholder}
          score={hasScore ? match.homeScore : null}
          pens={finished && match.homePens != null ? match.homePens : null}
          isWinner={!!homeWinner}
        />
        <TeamLine
          team={match.awayTeam}
          placeholder={match.awayPlaceholder}
          score={hasScore ? match.awayScore : null}
          pens={finished && match.awayPens != null ? match.awayPens : null}
          isWinner={!!awayWinner}
        />
      </div>
    </Link>
  );
}
