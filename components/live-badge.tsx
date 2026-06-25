import { cn } from "@/lib/utils";
import { formatLiveMinute } from "@/lib/format";

export function LiveBadge({
  minute,
  injuryTime,
  className,
}: {
  minute?: number | null;
  injuryTime?: number | null;
  className?: string;
}) {
  const clock =
    minute != null || injuryTime != null
      ? formatLiveMinute({ minute: minute ?? null, injuryTime: injuryTime ?? null })
      : null;

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
