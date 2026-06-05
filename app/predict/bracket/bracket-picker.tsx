"use client";

import { useState, useTransition } from "react";
import { submitBracketPicks } from "@/app/actions/predictions";
import type { Team, BracketRound } from "@/db/schema";

export interface RoundConfig {
  round: BracketRound;
  label: string;
  pick: number;
}

export function BracketPicker({
  rounds,
  teams,
  initialPicks,
  locked,
}: {
  rounds: RoundConfig[];
  teams: Team[];
  initialPicks: Record<string, number[]>;
  locked: boolean;
}) {
  return (
    <div className="space-y-6">
      {rounds.map((r) => (
        <RoundBlock
          key={r.round}
          config={r}
          teams={teams}
          initial={initialPicks[r.round] ?? []}
          locked={locked}
        />
      ))}
    </div>
  );
}

function RoundBlock({
  config,
  teams,
  initial,
  locked,
}: {
  config: RoundConfig;
  teams: Team[];
  initial: number[];
  locked: boolean;
}) {
  const [selected, setSelected] = useState<number[]>(initial);
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  const toggle = (id: number) => {
    if (locked) return;
    setMsg(null);
    setSelected((cur) => {
      if (cur.includes(id)) return cur.filter((x) => x !== id);
      if (cur.length >= config.pick) return cur; // enforce max
      return [...cur, id];
    });
  };

  const save = () => {
    startTransition(async () => {
      const res = await submitBracketPicks(config.round, selected);
      setMsg(res.ok ? "Saved ✓" : res.error ?? "Error");
    });
  };

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-slate-900">{config.label}</h3>
          <p className="text-xs text-slate-500">
            Pick {config.pick} · selected {selected.length}/{config.pick}
          </p>
        </div>
        {!locked && (
          <div className="flex items-center gap-2">
            {msg && (
              <span className={msg.startsWith("Saved") ? "text-xs text-green-600" : "text-xs text-red-600"}>
                {msg}
              </span>
            )}
            <button
              onClick={save}
              disabled={pending}
              className="rounded-md bg-slate-900 px-3 py-1 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
            >
              {pending ? "Saving…" : "Save"}
            </button>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {teams.map((t) => {
          const isSel = selected.includes(t.id);
          const disabled = locked || (!isSel && selected.length >= config.pick);
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => toggle(t.id)}
              disabled={disabled && !isSel}
              className={`rounded-full border px-3 py-1 text-sm transition ${
                isSel
                  ? "border-slate-900 bg-slate-900 text-white"
                  : disabled
                    ? "cursor-not-allowed border-slate-200 text-slate-300"
                    : "border-slate-300 text-slate-700 hover:border-slate-500"
              }`}
            >
              {t.tla || t.shortName || t.name}
            </button>
          );
        })}
      </div>
    </section>
  );
}
