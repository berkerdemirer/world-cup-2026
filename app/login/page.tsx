import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { isRoomGated } from "@/lib/room";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect("/");
  const roomRequired = await isRoomGated();

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
        <div className="mb-6 text-center">
          <div className="text-4xl">🏆</div>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">World Cup 2026</h1>
          <p className="text-sm text-slate-500">Prediction game — pick scores &amp; bracket</p>
        </div>
        <LoginForm roomRequired={roomRequired} />
        <p className="mt-4 text-center text-xs text-slate-400">
          {roomRequired
            ? "Ask the organiser for the room password. Add a PIN to protect your name."
            : "New here? Just enter a name to join. Add a PIN to protect it."}
        </p>
      </div>
    </main>
  );
}
