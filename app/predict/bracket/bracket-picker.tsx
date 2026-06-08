/* eslint-disable @next/next/no-img-element */
"use client";

import { useState, useTransition } from "react";
import { Check, Lock, RotateCcw } from "lucide-react";
import { submitBracketPicks, resetBracketPicks } from "@/app/actions/predictions";
import type { Team, BracketRound } from "@/db/schema";

export interface RoundConfig {
  round: BracketRound;
  label: string;
  pick: number;
  points: number;
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
  const [selections, setSelections] = useState<Record<string, number[]>>(() => {
    const init: Record<string, number[]> = {};
    for (const r of rounds) init[r.round] = initialPicks[r.round] ?? [];
    return init;
  });
  const [resetPending, startReset] = useTransition();

  const totalPicked = Object.values(selections).reduce((n, ids) => n + ids.length, 0);

  const setRound = (round: string, ids: number[]) =>
    setSelections((cur) => ({ ...cur, [round]: ids }));

  const resetAll = () => {
    if (!window.confirm("Clear all your bracket picks? This can't be undone.")) return;
    startReset(async () => {
      const res = await resetBracketPicks();
      if (res.ok) {
        const cleared: Record<string, number[]> = {};
        for (const r of rounds) cleared[r.round] = [];
        setSelections(cleared);
      }
    });
  };

  return (
    <div className="flex flex-col gap-4">
      {!locked && totalPicked > 0 && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={resetAll}
            disabled={resetPending}
            className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold text-muted-foreground outline-none transition hover:bg-line hover:text-ink focus-visible:ring-3 focus-visible:ring-ring/70 disabled:opacity-60"
          >
            <RotateCcw className="size-4" />
            {resetPending ? "Resetting…" : "Reset all picks"}
          </button>
        </div>
      )}

      {rounds.map((r) => (
        <RoundBlock
          key={r.round}
          config={r}
          teams={teams}
          selected={selections[r.round] ?? []}
          onChange={(ids) => setRound(r.round, ids)}
          locked={locked}
        />
      ))}
    </div>
  );
}

function RoundBlock({
  config,
  teams,
  selected,
  onChange,
  locked,
}: {
  config: RoundConfig;
  teams: Team[];
  selected: number[];
  onChange: (ids: number[]) => void;
  locked: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const complete = selected.length === config.pick;

  const toggle = (id: number) => {
    if (locked) return;
    setMsg(null);
    if (selected.includes(id)) {
      onChange(selected.filter((x) => x !== id));
    } else if (selected.length < config.pick) {
      onChange([...selected, id]);
    }
  };

  const save = () => {
    startTransition(async () => {
      const res = await submitBracketPicks(config.round, selected);
      setMsg(res.ok ? { ok: true, text: "Saved" } : { ok: false, text: res.error ?? "Error" });
    });
  };

  return (
    <section className="rounded-3xl bg-card p-5 shadow-sm ring-1 ring-black/5 md:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h3 className="display text-xl uppercase leading-none text-ink">{config.label}</h3>
          <span className="rounded-lg bg-line px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            +{config.points} / team
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          <span
            className={`flex items-center gap-1 rounded-xl px-4 py-2 text-sm font-bold ${
              complete ? "bg-brand text-brand-foreground" : "bg-line text-muted-foreground"
            }`}
          >
            {complete && <Check className="size-4" strokeWidth={3} />}
            {selected.length}/{config.pick}
          </span>
          {!locked && (
            <>
              {msg && (
                <span
                  className={`text-xs font-semibold ${msg.ok ? "text-green-600" : "text-red-600"}`}
                >
                  {msg.text}
                </span>
              )}
              <button
                onClick={save}
                disabled={pending}
                className="rounded-xl bg-ink px-4 py-2 text-sm font-bold text-white outline-none transition hover:opacity-90 focus-visible:ring-3 focus-visible:ring-ring/70 disabled:opacity-60"
              >
                {pending ? "Saving…" : "Save"}
              </button>
            </>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {teams.map((t) => {
          const isSel = selected.includes(t.id);
          const blocked = locked || (!isSel && selected.length >= config.pick);
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => toggle(t.id)}
              disabled={blocked && !isSel}
              className={`flex items-center gap-2 rounded-full border py-1 pl-1 pr-3 text-sm font-semibold outline-none transition focus-visible:ring-3 focus-visible:ring-ring/70 ${
                isSel
                  ? "border-transparent bg-brand text-brand-foreground"
                  : blocked
                    ? "cursor-not-allowed border-line text-muted-foreground/40"
                    : "border-line text-ink hover:border-ink"
              }`}
            >
              <span
                className={`grid size-6 shrink-0 place-items-center overflow-hidden rounded-full bg-white ${
                  blocked && !isSel ? "opacity-40" : ""
                }`}
              >
                {t.crestUrl ? (
                  <img src={t.crestUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-[8px] font-bold text-muted-foreground">
                    {t.tla ?? "?"}
                  </span>
                )}
              </span>
              {t.tla || t.shortName || t.name}
            </button>
          );
        })}
      </div>

      {locked && (
        <p className="mt-4 flex items-center gap-1.5 border-t border-line pt-3 text-xs font-medium text-muted-foreground">
          <Lock className="size-3.5" />
          Picks are locked for this round.
        </p>
      )}
    </section>
  );
}
