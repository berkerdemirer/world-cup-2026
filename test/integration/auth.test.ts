import { test, before, beforeEach, mock } from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { resetDb, seedUser } from "./helpers";

// login() ends in redirect() on success and persists an iron-session cookie,
// neither of which exists outside a Next request. We mock next/navigation so a
// successful login is observable (redirect throws a tagged sentinel, like the
// real one does to unwind the request) and stub the session store. The action's
// own logic — room gate, account creation, and the PIN match/reclaim — runs
// against the real database.
const ROOM_KEY = "let-me-in";

class RedirectSignal extends Error {
  constructor(public to: string) {
    super(`redirect:${to}`);
    this.name = "RedirectSignal";
  }
}

let savedSession: { userId?: string; displayName?: string; isAdmin?: boolean } | null = null;

mock.module("next/navigation", {
  namedExports: {
    redirect: (to: string) => {
      throw new RedirectSignal(to);
    },
  },
});
mock.module("@/lib/session", {
  namedExports: {
    getSession: async () => {
      const session: Record<string, unknown> = {
        save: async () => {
          savedSession = {
            userId: session.userId as string | undefined,
            displayName: session.displayName as string | undefined,
            isAdmin: session.isAdmin as boolean | undefined,
          };
        },
        destroy: () => {},
      };
      return session;
    },
  },
});

type Auth = typeof import("@/app/actions/auth");
let login: Auth["login"];

function loginForm(displayName: string, pin: string, roomPassword = ROOM_KEY) {
  const fd = new FormData();
  fd.set("displayName", displayName);
  fd.set("pin", pin);
  fd.set("roomPassword", roomPassword);
  return fd;
}

/** Run login() and report whether it redirected (success) or returned an error. */
async function attemptLogin(fd: FormData): Promise<{ redirected: boolean; error?: string }> {
  savedSession = null;
  try {
    const res = await login({}, fd);
    return { redirected: false, error: res.error };
  } catch (e) {
    if (e instanceof RedirectSignal) return { redirected: true };
    throw e;
  }
}

before(async () => {
  assert.equal(process.env.DB_DRIVER, "pg", "integration tests must run via pnpm test:integration");
  // No admin-set room hash in these tests, so the env var is the active gate.
  process.env.ROOM_PASSWORD = ROOM_KEY;
  ({ login } = await import("@/app/actions/auth"));
});

beforeEach(async () => {
  await resetDb();
});

test("login creates a new account and sets its PIN", async () => {
  const out = await attemptLogin(loginForm("Newbie", "1234"));
  assert.equal(out.redirected, true, out.error);

  const [u] = await db.select().from(users).where(eq(users.displayName, "Newbie"));
  assert.ok(u, "user row created");
  assert.ok(u.pinHash, "pin hash stored");
  assert.ok(await bcrypt.compare("1234", u.pinHash!), "stored hash matches the PIN");
  assert.equal(savedSession?.userId, u.id);
});

test("login rejects the wrong room key before touching accounts", async () => {
  const out = await attemptLogin(loginForm("Ghost", "1234", "wrong-key"));
  assert.equal(out.redirected, false);
  assert.match(out.error ?? "", /room key/i);

  const rows = await db.select().from(users);
  assert.equal(rows.length, 0, "no account created when the room key is wrong");
});

test("login rejects a wrong PIN for an existing account", async () => {
  await attemptLogin(loginForm("Repeat", "1234")); // establishes the PIN
  const out = await attemptLogin(loginForm("Repeat", "9999"));
  assert.equal(out.redirected, false);
  assert.match(out.error ?? "", /incorrect pin/i);
});

test("a PIN-less account (admin-reset) is reclaimed by the next login", async () => {
  // Simulate adminResetPin(): an existing user whose pinHash has been cleared.
  const u = await seedUser("Reset");
  await db.update(users).set({ pinHash: null }).where(eq(users.id, u.id));

  // The supplied PIN claims the account instead of locking the user out.
  const first = await attemptLogin(loginForm("Reset", "5678"));
  assert.equal(first.redirected, true, first.error);

  const [after] = await db.select().from(users).where(eq(users.id, u.id));
  assert.ok(after.pinHash, "a fresh PIN hash was written");
  assert.ok(await bcrypt.compare("5678", after.pinHash!), "the new PIN was stored");

  // The newly-set PIN is now required; a different one is refused.
  const wrong = await attemptLogin(loginForm("Reset", "0000"));
  assert.equal(wrong.redirected, false);
  assert.match(wrong.error ?? "", /incorrect pin/i);

  // ...and the reclaimed PIN keeps working.
  const again = await attemptLogin(loginForm("Reset", "5678"));
  assert.equal(again.redirected, true, again.error);
});
