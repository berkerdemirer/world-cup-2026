"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, GitFork, Trophy, SlidersHorizontal, LogOut, Target, BookOpen, LayoutGrid, type LucideIcon } from "lucide-react";
import { logout } from "@/app/actions/auth";

const links: { href: string; label: string; Icon: LucideIcon }[] = [
  { href: "/predict/matches", label: "Fixtures", Icon: CalendarDays },
  { href: "/predict/bracket", label: "Bracket", Icon: GitFork },
  { href: "/tournament/groups", label: "Tournament", Icon: LayoutGrid },
  { href: "/leaderboard", label: "Leaderboard", Icon: Trophy },
  { href: "/my-picks", label: "My Picks", Icon: Target },
  { href: "/how-to-play", label: "Rules", Icon: BookOpen },
];

export function TopNav({
  displayName,
  isAdmin,
  rank,
  points,
}: {
  displayName: string;
  isAdmin: boolean;
  rank?: number | null;
  points?: number;
}) {
  const pathname = usePathname();
  const isActive = (href: string) =>
    pathname.startsWith(href) ||
    (href === "/tournament/groups" && pathname.startsWith("/tournament"));

  const allLinks = isAdmin
    ? [...links, { href: "/admin", label: "Admin", Icon: SlidersHorizontal }]
    : links;

  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <>
    <header className="sticky top-0 z-30 border-b border-white/5 bg-ink text-white">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center gap-4 px-4 md:px-8 xl:max-w-[1440px]">
        <Link href="/predict/matches" className="flex shrink-0 items-center">
          <span className="display text-lg leading-none tracking-wide">
            Turnit World Cup 2026
          </span>
        </Link>

        <span className="hidden h-7 w-px shrink-0 bg-white/30 lg:block" />

        <nav className="hidden min-w-0 flex-1 items-stretch gap-1.5 lg:flex">
          {allLinks.map(({ href, label, Icon }) => {
            const active = isActive(href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-full px-4 py-2.5 text-sm font-semibold transition ${
                  active
                    ? "bg-brand text-brand-foreground"
                    : "text-white hover:bg-white/10"
                }`}
              >
                <Icon className="size-4 shrink-0" strokeWidth={2.25} />
                {label}
              </Link>
            );
          })}
        </nav>

        <span className="flex-1 lg:hidden" />

        <div className="flex shrink-0 items-center gap-2.5">
          <div className="text-right leading-tight">
            <div className="text-sm font-semibold">{displayName}</div>
            <div className="whitespace-nowrap text-xs text-white">
              {rank ? `Rank #${rank}` : "Unranked"} · {points ?? 0} pts
            </div>
          </div>
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-orange-500 text-xs font-bold">
            {initials}
          </span>
          <form action={logout}>
            <button
              type="submit"
              title="Log out"
              className="rounded-lg p-2 text-white transition hover:bg-white/10"
            >
              <LogOut className="size-4" />
            </button>
          </form>
        </div>
      </div>
    </header>

    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-white/5 bg-ink pb-[env(safe-area-inset-bottom)] text-white lg:hidden">
      <div className="mx-auto flex max-w-7xl items-stretch justify-around px-1 xl:max-w-[1440px]">
        {allLinks.map(({ href, label, Icon }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex min-w-[3.25rem] flex-1 flex-col items-center justify-center gap-1 px-2 py-2.5 text-[11px] font-semibold transition ${
                active ? "text-brand" : "text-white/70 hover:text-white"
              }`}
            >
              <Icon className="size-5 shrink-0" strokeWidth={2.25} />
              <span className="text-center leading-tight">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
    </>
  );
}
