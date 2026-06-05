import { eq, sql as dsql } from "drizzle-orm";
import { db } from "@/db";
import {
  matches,
  scorePredictions,
  bracketPredictions,
  scores,
  settings,
  type Settings,
  type Match,
  type BracketRound,
} from "@/db/schema";

export type ScoreTier = "exact" | "goal_diff" | "outcome" | "none";

/**
 * Determine the highest matching scoring tier for a single match prediction.
 * Tiers are mutually exclusive — the highest applicable one is awarded.
 */
export function scoreTier(
  predHome: number,
  predAway: number,
  actualHome: number,
  actualAway: number,
): ScoreTier {
  if (predHome === actualHome && predAway === actualAway) return "exact";

  const predDiff = predHome - predAway;
  const actualDiff = actualHome - actualAway;

  // Correct goal difference: same margin AND same winner (covers draws of a
  // different scoreline, since both diffs are 0).
  if (predDiff === actualDiff) return "goal_diff";

  // Correct outcome (tendency): right side wins / right draw, wrong margin.
  if (Math.sign(predDiff) === Math.sign(actualDiff)) return "outcome";

  return "none";
}

export function pointsForTier(tier: ScoreTier, s: Settings): number {
  switch (tier) {
    case "exact":
      return s.ptsExact;
    case "goal_diff":
      return s.ptsGoalDiff;
    case "outcome":
      return s.ptsOutcome;
    default:
      return 0;
  }
}

export function bracketPointsForRound(round: BracketRound, s: Settings): number {
  switch (round) {
    case "LAST_32":
      return s.ptsBracketR32;
    case "LAST_16":
      return s.ptsBracketR16;
    case "QUARTER_FINALS":
      return s.ptsBracketQf;
    case "SEMI_FINALS":
      return s.ptsBracketSf;
    case "FINAL":
      return s.ptsBracketFinal;
    case "WINNER":
      return s.ptsBracketWinner;
    default:
      return 0;
  }
}

/** Bracket slot id used both for fixtures and predictions, e.g. "QUARTER_FINALS:QF1". */
export function bracketSlotKey(round: BracketRound, slot: string): string {
  return `${round}:${slot}`;
}

// ---------------------------------------------------------------------------
// Lock rules (server-enforced)
// ---------------------------------------------------------------------------

export class LockedError extends Error {
  constructor(message = "Predictions are locked.") {
    super(message);
    this.name = "LockedError";
  }
}

/** A match score prediction locks at kickoff. */
export function assertMatchOpen(match: Pick<Match, "kickoffAt" | "status">): void {
  if (match.status !== "SCHEDULED" && match.status !== "TIMED") {
    throw new LockedError("This match has already started.");
  }
  if (Date.now() >= new Date(match.kickoffAt).getTime()) {
    throw new LockedError("This match has kicked off; predictions are locked.");
  }
}

/** The bracket locks globally at the knockout start time. */
export function isBracketLocked(lockAt: Date | null): boolean {
  return !!lockAt && Date.now() >= lockAt.getTime();
}

export function assertBracketOpen(lockAt: Date | null): void {
  if (isBracketLocked(lockAt)) {
    throw new LockedError("The bracket is locked — the knockout stage has begun.");
  }
}

/** Effective bracket lock time: explicit setting, else first LAST_32 kickoff. */
export async function getBracketLockAt(s: Settings): Promise<Date | null> {
  if (s.bracketLockAt) return new Date(s.bracketLockAt);
  const [first] = await db
    .select({ kickoffAt: matches.kickoffAt })
    .from(matches)
    .where(eq(matches.stage, "LAST_32"))
    .orderBy(matches.kickoffAt)
    .limit(1);
  return first ? new Date(first.kickoffAt) : null;
}

export async function getSettings(): Promise<Settings> {
  const [row] = await db.select().from(settings).where(eq(settings.id, 1)).limit(1);
  if (!row) {
    const [created] = await db.insert(settings).values({ id: 1 }).returning();
    return created;
  }
  return row;
}

async function allMatches(): Promise<Match[]> {
  return db.select().from(matches);
}

/**
 * For each bracket round, the set of team ids that actually reached it.
 * "Reached round R" = appears as a participant in a stage-R match. The
 * tournament WINNER is the advancing team of the FINAL.
 */
export function teamsReachingRounds(all: Match[]): Map<BracketRound, Set<number>> {
  const result = new Map<BracketRound, Set<number>>();
  const add = (round: BracketRound, teamId: number | null) => {
    if (teamId == null) return;
    let set = result.get(round);
    if (!set) {
      set = new Set<number>();
      result.set(round, set);
    }
    set.add(teamId);
  };

  const stageToRound: Partial<Record<string, BracketRound>> = {
    LAST_32: "LAST_32",
    LAST_16: "LAST_16",
    QUARTER_FINALS: "QUARTER_FINALS",
    SEMI_FINALS: "SEMI_FINALS",
    FINAL: "FINAL",
  };

  for (const m of all) {
    const round = stageToRound[m.stage];
    if (round) {
      add(round, m.homeTeamId);
      add(round, m.awayTeamId);
    }
    if (m.stage === "FINAL") {
      add("WINNER", m.advancingTeamId);
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// Full leaderboard recompute (cheap at colleague scale; avoids incremental bugs)
// ---------------------------------------------------------------------------

export async function recomputeScores(): Promise<void> {
  const s = await getSettings();

  const finished = await db
    .select()
    .from(matches)
    .where(eq(matches.status, "FINISHED"));

  const finishedById = new Map(finished.map((m) => [m.id, m] as const));

  const allScorePreds = await db.select().from(scorePredictions);
  const allBracketPreds = await db.select().from(bracketPredictions);

  type Agg = { match: number; bracket: number; exact: number };
  const byUser = new Map<string, Agg>();
  const ensure = (uid: string): Agg => {
    let a = byUser.get(uid);
    if (!a) {
      a = { match: 0, bracket: 0, exact: 0 };
      byUser.set(uid, a);
    }
    return a;
  };

  for (const p of allScorePreds) {
    const m = finishedById.get(p.matchId);
    if (!m || m.homeScore == null || m.awayScore == null) continue;
    const tier = scoreTier(p.homeScore, p.awayScore, m.homeScore, m.awayScore);
    const agg = ensure(p.userId);
    agg.match += pointsForTier(tier, s);
    if (tier === "exact") agg.exact += 1;
  }

  // Bracket scoring uses a "teams that reached each round" model, which is
  // robust to how/when knockout slots resolve in the API. A team "reached"
  // round R if it appears as a participant in any match of stage R. The
  // tournament WINNER is the advancingTeamId of the FINAL match.
  const reached = teamsReachingRounds(await allMatches());

  for (const p of allBracketPreds) {
    const set = reached.get(p.round);
    if (!set) continue;
    if (set.has(p.pickedTeamId)) {
      ensure(p.userId).bracket += bracketPointsForRound(p.round, s);
    }
  }

  // Upsert every user's aggregate (including those at 0 already present).
  const existing = await db.select({ userId: scores.userId }).from(scores);
  for (const e of existing) ensure(e.userId);

  for (const [userId, a] of byUser) {
    await db
      .insert(scores)
      .values({
        userId,
        matchPoints: a.match,
        bracketPoints: a.bracket,
        totalPoints: a.match + a.bracket,
        exactCount: a.exact,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: scores.userId,
        set: {
          matchPoints: a.match,
          bracketPoints: a.bracket,
          totalPoints: a.match + a.bracket,
          exactCount: a.exact,
          updatedAt: new Date(),
        },
      });
  }
}

// Re-export to keep a single import site for callers that touch scoring.
export { dsql };
