import { test } from "node:test";
import assert from "node:assert/strict";
import { computeGroupStandings, teamGroupMap } from "./group-standings";
import type { Match, Team } from "@/db/schema";

function team(id: number, name: string, groupLabel?: string): Team {
  return {
    id,
    name,
    shortName: name,
    tla: name.slice(0, 3).toUpperCase(),
    crestUrl: null,
    groupLabel: groupLabel ?? null,
  };
}

function match(
  overrides: Partial<Match> & Pick<Match, "id" | "homeTeamId" | "awayTeamId" | "groupLabel">,
): Match {
  return {
    stage: "GROUP_STAGE",
    matchday: 1,
    homePlaceholder: null,
    awayPlaceholder: null,
    kickoffAt: new Date("2026-06-15T18:00:00Z"),
    status: "FINISHED",
    homeScore: 0,
    awayScore: 0,
    homePens: null,
    awayPens: null,
    minute: null,
    injuryTime: null,
    advancingTeamId: null,
    source: "api",
    updatedAt: new Date(),
    ...overrides,
  };
}

test("computeGroupStandings ranks by points then goal difference", () => {
  const teams = [
    team(1, "Brazil", "A"),
    team(2, "Serbia", "A"),
    team(3, "Spain", "A"),
    team(4, "Croatia", "A"),
  ];
  const matches = [
    match({ id: 1, homeTeamId: 1, awayTeamId: 2, groupLabel: "A", homeScore: 2, awayScore: 0 }),
    match({ id: 2, homeTeamId: 3, awayTeamId: 4, groupLabel: "A", homeScore: 1, awayScore: 1 }),
    match({ id: 3, homeTeamId: 1, awayTeamId: 3, groupLabel: "A", homeScore: 1, awayScore: 0 }),
  ];

  const [groupA] = computeGroupStandings(matches, teams);
  assert.equal(groupA.groupLabel, "A");
  assert.deepEqual(
    groupA.rows.map((r) => r.team.id),
    [1, 4, 3, 2],
  );
  assert.equal(groupA.rows[0].points, 6);
  assert.equal(groupA.rows[0].goalDiff, 3);
});

test("computeGroupStandings includes live matches with current score", () => {
  const teams = [team(1, "Brazil", "B"), team(2, "Serbia", "B")];
  const matches = [
    match({
      id: 1,
      homeTeamId: 1,
      awayTeamId: 2,
      groupLabel: "B",
      status: "IN_PLAY",
      homeScore: 2,
      awayScore: 1,
    }),
  ];

  const [groupB] = computeGroupStandings(matches, teams);
  assert.equal(groupB.rows[0].team.id, 1);
  assert.equal(groupB.rows[0].played, 1);
  assert.equal(groupB.rows[0].points, 3);
});

test("computeGroupStandings ignores scheduled fixtures", () => {
  const teams = [team(1, "Brazil", "C"), team(2, "Serbia", "C")];
  const matches = [
    match({
      id: 1,
      homeTeamId: 1,
      awayTeamId: 2,
      groupLabel: "C",
      status: "TIMED",
      homeScore: null,
      awayScore: null,
    }),
  ];

  const [groupC] = computeGroupStandings(matches, teams);
  assert.equal(groupC.rows[0].played, 0);
  assert.equal(groupC.rows[0].points, 0);
});

test("teamGroupMap infers groups from fixtures when team rows lack groupLabel", () => {
  const teams = [team(1, "Brazil"), team(2, "Serbia")];
  const matches = [
    match({ id: 1, homeTeamId: 1, awayTeamId: 2, groupLabel: "D" }),
  ];

  const map = teamGroupMap(matches, teams);
  assert.equal(map.get(1), "D");
  assert.equal(map.get(2), "D");
});
