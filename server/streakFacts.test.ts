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

const willieTeams = [2024, 2025, 2026].flatMap(seasonYear => [
  {
    espnTeamId: seasonYear === 2026 ? 4 : 1,
    seasonYear,
    name: "Willie team",
    ownerName: "Willie",
    franchiseKey: "willie",
  },
  {
    espnTeamId: 2,
    seasonYear,
    name: "Mark team",
    ownerName: "Mark",
    franchiseKey: "mark",
  },
]);
const willieGame = (id: number, year: number, week: number, extra = {}) =>
  game(id, year, year === 2026 ? 4 : 1, 120, 100, { week, ...extra });
const willieGames = [
  ...[1, 2, 3, 4].map(w => willieGame(w, 2024, w)),
  willieGame(5, 2024, 5, { homeScore: 90 }),
  willieGame(6, 2024, 13),
  willieGame(7, 2024, 14),
  willieGame(8, 2024, 15, { isPlayoffs: 1 }),
  willieGame(9, 2025, 1, { homeScore: 90 }),
  willieGame(10, 2026, 3),
  willieGame(11, 2026, 4, { isComplete: 0, homeScore: 160 }),
];
const latestAnswer = (q: string, data = willieGames) =>
  answerStreakQuestion(willieTeams, data, q, 2026);

describe("latest consecutive results", () => {
  it.each([
    "Has Willie won 2 in a row ever?",
    "When was the last time Willie won two games in a row?",
    "When did Willie win two consecutive games?",
    "Last time Willie won 2 straight",
    "When did Willie get back-to-back wins?",
    "Willie most recent winning streak",
  ])("routes and answers the latest qualifying pair: %s", q => {
    expect(isStreakQuestion(q)).toBe(true);
    const answer = latestAnswer(q);
    expect(answer).toContain("Willie has won 2 games in a row");
    expect(answer).toContain("2024 Week 14");
    expect(answer).toContain("2024 Week 15 (postseason)");
    expect(answer).not.toContain("2024 Week 1:");
    expect(answer).not.toContain("2024 Week 13:");
    expect(answer).toContain("beat Mark, 120.00–100.00");
    expect(answer).toContain("2026 Week 4 is still marked unfinished");
  });
  it("honors regular-season scope and a requested three-game run", () => {
    expect(
      latestAnswer("last time Willie won two in a row regular season")
    ).toContain("2024 Week 13");
    expect(
      latestAnswer("last time Willie won two in a row regular season")
    ).not.toContain("Week 15 (postseason):");
    const text = latestAnswer("last time Willie won three in a row");
    expect(text).toContain("won 3 games");
    expect(text).toContain("2024 Week 13");
    expect(text).toContain("2024 Week 15");
  });
  it("counts a newly finalized result and computes away scores correctly", () => {
    const data = willieGames.map(g =>
      g.id === 11
        ? {
            ...g,
            homeTeamId: 2,
            awayTeamId: 4,
            homeScore: 158.48,
            awayScore: 159.08,
            isComplete: 1,
          }
        : g
    );
    const text = latestAnswer("last time Willie won 2 in a row", data);
    expect(text).toContain("2026 Week 3");
    expect(text).toContain("2026 Week 4: beat Mark, 159.08–158.48");
    expect(text).not.toContain("2024 Week 14");
  });
  it("does not infer no career streak from a season with no qualifying pair", () => {
    expect(latestAnswer("Has Willie won two in a row in 2025?")).toContain(
      "No confirmed instance"
    );
    expect(latestAnswer("Has Willie won two in a row last season?")).toContain(
      "Scope: 2025"
    );
  });
  it("uses membership for did I and asks for a manager when unidentified", () => {
    expect(
      answerStreakQuestion(
        willieTeams,
        willieGames,
        "When did I last win two in a row?",
        2026,
        4
      )
    ).toContain("Willie has won");
    expect(
      answerStreakQuestion(
        willieTeams,
        willieGames,
        "When did I last win two in a row?",
        2026
      )
    ).toContain("Choose your team");
    expect(latestAnswer("When did Nobody win two in a row?")).toContain(
      "Please name one manager"
    );
  });
  it.each([
    { week: 3 },
    { homeScore: 100 },
    { homeScore: null },
    { isComplete: 0 },
    { seasonYear: 2025 },
  ])(
    "does not bridge gaps, ties, missing scores, unfinished games or seasons: %j",
    extra => {
      const data = [willieGame(1, 2024, 1), willieGame(2, 2024, 2, extra)];
      expect(latestAnswer("Has Willie won two in a row?", data)).toContain(
        "No confirmed instance"
      );
    }
  );
  it("sorts and deduplicates identical rows, but declines conflicting duplicates", () => {
    expect(
      latestAnswer(
        "last time Willie won two in a row",
        [...willieGames].reverse().concat(willieGames[0])
      )
    ).toContain("2024 Week 15");
    expect(
      latestAnswer("last time Willie won two in a row", [
        ...willieGames,
        { ...willieGames[0], homeScore: 99 },
      ])
    ).toContain("conflicting duplicate");
    expect(
      latestAnswer("last time Willie won two in a row", [
        ...willieGames,
        { ...willieGames[0], id: 999 },
      ])
    ).toContain("multiple stored matchups");
  });
  it("handles losses and multiweek results as games, not multiple wins", () => {
    const losses = [
      willieGame(1, 2024, 1, { homeScore: 90, scoringWeeks: 2 }),
      willieGame(2, 2024, 3, { homeScore: 80 }),
    ];
    expect(
      latestAnswer("last time Willie lost two in a row", losses)
    ).toContain("lost to Mark, 80.00–100.00");
    expect(
      latestAnswer("last time Willie lost three in a row", losses)
    ).toContain("No confirmed instance");
  });
  it("preserves longest queries and does not classify unrelated row questions", () => {
    expect(latestAnswer("Willie longest winning streak")).toContain(
      "Longest winning streak: 4 games"
    );
    expect(isStreakQuestion("Show two players in a row")).toBe(false);
    expect(latestAnswer("last time Willie won 0 in a row")).toContain(
      "2 to 100"
    );
  });
});

describe("league-wide season starts and reusable records", () => {
  it.each([
    "When is the last time someone went 4-0?",
    "Who last started 4–0?",
    "Who opened the season 4-0?",
    "Has Willie ever gone 4-0?",
  ])("routes season-start variations directly: %s", q => {
    expect(isStreakQuestion(q)).toBe(true);
    const answer = latestAnswer(q);
    expect(answer).toContain("4–0 season starts");
    expect(answer).toContain("Willie: 2024, Weeks 1–4 (W–W–W–W)");
    expect(answer).toContain("not any later stretch");
  });
  it("distinguishes four later wins from a 4-0 season start", () => {
    const later = [1, 2, 3, 4].map((week, i) =>
      willieGame(i + 1, 2025, week, { homeScore: i === 0 ? 90 : 120 })
    );
    expect(latestAnswer("Who went 4-0?", later)).toContain(
      "No confirmed 4–0 season start"
    );
    expect(latestAnswer("Who started 3-1?", later)).toContain("W");
    expect(latestAnswer("Who started 0-4?")).toContain("Mark: 2024");
  });
  it("does not count missing or unfinished early games", () => {
    const missing = willieGames.filter(g => g.id !== 2);
    expect(latestAnswer("Who started 4-0?", missing)).toContain("No confirmed");
    const pending = willieGames.map(g =>
      g.id === 4 ? { ...g, isComplete: 0 } : g
    );
    expect(latestAnswer("Who started 4-0?", pending)).toContain("No confirmed");
  });
  it("retains tied managers and older starts when listing all", () => {
    const newer = [1, 2, 3, 4].map(w => willieGame(20 + w, 2025, w));
    const data = willieGames.filter(g => g.seasonYear !== 2025).concat(newer);
    const latest = latestAnswer("Who last started 4-0?", data);
    expect(latest).toContain("Willie: 2025");
    expect(latest).not.toContain("Willie: 2024");
    const all = latestAnswer("List all 4-0 season starts", data);
    expect(all).toContain("Willie: 2024");
    expect(all).toContain("Willie: 2025");
  });
  it("answers latest runs league-wide instead of returning longest runs", () => {
    const text = latestAnswer("When did someone last win two in a row?");
    expect(text).toContain("Willie has won 2 games");
    expect(text).toContain("2024 Week 15");
    expect(text).not.toContain("2024 Week 1:");
    expect(latestAnswer("Who has the longest winning streak?")).toContain(
      "4 games"
    );
  });
});

it("reports occurrence counts separately from longest and latest answers", () => {
  const text = latestAnswer("How many times has Willie won two in a row?");
  expect(text).toContain("Willie: 5");
  expect(text).toContain("Overlapping sequences count separately");
  const list = latestAnswer("List all instances when Willie won two in a row");
  expect(list).toContain("2024 Week 1:");
  expect(list).toContain("2024 Week 15 (postseason)");
});
it("does not bridge missing games when calculating a longest streak", () => {
  const data = [willieGame(1, 2024, 1), willieGame(2, 2024, 3)];
  expect(latestAnswer("Willie longest winning streak", data)).toContain(
    "1 game"
  );
});

it("distinguishes current season starts, occurrence counts and head-to-head records", () => {
  expect(latestAnswer("Who is currently 4-0?")).toContain("No confirmed");
  expect(latestAnswer("Who was last 4-0?")).toContain("Willie: 2024");
  expect(latestAnswer("How many times has Willie started 4-0?")).toContain(
    "Willie: 1 (2024)"
  );
  expect(isStreakQuestion("Roger record against Willie 4-0")).toBe(false);
  expect(
    answerStreakQuestion(
      willieTeams,
      willieGames,
      "When was the last time I won two in a row?",
      2026,
      4
    )
  ).toContain("Willie has won");
});
