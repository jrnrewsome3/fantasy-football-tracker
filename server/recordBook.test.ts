import { expect, it } from "vitest";
import { buildLeagueRecordBook, summarizeLeagueRecords } from "./recordBook";
const teams = [
  {
    espnTeamId: 1,
    seasonYear: 2024,
    name: "A",
    ownerName: "Willie",
    franchiseKey: "willie",
  },
  {
    espnTeamId: 2,
    seasonYear: 2024,
    name: "B",
    ownerName: "Mark",
    franchiseKey: "mark",
  },
];
const games = [1, 2, 3, 4].map(week => ({
  id: week,
  seasonYear: 2024,
  week,
  homeTeamId: 1,
  awayTeamId: 2,
  homeScore: 120,
  awayScore: 100,
  isComplete: 1,
  isPlayoffs: 0,
}));
it("prepares every manager with calculated streaks, latest evidence and undefeated starts", () => {
  const summary = summarizeLeagueRecords(teams, games);
  expect(summary).toHaveLength(2);
  expect(summary[0]).toMatchObject({
    manager: "Willie",
    longestWinning: [{ length: 4 }],
    currentCompleted: { length: 4 },
    undefeatedStarts: [
      { record: "1-0", seasons: [2024] },
      { record: "2-0", seasons: [2024] },
      { record: "3-0", seasons: [2024] },
      { record: "4-0", seasons: [2024] },
    ],
  });
  expect(summary[0].latestTwoWins?.map(r => r.game.week)).toEqual([3, 4]);
  expect(summary[1]).toMatchObject({
    manager: "Mark",
    longestLosing: [{ length: 4 }],
    latestTwoWins: [],
  });
});
it("declines ambiguous ownership and missing opponents instead of creating wins", () => {
  const ambiguous = buildLeagueRecordBook(
    [...teams, { ...teams[0], ownerName: "Other", franchiseKey: "other" }],
    games
  );
  expect(
    ambiguous.find(r => r.team.franchiseKey === "other")?.issues
  ).toContain("ambiguous manager ownership");
  expect(
    buildLeagueRecordBook([teams[0]], games)[0].results.every(
      r => r.result === "?"
    )
  ).toBe(true);
});
