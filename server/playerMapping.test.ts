import { describe, it, expect } from "vitest";
import { mapRawPlayer, mapRawBoxScores, isStartingSlot } from "./playerMapping";
import { compareLineups, projectedTotal } from "../shared/lineupComparison";
const entry = {
  lineupSlotId: 4,
  playerPoolEntry: {
    player: {
      id: 4241389,
      fullName: "CeeDee Lamb",
      defaultPositionId: 3,
      proTeamId: 6,
      injuryStatus: "ACTIVE",
      stats: [
        {
          seasonId: 2025,
          scoringPeriodId: 1,
          statSplitTypeId: 1,
          statSourceId: 1,
          appliedTotal: 99,
        },
        {
          seasonId: 2026,
          scoringPeriodId: 2,
          statSplitTypeId: 1,
          statSourceId: 1,
          appliedTotal: 88,
        },
        {
          seasonId: 2026,
          scoringPeriodId: 1,
          statSplitTypeId: 1,
          statSourceId: 1,
          appliedTotal: 17.28384981,
        },
        {
          seasonId: 2026,
          scoringPeriodId: 1,
          statSplitTypeId: 1,
          statSourceId: 0,
          appliedTotal: 2.75,
        },
      ],
    },
  },
};
describe("ESPN roster regression", () => {
  it("keeps the right week, true WR position, NFL abbreviation and exact league projection", () => {
    expect(mapRawPlayer(entry, 2026, 1)).toMatchObject({
      player: { id: 4241389, position: "WR", proTeam: "DAL" },
      position: "WR",
      projectedPoints: 17.28384981,
      totalPoints: 2.75,
    });
  });
  it("keeps unavailable projections null and excludes bench, IR, unknown slots", () => {
    expect(mapRawPlayer(entry, 2026, 3).projectedPoints).toBeNull();
    for (const slot of ["Bench", "IR", "Unknown", null])
      expect(isStartingSlot(slot)).toBe(false);
    for (const slot of ["QB", "RB/WR/TE", "D/ST"])
      expect(isStartingSlot(slot)).toBe(true);
  });
  it("preserves zero live scores and fractional matchup scores", () => {
    const side = {
      teamId: 1,
      totalPointsLive: 0,
      totalPoints: 14,
      totalProjectedPointsLive: 120.125,
      rosterForCurrentScoringPeriod: { entries: [entry] },
    };
    expect(
      mapRawBoxScores(
        {
          schedule: [
            {
              matchupPeriodId: 1,
              home: side,
              away: { ...side, teamId: 2, totalPointsLive: 1.25 },
            },
          ],
        },
        2026,
        1,
        1
      )[0]
    ).toMatchObject({
      homeScore: 0,
      awayScore: 1.25,
      homeProjectedScore: 120.125,
      homeRoster: [{ player: { id: 4241389 } }],
    });
  });
  it("fails malformed player data instead of silently skipping", () =>
    expect(() => mapRawPlayer({}, 2026, 1)).toThrow());
});
describe("lineup comparison", () => {
  it("adds repeated slots and does not turn missing projections into zero", () => {
    const mine = [
      { slotPosition: "WR", projectedPoints: 17.25 },
      { slotPosition: "WR", projectedPoints: 12.5 },
    ];
    expect(projectedTotal(mine)).toBe(29.75);
    expect(
      compareLineups(mine, [{ slotPosition: "WR", projectedPoints: null }])
    ).toEqual([{ slot: "WR", mine: 29.75, opponent: null }]);
    expect(projectedTotal([])).toBeNull();
    expect(projectedTotal([{ slotPosition: "K", projectedPoints: 0 }])).toBe(0);
  });
});
