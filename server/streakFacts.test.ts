import { describe, expect, it } from "vitest";
import {
  calculateLeagueStreaks,
  answerStreakQuestion,
  isStreakQuestion,
} from "./streakFacts";
const teams = [
  {
    espnTeamId: 1,
    seasonYear: 2024,
    name: "Old Name",
    ownerName: "Roger",
    franchiseKey: "roger",
  },
  {
    espnTeamId: 8,
    seasonYear: 2025,
    name: "Mayhem Rising",
    ownerName: "Roger",
    franchiseKey: "roger",
  },
  { espnTeamId: 2, seasonYear: 2024, name: "Dino", ownerName: "Dino" },
  { espnTeamId: 2, seasonYear: 2025, name: "Dino", ownerName: "Dino" },
];
const game = (
  id: number,
  year: number,
  home: number,
  a: number,
  b: number,
  extra = {}
) => ({
  id,
  seasonYear: year,
  week: id,
  homeTeamId: home,
  awayTeamId: 2,
  homeScore: a,
  awayScore: b,
  isComplete: 1,
  isPlayoffs: 0,
  ...extra,
});
const games = [
  game(1, 2024, 1, 20, 10),
  game(2, 2024, 1, 30, 10),
  game(3, 2025, 8, 40, 10),
];
describe("database-derived streak evidence", () => {
  it("joins a franchise across seasons and team ID changes, sorts results and deduplicates IDs", () => {
    const r = calculateLeagueStreaks(teams, [
      games[2],
      games[0],
      games[1],
      games[1],
    ]);
    expect(r.counted).toBe(3);
    expect(r.rows[0].current?.games.length).toBe(3);
  });
  it("ties break streaks and unfinished games do not count", () => {
    const r = calculateLeagueStreaks(teams, [
      ...games,
      game(4, 2025, 8, 0, 0, { isComplete: 0 }),
      game(5, 2025, 8, 10, 10),
      game(6, 2025, 8, 20, 10),
    ]);
    expect(r.rows[0].runs.map(r => [r.result, r.games.length])).toEqual([
      ["W", 3],
      ["T", 1],
      ["W", 1],
    ]);
  });
  it("unknown scores break continuity rather than becoming zero", () => {
    const r = calculateLeagueStreaks(teams, [
      ...games,
      game(4, 2025, 8, 20, 10, { homeScore: null }),
      game(5, 2025, 8, 20, 10),
    ]);
    expect(r.rows[0].current?.games.length).toBe(1);
  });
  it("honors season and playoff scope", () => {
    const data = [...games, game(4, 2025, 8, 20, 10, { isPlayoffs: 1 })];
    expect(
      calculateLeagueStreaks(teams, data, 2025, "regular").rows[0].current
        ?.games.length
    ).toBe(1);
    expect(
      calculateLeagueStreaks(teams, data, undefined, "all").rows[0].current
        ?.games.length
    ).toBe(4);
  });
  it("answers league win and loss leaders with evidence dates", () => {
    expect(
      answerStreakQuestion(teams, games, "longest winning streak", 2025)
    ).toContain("Roger (Mayhem Rising): 2024 Week 1 through 2025 Week 3");
    expect(
      answerStreakQuestion(teams, games, "longest losing streak", 2025)
    ).toContain("Dino (Dino)");
  });
  it("uses selected membership for personal questions and does not fall back to the league leader", () => {
    expect(
      answerStreakQuestion(teams, games, "my longest winning streak", 2025, 2)
    ).toContain("No qualifying");
    expect(
      answerStreakQuestion(teams, games, "my longest winning streak", 2025)
    ).toContain("Choose your team");
  });
  it("keeps current streaks separate from historical records", () => {
    const text = answerStreakQuestion(
      teams,
      [...games, game(4, 2025, 8, 5, 10)],
      "current winning streak",
      2025
    );
    expect(text).toContain("Current winning streak: 1 game");
    expect(text).toContain("Dino (Dino)");
  });
  it("handles an empty season without guessing", () =>
    expect(
      answerStreakQuestion(teams, games, "winning streak this season", 2026)
    ).toContain("No qualifying"));
  it("routes historical streak questions before broad my-team keywords", () => {
    expect(isStreakQuestion("What is my team’s longest winning streak?")).toBe(
      true
    );
    expect(isStreakQuestion("Who has the most consecutive losses?")).toBe(true);
    expect(isStreakQuestion("Compare my team lineup")).toBe(false);
  });
});

it("does not match short owner names inside question words", () => {
  const withTy = [
    ...teams,
    { espnTeamId: 7, seasonYear: 2025, name: "Amon Ya Ass", ownerName: "Ty" },
  ];
  expect(
    answerStreakQuestion(withTy, games, "longest victory streak", 2025)
  ).toContain("Roger");
});
it("includes postseason only when requested without an inclusion qualifier", () => {
  const data = [...games, game(4, 2025, 8, 20, 10, { isPlayoffs: 1 })];
  expect(
    answerStreakQuestion(
      teams,
      data,
      "longest winning streak including playoffs",
      2025
    )
  ).toContain("4 games");
  expect(
    answerStreakQuestion(teams, data, "longest playoff winning streak", 2025)
  ).toContain("1 game");
});
it("lists all tied record holders", () => {
  const text = answerStreakQuestion(
    teams,
    [game(1, 2024, 1, 20, 10), game(2, 2024, 1, 5, 10)],
    "longest winning streak",
    2025
  );
  expect(text).toContain("Roger");
  expect(text).toContain("Dino");
});
