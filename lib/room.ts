import "server-only";
import bcrypt from "bcryptjs";
import { getSettings } from "@/lib/scoring";

/**
 * Shared "room password" gate. A password set in the admin settings takes
 * precedence; otherwise a ROOM_PASSWORD env var can act as a bootstrap/fallback.
 * If neither is configured the room is open (no gate).
 */
export async function isRoomGated(): Promise<boolean> {
  const s = await getSettings();
  return !!s.roomPasswordHash || !!process.env.ROOM_PASSWORD;
}

/** Returns true if the supplied password opens the room (always true when ungated). */
export async function verifyRoomPassword(password: string | undefined): Promise<boolean> {
  const s = await getSettings();
  if (s.roomPasswordHash) {
    if (!password) return false;
    return bcrypt.compare(password, s.roomPasswordHash);
  }
  const env = process.env.ROOM_PASSWORD;
  if (env) {
    return !!password && password === env;
  }
  return true; // no gate configured
}
