import "dotenv/config";
import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { sql } from "drizzle-orm";
import { db } from "../db";
import { settings, users, scores } from "../db/schema";

const ADMIN_NAME = "berker";
const ADMIN_PIN = "0133";

async function main() {
  // 1. Prune: wipe all data, reset identity. CASCADE clears dependent rows.
  await db.execute(
    sql`TRUNCATE TABLE
      score_predictions,
      bracket_predictions,
      scores,
      settings,
      matches,
      teams,
      users
      RESTART IDENTITY CASCADE`,
  );
  console.log("✓ pruned all tables");

  // 2. Generate a brand-based room key and store only its hash.
  const roomKey = `turnit-${randomBytes(3).toString("hex")}`;
  const roomPasswordHash = await bcrypt.hash(roomKey, 10);
  await db.insert(settings).values({ id: 1, roomPasswordHash });
  console.log("✓ settings row created with room key");

  // 3. Create the admin user with their PIN + a scores row.
  const pinHash = await bcrypt.hash(ADMIN_PIN, 10);
  const [admin] = await db
    .insert(users)
    .values({ displayName: ADMIN_NAME, pinHash, isAdmin: true })
    .returning();
  await db.insert(scores).values({ userId: admin.id });
  console.log(`✓ created admin user "${admin.displayName}" (isAdmin=${admin.isAdmin})`);

  console.log("\n──────────────────────────────────────");
  console.log(`  ROOM KEY:  ${roomKey}`);
  console.log(`  ADMIN:     ${ADMIN_NAME} / PIN ${ADMIN_PIN}`);
  console.log("──────────────────────────────────────");
  console.log("Share the room key with players. It is stored hashed and cannot be recovered.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
