import { describe, expect, it } from "vitest";
import { answerHistoryQuestion, isHistoricalQuestion } from "./historyFacts";
const teams = [
  {
    espnTeamId: -8,
    seasonYear: 2022,
    name: "Old Ty",
    ownerName: "Ty",
    franchiseKey: "ty",
  },
  {
    espnTeamId: -4,
    seasonYear: 2022,
    name: "Willie",
    ownerName: "Willie",
    franchiseKey: "willie",
  },
  {
    espnTeamId: 8,
    seasonYear: 2026,
    name: "Amon Ya Ass",
    ownerName: "Ty",
    franchiseKey: "ty",
  },
  {
    espnTeamId: 4,
    seasonYear: 2026,
    name: "Gibbs",
    ownerName: "Willie",
    franchiseKey: "willie",
  },
];
const game = (id: number, fields = {}) => ({
  id,
  seasonYear: 2022,
  week: id,
  homeTeamId: -8,
  awayTeamId: -4,
  homeScore: 100,
  awayScore: 90,
  isComplete: 1,
  isPlayoffs: 0,
  scoringWeeks: 1,
  ...fields,
});
const games = [
  game(1, { homeScore: 187.26, awayScore: 168.38, week: 2 }),
  game(2, {
    homeScore: 400,
    awayScore: 300,
    scoringWeeks: 2,
    isPlayoffs: 1,
    week: 15,
  }),
  game(3, {
    seasonYear: 2026,
    homeTeamId: 4,
    awayTeamId: 8,
    homeScore: 180,
    awayScore: 175,
  }),
  game(4, {
    seasonYear: 2026,
    homeTeamId: 8,
    awayTeamId: 4,
    homeScore: 999,
    isComplete: 0,
  }),
  game(5, { homeScore: 90, awayScore: 90 }),
];
const answer = (q: string, g = games, mine?: number) =>
  answerHistoryQuestion(teams, g, q, 2026, mine);
describe("historical facts", () => {
  it("recognizes reported questions before lineup routing", () => {
    for (const q of [
      "What is Ty’s highest scoring performances",
      "Roger and Daly head-to-head history",
      "my team's all-time scoring record",
      "Ty matchup Week 2 2024",
      "Who has the most championships?",
    ])
      expect(isHistoricalQuestion(q)).toBe(true);
    expect(isHistoricalQuestion("How does my lineup look this week?")).toBe(
      false
    );
  });
  it("ranks own scores and preserves season, opponent and winner", () => {
    const text = answer("What is Ty’s highest scoring performances");
    expect(text).toContain("2022 Week 2: Ty **187.26** vs Willie 168.38 — won");
    expect(text).toContain(
      "2026 Week 3: Ty **175.00** vs Willie 180.00 — lost"
    );
    expect(text.indexOf("187.26")).toBeLessThan(text.indexOf("175.00"));
    expect(text).not.toContain("999");
    expect(text).not.toContain("400.00");
  });
  it("follows franchise identity and counts multiweek matchups once", () => {
    const text = answer("Ty versus Willie all-time head-to-head");
    expect(text).toContain("4 completed meetings");
    expect(text).toContain("Ty: 2 wins");
    expect(text).toContain("Willie: 1 wins");
    expect(text).toContain("Ties: 1");
    expect(text).toContain(
      "Latest meeting: 2026 Week 3 — Ty 175.00 – Willie 180.00; Willie won"
    );
    expect(text).not.toContain("Home Wins");
  });
  it("respects regular season, postseason and explicit year", () => {
    expect(answer("Ty vs Willie head-to-head 2022 regular season")).toContain(
      "2 completed meetings"
    );
    expect(answer("Ty vs Willie head-to-head 2022 playoffs")).toContain(
      "1 completed meetings"
    );
    expect(answer("Ty highest scoring performances last season")).toContain(
      "No qualifying"
    );
  });
  it("uses authenticated membership for personal questions", () => {
    expect(
      answer("What are my highest scoring performances?", games, 8)
    ).toContain("Ty: highest");
    expect(answer("What are my highest scoring performances?")).toContain(
      "Choose your team"
    );
  });
  it("does not substitute league leaders for an unknown manager", () => {
    expect(answer("Alex's highest scoring performances")).toContain(
      "Please name the manager"
    );
    expect(answer("Ty vs Alex head-to-head")).toContain("exactly two");
  });
  it("lists exact stored weekly results", () => {
    expect(answer("Ty matchup Week 2 2022")).toContain(
      "Ty 187.26 – Willie 168.38; Ty won"
    );
  });
  it("keeps cutoff ties and valid zero scores", () => {
    const tied = [
      game(10, { homeScore: 0, awayScore: 10 }),
      game(11, { homeScore: 0, awayScore: 10 }),
    ];
    expect(
      answer("Ty lowest scoring performances top 1", tied).match(
        /\*\*0.00\*\*/g
      )
    ).toHaveLength(2);
  });
  it("fails closed for null scores, unresolved teams and conflicting duplicate fixtures", () => {
    for (const rows of [
      [game(1, { homeScore: null })],
      [game(1, { awayTeamId: 999 })],
      [game(1), game(2, { week: 1 })],
    ])
      expect(answer("Ty highest scoring performances", rows)).toContain(
        "can't give a reliable record"
      );
    expect(answer("Ty vs Willie head-to-head", [game(1), game(1)])).toContain(
      "1 completed meetings"
    );
  });
  it("routes common head-to-head wording without capturing current lineup questions", () => {
    for (const q of [
      "How many times has Ty beaten Willie?",
      "Ty vs Willie",
      "Who leads between Ty and Willie?",
    ]) {
      expect(isHistoricalQuestion(q)).toBe(true);
      expect(answer(q)).toContain("4 completed meetings");
    }
    expect(isHistoricalQuestion("Ty vs Willie lineup this week")).toBe(false);
    expect(answer("Ty vs Willie highest scoring games all-time")).toContain(
      "don't have a verified calculation"
    );
  });
  it("declines unsupported calculations and year ranges", () => {
    expect(answer("Who has the most championships?")).toContain(
      "No championship record"
    );
    expect(answer("Ty highest average score")).toContain(
      "don't have a verified calculation"
    );
    expect(answer("Ty highest scores 2022 through 2026")).toContain(
      "range of seasons"
    );
    expect(answer("Ty vs Willie home head-to-head")).toContain(
      "don't have a verified calculation"
    );
  });
});

it("computes championships from podiums, not wins, with personal and year scope", () => {
  const podium = [
    { seasonYear: 2022, championName: "Willie", runnerUpName: "Ty" },
    { seasonYear: 2023, championName: "Ty", runnerUpName: "Willie" },
    { seasonYear: 2024, championName: "Ty", runnerUpName: "Willie" },
  ];
  expect(
    answerHistoryQuestion(
      teams,
      games,
      "Who has the most championships?",
      2026,
      null,
      podium
    )
  ).toContain("Ty: 2 championships (2023, 2024)");
  expect(
    answerHistoryQuestion(
      teams,
      games,
      "Who was champion in 2022?",
      2026,
      null,
      podium
    )
  ).toContain("Willie: 1 championship (2022)");
  expect(
    answerHistoryQuestion(
      teams,
      games,
      "How many titles do I have in my career?",
      2026,
      8,
      podium
    )
  ).toContain("Ty: 2 championships");
  expect(
    answerHistoryQuestion(
      teams,
      games,
      "Ty championships 2022",
      2026,
      null,
      podium
    )
  ).toContain("Ty: 0 championships");
});
it("calculates career W-L from completed regular-season games by default", () => {
  expect(answer("Ty career record")).toContain("Ty: 1 wins, 1 losses, 1 ties");
  expect(answer("Ty career record including playoffs")).toContain(
    "Ty: 2 wins, 1 losses, 1 ties"
  );
  expect(answer("Ty career record playoffs only")).toContain(
    "Ty: 1 wins, 0 losses, 0 ties"
  );
  expect(isHistoricalQuestion("Who has the most wins?")).toBe(true);
});
