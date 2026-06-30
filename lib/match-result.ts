// Pure helpers for the score predictions are graded against — post-extra-time,
// excluding penalty shoot-out goals. Safe to import from client code.

export type MatchResultInput = {
  homeScore: number | null;
  awayScore: number | null;
  homePens?: number | null;
  awayPens?: number | null;
};

/**
 * Score after extra time (120'), excluding penalty shoot-out goals.
 * football-data.org's score.fullTime includes pens when duration is
 * PENALTY_SHOOTOUT; subtract them when the stored row still carries that sum.
 */
export function postExtraTimeScore(
  match: MatchResultInput,
): { home: number; away: number } | null {
  if (match.homeScore == null || match.awayScore == null) return null;

  let home = match.homeScore;
  let away = match.awayScore;

  const ph = match.homePens;
  const pa = match.awayPens;
  if (ph != null && pa != null) {
    const afterEtHome = home - ph;
    const afterEtAway = away - pa;
    // Pens only happen after a draw; if subtracting yields one, fullTime likely
    // included shoot-out goals.
    if (afterEtHome === afterEtAway && afterEtHome >= 0 && afterEtAway >= 0) {
      home = afterEtHome;
      away = afterEtAway;
    }
  }

  return { home, away };
}
