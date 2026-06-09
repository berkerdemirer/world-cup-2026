import { AppShell } from "@/components/app-shell";
import { requireUser } from "@/lib/session";
import {
  getMatchesWithTeams,
  getUserScorePredictions,
  isMatchLocked,
  type MatchWithTeams,
} from "@/lib/queries";
import { getSettings } from "@/lib/scoring";
import { STAGE_LABELS } from "@/lib/format";
import { PageHeader } from "@/components/page-header";
import { LiveRefresh } from "@/components/live-refresh";
import { MatchTable, type MatchPoints } from "./match-table";
import Link from "next/link";
import { BookOpen } from "lucide-react";

type FixtureSection = { key: string; label: string; matches: MatchWithTeams[] };

/** Group-stage matches are grouped by calendar day; knockout matches by round. */
function sectionOf(m: MatchWithTeams): { key: string; label: string } {
  if (m.stage === "GROUP_STAGE") {
    const d = new Date(m.kickoffAt);
    const key = `d${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(
      d.getDate(),
    ).padStart(2, "0")}`;
    const label = d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
    return { key, label };
  }
  return { key: m.stage, label: STAGE_LABELS[m.stage] };
}

export default async function FixturesPage() {
  const session = await requireUser();
  const [allMatches, predictions, settings] = await Promise.all([
    getMatchesWithTeams(),
    getUserScorePredictions(session.userId),
    getSettings(),
  ]);

  const points: MatchPoints = {
    exact: settings.ptsExact,
    goalDiff: settings.ptsGoalDiff,
    outcome: settings.ptsOutcome,
  };

  // Build ordered, de-duplicated sections (matches arrive sorted by kickoff).
  const sections: FixtureSection[] = [];
  const byKey = new Map<string, FixtureSection>();
  for (const m of allMatches) {
    const { key, label } = sectionOf(m);
    let s = byKey.get(key);
    if (!s) {
      s = { key, label, matches: [] };
      byKey.set(key, s);
      sections.push(s);
    }
    s.matches.push(m);
  }

  const totalOpen = allMatches.filter((m) => !isMatchLocked(m)).length;

  return (
    <AppShell>
      <LiveRefresh intervalMs={settings.liveSyncSeconds * 1000} />
      <PageHeader
        title="Fixtures"
        subtitle={
          sections.length === 0
            ? "No fixtures loaded yet"
            : `All ${allMatches.length} matches · ${
                totalOpen > 0 ? `${totalOpen} open for predictions` : "all locked"
              }`
        }
        right={
          <Link
            href="/how-to-play"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-card px-3.5 py-2 text-sm font-semibold text-ink shadow-sm ring-1 ring-black/5 transition-colors hover:bg-line/50"
          >
            <BookOpen className="size-4" strokeWidth={2.25} />
            Rules
          </Link>
        }
      />

      {sections.length === 0 ? (
        <EmptyState />
      ) : (
        <MatchTable
          sections={sections.map((s) => ({
            key: s.key,
            label: s.label,
            openCount: s.matches.filter((m) => !isMatchLocked(m)).length,
            rows: s.matches.map((m) => ({
              match: m,
              prediction: predictions.get(m.id) ?? null,
              locked: isMatchLocked(m),
            })),
          }))}
          points={points}
        />
      )}
    </AppShell>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-dashed border-line bg-card/50 p-10 text-center text-muted-foreground">
      No fixtures loaded yet. An admin needs to run a data sync from the{" "}
      <span className="font-medium text-ink">Admin → Sync</span> panel.
    </div>
  );
}
