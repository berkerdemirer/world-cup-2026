import { AppShell } from "@/components/app-shell";
import { TournamentNav } from "@/components/tournament-nav";
import { PageHeader } from "@/components/page-header";
import { LiveRefresh } from "@/components/live-refresh";
import { getGroupStandings } from "@/lib/queries";
import { getSettings } from "@/lib/scoring";
import type { GroupStandingRow } from "@/lib/group-standings";

function GroupTable({ groupLabel, rows }: { groupLabel: string; rows: GroupStandingRow[] }) {
  return (
    <div className="overflow-hidden rounded-2xl bg-card shadow-sm ring-1 ring-black/5">
      <div className="bg-cream px-4 py-2 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
        Group {groupLabel}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[360px] text-sm">
          <thead>
            <tr className="border-b border-line text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              <th className="px-3 py-2 sm:px-4">#</th>
              <th className="px-3 py-2 sm:px-4">Team</th>
              <th className="px-2 py-2 text-center">P</th>
              <th className="px-2 py-2 text-center">W</th>
              <th className="px-2 py-2 text-center">D</th>
              <th className="px-2 py-2 text-center">L</th>
              <th className="hidden px-2 py-2 text-center sm:table-cell">GF</th>
              <th className="hidden px-2 py-2 text-center sm:table-cell">GA</th>
              <th className="px-2 py-2 text-center">GD</th>
              <th className="px-3 py-2 text-center sm:px-4">Pts</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((row, i) => {
              const qualifies = i < 2;
              return (
                <tr
                  key={row.team.id}
                  className={qualifies && row.played > 0 ? "bg-brand/5" : undefined}
                >
                  <td className="px-3 py-2.5 text-muted-foreground sm:px-4">{i + 1}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 font-semibold text-ink sm:px-4">
                    <span className="inline-flex items-center gap-2">
                      {row.team.crestUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={row.team.crestUrl}
                          alt=""
                          className="size-5 shrink-0 object-contain"
                        />
                      ) : (
                        <span className="grid size-5 shrink-0 place-items-center rounded-full bg-line text-[8px] font-bold">
                          {row.team.tla ?? "?"}
                        </span>
                      )}
                      <span>{row.team.tla ?? row.team.shortName ?? row.team.name}</span>
                    </span>
                  </td>
                  <td className="px-2 py-2.5 text-center text-muted-foreground">{row.played}</td>
                  <td className="px-2 py-2.5 text-center text-muted-foreground">{row.won}</td>
                  <td className="px-2 py-2.5 text-center text-muted-foreground">{row.drawn}</td>
                  <td className="px-2 py-2.5 text-center text-muted-foreground">{row.lost}</td>
                  <td className="hidden px-2 py-2.5 text-center text-muted-foreground sm:table-cell">
                    {row.goalsFor}
                  </td>
                  <td className="hidden px-2 py-2.5 text-center text-muted-foreground sm:table-cell">
                    {row.goalsAgainst}
                  </td>
                  <td
                    className={`px-2 py-2.5 text-center font-semibold ${
                      row.goalDiff > 0
                        ? "text-royal"
                        : row.goalDiff < 0
                          ? "text-red-600"
                          : "text-muted-foreground"
                    }`}
                  >
                    {row.goalDiff > 0 ? `+${row.goalDiff}` : row.goalDiff}
                  </td>
                  <td className="px-3 py-2.5 text-center sm:px-4">
                    <span className="display text-base text-ink">{row.points}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default async function GroupStandingsPage() {
  const [groups, settings] = await Promise.all([getGroupStandings(), getSettings()]);

  return (
    <AppShell>
      <LiveRefresh intervalMs={settings.liveSyncSeconds * 1000} />
      <PageHeader
        title="Group standings"
        subtitle="Live tables from real results. Top two in each group advance to the Round of 32."
      />
      <TournamentNav />

      {groups.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-card/50 p-10 text-center text-muted-foreground">
          No group-stage data yet. Tables will appear once fixtures are synced.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {groups.map((g) => (
            <GroupTable key={g.groupLabel} groupLabel={g.groupLabel} rows={g.rows} />
          ))}
        </div>
      )}
    </AppShell>
  );
}
