"use client";

import { useState, useTransition } from "react";
import { adminToggleAdmin, adminResetPin, adminSetPin } from "@/app/actions/admin";

export function UserRow({
  id,
  displayName,
  isAdmin,
  hasPin,
}: {
  id: string;
  displayName: string;
  isAdmin: boolean;
  hasPin: boolean;
}) {
  const [pending, start] = useTransition();
  const [pin, setPin] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  const wrap = (fn: () => Promise<{ ok: boolean; error?: string; message?: string }>) =>
    start(async () => {
      const res = await fn();
      setMsg(res.ok ? res.message ?? "Done" : res.error ?? "Error");
    });

  return (
    <tr>
      <td className="px-4 py-2.5 font-medium text-slate-800">{displayName}</td>
      <td className="px-4 py-2.5 text-center">
        {isAdmin ? (
          <span className="rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-700">admin</span>
        ) : (
          <span className="text-xs text-slate-400">player</span>
        )}
      </td>
      <td className="px-4 py-2.5 text-center text-xs text-slate-500">
        {hasPin ? "🔒 set" : "—"}
      </td>
      <td className="px-4 py-2.5">
        <div className="flex flex-wrap items-center justify-end gap-2">
          <button
            disabled={pending}
            onClick={() => wrap(() => adminToggleAdmin(id, !isAdmin))}
            className="rounded border border-slate-300 px-2 py-1 text-xs hover:bg-slate-50 disabled:opacity-60"
          >
            {isAdmin ? "Revoke admin" : "Make admin"}
          </button>
          <input
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="new PIN"
            className="w-20 rounded border border-slate-300 px-2 py-1 text-xs"
          />
          <button
            disabled={pending || !pin}
            onClick={() => wrap(() => adminSetPin(id, pin))}
            className="rounded border border-slate-300 px-2 py-1 text-xs hover:bg-slate-50 disabled:opacity-60"
          >
            Set PIN
          </button>
          <button
            disabled={pending || !hasPin}
            onClick={() => wrap(() => adminResetPin(id))}
            className="rounded border border-slate-300 px-2 py-1 text-xs hover:bg-slate-50 disabled:opacity-60"
          >
            Clear PIN
          </button>
          {msg && <span className="text-xs text-slate-500">{msg}</span>}
        </div>
      </td>
    </tr>
  );
}
