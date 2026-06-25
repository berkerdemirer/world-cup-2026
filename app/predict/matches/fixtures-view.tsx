"use client";

import { useMemo } from "react";
import { isFixtureActive } from "@/lib/match-status";
import { MatchTable, type MatchPoints, type TableRow } from "./match-table";

export function FixturesView({
  rows,
  points,
}: {
  rows: TableRow[];
  points: MatchPoints;
}) {
  const activeRows = useMemo(
    () => rows.filter((r) => isFixtureActive(r.match)),
    [rows],
  );

  return <MatchTable rows={activeRows} points={points} />;
}
