import type { Match, MatchStatus, Team } from "@/db/schema";

export interface GroupStandingRow {
  team: Team;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
  points: number;
}

export interface GroupStandings {
  groupLabel: string;
  rows: GroupStandingRow[];
}

const COUNTABLE_STATUSES = new Set<MatchStatus>(["FINISHED", "IN_PLAY", "PAUSED"]);

function compareRows(a: GroupStandingRow, b: GroupStandingRow): number {
  if (b.points !== a.points) return b.points - a.points;
  if (b.goalDiff !== a.goalDiff) return b.goalDiff - a.goalDiff;
  if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
  return a.team.name.localeCompare(b.team.name);
}

/** Derive team → group from group-stage fixtures when teams.groupLabel is unset. */
export function teamGroupMap(
  matches: Pick<Match, "stage" | "groupLabel" | "homeTeamId" | "awayTeamId">[],
  teams: Team[],
): Map<number, string> {
  const fromTeams = new Map(
    teams.filter((t) => t.groupLabel).map((t) => [t.id, t.groupLabel!] as const),
  );
  for (const m of matches) {
    if (m.stage !== "GROUP_STAGE" || !m.groupLabel) continue;
    if (m.homeTeamId != null) fromTeams.set(m.homeTeamId, m.groupLabel);
    if (m.awayTeamId != null) fromTeams.set(m.awayTeamId, m.groupLabel);
  }
  return fromTeams;
}

/**
 * Build group tables from group-stage results. Live matches count with their
 * current score; scheduled fixtures are ignored.
 */
export function computeGroupStandings(
  matches: Pick<
    Match,
    | "stage"
    | "groupLabel"
    | "homeTeamId"
    | "awayTeamId"
    | "status"
    | "homeScore"
    | "awayScore"
  >[],
  teams: Team[],
): GroupStandings[] {
  const groups = new Map<string, Map<number, GroupStandingRow>>();
  const teamById = new Map(teams.map((t) => [t.id, t] as const));
  const teamGroups = teamGroupMap(matches, teams);

  const ensureRow = (teamId: number, groupLabel: string): GroupStandingRow | null => {
    const team = teamById.get(teamId);
    if (!team) return null;
    let group = groups.get(groupLabel);
    if (!group) {
      group = new Map();
      groups.set(groupLabel, group);
    }
    let row = group.get(teamId);
    if (!row) {
      row = {
        team,
        played: 0,
        won: 0,
        drawn: 0,
        lost: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        goalDiff: 0,
        points: 0,
      };
      group.set(teamId, row);
    }
    return row;
  };

  for (const m of matches) {
    if (m.stage !== "GROUP_STAGE" || !m.groupLabel) continue;
    if (!COUNTABLE_STATUSES.has(m.status)) continue;
    if (m.homeScore == null || m.awayScore == null) continue;
    if (m.homeTeamId == null || m.awayTeamId == null) continue;

    const home = ensureRow(m.homeTeamId, m.groupLabel);
    const away = ensureRow(m.awayTeamId, m.groupLabel);
    if (!home || !away) continue;

    home.played++;
    away.played++;
    home.goalsFor += m.homeScore;
    home.goalsAgainst += m.awayScore;
    away.goalsFor += m.awayScore;
    away.goalsAgainst += m.homeScore;

    if (m.homeScore > m.awayScore) {
      home.won++;
      home.points += 3;
      away.lost++;
    } else if (m.homeScore < m.awayScore) {
      away.won++;
      away.points += 3;
      home.lost++;
    } else {
      home.drawn++;
      away.drawn++;
      home.points++;
      away.points++;
    }
  }

  // Include every team assigned to a group, even with zero played.
  for (const team of teams) {
    const label = team.groupLabel ?? teamGroups.get(team.id);
    if (!label) continue;
    ensureRow(team.id, label);
  }

  return [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([groupLabel, rowMap]) => {
      const rows = [...rowMap.values()].map((r) => ({
        ...r,
        goalDiff: r.goalsFor - r.goalsAgainst,
      }));
      rows.sort(compareRows);
      return { groupLabel, rows };
    });
}
