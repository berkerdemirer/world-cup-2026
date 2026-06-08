import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { isRoomGated } from "@/lib/room";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect("/");

  const roomRequired = await isRoomGated();

  return (
    <main className="dotted-bg flex min-h-screen items-center justify-center bg-cream p-6">
      <div className="w-full max-w-sm rounded-3xl bg-card p-8 shadow-sm ring-1 ring-black/5">
        <div className="mb-6 text-center">
          <h1 className="display text-3xl uppercase tracking-wide text-ink">Turnit World Cup 2026</h1>
          <p className="text-sm text-muted-foreground">World Cup &rsquo;26 prediction pool</p>
        </div>
        <LoginForm roomRequired={roomRequired} />
        <p className="mt-4 text-center text-xs text-muted-foreground">
          {roomRequired
            ? "Enter the room key from the organiser, then pick a name and a PIN to protect it."
            : "New here? Pick a name and a PIN to join — you'll need both to sign back in."}
        </p>
      </div>
    </main>
  );
}
