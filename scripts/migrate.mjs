#!/usr/bin/env node
/**
 * Apply pending Drizzle migrations from the CLI (`pnpm db:migrate`).
 * Production deploys run the same logic via instrumentation.ts at server boot.
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set.");
  }

  const pool = new Pool({ connectionString: url });
  try {
    const db = drizzle(pool);
    await migrate(db, { migrationsFolder: path.join(root, "db/migrations") });
    console.log("Database migrations applied.");
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
