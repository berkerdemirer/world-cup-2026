import { NextRequest, NextResponse } from "next/server";
import { syncMatches } from "@/lib/football-api";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Scheduled sync entrypoint. Protected by CRON_SECRET so it can't be spammed.
 * Vercel Cron sends `Authorization: Bearer <CRON_SECRET>`; we also accept a
 * `?secret=` query param for external schedulers (cron-job.org, GitHub Actions).
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    const qs = req.nextUrl.searchParams.get("secret");
    const ok = auth === `Bearer ${secret}` || qs === secret;
    if (!ok) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const result = await syncMatches();
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Sync failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
