"use client";

import { formatBracketLockDeadline } from "@/lib/format";
import { useIsClient } from "@/lib/use-is-client";
import { useBracketLocked } from "@/lib/use-bracket-locked";

function LockIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

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
      <LockIcon className="size-4 shrink-0" />
      {locked ? (
        <span>Bracket locked — the knockout stage has begun.</span>
      ) : (
        <span>
          Picks lock on{" "}
          <span className="font-bold">
            {isClient ? formatBracketLockDeadline(deadline) : "…"}
          </span>
          . Make your picks before then.
        </span>
      )}
    </div>
  );
}
