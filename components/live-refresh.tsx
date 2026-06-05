"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

/**
 * Keeps the current page fresh while it's open: every `intervalMs` it pings
 * /api/live (which triggers a globally-throttled server sync) and then refreshes
 * the server components to pull in any new scores. Pauses while the tab is hidden
 * to avoid needless calls.
 */
export function LiveRefresh({ intervalMs = 30000 }: { intervalMs?: number }) {
  const router = useRouter();
  const inFlight = useRef(false);

  useEffect(() => {
    let cancelled = false;

    const tick = async () => {
      if (cancelled || inFlight.current || document.hidden) return;
      inFlight.current = true;
      try {
        const res = await fetch("/api/live", { cache: "no-store" });
        if (!cancelled && res.ok) {
          const data = (await res.json()) as { synced?: boolean };
          // Only re-render when the server actually pulled fresh data.
          if (data.synced) router.refresh();
        }
      } catch {
        // Network blips are non-fatal; we'll try again next tick.
      } finally {
        inFlight.current = false;
      }
    };

    const id = setInterval(tick, intervalMs);
    // Fire once shortly after mount so a freshly opened tab updates quickly.
    const kickoff = setTimeout(tick, 1500);

    return () => {
      cancelled = true;
      clearInterval(id);
      clearTimeout(kickoff);
    };
  }, [intervalMs, router]);

  return null;
}
