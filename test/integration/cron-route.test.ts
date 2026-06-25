import { test, before, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { db } from "@/db";
import { matches } from "@/db/schema";
import { GET } from "@/app/api/cron/sync/route";
import { resetDb, mockFetch, mockFootballApi, jsonResponse } from "./helpers";
import { wcMatchesPayload } from "./fixtures/wc-matches";

const SECRET = "test-cron-secret"; // matches scripts/test-integration.mjs
let unmock: (() => void) | null = null;

before(() => {
  assert.equal(process.env.DB_DRIVER, "pg", "integration tests must run via pnpm test:integration");
  assert.equal(process.env.CRON_SECRET, SECRET, "harness must set CRON_SECRET");
});

beforeEach(async () => {
  await resetDb();
  const m = mockFootballApi(wcMatchesPayload());
  unmock = m.restore;
});

afterEach(() => {
  unmock?.();
  unmock = null;
});

function req(opts: { secretQuery?: string; bearer?: string } = {}) {
  const url = new URL("http://localhost/api/cron/sync");
  if (opts.secretQuery !== undefined) url.searchParams.set("secret", opts.secretQuery);
  const headers = new Headers();
  if (opts.bearer !== undefined) headers.set("authorization", `Bearer ${opts.bearer}`);
  return new NextRequest(url, { headers });
}

test("cron sync runs with the correct secret in the query string", async () => {
  const res = await GET(req({ secretQuery: SECRET }));
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.ok, true);
  assert.equal(body.matchesSeen, 8);
  assert.equal(body.matchesUpdated, 8);

  // It actually wrote to the database.
  const rows = await db.select().from(matches);
  assert.equal(rows.length, 8);
});

test("cron sync accepts the secret via the Authorization bearer header", async () => {
  const res = await GET(req({ bearer: SECRET }));
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.ok, true);
});

test("cron sync rejects a wrong secret with 401", async () => {
  const res = await GET(req({ secretQuery: "nope" }));
  assert.equal(res.status, 401);
  const body = await res.json();
  assert.equal(body.error, "Unauthorized");

  const rows = await db.select().from(matches);
  assert.equal(rows.length, 0, "no sync should run for an unauthorized request");
});

test("cron sync rejects a missing secret with 401", async () => {
  const res = await GET(req());
  assert.equal(res.status, 401);
});

test("cron sync returns 500 with a message when the upstream API fails", async () => {
  unmock?.();
  const m = mockFetch(() => jsonResponse({ message: "boom" }, 500));
  unmock = m.restore;

  const res = await GET(req({ secretQuery: SECRET }));
  assert.equal(res.status, 500);
  const body = await res.json();
  assert.equal(body.ok, false);
  assert.ok(body.error);
});
