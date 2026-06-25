import "server-only";
import path from "node:path";
import { Pool } from "pg";

let pending: Promise<void> | null = null;

/** Apply pending Drizzle migrations. Safe to call concurrently — deduped in-process. */
export function runMigrations(): Promise<void> {
  if (pending) return pending;

  pending = (async () => {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error("DATABASE_URL is not set.");
    }

    const pool = new Pool({ connectionString: url });
    try {
      const { applyMigrations } = await import("./migrate-db.mjs");
      await applyMigrations(pool, path.join(process.cwd(), "db/migrations"));
    } finally {
      await pool.end();
    }
  })();

  return pending;
}
