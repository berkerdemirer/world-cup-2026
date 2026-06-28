"use client";

import { Lock } from "lucide-react";
import { formatBracketLockDeadline } from "@/lib/format";
import { useIsClient } from "@/lib/use-is-client";
import { useBracketLocked } from "@/lib/use-bracket-locked";

export function BracketLockBanner({
  lockAt,
  serverLocked,
}: {
  lockAt: string;
  serverLocked: boolean;
}) {
  const isClient = useIsClient();
  const locked = useBracketLocked(lockAt, serverLocked);
  const deadline = new Date(lockAt);

  return (
    <div
      className={`mb-6 flex items-center gap-2.5 rounded-2xl px-4 py-3 text-sm font-medium ${
        locked ? "bg-ink text-white" : "bg-amber-50 text-amber-900 ring-1 ring-amber-200"
      }`}
    >
      <Lock className="size-4 shrink-0" />
      {locked ? (
        <span>Bracket locked — the knockout stage has begun.</span>
      ) : (
        <span>
          Picks lock on{" "}
          <span className="font-bold">
            {isClient ? formatBracketLockDeadline(deadline) : "…"}
          </span>{" "}
          (knockout kickoff). Make your picks before then.
        </span>
      )}
    </div>
  );
}
