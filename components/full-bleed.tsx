import { cn } from "@/lib/utils";

/** Break out of a centered max-width parent to use the full viewport width. */
export function FullBleed({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative [margin-inline:calc(50%-50vw)] [width:100vw] max-w-none",
        className,
      )}
    >
      {children}
    </div>
  );
}
