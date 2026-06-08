/* eslint-disable @next/next/no-img-element */
import type { Team } from "@/db/schema";

export function TeamBadge({
  team,
  placeholder,
  align = "left",
}: {
  team?: Pick<Team, "name" | "tla" | "crestUrl"> | null;
  placeholder?: string | null;
  align?: "left" | "right";
}) {
  const label = team?.name ?? placeholder ?? "TBD";
  const content = (
    <>
      {team?.crestUrl ? (
        <img src={team.crestUrl} alt="" className="h-5 w-5 shrink-0 object-contain" />
      ) : (
        <span className="inline-block h-5 w-5 shrink-0 rounded-full bg-slate-200" />
      )}
      <span className="truncate font-medium text-slate-800">{label}</span>
    </>
  );
  return (
    <span
      className={`flex min-w-0 items-center gap-2 ${
        align === "right" ? "flex-row-reverse text-right" : ""
      }`}
    >
      {content}
    </span>
  );
}

/**
 * Big circular crest used in match cards: round flag/crest with the TLA
 * overlaid, and the team name centered beneath.
 */
export function TeamCrest({
  team,
  placeholder,
}: {
  team?: Pick<Team, "name" | "tla" | "crestUrl"> | null;
  placeholder?: string | null;
}) {
  const name = team?.name ?? placeholder ?? "TBD";
  return (
    <div className="flex min-w-0 flex-1 flex-col items-center gap-2 text-center">
      <span className="grid h-14 w-14 place-items-center overflow-hidden rounded-full bg-white ring-1 ring-black/5">
        {team?.crestUrl ? (
          <img src={team.crestUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="text-[11px] font-bold text-muted-foreground">TBD</span>
        )}
      </span>
      <span className="line-clamp-2 text-sm font-bold leading-tight text-ink">{name}</span>
    </div>
  );
}
