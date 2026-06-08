import { AppShell } from "@/components/app-shell";
import { requireAdmin } from "@/lib/session";
import { getMatchesWithTeams, type MatchWithTeams } from "@/lib/queries";
import { STAGE_LABELS } from "@/lib/format";
import { PageHeader, SectionLabel } from "@/components/page-header";
import { ResultForm } from "./result-form";

/** Group-stage matches group by calendar day; knockout matches by round. */
function sectionOf(m: MatchWithTeams): { key: string; label: string } {
  if (m.stage === "GROUP_STAGE") {
    const d = new Date(m.kickoffAt);
    const key = `d${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(
      d.getDate(),
    ).padStart(2, "0")}`;
    const label = d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
    return { key, label };
  }
  return { key: m.stage, label: STAGE_LABELS[m.stage] };
}

export default async function AdminResultsPage() {
  await requireAdmin();
  const all = await getMatchesWithTeams();

  // Build ordered, de-duplicated sections (matches arrive sorted by kickoff).
  const sections: { key: string; label: string; matches: MatchWithTeams[] }[] = [];
  const byKey = new Map<string, (typeof sections)[number]>();
  for (const m of all) {
    const { key, label } = sectionOf(m);
    let s = byKey.get(key);
    if (!s) {
      s = { key, label, matches: [] };
      byKey.set(key, s);
      sections.push(s);
    }
    s.matches.push(m);
  }

  return (
    <AppShell>
      <PageHeader
        title="Enter / override results"
        subtitle="Saving marks a match as manual — the API sync will never overwrite it afterwards."
      />

      {all.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-card/50 p-10 text-center text-muted-foreground">
          No matches yet — run a sync first.
        </div>
      ) : (
        sections.map((s) => (
          <section key={s.key}>
            <SectionLabel className="pt-6 pb-2">{s.label}</SectionLabel>
            <div className="space-y-2">
              {s.matches.map((m) => (
                <ResultForm key={m.id} match={m} />
              ))}
            </div>
          </section>
        ))
      )}
    </AppShell>
  );
}
