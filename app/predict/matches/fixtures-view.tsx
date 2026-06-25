"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { PredictionHistoryList } from "@/components/prediction-history-list";
import type { HistoryItem } from "@/lib/prediction-history";
import { isMatchUnplayed } from "@/lib/match-status";
import { cn } from "@/lib/utils";
import { MatchTable, type MatchPoints, type TableRow } from "./match-table";

export type FixturesTab = "upcoming" | "history";

const TABS: { id: FixturesTab; label: string }[] = [
  { id: "upcoming", label: "Upcoming" },
  { id: "history", label: "History" },
];

function parseTab(value: string | null): FixturesTab {
  if (value === "history") return "history";
  return "upcoming";
}

export function FixturesView({
  rows,
  points,
  history,
  unplayedCount,
}: {
  rows: TableRow[];
  points: MatchPoints;
  history: HistoryItem[];
  unplayedCount: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeTab = useMemo(() => parseTab(searchParams.get("tab")), [searchParams]);

  const upcomingRows = useMemo(
    () => rows.filter((r) => isMatchUnplayed(r.match)),
    [rows],
  );

  const selectTab = useCallback(
    (next: FixturesTab) => {
      const params = new URLSearchParams(searchParams.toString());
      if (next === "upcoming") {
        params.delete("tab");
      } else {
        params.set("tab", next);
      }
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  return (
    <div className="flex flex-col gap-4">
      <div
        role="tablist"
        aria-label="Fixtures views"
        className="flex flex-wrap gap-2 rounded-2xl bg-card p-1.5 shadow-sm ring-1 ring-black/5"
      >
        {TABS.map(({ id, label }) => {
          const active = activeTab === id;
          const count = id === "upcoming" ? unplayedCount : history.length;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => selectTab(id)}
              className={cn(
                "inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition",
                active
                  ? "bg-brand text-brand-foreground"
                  : "text-muted-foreground hover:bg-cream hover:text-ink",
              )}
            >
              {label}
              {count > 0 && (
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-xs font-bold",
                    active ? "bg-brand-foreground/15 text-brand-foreground" : "bg-line text-ink",
                  )}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {activeTab === "upcoming" && <MatchTable rows={upcomingRows} points={points} />}
      {activeTab === "history" && <PredictionHistoryList items={history} />}
    </div>
  );
}
