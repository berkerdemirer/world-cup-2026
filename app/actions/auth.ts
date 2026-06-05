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
    .regex(/^\d{4,8}$/u, "PIN must be 4–8 digits")
    .optional()
    .or(z.literal("")),
  roomPassword: z.string().optional(),
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
    return { error: "Incorrect room password." };
  }

  const { displayName } = parsed.data;
  const pin = parsed.data.pin && parsed.data.pin.length > 0 ? parsed.data.pin : undefined;

  const [existing] = await db
    .select()
    .from(users)
    .where(eq(users.displayName, displayName))
    .limit(1);

  let user = existing;

  if (!user) {
    // First time: create the player. Any provided PIN is set on the account.
    const pinHash = pin ? await bcrypt.hash(pin, 10) : null;
    const [created] = await db
      .insert(users)
      .values({ displayName, pinHash })
      .returning();
    user = created;
    await db.insert(scores).values({ userId: user.id }).onConflictDoNothing();
  } else if (user.pinHash) {
    // Account is PIN-protected — require a matching PIN.
    if (!pin || !(await bcrypt.compare(pin, user.pinHash))) {
      return { error: "Incorrect PIN for this name." };
    }
  } else if (pin) {
    // No PIN set yet and one was provided — adopt it for future logins.
    const pinHash = await bcrypt.hash(pin, 10);
    await db.update(users).set({ pinHash }).where(eq(users.id, user.id));
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
