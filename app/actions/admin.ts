"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/db";
import { matches, settings, users } from "@/db/schema";
import { requireAdmin } from "@/lib/session";
import { syncMatches, apiHealthCheck, type SyncResult } from "@/lib/football-api";
import { recomputeScores } from "@/lib/scoring";

export type AdminActionResult = { ok: boolean; error?: string; message?: string };

export async function adminSync(): Promise<AdminActionResult & { result?: SyncResult }> {
  await requireAdmin();
  try {
    const result = await syncMatches();
    revalidatePath("/admin");
    revalidatePath("/leaderboard");
    return {
      ok: true,
      result,
      message: `Synced ${result.matchesUpdated} matches (${result.manualSkipped} manual rows preserved).`,
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Sync failed" };
  }
}

export async function adminCheckApi(): Promise<{ ok: boolean; message: string }> {
  await requireAdmin();
  return apiHealthCheck();
}

const resultSchema = z.object({
  matchId: z.coerce.number().int().positive(),
  homeScore: z.coerce.number().int().min(0).max(30),
  awayScore: z.coerce.number().int().min(0).max(30),
  homePens: z.coerce.number().int().min(0).max(30).optional().or(z.nan()),
  awayPens: z.coerce.number().int().min(0).max(30).optional().or(z.nan()),
  advancingTeamId: z.coerce.number().int().positive().optional().or(z.nan()),
});

/** Manually set a final result; marks the row source='manual' so sync won't overwrite it. */
export async function adminSetResult(
  _prev: AdminActionResult,
  formData: FormData,
): Promise<AdminActionResult> {
  await requireAdmin();
  const parsed = resultSchema.safeParse({
    matchId: formData.get("matchId"),
    homeScore: formData.get("homeScore"),
    awayScore: formData.get("awayScore"),
    homePens: formData.get("homePens") || undefined,
    awayPens: formData.get("awayPens") || undefined,
    advancingTeamId: formData.get("advancingTeamId") || undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const v = parsed.data;
  const num = (x: number | undefined) => (typeof x === "number" && !Number.isNaN(x) ? x : null);

  await db
    .update(matches)
    .set({
      homeScore: v.homeScore,
      awayScore: v.awayScore,
      homePens: num(v.homePens),
      awayPens: num(v.awayPens),
      advancingTeamId: num(v.advancingTeamId),
      status: "FINISHED",
      source: "manual",
      updatedAt: new Date(),
    })
    .where(eq(matches.id, v.matchId));

  await recomputeScores();
  revalidatePath("/admin/results");
  revalidatePath("/leaderboard");
  return { ok: true, message: "Result saved (manual)." };
}

const settingsSchema = z.object({
  ptsExact: z.coerce.number().int().min(0).max(100),
  ptsGoalDiff: z.coerce.number().int().min(0).max(100),
  ptsOutcome: z.coerce.number().int().min(0).max(100),
  ptsBracketR16: z.coerce.number().int().min(0).max(100),
  ptsBracketQf: z.coerce.number().int().min(0).max(100),
  ptsBracketSf: z.coerce.number().int().min(0).max(100),
  ptsBracketFinal: z.coerce.number().int().min(0).max(100),
  ptsBracketWinner: z.coerce.number().int().min(0).max(100),
  liveSyncSeconds: z.coerce.number().int().min(10).max(3600),
  // Empty input clears the override so the lock derives from the first knockout
  // kickoff; a datetime-local value (local time) sets an explicit lock.
  bracketLockAt: z
    .string()
    .trim()
    .transform((v) => (v ? new Date(v) : null))
    .refine((d) => d === null || !Number.isNaN(d.getTime()), "Invalid lock date/time"),
});

export async function adminUpdateSettings(
  _prev: AdminActionResult,
  formData: FormData,
): Promise<AdminActionResult> {
  await requireAdmin();
  const parsed = settingsSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  await db
    .insert(settings)
    .values({ id: 1, ...parsed.data })
    .onConflictDoUpdate({ target: settings.id, set: parsed.data });

  await recomputeScores();
  revalidatePath("/admin/settings");
  revalidatePath("/leaderboard");
  return { ok: true, message: "Scoring updated and leaderboard recomputed." };
}

export async function adminSetRoomPassword(
  _prev: AdminActionResult,
  formData: FormData,
): Promise<AdminActionResult> {
  await requireAdmin();
  const raw = String(formData.get("roomPassword") ?? "").trim();
  const clear = formData.get("clear") === "1";

  if (clear) {
    await db
      .insert(settings)
      .values({ id: 1, roomPasswordHash: null })
      .onConflictDoUpdate({ target: settings.id, set: { roomPasswordHash: null } });
    revalidatePath("/admin/settings");
    return { ok: true, message: "Room password removed — the room is open." };
  }

  if (raw.length < 4) {
    return { ok: false, error: "Room password must be at least 4 characters." };
  }
  const roomPasswordHash = await bcrypt.hash(raw, 10);
  await db
    .insert(settings)
    .values({ id: 1, roomPasswordHash })
    .onConflictDoUpdate({ target: settings.id, set: { roomPasswordHash } });
  revalidatePath("/admin/settings");
  return { ok: true, message: "Room password set. New players now need it to join." };
}

export async function adminToggleAdmin(userId: string, makeAdmin: boolean): Promise<AdminActionResult> {
  await requireAdmin();
  await db.update(users).set({ isAdmin: makeAdmin }).where(eq(users.id, userId));
  revalidatePath("/admin/users");
  return { ok: true };
}

export async function adminResetPin(userId: string): Promise<AdminActionResult> {
  await requireAdmin();
  await db.update(users).set({ pinHash: null }).where(eq(users.id, userId));
  revalidatePath("/admin/users");
  return { ok: true, message: "PIN cleared." };
}

export async function adminSetPin(userId: string, pin: string): Promise<AdminActionResult> {
  await requireAdmin();
  if (!/^\d{4,8}$/u.test(pin)) return { ok: false, error: "PIN must be 4–8 digits." };
  const pinHash = await bcrypt.hash(pin, 10);
  await db.update(users).set({ pinHash }).where(eq(users.id, userId));
  revalidatePath("/admin/users");
  return { ok: true, message: "PIN set." };
}
