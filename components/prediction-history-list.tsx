"use client";
/* eslint-disable @next/next/no-img-element */

import { useCallback, useState } from "react";
import { createPortal } from "react-dom";
import type { HistoryItem } from "@/lib/prediction-history";
import type { ScoreTier } from "@/lib/score-tier";
import { postExtraTimeScore } from "@/lib/match-result";
import type { Team } from "@/db/schema";
import {
  MatchPredictionsDialog,
  type MatchPredictionsData,
} from "@/components/match-predictions-dialog";

export function PredictionHistoryList({ items }: { items: HistoryItem[] }) {
  const [selectedMatchId, setSelectedMatchId] = useState<number | null>(null);
  const [data, setData] = useState<MatchPredictionsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const closeDialog = useCallback(() => {
    setSelectedMatchId(null);
    setData(null);
    setError(null);
    setLoading(false);
  }, []);

  const openMatch = useCallback(async (matchId: number) => {
    setSelectedMatchId(matchId);
    setData(null);
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/matches/${matchId}/predictions`);
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "Could not load predictions");
      }
      const payload = (await res.json()) as MatchPredictionsData;
      setData(payload);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load predictions");
    } finally {
      setLoading(false);
    }
  }, []);

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-line bg-card/50 p-10 text-center text-muted-foreground">
        No settled predictions yet. Your scored picks will show up here once matches finish.
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-2.5">
        {items.map((item) => (
          <HistoryRow key={item.match.id} item={item} onOpen={() => openMatch(item.match.id)} />
        ))}
      </div>

      {selectedMatchId != null &&
        createPortal(
          <MatchPredictionsDialog
            matchId={selectedMatchId}
            data={data}
            loading={loading}
            error={error}
            onClose={closeDialog}
          />,
          document.body,
        )}
    </>
  );
}

function teamName(team: Team | null | undefined, placeholder?: string | null): string {
  return team?.shortName ?? team?.name ?? placeholder ?? "TBD";
}

function HistoryRow({ item, onOpen }: { item: HistoryItem; onOpen: () => void }) {
  const { match, prediction, tier, points } = item;
  const actual = postExtraTimeScore(match)!;
  const homeName = teamName(match.homeTeam, match.homePlaceholder);
  const awayName = teamName(match.awayTeam, match.awayPlaceholder);

  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full items-center gap-3 rounded-2xl bg-card px-4 py-3 text-left shadow-sm ring-1 ring-black/5 transition hover:bg-cream/60 hover:ring-black/10 md:px-5"
    >
      <div className="flex shrink-0 items-center -space-x-1.5">
        <MiniCrest team={match.homeTeam} placeholder={match.homePlaceholder} />
        <MiniCrest team={match.awayTeam} placeholder={match.awayPlaceholder} />
      </div>

      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold text-ink">
          {homeName} <span className="font-normal text-muted-foreground">vs</span> {awayName}
        </div>
        <div className="mt-0.5 text-xs text-muted-foreground">
          called{" "}
          <span className="font-semibold text-ink">
            {prediction.homeScore}&ndash;{prediction.awayScore}
          </span>
        </div>
      </div>

      <div className="display shrink-0 text-2xl text-ink">
        {actual.home}&ndash;{actual.away}
      </div>

      <ScorePill tier={tier} points={points} />
    </button>
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
