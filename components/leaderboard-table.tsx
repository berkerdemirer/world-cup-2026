"use client";

import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import type { HistoryItem } from "@/lib/prediction-history";
import {
  DEFAULT_LEADERBOARD_DIRECTION,
  DEFAULT_LEADERBOARD_SORT,
  defaultDirectionForSortKey,
  sortLeaderboardRows,
  type LeaderboardSortKey,
  type SortDirection,
} from "@/lib/leaderboard-sort";
import type { LeaderboardRow } from "@/lib/queries";
import { PlayerPicksDialog } from "@/components/player-picks-dialog";
import { cn } from "@/lib/utils";

export type PointValues = {
  exact: number;
  goalDiff: number;
  outcome: number;
};

function SortableHeader({
  label,
  sortKey,
  activeSortKey,
  direction,
  onSort,
  className,
  title,
}: {
  label: string;
  sortKey: LeaderboardSortKey;
  activeSortKey: LeaderboardSortKey;
  direction: SortDirection;
  onSort: (key: LeaderboardSortKey) => void;
  className?: string;
  title?: string;
}) {
  const active = activeSortKey === sortKey;
  const SortIcon = active ? (direction === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown;

  return (
    <th
      className={className}
      aria-sort={active ? (direction === "asc" ? "ascending" : "descending") : "none"}
    >
      <button
        type="button"
        title={title}
        onClick={() => onSort(sortKey)}
        className={cn(
          "group inline-flex items-center gap-1 rounded-md outline-none transition hover:text-ink focus-visible:ring-2 focus-visible:ring-ring/50",
          active ? "text-ink" : "text-muted-foreground",
        )}
      >
        <span>{label}</span>
        <SortIcon
          strokeWidth={2.5}
          className={cn(
            "size-3.5 shrink-0 transition-colors",
            active
              ? "text-brand"
              : "text-ink/55 group-hover:text-ink/80",
          )}
        />
      </button>
    </th>
  );
}

export function LeaderboardTable({
  rows,
  currentUserId,
  leaderTotal,
  pointValues,
}: {
  rows: LeaderboardRow[];
  currentUserId: string;
  leaderTotal: number;
  pointValues: PointValues;
}) {
  const [selected, setSelected] = useState<LeaderboardRow | null>(null);
  const [history, setHistory] = useState<HistoryItem[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<LeaderboardSortKey>(DEFAULT_LEADERBOARD_SORT);
  const [sortDirection, setSortDirection] =
    useState<SortDirection>(DEFAULT_LEADERBOARD_DIRECTION);

  const sortedRows = useMemo(
    () => sortLeaderboardRows(rows, sortKey, sortDirection, leaderTotal),
    [rows, sortKey, sortDirection, leaderTotal],
  );

  const handleSort = useCallback(
    (key: LeaderboardSortKey) => {
      if (key === sortKey) {
        setSortDirection((currentDirection) => (currentDirection === "asc" ? "desc" : "asc"));
        return;
      }

      setSortKey(key);
      setSortDirection(defaultDirectionForSortKey(key));
    },
    [sortKey],
  );

  const closeDialog = useCallback(() => {
    setSelected(null);
    setHistory(null);
    setError(null);
    setLoading(false);
  }, []);

  const openPlayer = useCallback(async (row: LeaderboardRow) => {
    setSelected(row);
    setHistory(null);
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/players/${row.userId}/picks`);
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "Could not load picks");
      }
      const data = (await res.json()) as { history: HistoryItem[] };
      setHistory(data.history);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load picks");
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <>
      <div className="overflow-hidden rounded-2xl bg-card shadow-sm ring-1 ring-black/5">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                <SortableHeader
                  label="#"
                  sortKey="rank"
                  activeSortKey={sortKey}
                  direction={sortDirection}
                  onSort={handleSort}
                  className="px-3 py-3 sm:px-4"
                />
                <SortableHeader
                  label="Player"
                  sortKey="displayName"
                  activeSortKey={sortKey}
                  direction={sortDirection}
                  onSort={handleSort}
                  className="px-3 py-3 sm:px-4"
                />
                <SortableHeader
                  label="Exact"
                  sortKey="exactCount"
                  activeSortKey={sortKey}
                  direction={sortDirection}
                  onSort={handleSort}
                  className="px-2 py-3 text-center sm:px-3"
                  title={`${pointValues.exact} pts each`}
                />
                <SortableHeader
                  label="+GD"
                  sortKey="goalDiffCount"
                  activeSortKey={sortKey}
                  direction={sortDirection}
                  onSort={handleSort}
                  className="px-2 py-3 text-center sm:px-3"
                  title={`${pointValues.goalDiff} pts each`}
                />
                <SortableHeader
                  label="Outcome"
                  sortKey="outcomeCount"
                  activeSortKey={sortKey}
                  direction={sortDirection}
                  onSort={handleSort}
                  className="px-2 py-3 text-center sm:px-3"
                  title={`Correct winner or draw picks · ${pointValues.outcome} pts each`}
                />
                <SortableHeader
                  label="Match pts"
                  sortKey="matchPoints"
                  activeSortKey={sortKey}
                  direction={sortDirection}
                  onSort={handleSort}
                  className="px-2 py-3 text-center sm:px-3"
                  title="Points from score predictions (Exact + +GD + Outcome)"
                />
                <SortableHeader
                  label="Bracket"
                  sortKey="bracketPoints"
                  activeSortKey={sortKey}
                  direction={sortDirection}
                  onSort={handleSort}
                  className="px-2 py-3 text-center sm:px-3"
                />
                <SortableHeader
                  label="Behind"
                  sortKey="behind"
                  activeSortKey={sortKey}
                  direction={sortDirection}
                  onSort={handleSort}
                  className="hidden px-2 py-3 text-center sm:table-cell sm:px-3"
                />
                <SortableHeader
                  label="Total"
                  sortKey="totalPoints"
                  activeSortKey={sortKey}
                  direction={sortDirection}
                  onSort={handleSort}
                  className="px-3 py-3 text-center sm:px-4"
                />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {sortedRows.map((r) => {
                const isMe = r.userId === currentUserId;
                const medal =
                  r.rank === 1
                    ? "bg-gradient-to-br from-amber-300 to-yellow-500 text-amber-950 shadow-sm ring-1 ring-amber-400/60"
                    : r.rank === 2
                      ? "bg-gradient-to-br from-zinc-200 to-zinc-400 text-zinc-800 ring-1 ring-zinc-300/60"
                      : r.rank === 3
                        ? "bg-gradient-to-br from-orange-300 to-amber-600 text-orange-950 ring-1 ring-orange-400/60"
                        : "text-muted-foreground";
                const gap = leaderTotal - r.totalPoints;
                const matchCheck =
                  r.exactCount * pointValues.exact +
                  r.goalDiffCount * pointValues.goalDiff +
                  r.outcomeCount * pointValues.outcome;

                return (
                  <tr
                    key={r.userId}
                    className={`cursor-pointer transition hover:bg-cream/60 ${isMe ? "bg-brand/10" : ""}`}
                    onClick={() => openPlayer(r)}
                  >
                    <td className="px-3 py-3 sm:px-4">
                      <span
                        className={`grid h-7 w-7 place-items-center rounded-full text-xs font-bold ${medal}`}
                      >
                        {r.rank}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 font-semibold text-ink sm:px-4">
                      {r.displayName}
                      {isMe && (
                        <span className="ml-1.5 rounded bg-brand px-1.5 py-0.5 text-[10px] font-bold uppercase text-brand-foreground">
                          You
                        </span>
                      )}
                    </td>
                    <td className="px-2 py-3 text-center tabular-nums text-muted-foreground sm:px-3">
                      {r.exactCount}
                    </td>
                    <td className="px-2 py-3 text-center tabular-nums text-muted-foreground sm:px-3">
                      {r.goalDiffCount}
                    </td>
                    <td className="px-2 py-3 text-center tabular-nums text-muted-foreground sm:px-3">
                      {r.outcomeCount}
                    </td>
                    <td
                      className="px-2 py-3 text-center tabular-nums text-muted-foreground sm:px-3"
                      title={`${r.exactCount}×${pointValues.exact} + ${r.goalDiffCount}×${pointValues.goalDiff} + ${r.outcomeCount}×${pointValues.outcome} = ${matchCheck}`}
                    >
                      {r.matchPoints}
                    </td>
                    <td className="px-2 py-3 text-center tabular-nums text-muted-foreground sm:px-3">
                      {r.bracketPoints}
                    </td>
                    <td className="hidden px-2 py-3 text-center tabular-nums text-muted-foreground sm:table-cell sm:px-3">
                      {gap === 0 ? "—" : `-${gap}`}
                    </td>
                    <td className="px-3 py-3 text-center sm:px-4">
                      <span
                        className={`display text-lg tabular-nums ${r.rank === 1 ? "text-amber-500" : "text-ink"}`}
                        title={`${r.matchPoints} match pts + ${r.bracketPoints} bracket pts`}
                      >
                        {r.totalPoints}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-muted-foreground">
                    No players yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
        Match pts = Exact ({pointValues.exact}) + +GD ({pointValues.goalDiff}) + Outcome (
        {pointValues.outcome}). Total = Match pts + Bracket pts. Tap a column header to sort, or
        tap a player to see their scored picks.
      </p>

      {selected && (
        <PlayerPicksDialog
          player={selected}
          history={history}
          loading={loading}
          error={error}
          onClose={closeDialog}
        />
      )}
    </>
  );
}
