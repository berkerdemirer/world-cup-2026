import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "./schema";

// Lazily initialise so importing this module during `next build` doesn't require
// DATABASE_URL — it's only needed when a query actually runs.
let _db: NeonHttpDatabase<typeof schema> | null = null;

function getDb(): NeonHttpDatabase<typeof schema> {
  if (_db) return _db;
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not set. Add it to your environment (.env.local).");
  }
  const sql = neon(databaseUrl);
  _db = drizzle(sql, { schema });
  return _db;
}

// Proxy that defers connection until first property access (i.e. first query).
export const db = new Proxy({} as NeonHttpDatabase<typeof schema>, {
  get(_target, prop, receiver) {
    return Reflect.get(getDb(), prop, receiver);
  },
});

export { schema };
