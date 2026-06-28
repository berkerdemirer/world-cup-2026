"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { PredictionHistoryList } from "@/components/prediction-history-list";
import type { HistoryItem } from "@/lib/prediction-history";
import type { LeaderboardRow } from "@/lib/queries";

export function PlayerPicksDialog({
  player,
  history,
  loading,
  error,
  onClose,
}: {
  player: LeaderboardRow;
  history: HistoryItem[] | null;
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
  }, [player.userId]);

  const requestClose = () => {
    skipCloseRef.current = false;
    dialogRef.current?.close();
    onClose();
  };

  const handleDialogClose = () => {
    if (skipCloseRef.current) return;
    onClose();
  };

  return createPortal(
    <dialog
      ref={dialogRef}
      className="m-auto w-[min(100vw-2rem,42rem)] max-h-[min(100vh-2rem,720px)] overflow-hidden rounded-2xl border-0 bg-card p-0 text-ink shadow-xl ring-1 ring-black/10 backdrop:bg-ink/50"
      onClose={handleDialogClose}
      onClick={(e) => {
        if (e.target === dialogRef.current) requestClose();
      }}
    >
      <div className="flex max-h-[min(100vh-2rem,720px)] flex-col">
        <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div>
            <h2 className="display text-2xl uppercase leading-none text-ink">{player.displayName}</h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {player.totalPoints} pts · {history?.length ?? 0} scored pick
              {(history?.length ?? 0) === 1 ? "" : "s"}
            </p>
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

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {loading && (
            <div className="space-y-2.5">
              <div className="h-16 animate-pulse rounded-2xl bg-line/60" />
              <div className="h-16 animate-pulse rounded-2xl bg-line/60" />
              <div className="h-16 animate-pulse rounded-2xl bg-line/60" />
            </div>
          )}
          {!loading && error && (
            <p className="rounded-2xl border border-dashed border-line bg-cream/50 p-8 text-center text-sm text-muted-foreground">
              {error}
            </p>
          )}
          {!loading && !error && history && (
            <>
              <p className="mb-3 text-xs text-muted-foreground">
                Tap a match to see everyone&apos;s picks.
              </p>
              <PredictionHistoryList items={history} />
            </>
          )}
        </div>
      </div>
    </dialog>,
    document.body,
  );
}
