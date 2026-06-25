"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import type { ScoreTier } from "@/lib/score-tier";
import type { Team } from "@/db/schema";

const TIER_LABEL: Record<ScoreTier, string> = {
  exact: "Exact",
  goal_diff: "+GD",
  outcome: "Result",
  none: "Miss",
};

export type MatchPredictionRow = {
  displayName: string;
  homeScore: number;
  awayScore: number;
  tier: ScoreTier;
  points: number;
};

export type MatchPredictionsData = {
  match: {
    id: number;
    stageLabel: string;
    kickoffAt: string;
    homeScore: number;
    awayScore: number;
    homePens: number | null;
    awayPens: number | null;
    homeTeam: Team | null;
    awayTeam: Team | null;
    homePlaceholder: string | null;
    awayPlaceholder: string | null;
  };
  predictions: MatchPredictionRow[];
};

function teamName(team: Team | null, placeholder: string | null): string {
  return team?.shortName ?? team?.name ?? placeholder ?? "TBD";
}

export function MatchPredictionsDialog({
  matchId,
  data,
  loading,
  error,
  onClose,
}: {
  matchId: number;
  data: MatchPredictionsData | null;
  loading: boolean;
  error: string | null;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const skipCloseRef = useRef(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    dialog.showModal();
    return () => {
      skipCloseRef.current = true;
    };
  }, [matchId]);

  const requestClose = () => {
    skipCloseRef.current = false;
    dialogRef.current?.close();
    onClose();
  };

  const handleDialogClose = () => {
    if (skipCloseRef.current) return;
    onClose();
  };

  const homeName = data ? teamName(data.match.homeTeam, data.match.homePlaceholder) : "";
  const awayName = data ? teamName(data.match.awayTeam, data.match.awayPlaceholder) : "";

  return (
    <dialog
      ref={dialogRef}
      className="m-auto w-[min(100vw-2rem,42rem)] max-h-[min(100vh-2rem,720px)] overflow-hidden rounded-2xl border-0 bg-card p-0 text-ink shadow-xl ring-1 ring-black/10 backdrop:bg-ink/50 open:flex open:flex-col"
      onClose={handleDialogClose}
      onClick={(e) => {
        if (e.target === dialogRef.current) requestClose();
      }}
    >
      <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
        <div className="min-w-0">
          {data && (
            <>
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                {data.match.stageLabel}
              </p>
              <h2 className="display mt-1 text-2xl uppercase leading-none text-ink">
                {homeName} vs {awayName}
              </h2>
              <p className="mt-1.5 text-sm text-muted-foreground">
                Final {data.match.homeScore}&ndash;{data.match.awayScore}
                {data.match.homePens != null && data.match.awayPens != null && (
                  <> · pens {data.match.homePens}&ndash;{data.match.awayPens}</>
                )}
              </p>
            </>
          )}
          {loading && !data && (
            <div className="h-14 w-48 animate-pulse rounded-xl bg-line/60" />
          )}
        </div>
        <button
          type="button"
          onClick={requestClose}
          className="rounded-lg p-2 text-muted-foreground transition hover:bg-line/60 hover:text-ink"
          aria-label="Close"
        >
          <X className="size-5" strokeWidth={2.25} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4">
        {loading && (
          <div className="space-y-2">
            <div className="h-12 animate-pulse rounded-xl bg-line/60" />
            <div className="h-12 animate-pulse rounded-xl bg-line/60" />
            <div className="h-12 animate-pulse rounded-xl bg-line/60" />
          </div>
        )}
        {!loading && error && (
          <p className="rounded-2xl border border-dashed border-line bg-cream/50 p-8 text-center text-sm text-muted-foreground">
            {error}
          </p>
        )}
        {!loading && !error && data && data.predictions.length === 0 && (
          <p className="rounded-2xl border border-dashed border-line bg-cream/50 p-8 text-center text-sm text-muted-foreground">
            Nobody predicted this match.
          </p>
        )}
        {!loading && !error && data && data.predictions.length > 0 && (
          <div className="overflow-hidden rounded-2xl ring-1 ring-black/5">
            <table className="w-full text-sm">
              <thead className="bg-cream/80 text-left text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-2.5">Player</th>
                  <th className="px-4 py-2.5 text-center">Pick</th>
                  <th className="px-4 py-2.5 text-right">Result</th>
                  <th className="px-4 py-2.5 text-right">Pts</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line bg-card">
                {data.predictions.map((p) => (
                  <tr key={p.displayName}>
                    <td className="px-4 py-2.5 font-semibold text-ink">{p.displayName}</td>
                    <td className="px-4 py-2.5 text-center font-mono text-muted-foreground">
                      {p.homeScore}&ndash;{p.awayScore}
                    </td>
                    <td className="px-4 py-2.5 text-right text-muted-foreground">
                      {TIER_LABEL[p.tier]}
                    </td>
                    <td className="px-4 py-2.5 text-right font-semibold tabular-nums text-ink">
                      {p.points}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </dialog>
  );
}
