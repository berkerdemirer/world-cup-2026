import { AppShell } from "@/components/app-shell";
import { requireAdmin } from "@/lib/session";
import { getMatchesWithTeams, type MatchWithTeams } from "@/lib/queries";
import { FIXTURE_TZ, fixtureSectionOf } from "@/lib/format";
import { PageHeader, SectionLabel } from "@/components/page-header";
import { ResultForm } from "./result-form";

export default async function AdminResultsPage() {
  await requireAdmin();
  const all = await getMatchesWithTeams();

  // Build ordered, de-duplicated sections (matches arrive sorted by kickoff).
  const sections: { key: string; label: string; matches: MatchWithTeams[] }[] = [];
  const byKey = new Map<string, (typeof sections)[number]>();
  for (const m of all) {
    const { key, label } = fixtureSectionOf(m, { timeZone: FIXTURE_TZ, weekday: "long" });
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
