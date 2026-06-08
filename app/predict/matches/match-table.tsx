/* eslint-disable @next/next/no-img-element */
"use client";

import { Fragment, useCallback, useEffect, useState, useTransition } from "react";
import { Check, Loader2, Sparkles } from "lucide-react";
import { submitScorePrediction } from "@/app/actions/predictions";
import { scoreTier } from "@/lib/score-tier";
import type { MatchWithTeams } from "@/lib/queries";
import type { Team } from "@/db/schema";

export type MatchPoints = { exact: number; goalDiff: number; outcome: number };

// Weighted goal distribution (index = goals) so "Lucky" picks look like real
// football scores — mostly 0–2, the odd blowout — rather than uniform noise.
const GOAL_WEIGHTS = [0.3, 0.34, 0.21, 0.1, 0.04, 0.01];
function randomGoals(): number {
  let r = Math.random();
  for (let g = 0; g < GOAL_WEIGHTS.length; g++) {
    r -= GOAL_WEIGHTS[g];
    if (r < 0) return g;
  }
  return 0;
}

function fmtDate(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" }).toUpperCase();
}
function fmtTime(d: Date): string {
  return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
}

export type TableRow = {
  match: MatchWithTeams;
  prediction: { homeScore: number; awayScore: number } | null;
  locked: boolean;
};

export type TableSection = { key: string; label: string; openCount: number; rows: TableRow[] };

export function MatchTable({
  sections,
  points,
}: {
  sections: TableSection[];
  points: MatchPoints;
}) {
  // Bumping this nonce signals every open, un-picked row to roll a random score.
  const [luckyNonce, setLuckyNonce] = useState(0);
  // Count of rows currently saving a lucky pick — drives the button's spinner.
  // Each participating row registers (+1) as it starts and (-1) once it settles,
  // so the loader shows for exactly as long as saves are in flight.
  const [filling, setFilling] = useState(0);
  const registerFill = useCallback((delta: number) => setFilling((n) => n + delta), []);
  const isFilling = filling > 0;

  const openEmpty = sections.reduce(
    (n, s) => n + s.rows.filter((r) => !r.locked && !r.prediction).length,
    0,
  );

  return (
    <>
      {openEmpty > 0 && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-card/60 px-4 py-3">
          <p className="text-sm font-medium text-ink/80">
            Don&apos;t want to fill in every match? Roll random scores for the{" "}
            <span className="font-bold text-ink">{openEmpty}</span> match
            {openEmpty === 1 ? "" : "es"} you haven&apos;t picked yet.
          </p>
          <button
            type="button"
            onClick={() => setLuckyNonce((n) => n + 1)}
            disabled={isFilling}
            aria-busy={isFilling}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-brand px-3.5 py-2 text-xs font-bold uppercase tracking-wide text-brand-foreground outline-none transition hover:opacity-90 focus-visible:ring-3 focus-visible:ring-ring/70 disabled:opacity-70"
          >
            {isFilling ? (
              <Loader2 className="size-3.5 animate-spin" strokeWidth={2.5} />
            ) : (
              <Sparkles className="size-3.5" strokeWidth={2.5} />
            )}
            {isFilling ? "Rolling…" : "I'm feeling lucky"}
          </button>
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl bg-card shadow-sm ring-1 ring-black/5">
        <table className="w-full min-w-[600px] border-collapse">
          <tbody className="divide-y divide-line">
            {sections.map((s) => (
              <Fragment key={s.key}>
                <tr>
                  <td
                    colSpan={5}
                    className="bg-cream px-3 py-2 text-[11px] font-bold uppercase tracking-widest text-muted-foreground"
                  >
                    <span className="text-ink">{s.label}</span>
                    {s.openCount > 0 && <span> · {s.openCount} open</span>}
                  </td>
                </tr>
                {s.rows.map((r) => (
                  <Row
                    key={r.match.id}
                    row={r}
                    points={points}
                    luckyNonce={luckyNonce}
                    registerFill={registerFill}
                  />
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function TeamLabel({
  team,
  placeholder,
  side,
}: {
  team?: Pick<Team, "name" | "shortName" | "tla" | "crestUrl"> | null;
  placeholder?: string | null;
  side: "home" | "away";
}) {
  const name = team?.shortName ?? team?.name ?? placeholder ?? "TBD";
  const crest = (
    <span className="grid size-6 shrink-0 place-items-center overflow-hidden rounded-full bg-white ring-1 ring-black/5">
      {team?.crestUrl ? (
        <img src={team.crestUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        <span className="text-[8px] font-bold text-muted-foreground">{team?.tla ?? "?"}</span>
      )}
    </span>
  );
  return (
    <div className={`flex items-center gap-2 ${side === "home" ? "justify-end" : "justify-start"}`}>
      {side === "away" && crest}
      <span className="truncate text-sm font-semibold text-ink">{name}</span>
      {side === "home" && crest}
    </div>
  );
}

function Row({
  row,
  points,
  luckyNonce,
  registerFill,
}: {
  row: TableRow;
  points: MatchPoints;
  luckyNonce: number;
  registerFill: (delta: number) => void;
}) {
  const { match, prediction, locked } = row;
  const kickoff = new Date(match.kickoffAt);
  const hasScore = match.homeScore != null && match.awayScore != null;

  const [home, setHome] = useState<string>(prediction ? String(prediction.homeScore) : "");
  const [away, setAway] = useState<string>(prediction ? String(prediction.awayScore) : "");
  // Last persisted values; Save only enables when the inputs differ from these.
  const [savedHome, setSavedHome] = useState<string>(prediction ? String(prediction.homeScore) : "");
  const [savedAway, setSavedAway] = useState<string>(prediction ? String(prediction.awayScore) : "");
  const [pending, startTransition] = useTransition();
  const [justSaved, setJustSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dirty = home !== savedHome || away !== savedAway;
  const canSave = dirty && home !== "" && away !== "" && !pending;

  const persist = (h: string, a: string, onSettled?: () => void) => {
    if (h === "" || a === "") return;
    startTransition(async () => {
      const fd = new FormData();
      fd.set("matchId", String(match.id));
      fd.set("homeScore", h);
      fd.set("awayScore", a);
      try {
        const res = await submitScorePrediction({ ok: false }, fd);
        if (res.ok) {
          setSavedHome(h);
          setSavedAway(a);
          setJustSaved(true);
          setError(null);
        } else {
          setError(res.error ?? "Error");
        }
      } finally {
        onSettled?.();
      }
    });
  };

  const save = () => {
    if (!canSave) return;
    persist(home, away);
  };

  // "I'm feeling lucky" — fill this row only if it's still open and untouched,
  // so deliberate picks (saved or in-progress) are never overwritten.
  useEffect(() => {
    if (luckyNonce === 0 || locked) return;
    if (savedHome !== "" || savedAway !== "" || home !== "" || away !== "") return;
    const h = String(randomGoals());
    const a = String(randomGoals());
    setHome(h);
    setAway(a);
    // Register this row as in-flight so the toolbar shows its loader until the
    // save settles, then release it.
    registerFill(1);
    persist(h, a, () => registerFill(-1));
    // Only react to a new "lucky" trigger, not to local input edits.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [luckyNonce]);

  const input = (value: string, set: (v: string) => void, label: string) => (
    <input
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      maxLength={2}
      value={value}
      aria-label={label}
      onChange={(e) => {
        // Digits only (0–30) — strip anything else so no stray text gets in.
        const digits = e.target.value.replace(/[^0-9]/g, "").slice(0, 2);
        set(digits);
        setJustSaved(false);
        setError(null);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") save();
      }}
      className="score-box h-9 w-12 rounded-lg border border-line bg-cream text-center font-display text-xl text-ink outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/40"
    />
  );

  return (
    <tr className="hover:bg-cream/40">
      <td className="w-px whitespace-nowrap px-3 py-2.5 align-middle text-xs font-bold uppercase tracking-wide text-muted-foreground">
        <div className="text-ink">{fmtTime(kickoff)}</div>
        <div>{fmtDate(kickoff)}</div>
      </td>

      <td className="py-2.5 pl-3 pr-1 align-middle">
        <TeamLabel team={match.homeTeam} placeholder={match.homePlaceholder} side="home" />
      </td>

      <td className="w-px px-1 py-2.5 align-middle">
        {!locked ? (
          <div className="flex items-center justify-center gap-1.5">
            {input(home, setHome, "Home score")}
            <span className="text-sm font-bold text-muted-foreground">:</span>
            {input(away, setAway, "Away score")}
          </div>
        ) : hasScore ? (
          <div className="display text-center text-xl text-ink">
            {match.homeScore}&ndash;{match.awayScore}
          </div>
        ) : (
          <div className="text-center text-xs font-semibold text-muted-foreground">Locked</div>
        )}
      </td>

      <td className="py-2.5 pl-1 pr-3 align-middle">
        <TeamLabel team={match.awayTeam} placeholder={match.awayPlaceholder} side="away" />
      </td>

      {/* Fixed width so the empty → Save → Picked transitions don't resize the
          column and shift the rest of the row. */}
      <td className="w-[116px] whitespace-nowrap px-3 py-2.5 align-middle text-right">
        {locked ? (
          <ResultBadge match={match} prediction={prediction} points={points} hasScore={hasScore} />
        ) : dirty ? (
          // Unsaved changes — show the Save action.
          <div className="flex items-center justify-end gap-2">
            {error && (
              <span className="max-w-[120px] truncate text-xs font-semibold text-red-600" title={error}>
                {error}
              </span>
            )}
            <button
              type="button"
              onClick={save}
              disabled={!canSave}
              className="rounded-lg bg-ink px-3 py-1.5 text-xs font-bold text-white outline-none transition hover:opacity-90 focus-visible:ring-3 focus-visible:ring-ring/70 disabled:opacity-40"
            >
              {pending ? "…" : "Save"}
            </button>
          </div>
        ) : justSaved ? (
          <span className="flex items-center justify-end gap-1 text-xs font-bold text-ink">
            <Check className="size-3.5" strokeWidth={3} />
            Saved
          </span>
        ) : savedHome !== "" && savedAway !== "" ? (
          <span className="text-xs font-medium text-muted-foreground">
            Picked{" "}
            <span className="font-bold text-ink">
              {savedHome}&ndash;{savedAway}
            </span>
          </span>
        ) : null}
      </td>
    </tr>
  );
}

function ResultBadge({
  match,
  prediction,
  points,
  hasScore,
}: {
  match: MatchWithTeams;
  prediction: { homeScore: number; awayScore: number } | null;
  points: MatchPoints;
  hasScore: boolean;
}) {
  const settled = match.status === "FINISHED" && hasScore;
  if (!prediction) {
    return <span className="text-xs italic text-muted-foreground">No pick</span>;
  }
  if (!settled) {
    return (
      <span className="text-xs font-medium text-muted-foreground">
        Picked{" "}
        <span className="font-bold text-ink">
          {prediction.homeScore}&ndash;{prediction.awayScore}
        </span>
      </span>
    );
  }
  const tier = scoreTier(
    prediction.homeScore,
    prediction.awayScore,
    match.homeScore!,
    match.awayScore!,
  );
  const p = {
    exact: { cls: "bg-brand text-brand-foreground", pts: `+${points.exact}`, label: "Exact" },
    goal_diff: { cls: "bg-royal text-white", pts: `+${points.goalDiff}`, label: "+GD" },
    outcome: { cls: "bg-line text-ink", pts: `+${points.outcome}`, label: "Result" },
    none: { cls: "bg-line/70 text-muted-foreground", pts: "0", label: "Miss" },
  }[tier];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wide ${p.cls}`}
    >
      <span className="text-xs font-black normal-case">{p.pts}</span>
      {p.label}
    </span>
  );
}
