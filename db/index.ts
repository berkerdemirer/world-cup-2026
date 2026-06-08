import { createRequire } from "node:module";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "./schema";

// The app type stays the Neon driver's; the node-postgres driver used for local
// integration tests is structurally compatible for the query API we rely on.
type DB = NeonHttpDatabase<typeof schema>;

// Lazily initialise so importing this module during `next build` doesn't require
// DATABASE_URL — it's only needed when a query actually runs.
let _db: DB | null = null;

function getDb(): DB {
  if (_db) return _db;
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not set. Add it to your environment (.env.local).");
  }
  // Integration tests run against a plain Postgres (e.g. Docker) that the Neon
  // HTTP driver can't speak to. Opt into node-postgres with DB_DRIVER=pg;
  // production is unchanged and still uses the Neon serverless driver.
  if (process.env.DB_DRIVER === "pg") {
    _db = createPgDb(databaseUrl);
    return _db;
  }
  const sql = neon(databaseUrl);
  _db = drizzle(sql, { schema });
  return _db;
}

// `pg` is a devDependency and is only required on the test path, so production
// builds (which never set DB_DRIVER=pg) don't need it installed.
function createPgDb(connectionString: string): DB {
  const require = createRequire(import.meta.url);
  const { Pool } = require("pg");
  const { drizzle: drizzlePg } = require("drizzle-orm/node-postgres");
  const pool = new Pool({ connectionString });
  return drizzlePg(pool, { schema }) as unknown as DB;
}

// Proxy that defers connection until first property access (i.e. first query).
export const db = new Proxy({} as NeonHttpDatabase<typeof schema>, {
  get(_target, prop, receiver) {
    return Reflect.get(getDb(), prop, receiver);
  },
});

export { schema };
