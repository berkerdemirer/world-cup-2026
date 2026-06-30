import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { bracketPredictions } from "@/db/schema";
import { getMatchPredictions, getMatchWithTeams } from "@/lib/queries";
import { getCurrentUser } from "@/lib/session";
import {
  scoreTier,
  pointsForTier,
  bracketPointsForRound,
  getSettings,
  STAGE_TO_BRACKET_ROUND,
  NEXT_BRACKET_ROUND,
} from "@/lib/scoring";
import { postExtraTimeScore, advancingTeamFromResult } from "@/lib/match-result";
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

  const currentBracketRound = STAGE_TO_BRACKET_ROUND[match.stage] ?? null;
  const nextBracketRound = currentBracketRound ? (NEXT_BRACKET_ROUND[currentBracketRound] ?? null) : null;
  const advancingTeamId = advancingTeamFromResult({
    homeTeamId: match.homeTeamId,
    awayTeamId: match.awayTeamId,
    homeScore: match.homeScore,
    awayScore: match.awayScore,
    homePens: match.homePens,
    awayPens: match.awayPens,
  });

  const [rawPredictions, settings] = await Promise.all([
    getMatchPredictions(matchId),
    getSettings(),
  ]);

  // For knockout matches, fetch each user's bracket pick for the next round (home or away team).
  type BracketPickRow = { userId: string; pickedTeamId: number };
  const bracketPickByUserId = new Map<string, BracketPickRow>();
  if (nextBracketRound && match.homeTeamId != null && match.awayTeamId != null) {
    const rows = await db
      .select({ userId: bracketPredictions.userId, pickedTeamId: bracketPredictions.pickedTeamId })
      .from(bracketPredictions)
      .where(
        eq(bracketPredictions.round, nextBracketRound),
      );
    // Only keep picks for one of the two teams in this match.
    const matchTeams = new Set([match.homeTeamId, match.awayTeamId]);
    for (const r of rows) {
      if (matchTeams.has(r.pickedTeamId)) bracketPickByUserId.set(r.userId, r);
    }
  }

  const bracketPts = nextBracketRound ? bracketPointsForRound(nextBracketRound, settings) : 0;

  const predictions = rawPredictions.map((p) => {
    const tier = scoreTier(p.homeScore, p.awayScore, actual.home, actual.away);
    const bracketPick = nextBracketRound ? (bracketPickByUserId.get(p.userId) ?? null) : null;
    const bracketPoints = bracketPick != null
      ? (bracketPick.pickedTeamId === advancingTeamId ? bracketPts : 0)
      : null;
    return {
      displayName: p.displayName,
      homeScore: p.homeScore,
      awayScore: p.awayScore,
      tier,
      points: pointsForTier(tier, settings),
      bracketPickTeamId: bracketPick?.pickedTeamId ?? null,
      bracketPoints,
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
      advancingTeamId,
      nextBracketRound,
    },
    predictions,
  });
}
