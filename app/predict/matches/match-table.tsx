/* eslint-disable @next/next/no-img-element */
"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { Check, Loader2, Sparkles } from "lucide-react";
import { submitScorePrediction } from "@/app/actions/predictions";
import { LiveBadge } from "@/components/live-badge";
import { scoreTier } from "@/lib/score-tier";
import {
  FIXTURE_TZ,
  compareMatchesByKickoff,
  fixtureSectionOf,
  formatFixtureDate,
  formatFixtureTime,
  formatLiveClock,
} from "@/lib/format";
import { isMatchLive } from "@/lib/match-status";
import { cn } from "@/lib/utils";
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

export type TableRow = {
  match: MatchWithTeams;
  prediction: { homeScore: number; awayScore: number } | null;
  locked: boolean;
};

export type TableSection = { key: string; label: string; openCount: number; rows: TableRow[] };

function buildSections(rows: TableRow[]): TableSection[] {
  const sections: TableSection[] = [];
  const byKey = new Map<string, TableSection>();
  const sorted = [...rows].sort((a, b) => compareMatchesByKickoff(a.match, b.match));
  for (const row of sorted) {
    const { key, label } = fixtureSectionOf(row.match, { timeZone: FIXTURE_TZ });
    let section = byKey.get(key);
    if (!section) {
      section = { key, label, openCount: 0, rows: [] };
      byKey.set(key, section);
      sections.push(section);
    }
    section.rows.push(row);
    if (!row.locked) section.openCount++;
  }
  return sections;
}

export function MatchTable({
  rows,
  points,
}: {
  rows: TableRow[];
  points: MatchPoints;
}) {
  const sections = useMemo(() => buildSections(rows), [rows]);
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

  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-line bg-card/50 p-10 text-center text-muted-foreground">
        No upcoming or live matches right now. Check back when new fixtures are scheduled or
        browse your results in My Picks.
      </div>
    );
  }

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

      <div className="flex flex-col gap-4">
        {sections.map((s) => (
          <SectionCard
            key={s.key}
            section={s}
            points={points}
            luckyNonce={luckyNonce}
            registerFill={registerFill}
          />
        ))}
      </div>
    </>
  );
}

function SectionCard({
  section,
  points,
  luckyNonce,
  registerFill,
}: {
  section: TableSection;
  points: MatchPoints;
  luckyNonce: number;
  registerFill: (delta: number) => void;
}) {
  const header = (
    <>
      <span className="text-ink">{section.label}</span>
      {section.openCount > 0 ? (
        <span> · {section.openCount} open</span>
      ) : (
        <span> · {section.rows.length} match{section.rows.length === 1 ? "" : "es"}</span>
      )}
    </>
  );

  return (
    <div className="overflow-hidden rounded-2xl bg-card shadow-sm ring-1 ring-black/5">
      <div className="bg-cream px-4 py-2 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
        {header}
      </div>
      <div className="divide-y divide-line">
        {section.rows.map((r) => (
          <Row
            key={r.match.id}
            row={r}
            points={points}
            luckyNonce={luckyNonce}
            registerFill={registerFill}
          />
        ))}
      </div>
    </div>
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
  const live = isMatchLive(match);
  const liveClock = live ? formatLiveClock(match) : null;
  const hasScore = match.homeScore != null && match.awayScore != null;
  const settled = match.status === "FINISHED" && hasScore;

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

  // The same five blocks lay out as a single row on sm+ (time · home · score ·
  // away · action) and reflow on mobile into a card: meta + action share a top
  // line, and the matchup drops onto its own line below (the full-width spacer
  // forces the wrap). Ordering is purely CSS so each match keeps one instance
  // of its input state.
  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-x-2 gap-y-2.5 px-3 py-3 sm:flex-nowrap sm:gap-3",
        live ? "bg-brand/8 ring-1 ring-inset ring-brand/25" : "hover:bg-cream/40",
      )}
    >
      <div className="order-1 shrink-0 whitespace-nowrap text-xs font-bold uppercase tracking-wide text-muted-foreground">
        {live ? (
          <span className="inline-flex items-center gap-1.5">
            <LiveBadge status={match.status} minute={match.minute} injuryTime={match.injuryTime} />
            {!liveClock && <span suppressHydrationWarning className="sm:mt-0.5 sm:block">{formatFixtureTime(kickoff)}</span>}
          </span>
        ) : (
          <>
            <span suppressHydrationWarning className="text-ink">{formatFixtureTime(kickoff)}</span>
            <span className="sm:hidden"> · </span>
            <span suppressHydrationWarning className="sm:mt-0.5 sm:block">{formatFixtureDate(kickoff, { uppercase: true })}</span>
          </>
        )}
      </div>

      {/* Result badge — centered on the top line on mobile (between the date and
          the pick), tucked beside the pick on desktop. Only once the match is settled. */}
      <div className="order-2 shrink-0 sm:order-5 sm:w-[84px] sm:text-center">
        {settled && prediction && (
          <TierBadge match={match} prediction={prediction} points={points} />
        )}
      </div>

      {/* Action / result — top-right on mobile, last column on desktop. */}
      <div className="order-3 shrink-0 whitespace-nowrap text-right sm:order-6 sm:w-[104px]">
        {locked ? (
          !prediction ? (
            <span className="text-xs italic text-muted-foreground">No pick</span>
          ) : (
            <span className="text-xs font-medium text-muted-foreground">
              {settled ? "You picked" : "Picked"}{" "}
              <span className="font-bold text-ink">
                {prediction.homeScore}&ndash;{prediction.awayScore}
              </span>
            </span>
          )
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
      </div>

      {/* Full-width line break on mobile only — drops the matchup below the
          meta/action line. Removed at sm+ where everything is one row. */}
      <div className="order-4 w-full sm:hidden" aria-hidden="true" />

      <div className="order-5 min-w-0 flex-1 sm:order-2">
        <TeamLabel team={match.homeTeam} placeholder={match.homePlaceholder} side="home" />
      </div>

      <div className="order-6 w-[116px] shrink-0 sm:order-3">
        {!locked ? (
          <div className="flex items-center justify-center gap-1.5">
            {input(home, setHome, "Home score")}
            <span className="text-sm font-bold text-muted-foreground">:</span>
            {input(away, setAway, "Away score")}
          </div>
        ) : live ? (
          <div className="display text-center text-xl tabular-nums text-ink">
            {match.homeScore ?? 0}&ndash;{match.awayScore ?? 0}
          </div>
        ) : hasScore ? (
          <div className="display text-center text-xl text-ink">
            {match.homeScore}&ndash;{match.awayScore}
          </div>
        ) : (
          <div className="text-center text-xs font-semibold text-muted-foreground">Locked</div>
        )}
      </div>

      <div className="order-7 min-w-0 flex-1 sm:order-4">
        <TeamLabel team={match.awayTeam} placeholder={match.awayPlaceholder} side="away" />
      </div>
    </div>
  );
}

function TierBadge({
  match,
  prediction,
  points,
}: {
  match: MatchWithTeams;
  prediction: { homeScore: number; awayScore: number };
  points: MatchPoints;
}) {
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
