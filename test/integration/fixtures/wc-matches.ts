/**
 * A trimmed but shape-accurate slice of football-data.org's
 * GET /v4/competitions/WC/matches response. Only the fields lib/football-api.ts
 * reads are populated, but the structure (score.fullTime, score.penalties,
 * nested team objects, GROUP_x labels, stage strings) matches the real API so
 * the sync parser is exercised the same way it will be on match day.
 *
 * Covered scenarios:
 *  - GROUP_STAGE finished match with a clean result        (id 1)
 *  - GROUP_STAGE finished draw                             (id 2)
 *  - GROUP_STAGE not-yet-started match (TIMED)            (id 3)
 *  - GROUP_STAGE live match with a partial score (IN_PLAY) (id 4)
 *  - LAST_16 knockout decided in regulation               (id 100)
 *  - LAST_16 knockout decided on penalties after a draw    (id 101)
 *  - LAST_16 knockout with an unresolved (placeholder) side (id 102)
 *  - FINAL finished, winner advances                       (id 200)
 */

export const TEAMS = {
  brazil: { id: 764, name: "Brazil", shortName: "Brazil", tla: "BRA", crest: "https://crests/bra.png" },
  serbia: { id: 762, name: "Serbia", shortName: "Serbia", tla: "SRB", crest: "https://crests/srb.png" },
  spain: { id: 760, name: "Spain", shortName: "Spain", tla: "ESP", crest: "https://crests/esp.png" },
  croatia: { id: 799, name: "Croatia", shortName: "Croatia", tla: "CRO", crest: "https://crests/cro.png" },
  france: { id: 773, name: "France", shortName: "France", tla: "FRA", crest: "https://crests/fra.png" },
  argentina: { id: 762000, name: "Argentina", shortName: "Argentina", tla: "ARG", crest: "https://crests/arg.png" },
  portugal: { id: 765, name: "Portugal", shortName: "Portugal", tla: "POR", crest: "https://crests/por.png" },
  morocco: { id: 815, name: "Morocco", shortName: "Morocco", tla: "MAR", crest: "https://crests/mar.png" },
} as const;

const nullTeam = (placeholder: string) => ({
  id: null,
  name: placeholder,
  shortName: null,
  tla: null,
  crest: null,
});

export interface FixtureOptions {
  /** ISO base used for kickoff times; defaults to a date well in the past so
   *  "finished" matches read as locked and future ones as open. */
  now?: Date;
}

/** Build the matches payload. Times are relative to `now` so lock tests are stable. */
export function wcMatchesPayload(now = new Date("2026-06-15T00:00:00Z")) {
  const t = now.getTime();
  const hrs = (h: number) => new Date(t + h * 3600_000).toISOString();

  return {
    matches: [
      // --- Group stage -------------------------------------------------------
      {
        id: 1,
        utcDate: hrs(-48),
        status: "FINISHED",
        matchday: 1,
        stage: "GROUP_STAGE",
        group: "GROUP_A",
        homeTeam: TEAMS.brazil,
        awayTeam: TEAMS.serbia,
        score: { winner: "HOME_TEAM", duration: "REGULAR", fullTime: { home: 2, away: 0 }, halfTime: { home: 1, away: 0 } },
      },
      {
        id: 2,
        utcDate: hrs(-46),
        status: "FINISHED",
        matchday: 1,
        stage: "GROUP_STAGE",
        group: "GROUP_B",
        homeTeam: TEAMS.spain,
        awayTeam: TEAMS.croatia,
        score: { winner: "DRAW", duration: "REGULAR", fullTime: { home: 1, away: 1 }, halfTime: { home: 0, away: 1 } },
      },
      {
        id: 3,
        utcDate: hrs(+48),
        status: "TIMED",
        matchday: 2,
        stage: "GROUP_STAGE",
        group: "GROUP_A",
        homeTeam: TEAMS.brazil,
        awayTeam: TEAMS.spain,
        score: { winner: null, duration: "REGULAR", fullTime: { home: null, away: null }, halfTime: { home: null, away: null } },
      },
      {
        id: 4,
        utcDate: hrs(-1),
        status: "IN_PLAY",
        minute: 67,
        injuryTime: null,
        matchday: 2,
        stage: "GROUP_STAGE",
        group: "GROUP_B",
        homeTeam: TEAMS.serbia,
        awayTeam: TEAMS.croatia,
        score: { winner: "AWAY_TEAM", duration: "REGULAR", fullTime: { home: 0, away: 1 }, halfTime: { home: 0, away: 1 } },
      },

      // --- Knockouts ---------------------------------------------------------
      {
        id: 100,
        utcDate: hrs(+72),
        status: "FINISHED",
        matchday: null,
        stage: "LAST_16",
        group: null,
        homeTeam: TEAMS.france,
        awayTeam: TEAMS.morocco,
        score: { winner: "HOME_TEAM", duration: "REGULAR", fullTime: { home: 2, away: 1 }, halfTime: { home: 1, away: 0 } },
      },
      {
        // Draw after extra time, decided on penalties: Portugal advances 4-2.
        id: 101,
        utcDate: hrs(+74),
        status: "FINISHED",
        matchday: null,
        stage: "LAST_16",
        group: null,
        homeTeam: TEAMS.portugal,
        awayTeam: TEAMS.argentina,
        score: {
          winner: "DRAW",
          duration: "PENALTY_SHOOTOUT",
          fullTime: { home: 1, away: 1 },
          halfTime: { home: 0, away: 1 },
          penalties: { home: 4, away: 2 },
        },
      },
      {
        // One side not yet resolved — API sends a placeholder team with id: null.
        id: 102,
        utcDate: hrs(+76),
        status: "TIMED",
        matchday: null,
        stage: "LAST_16",
        group: null,
        homeTeam: TEAMS.spain,
        awayTeam: nullTeam("Winner Group C"),
        score: { winner: null, duration: "REGULAR", fullTime: { home: null, away: null } },
      },
      {
        id: 200,
        utcDate: hrs(+120),
        status: "FINISHED",
        matchday: null,
        stage: "FINAL",
        group: null,
        homeTeam: TEAMS.france,
        awayTeam: TEAMS.portugal,
        score: { winner: "HOME_TEAM", duration: "REGULAR", fullTime: { home: 3, away: 1 }, halfTime: { home: 2, away: 0 } },
      },
    ],
  };
}

export type WcMatchesPayload = ReturnType<typeof wcMatchesPayload>;
