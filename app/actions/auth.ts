"use server";

import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { users, scores } from "@/db/schema";
import { getSession } from "@/lib/session";
import { verifyRoomPassword } from "@/lib/room";

const loginSchema = z.object({
  displayName: z.string().trim().min(2, "Name must be at least 2 characters").max(40),
  pin: z
    .string()
    .trim()
    .regex(/^\d{4,8}$/u, "PIN must be 4–8 digits"),
  roomPassword: z.string().trim().min(1, "Room key is required"),
});

export type LoginState = { error?: string };

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    displayName: formData.get("displayName"),
    pin: formData.get("pin") ?? "",
    roomPassword: formData.get("roomPassword") ?? "",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  // Shared room-password gate — checked before anything else so randoms can't
  // even create an account.
  if (!(await verifyRoomPassword(parsed.data.roomPassword))) {
    return { error: "Incorrect room key." };
  }

  const { displayName, pin } = parsed.data;

  const [existing] = await db
    .select()
    .from(users)
    .where(eq(users.displayName, displayName))
    .limit(1);

  let user = existing;

  if (!user) {
    // First time: create the player with their PIN.
    const pinHash = await bcrypt.hash(pin, 10);
    const [created] = await db
      .insert(users)
      .values({ displayName, pinHash })
      .returning();
    user = created;
    await db.insert(scores).values({ userId: user.id }).onConflictDoNothing();
  } else if (!user.pinHash) {
    // Existing account with no PIN (new, or cleared by an admin reset) — the
    // first PIN supplied claims the account from here on.
    const pinHash = await bcrypt.hash(pin, 10);
    await db.update(users).set({ pinHash }).where(eq(users.id, user.id));
    user = { ...user, pinHash };
  } else if (!(await bcrypt.compare(pin, user.pinHash))) {
    // Existing account — the PIN must match the one set at registration.
    return { error: "Incorrect PIN for this name." };
  }

  const session = await getSession();
  session.userId = user.id;
  session.displayName = user.displayName;
  session.isAdmin = user.isAdmin;
  await session.save();

  redirect("/");
}

export async function logout(): Promise<void> {
  const session = await getSession();
  session.destroy();
  redirect("/login");
}
