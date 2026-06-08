#!/usr/bin/env node
/**
 * Integration test harness.
 *
 * Spins up an ephemeral Postgres in Docker, applies the project's real Drizzle
 * migrations to it, runs the integration tests against it via the node-postgres
 * driver (DB_DRIVER=pg), then tears the container down — pass or fail.
 *
 * Usage:  pnpm test:integration
 * Requires: Docker running locally.
 */
import { spawn, spawnSync } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";

const IMAGE = "postgres:16-alpine";
const CONTAINER = `wc2026_test_pg_${process.pid}`;
const DB_NAME = "wc_test";
const DB_USER = "postgres";
const DB_PASS = "postgres";

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { encoding: "utf8", ...opts });
  if (r.error) throw r.error;
  return r;
}

function dockerAvailable() {
  const r = run("docker", ["info"], { stdio: "ignore" });
  return r.status === 0;
}

function cleanup() {
  run("docker", ["rm", "-f", CONTAINER], { stdio: "ignore" });
}

async function waitForPostgres() {
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    const r = run("docker", ["exec", CONTAINER, "pg_isready", "-U", DB_USER, "-d", DB_NAME], {
      stdio: "ignore",
    });
    if (r.status === 0) return;
    await sleep(500);
  }
  throw new Error("Timed out waiting for Postgres to become ready.");
}

async function runMigrations(databaseUrl) {
  const { Pool } = await import("pg");
  const { drizzle } = await import("drizzle-orm/node-postgres");
  const { migrate } = await import("drizzle-orm/node-postgres/migrator");
  const pool = new Pool({ connectionString: databaseUrl });
  try {
    const db = drizzle(pool);
    await migrate(db, { migrationsFolder: "db/migrations" });
  } finally {
    await pool.end();
  }
}

function runTests(databaseUrl) {
  return new Promise((resolve) => {
    const child = spawn(
      process.execPath,
      [
        // Resolve the `server-only` guard (and other server modules) to their
        // server build, the same condition Next uses for Server Components and
        // route handlers — otherwise `import "server-only"` throws.
        "--conditions=react-server",
        "--import",
        "tsx",
        "--experimental-test-module-mocks",
        "--test",
        // DB tests share one Postgres — run files serially to avoid cross-talk.
        "--test-concurrency=1",
        "test/integration/**/*.test.ts",
      ],
      {
        stdio: "inherit",
        env: {
          ...process.env,
          DATABASE_URL: databaseUrl,
          DB_DRIVER: "pg",
          // Deterministic, non-secret values so modules that read these at import
          // time don't throw. No real network/auth is used in the tests.
          SESSION_PASSWORD: "test-session-password-at-least-32-chars",
          CRON_SECRET: "test-cron-secret",
          FOOTBALL_DATA_TOKEN: "test-token",
          NODE_ENV: "test",
        },
      },
    );
    child.on("exit", (code) => resolve(code ?? 1));
  });
}

async function main() {
  if (!dockerAvailable()) {
    console.error(
      "\nDocker does not appear to be running. Start Docker Desktop (or your engine) and retry.\n",
    );
    process.exit(1);
  }

  // Best-effort: remove a stale container with the same name from a crashed run.
  cleanup();

  console.log(`Starting ephemeral Postgres (${IMAGE})…`);
  const up = run("docker", [
    "run", "-d", "--rm",
    "--name", CONTAINER,
    "-e", `POSTGRES_PASSWORD=${DB_PASS}`,
    "-e", `POSTGRES_USER=${DB_USER}`,
    "-e", `POSTGRES_DB=${DB_NAME}`,
    "-p", "0:5432",
    IMAGE,
  ]);
  if (up.status !== 0) {
    console.error(up.stderr || up.stdout);
    process.exit(1);
  }

  let exitCode = 1;
  try {
    // Discover the ephemeral host port Docker assigned.
    const portOut = run("docker", ["port", CONTAINER, "5432/tcp"]).stdout.trim();
    // e.g. "0.0.0.0:54213" (may be multiple lines for v4/v6) — take the first.
    const hostPort = portOut.split("\n")[0].split(":").pop().trim();
    if (!hostPort) throw new Error(`Could not determine host port from: ${portOut}`);

    const databaseUrl = `postgres://${DB_USER}:${DB_PASS}@127.0.0.1:${hostPort}/${DB_NAME}`;

    await waitForPostgres();
    console.log("Applying migrations…");
    await runMigrations(databaseUrl);

    console.log("Running integration tests…\n");
    exitCode = await runTests(databaseUrl);
  } catch (err) {
    console.error(err);
    exitCode = 1;
  } finally {
    cleanup();
  }

  process.exit(exitCode);
}

process.on("SIGINT", () => {
  cleanup();
  process.exit(130);
});

main();
