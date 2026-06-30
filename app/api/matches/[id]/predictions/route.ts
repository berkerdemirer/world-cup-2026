import { NextResponse } from "next/server";
import { getMatchPredictions, getMatchWithTeams } from "@/lib/queries";
import { getCurrentUser } from "@/lib/session";
import { scoreTier, pointsForTier, getSettings } from "@/lib/scoring";
import { postExtraTimeScore } from "@/lib/match-result";
import { STAGE_LABELS } from "@/lib/format";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const matchId = Number(id);
  if (!Number.isInteger(matchId)) {
    return NextResponse.json({ error: "Invalid match" }, { status: 400 });
  }

  const match = await getMatchWithTeams(matchId);
  if (!match) {
    return NextResponse.json({ error: "Match not found" }, { status: 404 });
  }

  if (match.status !== "FINISHED" || match.homeScore == null || match.awayScore == null) {
    return NextResponse.json({ error: "Match is not finished" }, { status: 400 });
  }

  const actual = postExtraTimeScore(match)!;

  const [rawPredictions, settings] = await Promise.all([
    getMatchPredictions(matchId),
    getSettings(),
  ]);

  const predictions = rawPredictions.map((p) => {
    const tier = scoreTier(p.homeScore, p.awayScore, actual.home, actual.away);
    return {
      displayName: p.displayName,
      homeScore: p.homeScore,
      awayScore: p.awayScore,
      tier,
      points: pointsForTier(tier, settings),
    };
  });

  return NextResponse.json({
    match: {
      id: match.id,
      stage: match.stage,
      stageLabel: STAGE_LABELS[match.stage],
      kickoffAt: match.kickoffAt,
      homeScore: actual.home,
      awayScore: actual.away,
      homePens: match.homePens,
      awayPens: match.awayPens,
      homeTeam: match.homeTeam,
      awayTeam: match.awayTeam,
      homePlaceholder: match.homePlaceholder,
      awayPlaceholder: match.awayPlaceholder,
    },
    predictions,
  });
}
