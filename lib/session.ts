import "server-only";
import { cookies } from "next/headers";
import { getIronSession, type SessionOptions } from "iron-session";
import { redirect } from "next/navigation";

export interface SessionData {
  userId?: string;
  displayName?: string;
  isAdmin?: boolean;
}

const password = process.env.SESSION_PASSWORD;
if (!password || password.length < 32) {
  // Surfaced at runtime rather than build to keep `next build` working without secrets.
  if (process.env.NODE_ENV === "production") {
    console.warn("SESSION_PASSWORD missing or too short (need >= 32 chars).");
  }
}

export const sessionOptions: SessionOptions = {
  password: password || "dev-only-insecure-password-change-me-please!!",
  cookieName: "wc2026_session",
  cookieOptions: {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  },
};

export async function getSession() {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, sessionOptions);
}

/** Returns the logged-in user or null. */
export async function getCurrentUser(): Promise<SessionData | null> {
  const session = await getSession();
  return session.userId ? session : null;
}

/** Use in pages/actions that require a logged-in user. Redirects to /login. */
export async function requireUser(): Promise<Required<Pick<SessionData, "userId" | "displayName">> & SessionData> {
  const session = await getSession();
  if (!session.userId) redirect("/login");
  return session as Required<Pick<SessionData, "userId" | "displayName">> & SessionData;
}

/** Use in admin pages/actions. Redirects non-admins away. */
export async function requireAdmin() {
  const session = await getSession();
  if (!session.userId) redirect("/login");
  if (!session.isAdmin) redirect("/");
  return session;
}
