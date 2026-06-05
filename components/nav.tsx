"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/app/actions/auth";

const links = [
  { href: "/", label: "Dashboard" },
  { href: "/predict/matches", label: "Predict Scores" },
  { href: "/predict/bracket", label: "Bracket" },
  { href: "/leaderboard", label: "Leaderboard" },
];

export function Nav({ displayName, isAdmin }: { displayName: string; isAdmin: boolean }) {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
      <nav className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
        <Link href="/" className="mr-2 text-lg font-bold text-slate-900">
          🏆 WC&nbsp;2026
        </Link>
        <div className="flex flex-1 flex-wrap items-center gap-1">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                isActive(l.href)
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {l.label}
            </Link>
          ))}
          {isAdmin && (
            <Link
              href="/admin"
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                isActive("/admin")
                  ? "bg-amber-500 text-white"
                  : "text-amber-700 hover:bg-amber-50"
              }`}
            >
              Admin
            </Link>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden text-sm text-slate-500 sm:inline">{displayName}</span>
          <form action={logout}>
            <button
              type="submit"
              className="rounded-md px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100"
            >
              Log out
            </button>
          </form>
        </div>
      </nav>
    </header>
  );
}
