import { AppShell } from "@/components/app-shell";
import { requireAdmin } from "@/lib/session";
import { getSettings } from "@/lib/scoring";
import { SettingsForm } from "./settings-form";

export default async function AdminSettingsPage() {
  await requireAdmin();
  const settings = await getSettings();

  return (
    <AppShell>
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-slate-900">Scoring settings</h1>
        <p className="text-sm text-slate-500">
          Changing any value recomputes the whole leaderboard.
        </p>
      </div>
      <SettingsForm settings={settings} />
    </AppShell>
  );
}
