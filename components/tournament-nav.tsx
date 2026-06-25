"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/tournament/groups", label: "Group standings" },
  { href: "/tournament/knockout", label: "Knockout bracket" },
] as const;

export function TournamentNav() {
  const pathname = usePathname();

  return (
    <nav className="mb-8 flex flex-wrap gap-2">
      {links.map(({ href, label }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              active
                ? "bg-ink text-white"
                : "bg-card text-ink ring-1 ring-black/5 hover:bg-line/50"
            }`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
