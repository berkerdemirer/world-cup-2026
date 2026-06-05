import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { maybeSync } from "@/lib/football-api";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Polled by the in-app live refresher. Triggers a globally-throttled sync, so
 * many open clients still result in at most one upstream API call per interval.
 * Session-gated so only logged-in players can poke it.
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await maybeSync();
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Live sync failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
