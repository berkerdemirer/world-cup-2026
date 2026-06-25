import { sql } from "drizzle-orm";
import { db } from "@/db";
import {
  users,
  teams,
  matches,
  scorePredictions,
  bracketPredictions,
  settings,
  type MatchStatus,
  type Stage,
  type BracketRound,
} from "@/db/schema";

/**
 * Wipe every table between tests so each one starts from a known empty state.
 * RESTART IDENTITY is harmless here (all our ids are explicit), CASCADE handles
 * the FK graph. Run inside the integration harness only (DB_DRIVER=pg).
 */
export async function resetDb(): Promise<void> {
  if (process.env.DB_DRIVER !== "pg") {
    throw new Error("resetDb() refused: DB_DRIVER is not 'pg' — won't truncate a non-test database.");
  }
  await db.execute(
    sql`TRUNCATE TABLE scores, bracket_predictions, score_predictions, matches, teams, users, settings RESTART IDENTITY CASCADE`,
  );
}

let userSeq = 0;

/** Insert a user and return the generated row (uuid id, displayName, etc.). */
export async function seedUser(
  displayName?: string,
  opts: { isAdmin?: boolean; createdAt?: Date } = {},
) {
  userSeq += 1;
  const name = displayName ?? `Player ${userSeq}`;
  const [row] = await db
    .insert(users)
    .values({
      displayName: name,
      isAdmin: opts.isAdmin ?? false,
      ...(opts.createdAt ? { createdAt: opts.createdAt } : {}),
    })
    .returning();
  return row;
}

export async function seedTeam(id: number, name?: string) {
  const [row] = await db
    .insert(teams)
    .values({ id, name: name ?? `Team ${id}` })
    .onConflictDoNothing()
    .returning();
  // onConflictDoNothing returns nothing when the row already exists; that's fine
  // for seeding shared teams across helpers.
  return row;
}

export interface SeedMatchInput {
  id: number;
  stage?: Stage;
  status?: MatchStatus;
  kickoffAt?: Date;
  homeTeamId?: number | null;
  awayTeamId?: number | null;
  homeScore?: number | null;
  awayScore?: number | null;
  homePens?: number | null;
  awayPens?: number | null;
  advancingTeamId?: number | null;
  source?: "api" | "manual";
  groupLabel?: string | null;
}

export async function seedMatch(input: SeedMatchInput) {
  const [row] = await db
    .insert(matches)
    .values({
      id: input.id,
      stage: input.stage ?? "GROUP_STAGE",
      status: input.status ?? "SCHEDULED",
      kickoffAt: input.kickoffAt ?? new Date(Date.now() + 24 * 3600_000),
      homeTeamId: input.homeTeamId ?? null,
      awayTeamId: input.awayTeamId ?? null,
      homeScore: input.homeScore ?? null,
      awayScore: input.awayScore ?? null,
      homePens: input.homePens ?? null,
      awayPens: input.awayPens ?? null,
      advancingTeamId: input.advancingTeamId ?? null,
      source: input.source ?? "api",
      groupLabel: input.groupLabel ?? null,
    })
    .returning();
  return row;
}

export async function seedScorePrediction(
  userId: string,
  matchId: number,
  homeScore: number,
  awayScore: number,
) {
  await db
    .insert(scorePredictions)
    .values({ userId, matchId, homeScore, awayScore });
}

export async function seedBracketPick(
  userId: string,
  round: BracketRound,
  slot: string,
  pickedTeamId: number,
) {
  await db
    .insert(bracketPredictions)
    .values({ userId, round, slot, pickedTeamId });
}

/** Upsert the singleton settings row, overriding selected columns. */
export async function setSettings(
  overrides: Partial<typeof settings.$inferInsert> = {},
) {
  await db
    .insert(settings)
    .values({ id: 1, ...overrides })
    .onConflictDoUpdate({ target: settings.id, set: { ...overrides } });
}

// ---------------------------------------------------------------------------
// fetch mocking for the football-data.org client
// ---------------------------------------------------------------------------

type FetchImpl = typeof globalThis.fetch;

/** Install a fake global.fetch and return a restore function. */
export function mockFetch(handler: (url: string, init?: RequestInit) => Response | Promise<Response>) {
  const original = globalThis.fetch;
  const calls: string[] = [];
  globalThis.fetch = (async (input: Parameters<FetchImpl>[0], init?: Parameters<FetchImpl>[1]) => {
    const url = typeof input === "string" ? input : input.toString();
    calls.push(url);
    return handler(url, init as RequestInit);
  }) as FetchImpl;
  const restore = () => {
    globalThis.fetch = original;
  };
  return { restore, calls };
}

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

/** Shared football-data.org mock used by sync and cron integration tests. */
export function mockFootballApi(payload: { matches: unknown[] }) {
  return mockFetch((url) => {
    if (url.includes("/competitions/WC/matches")) return jsonResponse(payload);
    const single = url.match(/\/matches\/(\d+)(?:\?|$)/);
    if (single) {
      const id = Number(single[1]);
      const match = payload.matches.find(
        (entry) => typeof entry === "object" && entry != null && "id" in entry && entry.id === id,
      ) as { id: number } | undefined;
      if (match) {
        return jsonResponse({ ...match, minute: 67, injuryTime: null });
      }
    }
    if (url.includes("/competitions/WC")) return jsonResponse({ id: 1, name: "FIFA World Cup" });
    return jsonResponse({ error: "unexpected url" }, 404);
  });
}
