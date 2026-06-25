import "server-only";
import path from "node:path";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";

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
      const db = drizzle(pool);
      await migrate(db, { migrationsFolder: path.join(process.cwd(), "db/migrations") });
    } finally {
      await pool.end();
    }
  })();

  return pending;
}
