import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { requireAdmin } from "@/lib/session";
import { db } from "@/db";
import { matches, teams, users } from "@/db/schema";
import { sql } from "drizzle-orm";
import { getSettings } from "@/lib/scoring";
import { SyncPanel } from "./sync-panel";

async function count(table: typeof matches | typeof teams | typeof users): Promise<number> {
  const [row] = await db.select({ n: sql<number>`count(*)::int` }).from(table);
  return row?.n ?? 0;
}

export default async function AdminPage() {
  await requireAdmin();
  const [matchCount, teamCount, userCount, settings] = await Promise.all([
    count(matches),
    count(teams),
    count(users),
    getSettings(),
  ]);
  const lastSynced = settings.lastSyncedAt
    ? new Date(settings.lastSyncedAt).toLocaleString()
    : "never";

  return (
    <AppShell>
      <div className="mb-5 flex items-baseline justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Admin</h1>
        <span className="text-sm text-slate-500">
          Last synced: <span className="font-medium text-slate-700">{lastSynced}</span>
        </span>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Stat label="Matches" value={matchCount} />
        <Stat label="Teams" value={teamCount} />
        <Stat label="Players" value={userCount} />
      </div>

      <div className="space-y-4">
        <SyncPanel />

        <div className="grid gap-4 sm:grid-cols-3">
          <AdminLink href="/admin/results" title="Enter / override results" desc="Manually set final scores. Overrides survive sync." />
          <AdminLink href="/admin/settings" title="Scoring settings" desc="Tune point values; recomputes the leaderboard." />
          <AdminLink href="/admin/users" title="Players" desc="Grant admin, set or reset PINs." />
        </div>
      </div>
    </AppShell>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-2xl font-bold text-slate-900">{value}</div>
    </div>
  );
}

function AdminLink({ href, title, desc }: { href: string; title: string; desc: string }) {
  return (
    <Link
      href={href}
      className="block rounded-xl border border-slate-200 bg-white p-4 transition hover:border-slate-400"
    >
      <div className="font-semibold text-slate-900">{title}</div>
      <div className="mt-1 text-sm text-slate-500">{desc}</div>
    </Link>
  );
}
