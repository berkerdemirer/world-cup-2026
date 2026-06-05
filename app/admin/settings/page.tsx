import { AppShell } from "@/components/app-shell";
import { requireAdmin } from "@/lib/session";
import { getSettings } from "@/lib/scoring";
import { SettingsForm } from "./settings-form";
import { RoomPasswordForm } from "./room-password-form";

export default async function AdminSettingsPage() {
  await requireAdmin();
  const settings = await getSettings();

  return (
    <AppShell>
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-sm text-slate-500">
          Manage access and scoring. Changing point values recomputes the leaderboard.
        </p>
      </div>

      <div className="mb-6">
        <RoomPasswordForm
          roomSet={!!settings.roomPasswordHash}
          envGate={!settings.roomPasswordHash && !!process.env.ROOM_PASSWORD}
        />
      </div>

      <SettingsForm settings={settings} />
    </AppShell>
  );
}
