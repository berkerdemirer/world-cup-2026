"use client";

import { useMemo } from "react";
import { isMatchUnplayed } from "@/lib/match-status";
import { MatchTable, type MatchPoints, type TableRow } from "./match-table";

export function FixturesView({
  rows,
  points,
}: {
  rows: TableRow[];
  points: MatchPoints;
}) {
  const upcomingRows = useMemo(
    () => rows.filter((r) => isMatchUnplayed(r.match)),
    [rows],
  );

  return <MatchTable rows={upcomingRows} points={points} />;
}
