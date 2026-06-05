import { asc } from "drizzle-orm";
import { AppShell } from "@/components/app-shell";
import { requireAdmin } from "@/lib/session";
import { db } from "@/db";
import { users } from "@/db/schema";
import { UserRow } from "./user-row";

export default async function AdminUsersPage() {
  await requireAdmin();
  const all = await db.select().from(users).orderBy(asc(users.createdAt));

  return (
    <AppShell>
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-slate-900">Players</h1>
        <p className="text-sm text-slate-500">Grant admin access or manage PINs.</p>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-2.5">Player</th>
              <th className="px-4 py-2.5 text-center">Role</th>
              <th className="px-4 py-2.5 text-center">PIN</th>
              <th className="px-4 py-2.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {all.map((u) => (
              <UserRow
                key={u.id}
                id={u.id}
                displayName={u.displayName}
                isAdmin={u.isAdmin}
                hasPin={!!u.pinHash}
              />
            ))}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
