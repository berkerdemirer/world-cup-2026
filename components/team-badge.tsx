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
