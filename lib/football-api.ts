import "server-only";
import { db } from "@/db";
import { teams, matches, type Stage, type MatchStatus } from "@/db/schema";
import { recomputeScores } from "@/lib/scoring";

const BASE = "https://api.football-data.org/v4";
const COMPETITION = "WC"; // FIFA World Cup

// ---- football-data.org v4 response shapes (only fields we use) ----
interface ApiTeam {
  id: number | null;
  name: string | null;
  shortName?: string | null;
  tla?: string | null;
  crest?: string | null;
}

interface ApiScoreHalf {
  home: number | null;
  away: number | null;
}

interface ApiMatch {
  id: number;
  utcDate: string;
  status: string;
  matchday: number | null;
  stage: string;
  group: string | null;
  homeTeam: ApiTeam;
  awayTeam: ApiTeam;
  score: {
    winner: "HOME_TEAM" | "AWAY_TEAM" | "DRAW" | null;
    duration?: string;
    fullTime: ApiScoreHalf;
    halfTime?: ApiScoreHalf;
    penalties?: ApiScoreHalf;
  };
}

function token(): string {
  const t = process.env.FOOTBALL_DATA_TOKEN;
  if (!t) throw new Error("FOOTBALL_DATA_TOKEN is not set.");
  return t;
}

async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "X-Auth-Token": token() },
    // Always fetch fresh data for the sync job.
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`football-data.org ${path} -> ${res.status} ${res.statusText} ${body}`);
  }
  return res.json() as Promise<T>;
}

function normalizeStage(stage: string): Stage {
  const known: Stage[] = [
    "GROUP_STAGE",
    "LAST_32",
    "LAST_16",
    "QUARTER_FINALS",
    "SEMI_FINALS",
    "THIRD_PLACE",
    "FINAL",
  ];
  return (known.find((s) => s === stage) ?? "GROUP_STAGE") as Stage;
}

function groupLabel(group: string | null): string | null {
  if (!group) return null;
  // API gives e.g. "GROUP_A"
  return group.replace(/^GROUP_/, "");
}

/** Resolve which team advanced from a knockout match, including penalties. */
function advancingTeam(m: ApiMatch): number | null {
  if (m.stage === "GROUP_STAGE") return null;
  if (m.status !== "FINISHED") return null;
  const hId = m.homeTeam.id;
  const aId = m.awayTeam.id;
  if (hId == null || aId == null) return null;

  const h = m.score.fullTime.home ?? 0;
  const a = m.score.fullTime.away ?? 0;
  if (h !== a) return h > a ? hId : aId;

  const ph = m.score.penalties?.home;
  const pa = m.score.penalties?.away;
  if (ph != null && pa != null && ph !== pa) return ph > pa ? hId : aId;

  if (m.score.winner === "HOME_TEAM") return hId;
  if (m.score.winner === "AWAY_TEAM") return aId;
  return null;
}

async function upsertTeam(t: ApiTeam): Promise<number | null> {
  if (t.id == null || !t.name) return null;
  await db
    .insert(teams)
    .values({
      id: t.id,
      name: t.name,
      shortName: t.shortName ?? null,
      tla: t.tla ?? null,
      crestUrl: t.crest ?? null,
    })
    .onConflictDoUpdate({
      target: teams.id,
      set: {
        name: t.name,
        shortName: t.shortName ?? null,
        tla: t.tla ?? null,
        crestUrl: t.crest ?? null,
      },
    });
  return t.id;
}

export interface SyncResult {
  matchesSeen: number;
  matchesUpdated: number;
  manualSkipped: number;
}

/**
 * Pull all WC matches and upsert teams + matches. Rows whose source = 'manual'
 * are never overwritten, so admin corrections stick. Recomputes the leaderboard.
 */
export async function syncMatches(): Promise<SyncResult> {
  const data = await apiGet<{ matches: ApiMatch[] }>(`/competitions/${COMPETITION}/matches`);

  let updated = 0;
  let manualSkipped = 0;

  // Existing rows tell us which ones are manual (protected).
  const existing = await db
    .select({ id: matches.id, source: matches.source })
    .from(matches);
  const sourceById = new Map(existing.map((e) => [e.id, e.source] as const));

  for (const m of data.matches) {
    if (sourceById.get(m.id) === "manual") {
      manualSkipped++;
      continue;
    }

    const homeTeamId = await upsertTeam(m.homeTeam);
    const awayTeamId = await upsertTeam(m.awayTeam);

    const stage = normalizeStage(m.stage);
    const finished = m.status === "FINISHED";

    const values = {
      id: m.id,
      stage,
      groupLabel: groupLabel(m.group),
      matchday: m.matchday ?? null,
      homeTeamId,
      awayTeamId,
      homePlaceholder: homeTeamId == null ? (m.homeTeam.name ?? null) : null,
      awayPlaceholder: awayTeamId == null ? (m.awayTeam.name ?? null) : null,
      kickoffAt: new Date(m.utcDate),
      status: m.status as MatchStatus,
      homeScore: finished ? m.score.fullTime.home ?? null : null,
      awayScore: finished ? m.score.fullTime.away ?? null : null,
      homePens: m.score.penalties?.home ?? null,
      awayPens: m.score.penalties?.away ?? null,
      advancingTeamId: advancingTeam(m),
      source: "api" as const,
      updatedAt: new Date(),
    };

    await db
      .insert(matches)
      .values(values)
      .onConflictDoUpdate({
        target: matches.id,
        set: {
          stage: values.stage,
          groupLabel: values.groupLabel,
          matchday: values.matchday,
          homeTeamId: values.homeTeamId,
          awayTeamId: values.awayTeamId,
          homePlaceholder: values.homePlaceholder,
          awayPlaceholder: values.awayPlaceholder,
          kickoffAt: values.kickoffAt,
          status: values.status,
          homeScore: values.homeScore,
          awayScore: values.awayScore,
          homePens: values.homePens,
          awayPens: values.awayPens,
          advancingTeamId: values.advancingTeamId,
          updatedAt: values.updatedAt,
        },
      });
    updated++;
  }

  await recomputeScores();

  return { matchesSeen: data.matches.length, matchesUpdated: updated, manualSkipped };
}

/** Light connectivity check used by the admin panel. */
export async function apiHealthCheck(): Promise<{ ok: boolean; message: string }> {
  try {
    await apiGet<unknown>(`/competitions/${COMPETITION}`);
    return { ok: true, message: "Connected to football-data.org" };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Unknown error" };
  }
}
