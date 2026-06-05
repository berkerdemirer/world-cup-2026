"use client";

import { useState, useTransition } from "react";
import { adminSync, adminCheckApi } from "@/app/actions/admin";

export function SyncPanel() {
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [ok, setOk] = useState(true);

  const runSync = () =>
    startTransition(async () => {
      const res = await adminSync();
      setOk(res.ok);
      setMsg(res.ok ? res.message ?? "Synced." : res.error ?? "Sync failed.");
    });

  const checkApi = () =>
    startTransition(async () => {
      const res = await adminCheckApi();
      setOk(res.ok);
      setMsg(res.message);
    });

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="font-semibold text-slate-900">Data sync</h2>
      <p className="mt-1 text-sm text-slate-500">
        Pull the latest fixtures, scores and standings from football-data.org. Manual results are preserved.
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          onClick={runSync}
          disabled={pending}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
        >
          {pending ? "Working…" : "Sync now"}
        </button>
        <button
          onClick={checkApi}
          disabled={pending}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
        >
          Test API connection
        </button>
        {msg && (
          <span className={`text-sm ${ok ? "text-green-600" : "text-red-600"}`}>{msg}</span>
        )}
      </div>
    </div>
  );
}
