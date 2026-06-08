export function PageHeader({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="mb-8 flex items-end justify-between gap-4">
      <div>
        <h1 className="display text-5xl uppercase leading-none text-ink md:text-6xl">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-2 max-w-2xl text-base font-medium leading-relaxed text-ink/80">
            {subtitle}
          </p>
        )}
      </div>
      {right}
    </div>
  );
}

/** Section divider like "TODAY — MATCHDAY 3" with a trailing rule. */
export function SectionLabel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`mb-4 mt-8 flex items-center gap-3 first:mt-0${className ? ` ${className}` : ""}`}
    >
      <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
        {children}
      </span>
      <span className="h-px flex-1 bg-line" />
    </div>
  );
}
