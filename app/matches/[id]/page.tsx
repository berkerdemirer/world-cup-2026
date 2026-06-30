import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { LiveRefresh } from "@/components/live-refresh";
import { requireUser } from "@/lib/session";
import { getMatchWithTeams, getMatchPredictions, isMatchLocked } from "@/lib/queries";
import { LiveBadge } from "@/components/live-badge";
import { TeamBadge } from "@/components/team-badge";
import { STAGE_LABELS } from "@/lib/format";
import { isMatchLive } from "@/lib/match-status";
import { scoreTier, pointsForTier, getSettings, type ScoreTier } from "@/lib/scoring";
import { postExtraTimeScore } from "@/lib/match-result";

const TIER_LABEL: Record<ScoreTier, string> = {
  exact: "Exact",
  goal_diff: "Goal diff",
  outcome: "Result",
  none: "—",
};

export default async function MatchDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUser();
  const { id } = await params;
  const matchId = Number(id);
  if (!Number.isInteger(matchId)) notFound();

  const match = await getMatchWithTeams(matchId);
  if (!match) notFound();

  const locked = isMatchLocked(match);
  const live = isMatchLive(match);
  const finished = match.status === "FINISHED";
  const result = finished ? postExtraTimeScore(match) : null;
  const settings = await getSettings();
  const predictions = locked ? await getMatchPredictions(matchId) : [];

  return (
    <AppShell>
      {!finished && <LiveRefresh intervalMs={settings.liveSyncSeconds * 1000} />}
      <div className="mb-4 text-sm text-slate-500">{STAGE_LABELS[match.stage]}</div>

      <div
        className={`mb-6 grid grid-cols-[1fr_auto_1fr] items-center gap-4 rounded-xl border bg-white p-5 ${
          live ? "border-brand/40 ring-1 ring-brand/20" : "border-slate-200"
        }`}
      >
        <div className="justify-self-end text-lg">
          <TeamBadge team={match.homeTeam} placeholder={match.homePlaceholder} align="right" />
        </div>
        <div className="text-center">
          {live && (
            <LiveBadge className="mb-2 justify-center" status={match.status} minute={match.minute} injuryTime={match.injuryTime} />
          )}
          <div className="font-mono text-2xl font-bold text-slate-900">
            {finished && result
              ? `${result.home} : ${result.away}`
              : live
                ? `${match.homeScore ?? 0} : ${match.awayScore ?? 0}`
                : "vs"}
          </div>
          {finished && match.homePens != null && match.awayPens != null && (
            <div className="text-xs text-slate-500">
              pens {match.homePens}–{match.awayPens}
            </div>
          )}
          <div className="mt-1 text-xs text-slate-400">
            {new Date(match.kickoffAt).toLocaleString()}
          </div>
        </div>
        <div className="justify-self-start text-lg">
          <TeamBadge team={match.awayTeam} placeholder={match.awayPlaceholder} align="left" />
        </div>
      </div>

      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
        Everyone&apos;s predictions
      </h2>

      {!locked ? (
        <p className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-400">
          Predictions are hidden until kickoff.
        </p>
      ) : predictions.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-400">
          Nobody predicted this match.
        </p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-2.5">Player</th>
                <th className="px-4 py-2.5 text-center">Pick</th>
                {finished && <th className="px-4 py-2.5 text-right">Result</th>}
                {finished && <th className="px-4 py-2.5 text-right">Pts</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {predictions.map((p) => {
                const tier =
                  finished && result
                    ? scoreTier(p.homeScore, p.awayScore, result.home, result.away)
                    : null;
                return (
                  <tr key={p.displayName}>
                    <td className="px-4 py-2.5 font-medium text-slate-800">{p.displayName}</td>
                    <td className="px-4 py-2.5 text-center font-mono text-slate-700">
                      {p.homeScore}:{p.awayScore}
                    </td>
                    {finished && (
                      <td className="px-4 py-2.5 text-right text-slate-500">
                        {tier ? TIER_LABEL[tier] : "—"}
                      </td>
                    )}
                    {finished && (
                      <td className="px-4 py-2.5 text-right font-semibold text-slate-900">
                        {tier ? pointsForTier(tier, settings) : 0}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </AppShell>
  );
}
