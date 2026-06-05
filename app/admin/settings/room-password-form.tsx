"use client";

import { useActionState } from "react";
import { adminSetRoomPassword, type AdminActionResult } from "@/app/actions/admin";

const initial: AdminActionResult = { ok: false };

export function RoomPasswordForm({
  roomSet,
  envGate,
}: {
  roomSet: boolean;
  envGate: boolean;
}) {
  const [state, action, pending] = useActionState(adminSetRoomPassword, initial);

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
        Room password
      </h2>
      <p className="mt-1 text-sm text-slate-500">
        A shared code everyone must enter at login, so only people you share it with can join.
      </p>
      <p className="mt-1 text-sm font-medium">
        {roomSet ? (
          <span className="text-green-600">🔒 A room password is set.</span>
        ) : envGate ? (
          <span className="text-green-600">
            🔒 Gated by the <code>ROOM_PASSWORD</code> env var. Setting one here overrides it.
          </span>
        ) : (
          <span className="text-amber-600">⚠️ Open — anyone with the link can join.</span>
        )}
      </p>

      <form action={action} className="mt-3 flex flex-wrap items-center gap-2">
        <input
          name="roomPassword"
          type="text"
          autoComplete="off"
          placeholder={roomSet ? "new room password" : "set a room password"}
          className="w-56 rounded border border-slate-300 px-3 py-1.5 text-sm"
        />
        <button
          type="submit"
          name="clear"
          value="0"
          disabled={pending}
          className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
        >
          {pending ? "Saving…" : roomSet ? "Change" : "Set password"}
        </button>
        {roomSet && (
          <button
            type="submit"
            name="clear"
            value="1"
            disabled={pending}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            Remove
          </button>
        )}
        {state.error && <span className="text-sm text-red-600">{state.error}</span>}
        {state.ok && <span className="text-sm text-green-600">{state.message}</span>}
      </form>
    </section>
  );
}
