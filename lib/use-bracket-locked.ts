import { useSyncExternalStore } from "react";
import { isBracketLocked } from "@/lib/bracket-lock";

function subscribeToLock(lockMs: number, onStoreChange: () => void): () => void {
  if (Date.now() >= lockMs) return () => {};

  const msUntil = lockMs - Date.now();
  const timeout = window.setTimeout(onStoreChange, msUntil + 50);
  const interval = window.setInterval(onStoreChange, 30_000);
  return () => {
    window.clearTimeout(timeout);
    window.clearInterval(interval);
  };
}

/** Re-evaluates bracket lock state in the browser as the deadline passes. */
export function useBracketLocked(lockAt: Date | string | null, serverLocked: boolean): boolean {
  const lockMs = lockAt ? new Date(lockAt).getTime() : null;

  return useSyncExternalStore(
    (onStoreChange) => {
      if (lockMs == null || Number.isNaN(lockMs)) return () => {};
      return subscribeToLock(lockMs, onStoreChange);
    },
    () => {
      if (lockMs == null || Number.isNaN(lockMs)) return false;
      return isBracketLocked(new Date(lockMs));
    },
    () => serverLocked,
  );
}
