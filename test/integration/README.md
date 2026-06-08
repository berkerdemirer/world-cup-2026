# Integration tests

These exercise the real data path — server actions, the football-data.org sync,
the scoring engine, lock rules and the cron route — against a **real Postgres**,
so we don't get surprised once matches actually start.

## Running

```bash
pnpm test:integration      # integration tests only
pnpm test                  # fast unit tests (lib/*.test.ts)
pnpm test:all              # both
```

**Requirement:** Docker must be running. The harness
(`scripts/test-integration.mjs`) spins up an ephemeral `postgres:16-alpine`
container on a random port, applies the project's Drizzle migrations
(`db/migrations`), runs the tests, then removes the container — pass or fail.
Nothing touches your dev or production database.

## How it works

- **Driver:** `db/index.ts` uses the Neon serverless driver in production but
  switches to `node-postgres` when `DB_DRIVER=pg` (set only by the harness), so
  the exact same query code runs against local Postgres.
- **External API:** calls to football-data.org are stubbed via a fake
  `global.fetch` returning a shape-accurate fixture
  (`fixtures/wc-matches.ts`). No token or network needed.
- **Server actions:** `next/cache` and the iron-session helper are mocked
  (`node --experimental-test-module-mocks`) so the action's own logic runs
  against the real DB.
- Each test starts from a truncated DB (`resetDb()` in `helpers.ts`); files run
  serially against the shared container.

## Coverage

| File | What it protects |
|------|------------------|
| `football-api.test.ts` | Sync parsing: statuses, scores, penalties, advancing team, placeholders, **manual-row preservation**, idempotency, upstream errors, and the `maybeSync` throttle (incl. concurrent compare-and-swap). |
| `scoring.test.ts` | `recomputeScores` end-to-end: tiered match points, exact counts, bracket points by "teams that reached each round", winner-from-final, idempotency/result-correction, leaderboard ordering & tie-breaks. |
| `queries-locks.test.ts` | Kickoff/bracket lock rules and read queries (joins, placeholders, grouping). |
| `actions.test.ts` | Prediction actions: validation, lock enforcement, upsert/replace semantics, per-user isolation. |
| `cron-route.test.ts` | `/api/cron/sync` secret gate (query + bearer) and success/error responses. |

## Adding a test

Seed with the helpers in `helpers.ts` (`seedUser`, `seedTeam`, `seedMatch`,
`seedScorePrediction`, `seedBracketPick`, `setSettings`), call the function under
test, then assert against the DB. For sync-related tests, drive
football-data.org with `mockFetch` + a fixture.
