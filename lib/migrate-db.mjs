import fs from "node:fs";
import crypto from "node:crypto";
import path from "node:path";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";

async function tableExists(pool, table) {
  const result = await pool.query(
    `select 1 from information_schema.tables
     where table_schema = 'public' and table_name = $1`,
    [table],
  );
  return (result.rowCount ?? 0) > 0;
}

async function columnExists(pool, table, column) {
  const result = await pool.query(
    `select 1 from information_schema.columns
     where table_schema = 'public' and table_name = $1 and column_name = $2`,
    [table, column],
  );
  return (result.rowCount ?? 0) > 0;
}

function readJournalMigrations(migrationsFolder) {
  const journalPath = path.join(migrationsFolder, "meta/_journal.json");
  const journal = JSON.parse(fs.readFileSync(journalPath, "utf8"));
  return journal.entries.map((entry) => {
    const sqlPath = path.join(migrationsFolder, `${entry.tag}.sql`);
    const query = fs.readFileSync(sqlPath, "utf8");
    return {
      tag: entry.tag,
      folderMillis: entry.when,
      hash: crypto.createHash("sha256").update(query).digest("hex"),
    };
  });
}

async function ensureMigrationJournal(pool) {
  await pool.query(`create schema if not exists drizzle`);
  await pool.query(`
    create table if not exists drizzle.__drizzle_migrations (
      id serial primary key,
      hash text not null,
      created_at numeric
    )
  `);
}

async function lastAppliedMigrationMillis(pool) {
  const result = await pool.query(
    `select created_at from drizzle.__drizzle_migrations order by created_at desc limit 1`,
  );
  const value = result.rows[0]?.created_at;
  return value == null ? null : Number(value);
}

async function stampMigration(pool, migration) {
  const existing = await pool.query(
    `select 1 from drizzle.__drizzle_migrations where created_at = $1`,
    [migration.folderMillis],
  );
  if ((existing.rowCount ?? 0) > 0) return false;

  await pool.query(
    `insert into drizzle.__drizzle_migrations (hash, created_at) values ($1, $2)`,
    [migration.hash, migration.folderMillis],
  );
  return true;
}

/**
 * Production was originally provisioned with `db:push`, so the schema can exist
 * without Drizzle's migration journal. Stamp any migration whose effects are
 * already present so only genuinely new migrations run.
 */
export async function baselinePushDatabase(pool, migrationsFolder) {
  if (!(await tableExists(pool, "settings"))) return;

  await ensureMigrationJournal(pool);

  const migrations = readJournalMigrations(migrationsFolder);
  let lastApplied = await lastAppliedMigrationMillis(pool);

  const checks = [
    { tag: "0000_swift_argent", ok: () => tableExists(pool, "matches") },
    { tag: "0001_foamy_moonstone", ok: () => columnExists(pool, "settings", "last_synced_at") },
    { tag: "0002_chunky_namora", ok: () => columnExists(pool, "settings", "room_password_hash") },
    {
      tag: "0003_overrated_black_tarantula",
      ok: () => columnExists(pool, "scores", "goal_diff_count"),
    },
    { tag: "0004_live_match_minute", ok: () => columnExists(pool, "matches", "minute") },
  ];

  for (const check of checks) {
    if (!(await check.ok())) break;

    const migration = migrations.find((entry) => entry.tag === check.tag);
    if (!migration) break;
    if (lastApplied != null && lastApplied >= migration.folderMillis) continue;

    if (await stampMigration(pool, migration)) {
      lastApplied = migration.folderMillis;
      console.log(`Baselined ${check.tag} (schema already present).`);
    }
  }
}

/** Apply pending Drizzle migrations, baselining db:push databases first. */
export async function applyMigrations(pool, migrationsFolder) {
  await baselinePushDatabase(pool, migrationsFolder);
  const db = drizzle(pool);
  await migrate(db, { migrationsFolder });
}
