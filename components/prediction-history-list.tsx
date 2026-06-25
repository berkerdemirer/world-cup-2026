/* eslint-disable @next/next/no-img-element */
import type { HistoryItem } from "@/lib/prediction-history";
import type { ScoreTier } from "@/lib/score-tier";
import type { Team } from "@/db/schema";

export function PredictionHistoryList({ items }: { items: HistoryItem[] }) {
  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-line bg-card/50 p-10 text-center text-muted-foreground">
        No settled predictions yet. Your scored picks will show up here once matches finish.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2.5">
      {items.map((item) => (
        <HistoryRow key={item.match.id} item={item} />
      ))}
    </div>
  );
}

function HistoryRow({ item }: { item: HistoryItem }) {
  const { match, prediction, tier, points } = item;
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-card px-4 py-3 shadow-sm ring-1 ring-black/5 md:px-5">
      <div className="flex shrink-0 items-center -space-x-1.5">
        <MiniCrest team={match.homeTeam} placeholder={match.homePlaceholder} />
        <MiniCrest team={match.awayTeam} placeholder={match.awayPlaceholder} />
      </div>

      <div className="display shrink-0 text-2xl text-ink">
        {match.homeScore}&ndash;{match.awayScore}
      </div>

      <div className="min-w-0 flex-1 truncate text-sm text-muted-foreground">
        called{" "}
        <span className="font-semibold text-ink">
          {prediction.homeScore}&ndash;{prediction.awayScore}
        </span>
      </div>

      <ScorePill tier={tier} points={points} />
    </div>
  );
}

function MiniCrest({
  team,
  placeholder,
}: {
  team?: Pick<Team, "name" | "tla" | "crestUrl"> | null;
  placeholder?: string | null;
}) {
  const label = team?.tla ?? placeholder?.slice(0, 3).toUpperCase() ?? "TBD";
  return (
    <span className="grid size-9 place-items-center overflow-hidden rounded-full bg-white ring-2 ring-card">
      {team?.crestUrl ? (
        <img src={team.crestUrl} alt={team?.name ?? ""} className="h-full w-full object-cover" />
      ) : (
        <span className="text-[9px] font-bold text-muted-foreground">{label}</span>
      )}
    </span>
  );
}

function ScorePill({ tier, points }: { tier: ScoreTier; points: number }) {
  const p = {
    exact: { cls: "bg-brand text-brand-foreground", pts: `+${points}`, label: "Exact" },
    goal_diff: { cls: "bg-royal text-white", pts: `+${points}`, label: "+GD" },
    outcome: { cls: "bg-line text-ink", pts: `+${points}`, label: "Result" },
    none: { cls: "bg-line/70 text-muted-foreground", pts: "0", label: "Miss" },
  }[tier];
  return (
    <span
      className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold uppercase tracking-wide ${p.cls}`}
    >
      <span className="text-sm font-black normal-case">{p.pts}</span>
      {p.label}
    </span>
  );
}
