import { eq, inArray, sql as dsql } from "drizzle-orm";
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

// scoreTier lives in a DB-free module so it can be shared with client code.
import { scoreTier, type ScoreTier } from "./score-tier";
import { bracketLockGraceUntil, isBracketLocked, latestBracketLockAt } from "./bracket-lock";
import { postExtraTimeScore, advancingTeamFromResult } from "./match-result";
export { scoreTier, type ScoreTier };
export { isBracketLocked };

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
export function assertBracketOpen(lockAt: Date | null): void {
  if (isBracketLocked(lockAt)) {
    throw new LockedError("The bracket is locked — the knockout stage has begun.");
  }
}

function bracketLockAtFromEnv(): Date | null {
  const raw = process.env.BRACKET_LOCK_AT?.trim();
  if (!raw) return null;
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

async function getDerivedBracketLockAt(): Promise<Date | null> {
  const [first] = await db
    .select({ kickoffAt: matches.kickoffAt })
    .from(matches)
    .where(
      inArray(matches.stage, [
        "LAST_32",
        "LAST_16",
        "QUARTER_FINALS",
        "SEMI_FINALS",
        "FINAL",
      ]),
    )
    .orderBy(matches.kickoffAt)
    .limit(1);
  return first ? new Date(first.kickoffAt) : null;
}

/**
 * Effective bracket lock time: the latest of the derived knockout start, an
 * explicit admin setting, BRACKET_LOCK_AT env, and any one-off grace period.
 * Falling back to *all* knockout stages (not just LAST_32) means the lock still
 * fires if the feed labels the first round differently or hasn't scheduled it
 * yet — it can never silently stay open once knockout fixtures exist unless a
 * later override extends the deadline.
 */
export async function getBracketLockAt(s: Settings): Promise<Date | null> {
  const derived = await getDerivedBracketLockAt();
  const explicit = s.bracketLockAt ? new Date(s.bracketLockAt) : null;
  return latestBracketLockAt(
    derived,
    explicit,
    bracketLockAtFromEnv(),
    bracketLockGraceUntil(),
  );
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
 * "Reached round R" = appears as a participant in a stage-R match, or
 * advanced into R from the previous knockout round. The tournament WINNER is
 * the advancing team of the FINAL.
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

  const nextRound: Partial<Record<BracketRound, BracketRound>> = {
    LAST_32: "LAST_16",
    LAST_16: "QUARTER_FINALS",
    QUARTER_FINALS: "SEMI_FINALS",
    SEMI_FINALS: "FINAL",
    FINAL: "WINNER",
  };

  for (const m of all) {
    const round = stageToRound[m.stage];
    if (round) {
      add(round, m.homeTeamId);
      add(round, m.awayTeamId);
      if (m.status === "FINISHED") {
        const advancer = advancingTeamFromResult({
          homeTeamId: m.homeTeamId,
          awayTeamId: m.awayTeamId,
          homeScore: m.homeScore,
          awayScore: m.awayScore,
          homePens: m.homePens,
          awayPens: m.awayPens,
        });
        const next = nextRound[round];
        if (next && advancer != null) add(next, advancer);
      }
    }
  }
  return result;
}

/** How many teams participate in each knockout bracket round. */
export const BRACKET_ROUND_CAPACITY: Partial<Record<BracketRound, number>> = {
  LAST_32: 32,
  LAST_16: 16,
  QUARTER_FINALS: 8,
  SEMI_FINALS: 4,
  FINAL: 2,
  WINNER: 1,
};

const PREV_BRACKET_ROUND: Partial<Record<BracketRound, BracketRound>> = {
  LAST_16: "LAST_32",
  QUARTER_FINALS: "LAST_16",
  SEMI_FINALS: "QUARTER_FINALS",
  FINAL: "SEMI_FINALS",
  WINNER: "FINAL",
};

/** Losers of finished knockout ties — they cannot reach any later round. */
export function teamsEliminatedFromKnockout(all: Match[]): Set<number> {
  const eliminated = new Set<number>();
  for (const m of all) {
    if (m.stage === "GROUP_STAGE" || m.status !== "FINISHED") continue;
    if (m.homeTeamId == null || m.awayTeamId == null) continue;
    const adv = advancingTeamFromResult({
      homeTeamId: m.homeTeamId,
      awayTeamId: m.awayTeamId,
      homeScore: m.homeScore,
      awayScore: m.awayScore,
      homePens: m.homePens,
      awayPens: m.awayPens,
    });
    if (adv == null) continue;
    eliminated.add(adv === m.homeTeamId ? m.awayTeamId : m.homeTeamId);
  }
  return eliminated;
}

/**
 * Teams that can no longer reach `round` — knockout losers plus anyone
 * missing from a previous round once that round's field is full.
 */
export function teamsOutOfBracketRound(
  round: BracketRound,
  allTeamIds: readonly number[],
  reached: Map<BracketRound, Set<number>>,
  knockoutEliminated: Set<number>,
): Set<number> {
  const out = new Set(knockoutEliminated);

  const cap = BRACKET_ROUND_CAPACITY[round];
  const roundReached = reached.get(round);
  if (cap != null && roundReached != null && roundReached.size >= cap) {
    for (const id of allTeamIds) {
      if (!roundReached.has(id)) out.add(id);
    }
  }

  const prev = PREV_BRACKET_ROUND[round];
  if (prev != null) {
    const prevCap = BRACKET_ROUND_CAPACITY[prev];
    const prevReached = reached.get(prev);
    if (prevCap != null && prevReached != null && prevReached.size >= prevCap) {
      for (const id of allTeamIds) {
        if (!prevReached.has(id)) out.add(id);
      }
    }
  }

  return out;
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

  type Agg = { match: number; bracket: number; exact: number; goalDiff: number; outcome: number };
  const byUser = new Map<string, Agg>();
  const ensure = (uid: string): Agg => {
    let a = byUser.get(uid);
    if (!a) {
      a = { match: 0, bracket: 0, exact: 0, goalDiff: 0, outcome: 0 };
      byUser.set(uid, a);
    }
    return a;
  };

  for (const p of allScorePreds) {
    const m = finishedById.get(p.matchId);
    if (!m) continue;
    const actual = postExtraTimeScore(m);
    if (!actual) continue;
    const tier = scoreTier(p.homeScore, p.awayScore, actual.home, actual.away);
    const agg = ensure(p.userId);
    agg.match += pointsForTier(tier, s);
    switch (tier) {
      case "exact":
        agg.exact += 1;
        break;
      case "goal_diff":
        agg.goalDiff += 1;
        break;
      case "outcome":
        agg.outcome += 1;
        break;
      case "none":
        break;
      default: {
        const _exhaustive: never = tier;
        void _exhaustive;
        break;
      }
    }
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
        goalDiffCount: a.goalDiff,
        outcomeCount: a.outcome,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: scores.userId,
        set: {
          matchPoints: a.match,
          bracketPoints: a.bracket,
          totalPoints: a.match + a.bracket,
          exactCount: a.exact,
          goalDiffCount: a.goalDiff,
          outcomeCount: a.outcome,
          updatedAt: new Date(),
        },
      });
  }
}

// Re-export to keep a single import site for callers that touch scoring.
export { dsql };
