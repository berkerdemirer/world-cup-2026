"use server";

import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { matches, scorePredictions, bracketPredictions, type BracketRound } from "@/db/schema";
import { requireUser } from "@/lib/session";
import { assertMatchOpen, assertBracketOpen, getBracketLockAt, getSettings, LockedError } from "@/lib/scoring";

const scoreSchema = z.object({
  matchId: z.coerce.number().int().positive(),
  homeScore: z.coerce.number().int().min(0).max(30),
  awayScore: z.coerce.number().int().min(0).max(30),
});

export type ActionResult = { ok: boolean; error?: string };

export async function submitScorePrediction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const session = await requireUser();
  const parsed = scoreSchema.safeParse({
    matchId: formData.get("matchId"),
    homeScore: formData.get("homeScore"),
    awayScore: formData.get("awayScore"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { matchId, homeScore, awayScore } = parsed.data;

  const [match] = await db.select().from(matches).where(eq(matches.id, matchId)).limit(1);
  if (!match) return { ok: false, error: "Match not found." };

  try {
    assertMatchOpen(match);
  } catch (e) {
    if (e instanceof LockedError) return { ok: false, error: e.message };
    throw e;
  }

  await db
    .insert(scorePredictions)
    .values({ userId: session.userId, matchId, homeScore, awayScore })
    .onConflictDoUpdate({
      target: [scorePredictions.userId, scorePredictions.matchId],
      set: { homeScore, awayScore, updatedAt: new Date() },
    });

  revalidatePath("/predict/matches");
  return { ok: true };
}

const bracketSchema = z.object({
  round: z.enum([
    "LAST_32",
    "LAST_16",
    "QUARTER_FINALS",
    "SEMI_FINALS",
    "FINAL",
    "WINNER",
  ]),
  // teamIds chosen for this round (one entry per slot)
  teamIds: z.array(z.coerce.number().int().positive()),
});

/** Replace the user's picks for a single round (whole round committed at once). */
export async function submitBracketPicks(
  round: BracketRound,
  teamIds: number[],
): Promise<ActionResult> {
  const session = await requireUser();
  const parsed = bracketSchema.safeParse({ round, teamIds });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const settings = await getSettings();
  try {
    assertBracketOpen(await getBracketLockAt(settings));
  } catch (e) {
    if (e instanceof LockedError) return { ok: false, error: e.message };
    throw e;
  }

  // Clear existing picks for this round, then insert the new set.
  await db
    .delete(bracketPredictions)
    .where(
      and(
        eq(bracketPredictions.userId, session.userId),
        eq(bracketPredictions.round, parsed.data.round),
      ),
    );

  const unique = [...new Set(parsed.data.teamIds)];
  if (unique.length > 0) {
    await db.insert(bracketPredictions).values(
      unique.map((teamId, i) => ({
        userId: session.userId,
        round: parsed.data.round,
        slot: String(i + 1),
        pickedTeamId: teamId,
      })),
    );
  }

  revalidatePath("/predict/bracket");
  return { ok: true };
}

/** Clear all of the user's bracket picks across every round. */
export async function resetBracketPicks(): Promise<ActionResult> {
  const session = await requireUser();

  const settings = await getSettings();
  try {
    assertBracketOpen(await getBracketLockAt(settings));
  } catch (e) {
    if (e instanceof LockedError) return { ok: false, error: e.message };
    throw e;
  }

  await db.delete(bracketPredictions).where(eq(bracketPredictions.userId, session.userId));

  revalidatePath("/predict/bracket");
  return { ok: true };
}
