import "server-only";
import { asc, eq, desc } from "drizzle-orm";
import { db } from "@/db";
import {
  matches,
  teams,
  scores,
  users,
  scorePredictions,
  bracketPredictions,
  type Match,
  type Team,
  type BracketRound,
  type Stage,
} from "@/db/schema";
import { computeGroupStandings, type GroupStandings } from "@/lib/group-standings";
import { buildPredictionHistory, type HistoryItem } from "@/lib/prediction-history";
import { getSettings } from "@/lib/scoring";
import { KNOCKOUT_STAGES, STAGE_LABELS } from "@/lib/format";

export interface MatchWithTeams extends Match {
  homeTeam: Team | null;
  awayTeam: Team | null;
}

/** All matches ordered by kickoff, with home/away team rows joined in. */
export async function getMatchesWithTeams(): Promise<MatchWithTeams[]> {
  const rows = await db
    .select()
    .from(matches)
    .orderBy(asc(matches.kickoffAt), asc(matches.id));
  const teamRows = await db.select().from(teams);
  const teamById = new Map(teamRows.map((t) => [t.id, t] as const));
  return rows.map((m) => ({
    ...m,
    homeTeam: m.homeTeamId != null ? teamById.get(m.homeTeamId) ?? null : null,
    awayTeam: m.awayTeamId != null ? teamById.get(m.awayTeamId) ?? null : null,
  }));
}

export async function getMatchWithTeams(id: number): Promise<MatchWithTeams | null> {
  const [m] = await db.select().from(matches).where(eq(matches.id, id)).limit(1);
  if (!m) return null;
  const teamRows = await db.select().from(teams);
  const teamById = new Map(teamRows.map((t) => [t.id, t] as const));
  return {
    ...m,
    homeTeam: m.homeTeamId != null ? teamById.get(m.homeTeamId) ?? null : null,
    awayTeam: m.awayTeamId != null ? teamById.get(m.awayTeamId) ?? null : null,
  };
}

export async function getUserScorePredictions(
  userId: string,
): Promise<Map<number, { homeScore: number; awayScore: number }>> {
  const rows = await db
    .select()
    .from(scorePredictions)
    .where(eq(scorePredictions.userId, userId));
  return new Map(rows.map((r) => [r.matchId, { homeScore: r.homeScore, awayScore: r.awayScore }]));
}

export interface LeaderboardRow {
  userId: string;
  displayName: string;
  totalPoints: number;
  matchPoints: number;
  bracketPoints: number;
  exactCount: number;
  goalDiffCount: number;
  outcomeCount: number;
  rank: number;
}

/** Leaderboard ordered by total, then exact count, then join time. */
export async function getLeaderboard(): Promise<LeaderboardRow[]> {
  const rows = await db
    .select({
      userId: users.id,
      displayName: users.displayName,
      createdAt: users.createdAt,
      totalPoints: scores.totalPoints,
      matchPoints: scores.matchPoints,
      bracketPoints: scores.bracketPoints,
      exactCount: scores.exactCount,
      goalDiffCount: scores.goalDiffCount,
      outcomeCount: scores.outcomeCount,
    })
    .from(users)
    .leftJoin(scores, eq(scores.userId, users.id))
    .orderBy(
      desc(scores.totalPoints),
      desc(scores.exactCount),
      asc(users.createdAt),
    );

  return rows.map((r, i) => ({
    userId: r.userId,
    displayName: r.displayName,
    totalPoints: r.totalPoints ?? 0,
    matchPoints: r.matchPoints ?? 0,
    bracketPoints: r.bracketPoints ?? 0,
    exactCount: r.exactCount ?? 0,
    goalDiffCount: r.goalDiffCount ?? 0,
    outcomeCount: r.outcomeCount ?? 0,
    rank: i + 1,
  }));
}

/** Settled score predictions for one player (leaderboard drill-down). */
export async function getUserPredictionHistory(
  userId: string,
): Promise<{ displayName: string; history: HistoryItem[] } | null> {
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) return null;

  const [allMatches, predictions, settings] = await Promise.all([
    getMatchesWithTeams(),
    getUserScorePredictions(userId),
    getSettings(),
  ]);

  return {
    displayName: user.displayName,
    history: buildPredictionHistory(allMatches, predictions, settings),
  };
}

export interface MatchPredictionRow {
  displayName: string;
  homeScore: number;
  awayScore: number;
}

/** Everyone's score predictions for one match (only reveal after kickoff). */
export async function getMatchPredictions(matchId: number): Promise<MatchPredictionRow[]> {
  return db
    .select({
      displayName: users.displayName,
      homeScore: scorePredictions.homeScore,
      awayScore: scorePredictions.awayScore,
    })
    .from(scorePredictions)
    .innerJoin(users, eq(users.id, scorePredictions.userId))
    .where(eq(scorePredictions.matchId, matchId))
    .orderBy(asc(users.displayName));
}

export function isMatchLocked(m: Pick<Match, "kickoffAt" | "status">): boolean {
  if (m.status !== "SCHEDULED" && m.status !== "TIMED") return true;
  return Date.now() >= new Date(m.kickoffAt).getTime();
}

export async function getAllTeams(): Promise<Team[]> {
  return db.select().from(teams).orderBy(asc(teams.groupLabel), asc(teams.name));
}

export async function getGroupStandings(): Promise<GroupStandings[]> {
  const [allMatches, allTeams] = await Promise.all([getMatchesWithTeams(), getAllTeams()]);
  return computeGroupStandings(allMatches, allTeams);
}

export interface KnockoutRound {
  stage: Stage;
  label: string;
  matches: MatchWithTeams[];
}

/** Knockout fixtures grouped by round (R32 → Final). */
export async function getKnockoutRounds(): Promise<KnockoutRound[]> {
  const all = await getMatchesWithTeams();
  const knockout = all.filter((m) => KNOCKOUT_STAGES.includes(m.stage));
  const byStage = new Map<Stage, MatchWithTeams[]>();
  for (const m of knockout) {
    (byStage.get(m.stage) ?? byStage.set(m.stage, []).get(m.stage)!).push(m);
  }
  return KNOCKOUT_STAGES.filter((stage) => byStage.has(stage)).map((stage) => ({
    stage,
    label: STAGE_LABELS[stage],
    matches: byStage.get(stage)!,
  }));
}

/** The user's bracket picks grouped by round: round -> picked team ids. */
export async function getUserBracketPicks(
  userId: string,
): Promise<Record<BracketRound, number[]>> {
  const rows = await db
    .select()
    .from(bracketPredictions)
    .where(eq(bracketPredictions.userId, userId));
  const out: Partial<Record<BracketRound, number[]>> = {};
  for (const r of rows) {
    (out[r.round] ??= []).push(r.pickedTeamId);
  }
  return out as Record<BracketRound, number[]>;
}
