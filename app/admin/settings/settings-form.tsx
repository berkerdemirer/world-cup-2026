"use client";

import { useActionState } from "react";
import { adminUpdateSettings, type AdminActionResult } from "@/app/actions/admin";
import type { Settings } from "@/db/schema";

const initial: AdminActionResult = { ok: false };

function Field({ name, label, value }: { name: string; label: string; value: number }) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2">
      <span className="text-sm text-slate-700">{label}</span>
      <input
        name={name}
        type="number"
        min={0}
        defaultValue={value}
        className="w-16 rounded border border-slate-300 py-1 text-center"
      />
    </label>
  );
}

export function SettingsForm({ settings }: { settings: Settings }) {
  const [state, action, pending] = useActionState(adminUpdateSettings, initial);

  return (
    <form action={action} className="space-y-6">
      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Match scoring
        </h2>
        <div className="grid gap-2 sm:grid-cols-3">
          <Field name="ptsExact" label="Exact score" value={settings.ptsExact} />
          <Field name="ptsGoalDiff" label="Goal difference" value={settings.ptsGoalDiff} />
          <Field name="ptsOutcome" label="Correct result" value={settings.ptsOutcome} />
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Bracket scoring (per correct team)
        </h2>
        <div className="grid gap-2 sm:grid-cols-3">
          <Field name="ptsBracketR32" label="Round of 32" value={settings.ptsBracketR32} />
          <Field name="ptsBracketR16" label="Round of 16" value={settings.ptsBracketR16} />
          <Field name="ptsBracketQf" label="Quarter-final" value={settings.ptsBracketQf} />
          <Field name="ptsBracketSf" label="Semi-final" value={settings.ptsBracketSf} />
          <Field name="ptsBracketFinal" label="Final" value={settings.ptsBracketFinal} />
          <Field name="ptsBracketWinner" label="Champion" value={settings.ptsBracketWinner} />
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Live updates
        </h2>
        <div className="grid gap-2 sm:grid-cols-3">
          <Field
            name="liveSyncSeconds"
            label="Min seconds between API syncs"
            value={settings.liveSyncSeconds}
          />
        </div>
        <p className="mt-1 text-xs text-slate-400">
          The live dashboard hits football-data.org at most once per this interval, no matter how
          many players have the app open. 30s ≈ 2 calls/min.
        </p>
      </section>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save & recompute"}
        </button>
        {state.error && <span className="text-sm text-red-600">{state.error}</span>}
        {state.ok && <span className="text-sm text-green-600">{state.message}</span>}
      </div>
    </form>
  );
}
