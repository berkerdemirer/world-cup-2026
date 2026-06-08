import "server-only";
import bcrypt from "bcryptjs";
import { getSettings } from "@/lib/scoring";

/**
 * Shared "room password" gate. A password set in the admin settings takes
 * precedence; otherwise a ROOM_PASSWORD env var can act as a bootstrap/fallback.
 * The room key is always mandatory, so the gate is always shown.
 */
export async function isRoomGated(): Promise<boolean> {
  return true;
}

/**
 * Returns true only if the supplied password opens the room. When no room key
 * is configured (admin setting or ROOM_PASSWORD env), the room stays closed —
 * the key is mandatory, never silently open.
 */
export async function verifyRoomPassword(password: string | undefined): Promise<boolean> {
  if (!password) return false;
  const s = await getSettings();
  if (s.roomPasswordHash) {
    return bcrypt.compare(password, s.roomPasswordHash);
  }
  const env = process.env.ROOM_PASSWORD;
  if (env) {
    return password === env;
  }
  return false; // no gate configured — nobody gets in until a room key is set
}
