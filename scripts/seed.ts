import "dotenv/config";
import { db } from "../db";
import { settings, users, scores } from "../db/schema";
import { eq } from "drizzle-orm";

async function main() {
  // Ensure the single settings row exists with defaults.
  await db.insert(settings).values({ id: 1 }).onConflictDoNothing();
  console.log("✓ settings row ensured");

  const adminNames = (process.env.ADMIN_NAMES ?? "")
    .split(",")
    .map((n) => n.trim())
    .filter(Boolean);

  for (const name of adminNames) {
    const [existing] = await db
      .select()
      .from(users)
      .where(eq(users.displayName, name))
      .limit(1);

    let userId: string;
    if (existing) {
      await db.update(users).set({ isAdmin: true }).where(eq(users.id, existing.id));
      userId = existing.id;
      console.log(`✓ promoted existing user "${name}" to admin`);
    } else {
      const [created] = await db
        .insert(users)
        .values({ displayName: name, isAdmin: true })
        .returning();
      userId = created.id;
      console.log(`✓ created admin user "${name}"`);
    }
    await db.insert(scores).values({ userId }).onConflictDoNothing();
  }

  console.log("Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
