/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { LiveBadge } from "@/components/live-badge";
import { isMatchLive } from "@/lib/match-status";
import type { MatchWithTeams } from "@/lib/queries";

function fmtTime(d: Date): string {
  return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
}

function fmtDate(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" }).toUpperCase();
}

function TeamSide({
  team,
  placeholder,
  score,
  pens,
  isWinner,
  align,
}: {
  team: MatchWithTeams["homeTeam"];
  placeholder: string | null;
  score: number | null;
  pens?: number | null;
  isWinner: boolean;
  align: "left" | "right";
}) {
  const name = team?.shortName ?? team?.name ?? placeholder ?? "TBD";
  const crest = (
    <span className="grid size-7 shrink-0 place-items-center overflow-hidden rounded-full bg-white ring-1 ring-black/5">
      {team?.crestUrl ? (
        <img src={team.crestUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        <span className="text-[8px] font-bold text-muted-foreground">{team?.tla ?? "?"}</span>
      )}
    </span>
  );

  return (
    <div
      className={`flex min-w-0 flex-1 items-center gap-2 ${
        align === "right" ? "flex-row-reverse text-right" : ""
      } ${isWinner ? "font-bold text-ink" : "text-ink/80"}`}
    >
      {crest}
      <span className="truncate text-sm">{name}</span>
      {score != null && (
        <span className="display shrink-0 text-lg tabular-nums">
          {score}
          {pens != null && (
            <span className="ml-0.5 text-[10px] font-bold text-muted-foreground">({pens})</span>
          )}
        </span>
      )}
    </div>
  );
}

export function KnockoutMatchRow({ match }: { match: MatchWithTeams }) {
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
      className={`flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3 transition hover:bg-cream/50 sm:flex-nowrap ${
        live ? "bg-brand/8 ring-1 ring-inset ring-brand/25" : ""
      }`}
    >
      <div className="w-full shrink-0 text-xs font-bold uppercase tracking-wide text-muted-foreground sm:w-[88px]">
        {live ? (
          <>
            <LiveBadge />
            <span className="sm:mt-0.5 sm:block">{fmtTime(kickoff)}</span>
          </>
        ) : (
          <>
            <span className="text-ink">{fmtTime(kickoff)}</span>
            <span className="sm:mt-0.5 sm:block">{fmtDate(kickoff)}</span>
          </>
        )}
      </div>

      <TeamSide
        team={match.homeTeam}
        placeholder={match.homePlaceholder}
        score={hasScore ? match.homeScore : null}
        pens={finished && match.homePens != null ? match.homePens : null}
        isWinner={!!homeWinner}
        align="right"
      />

      <div className="hidden px-1 text-xs font-bold text-muted-foreground sm:block">vs</div>

      <TeamSide
        team={match.awayTeam}
        placeholder={match.awayPlaceholder}
        score={hasScore ? match.awayScore : null}
        pens={finished && match.awayPens != null ? match.awayPens : null}
        isWinner={!!awayWinner}
        align="left"
      />

      <div className="ml-auto shrink-0 text-xs font-semibold text-muted-foreground">
        {finished ? (
          <span className="rounded-full bg-line px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-ink">
            FT
          </span>
        ) : live ? (
          <span className="text-brand-foreground">Live</span>
        ) : (
          <span>Scheduled</span>
        )}
      </div>
    </Link>
  );
}
