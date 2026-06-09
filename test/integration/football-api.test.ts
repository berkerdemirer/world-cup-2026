import { test, before, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { matches, teams, settings } from "@/db/schema";
import { syncMatches, maybeSync, apiHealthCheck } from "@/lib/football-api";
import { resetDb, seedMatch, setSettings, mockFetch, jsonResponse } from "./helpers";
import { wcMatchesPayload, TEAMS } from "./fixtures/wc-matches";

let unmock: (() => void) | null = null;

before(() => {
  assert.equal(process.env.DB_DRIVER, "pg", "integration tests must run via pnpm test:integration");
});

beforeEach(async () => {
  await resetDb();
  // Default: serve the WC payload. Tests that need other behaviour call remock().
  mockMatches();
});

afterEach(() => {
  unmock?.();
  unmock = null;
});

/** Mock fetch to serve the WC matches payload for the matches endpoint. */
function mockMatches(payload = wcMatchesPayload()) {
  unmock?.();
  const m = mockFetch((url) => {
    if (url.includes("/competitions/WC/matches")) return jsonResponse(payload);
    if (url.includes("/competitions/WC")) return jsonResponse({ id: 1, name: "FIFA World Cup" });
    return jsonResponse({ error: "unexpected url" }, 404);
  });
  unmock = m.restore;
  return m;
}

/** Replace the active fetch mock with a custom handler (restores the prior one first). */
function remock(handler: Parameters<typeof mockFetch>[0]) {
  unmock?.();
  const m = mockFetch(handler);
  unmock = m.restore;
  return m;
}

test("syncMatches upserts teams and matches from the API payload", async () => {
  const result = await syncMatches();

  assert.equal(result.matchesSeen, 8);
  assert.equal(result.matchesUpdated, 8);
  assert.equal(result.manualSkipped, 0);

  const teamRows = await db.select().from(teams);
  // 8 distinct teams appear across the fixture (the placeholder side has no id).
  assert.equal(teamRows.length, 8);
  const brazil = teamRows.find((t) => t.id === TEAMS.brazil.id);
  assert.ok(brazil);
  assert.equal(brazil.name, "Brazil");
  assert.equal(brazil.tla, "BRA");

  const matchRows = await db.select().from(matches);
  assert.equal(matchRows.length, 8);
});

test("syncMatches maps statuses, scores, group labels and stages", async () => {
  await syncMatches();

  const [m1] = await db.select().from(matches).where(eq(matches.id, 1));
  assert.equal(m1.status, "FINISHED");
  assert.equal(m1.stage, "GROUP_STAGE");
  assert.equal(m1.groupLabel, "A"); // "GROUP_A" -> "A"
  assert.equal(m1.homeScore, 2);
  assert.equal(m1.awayScore, 0);
  assert.equal(m1.source, "api");

  // Live match: latest score is stored even though it's IN_PLAY.
  const [m4] = await db.select().from(matches).where(eq(matches.id, 4));
  assert.equal(m4.status, "IN_PLAY");
  assert.equal(m4.homeScore, 0);
  assert.equal(m4.awayScore, 1);

  // Not-yet-played match has null scores.
  const [m3] = await db.select().from(matches).where(eq(matches.id, 3));
  assert.equal(m3.status, "TIMED");
  assert.equal(m3.homeScore, null);
  assert.equal(m3.awayScore, null);
});

test("syncMatches resolves the advancing team in regulation knockouts", async () => {
  await syncMatches();
  const [m100] = await db.select().from(matches).where(eq(matches.id, 100));
  // France 2-1 Morocco -> France advances.
  assert.equal(m100.advancingTeamId, TEAMS.france.id);
});

test("syncMatches resolves the advancing team via penalties on a draw", async () => {
  await syncMatches();
  const [m101] = await db.select().from(matches).where(eq(matches.id, 101));
  // 1-1, penalties 4-2 to Portugal.
  assert.equal(m101.homePens, 4);
  assert.equal(m101.awayPens, 2);
  assert.equal(m101.advancingTeamId, TEAMS.portugal.id);
});

test("syncMatches stores placeholders when a team is unresolved", async () => {
  await syncMatches();
  const [m102] = await db.select().from(matches).where(eq(matches.id, 102));
  assert.equal(m102.homeTeamId, TEAMS.spain.id);
  assert.equal(m102.awayTeamId, null);
  assert.equal(m102.awayPlaceholder, "Winner Group C");
  assert.equal(m102.homePlaceholder, null);
  // An unresolved knockout cannot have an advancing team yet.
  assert.equal(m102.advancingTeamId, null);
});

test("syncMatches sets WINNER from the final's advancing team", async () => {
  await syncMatches();
  const [final] = await db.select().from(matches).where(eq(matches.id, 200));
  assert.equal(final.stage, "FINAL");
  assert.equal(final.advancingTeamId, TEAMS.france.id);
});

test("syncMatches never overwrites manual rows", async () => {
  // Admin manually corrected match 1 to a different score.
  await seedMatch({
    id: 1,
    stage: "GROUP_STAGE",
    status: "FINISHED",
    homeScore: 5,
    awayScore: 5,
    source: "manual",
  });

  const result = await syncMatches();
  assert.equal(result.manualSkipped, 1);
  assert.equal(result.matchesUpdated, 7);

  const [m1] = await db.select().from(matches).where(eq(matches.id, 1));
  assert.equal(m1.source, "manual");
  assert.equal(m1.homeScore, 5, "manual score must survive the sync");
  assert.equal(m1.awayScore, 5);
});

test("syncMatches is idempotent — a second run updates in place", async () => {
  await syncMatches();
  const first = await db.select().from(matches);
  const result = await syncMatches();
  const second = await db.select().from(matches);

  assert.equal(result.matchesUpdated, 8);
  assert.equal(first.length, second.length, "no duplicate match rows on re-sync");
});

test("syncMatches surfaces upstream HTTP errors", async () => {
  remock((url) => {
    if (url.includes("/competitions/WC/matches")) return jsonResponse({ message: "rate limited" }, 429);
    return jsonResponse({}, 404);
  });

  await assert.rejects(() => syncMatches(), /429/);
});

test("maybeSync calls the API on the first poll then throttles the next", async () => {
  const m = mockMatches();
  await setSettings({ liveSyncSeconds: 30, lastSyncedAt: null });

  const first = await maybeSync();
  assert.equal(first.synced, true);

  const matchesEndpointCalls = () =>
    m.calls.filter((u) => u.includes("/competitions/WC/matches")).length;
  assert.equal(matchesEndpointCalls(), 1);

  // Immediately polling again must NOT hit the upstream API (within the window).
  const second = await maybeSync();
  assert.equal(second.synced, false);
  assert.equal(matchesEndpointCalls(), 1, "throttled poll must not call the API again");
});

test("maybeSync syncs again once the throttle window has elapsed", async () => {
  const m = mockMatches();
  // Pretend the last sync was well outside the window.
  await setSettings({
    liveSyncSeconds: 30,
    lastSyncedAt: new Date(Date.now() - 60_000),
  });

  const res = await maybeSync();
  assert.equal(res.synced, true);
  assert.equal(m.calls.filter((u) => u.includes("/competitions/WC/matches")).length, 1);

  // lastSyncedAt should have advanced.
  const [s] = await db.select().from(settings).where(eq(settings.id, 1));
  assert.ok(s.lastSyncedAt && s.lastSyncedAt.getTime() > Date.now() - 5_000);
});

test("maybeSync grace lets an at-interval poll just under the window still sync", async () => {
  const m = mockMatches();
  // 29s since last sync with a 30s setting: inside the raw interval, but past
  // the 2s grace window — a client polling every 30s must still get a refresh
  // rather than being throttled to every other tick.
  await setSettings({
    liveSyncSeconds: 30,
    lastSyncedAt: new Date(Date.now() - 29_000),
  });

  const res = await maybeSync();
  assert.equal(res.synced, true);
  assert.equal(m.calls.filter((u) => u.includes("/competitions/WC/matches")).length, 1);
});

test("maybeSync claims the slot atomically under concurrent polls", async () => {
  const m = mockMatches();
  await setSettings({ liveSyncSeconds: 30, lastSyncedAt: null });

  // Fire several polls at once — only one should win the compare-and-swap.
  const results = await Promise.all([maybeSync(), maybeSync(), maybeSync(), maybeSync()]);
  const synced = results.filter((r) => r.synced).length;
  assert.equal(synced, 1, "exactly one concurrent poll may trigger a real sync");
  assert.equal(
    m.calls.filter((u) => u.includes("/competitions/WC/matches")).length,
    1,
    "the upstream API is hit at most once per window regardless of poll count",
  );
});

test("apiHealthCheck reports connectivity", async () => {
  const ok = await apiHealthCheck();
  assert.equal(ok.ok, true);

  remock(() => jsonResponse({ message: "forbidden" }, 403));
  const bad = await apiHealthCheck();
  assert.equal(bad.ok, false);
  assert.match(bad.message, /403/);
});
