import { cn } from "@/lib/utils";
import { formatLiveClock } from "@/lib/format";
import type { MatchStatus } from "@/db/schema";

export function LiveBadge({
  status,
  minute,
  injuryTime,
  className,
}: {
  status: MatchStatus;
  minute?: number | null;
  injuryTime?: number | null;
  className?: string;
}) {
  const clock = formatLiveClock({
    status,
    minute: minute ?? null,
    injuryTime: injuryTime ?? null,
  });

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-red-600",
        className,
      )}
    >
      <span className="relative flex size-2" aria-hidden>
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-red-500 opacity-60" />
        <span className="relative inline-flex size-2 rounded-full bg-red-600" />
      </span>
      {clock ?? "Live"}
    </span>
  );
}
