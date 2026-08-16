import { describe, expect, it } from "vitest";
import { validateSeason } from "./validate.mjs";

/**
 * Builds a synthetic but structurally faithful ESPN season payload for a
 * 4-team league: 6 regular-season matchup periods plus a two-round playoff.
 * Every check in the validator is exercised against a season we know the
 * truth about, so the gate is trusted before it ever sees real league data.
 */
function buildSeason(overrides = {}) {
  const teams = [1, 2, 3, 4].map(id => ({
    id,
    name: `Team ${id}`,
    owners: [`{OWNER-${id}}`],
    rankCalculatedFinal: 0,
    record: { overall: { wins: 0, losses: 0, ties: 0 } },
  }));

  const members = teams.map(t => ({
    id: t.owners[0],
    displayName: `owner${t.id}`,
  }));

  const schedule = [];
  const game = (period, homeId, awayId, homeScore, awayScore, tier = "NONE") => ({
    id: schedule.length + 1,
    matchupPeriodId: period,
    playoffTierType: tier,
    winner: homeScore > awayScore ? "HOME" : awayScore > homeScore ? "AWAY" : "TIE",
    home: { teamId: homeId, totalPoints: homeScore },
    away: { teamId: awayId, totalPoints: awayScore },
  });

  // Regular season: team 1 wins every week, team 4 loses every week.
  for (let period = 1; period <= 6; period++) {
    schedule.push(game(period, 1, 4, 120.5, 90.25));
    schedule.push(game(period, 2, 3, 110.75, 100.5));
  }

  // Playoffs: semifinal then final, winners bracket.
  schedule.push(game(7, 1, 3, 130.0, 99.5, "WINNERS_BRACKET"));
  schedule.push(game(7, 2, 4, 125.0, 88.0, "WINNERS_BRACKET"));
  schedule.push(game(8, 1, 2, 140.5, 120.0, "WINNERS_BRACKET"));

  // Reported records reflect the regular season only.
  const reported = { 1: [6, 0], 2: [6, 0], 3: [0, 6], 4: [0, 6] };
  for (const team of teams) {
    const [wins, losses] = reported[team.id];
    team.record.overall = { wins, losses, ties: 0 };
  }
  teams.find(t => t.id === 1).rankCalculatedFinal = 1;

  const payload = {
    season: {
      settings: {
        name: "Test League",
        scheduleSettings: {
          matchupPeriodCount: 6,
          playoffTeamCount: 4,
          playoffMatchupPeriodLength: 1,
        },
      },
      teams,
      members,
      schedule,
    },
  };

  return overrides.mutate ? overrides.mutate(payload) : payload;
}

describe("history validator", () => {
  it("passes a complete, self-consistent season", () => {
    const result = validateSeason(2021, buildSeason());

    expect(result.verdict).toBe("READY");
    expect(result.problems).toEqual([]);
    expect(result.teams).toBe(4);
  });

  it("derives the champion from the playoff bracket, not from win totals", () => {
    // Teams 1 and 2 both finish 6-0; only the bracket separates them.
    const result = validateSeason(2021, buildSeason());

    expect(result.champion).toBe("Team 1");
    expect(result.championSource).toBe("playoff bracket");
  });

  it("holds a season when the bracket and final standings disagree", () => {
    const result = validateSeason(
      2021,
      buildSeason({
        mutate: payload => {
          // ESPN's final rank says Team 2 won; the bracket says Team 1.
          for (const team of payload.season.teams) {
            team.rankCalculatedFinal = team.id === 2 ? 1 : 0;
          }
          return payload;
        },
      })
    );

    expect(result.verdict).toBe("NEEDS REVIEW");
    expect(result.problems.join(" ")).toMatch(/champion disagreement/i);
  });

  it("catches a week that is missing games", () => {
    const result = validateSeason(
      2021,
      buildSeason({
        mutate: payload => {
          payload.season.schedule = payload.season.schedule.filter(
            g => !(g.matchupPeriodId === 3 && g.home.teamId === 2)
          );
          return payload;
        },
      })
    );

    expect(result.verdict).toBe("NEEDS REVIEW");
    expect(result.problems.join(" ")).toMatch(/week 3: 1 games, expected 2/);
  });

  it("catches a team scheduled twice in the same week", () => {
    // This is the signature of the playoff-week duplication bug that
    // corrupted the original import.
    const result = validateSeason(
      2021,
      buildSeason({
        mutate: payload => {
          payload.season.schedule.push({
            id: 999,
            matchupPeriodId: 4,
            playoffTierType: "NONE",
            winner: "HOME",
            home: { teamId: 1, totalPoints: 100 },
            away: { teamId: 2, totalPoints: 90 },
          });
          return payload;
        },
      })
    );

    expect(result.verdict).toBe("NEEDS REVIEW");
    expect(result.problems.join(" ")).toMatch(/appears in two games/);
  });

  it("catches records that disagree with what ESPN reports", () => {
    const result = validateSeason(
      2021,
      buildSeason({
        mutate: payload => {
          payload.season.teams.find(t => t.id === 1).record.overall = {
            wins: 5,
            losses: 1,
            ties: 0,
          };
          return payload;
        },
      })
    );

    expect(result.verdict).toBe("NEEDS REVIEW");
    expect(result.problems.join(" ")).toMatch(/record mismatch/i);
  });

  it("holds a season that has not finished", () => {
    const result = validateSeason(
      2026,
      buildSeason({
        mutate: payload => {
          for (const game of payload.season.schedule) {
            game.winner = "UNDECIDED";
            game.home.totalPoints = 0;
            game.away.totalPoints = 0;
          }
          return payload;
        },
      })
    );

    expect(result.verdict).toBe("NEEDS REVIEW");
    expect(result.problems.join(" ")).toMatch(/not finished/);
  });

  it("flags teams with no owner id for manual assignment", () => {
    const result = validateSeason(
      2021,
      buildSeason({
        mutate: payload => {
          payload.season.teams.find(t => t.id === 3).owners = [];
          return payload;
        },
      })
    );

    expect(result.notes.join(" ")).toMatch(/no owner id/);
  });

  it("reports co-owned teams so both owners can be credited", () => {
    const result = validateSeason(
      2021,
      buildSeason({
        mutate: payload => {
          const team = payload.season.teams.find(t => t.id === 2);
          team.owners = ["{OWNER-2}", "{OWNER-2B}"];
          payload.season.members.push({
            id: "{OWNER-2B}",
            displayName: "coowner",
          });
          return payload;
        },
      })
    );

    expect(result.coOwned).toBe(1);
    expect(result.verdict).toBe("READY");
  });
});
