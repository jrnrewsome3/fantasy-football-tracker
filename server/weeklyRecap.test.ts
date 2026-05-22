import { beforeEach, describe, expect, it, vi } from "vitest";
import { matchups, teams } from "../drizzle/schema";
import { invokeLLM } from "./_core/llm";
import { getDb } from "./db";
import { generateWeeklyRecap } from "./weeklyRecap";

vi.mock("./db", () => ({
  getDb: vi.fn(),
}));

vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn(),
}));

const mockTeams = [
  { id: 1, leagueId: 1, name: "Dragons", wins: 2, losses: 3 },
  { id: 2, leagueId: 1, name: "Sharks", wins: 5, losses: 0 },
  { id: 3, leagueId: 1, name: "Comets", wins: 4, losses: 1 },
  { id: 4, leagueId: 1, name: "Rockets", wins: 1, losses: 4 },
  { id: 5, leagueId: 1, name: "Owls", wins: 3, losses: 2 },
  { id: 6, leagueId: 1, name: "Wolves", wins: 3, losses: 2 },
];

const mockMatchups = [
  {
    leagueId: 1,
    week: 1,
    seasonYear: 2018,
    homeTeamId: 1,
    awayTeamId: 2,
    homeScore: 120.5,
    awayScore: 110.2,
  },
  {
    leagueId: 1,
    week: 1,
    seasonYear: 2018,
    homeTeamId: 3,
    awayTeamId: 4,
    homeScore: 98.3,
    awayScore: 145.7,
  },
  {
    leagueId: 1,
    week: 1,
    seasonYear: 2018,
    homeTeamId: 5,
    awayTeamId: 6,
    homeScore: 100,
    awayScore: 101.2,
  },
  {
    leagueId: 1,
    week: 1,
    seasonYear: 2018,
    homeTeamId: 1,
    awayTeamId: 6,
    homeScore: 130,
    awayScore: 99,
  },
];

function createMockDb() {
  return {
    select: vi.fn(() => ({
      from: vi.fn((table) => ({
        where: vi.fn(async () => {
          if (table === matchups) {
            return mockMatchups;
          }

          if (table === teams) {
            return mockTeams;
          }

          return [];
        }),
      })),
    })),
  };
}

describe("generateWeeklyRecap", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getDb).mockResolvedValue(createMockDb() as any);
    vi.mocked(invokeLLM).mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              summary: "A deterministic recap summary.",
              topPerformerHighlights: [
                "Top deterministic highlight",
                "Second deterministic highlight",
                "Third deterministic highlight",
              ],
              upsetDescriptions: [
                "A deterministic upset description",
                "Another deterministic upset description",
              ],
              storylines: [
                "A deterministic storyline",
                "Another deterministic storyline",
              ],
            }),
          },
        },
      ],
    } as any);
  });

  it("should deduplicate top performers by team name", async () => {
    const recap = await generateWeeklyRecap(1, 1, 2018);

    const teamNames = recap.topPerformers.map(p => p.teamName);
    const uniqueTeamNames = new Set(teamNames);

    expect(teamNames.length).toBe(uniqueTeamNames.size);
    expect(recap.topPerformers).toEqual([
      {
        teamName: "Rockets",
        score: 145.7,
        highlight: "Top deterministic highlight",
      },
      {
        teamName: "Dragons",
        score: 130,
        highlight: "Second deterministic highlight",
      },
      {
        teamName: "Sharks",
        score: 110.2,
        highlight: "Third deterministic highlight",
      },
    ]);

    for (let i = 0; i < recap.topPerformers.length - 1; i++) {
      expect(recap.topPerformers[i].score).toBeGreaterThanOrEqual(
        recap.topPerformers[i + 1].score
      );
    }
  });

  it("should return unique closest games", async () => {
    const recap = await generateWeeklyRecap(1, 1, 2018);

    const gameKeys = recap.closestGames.map(g =>
      [g.team1, g.team2].sort().join("-")
    );
    const uniqueGameKeys = new Set(gameKeys);

    expect(gameKeys.length).toBe(uniqueGameKeys.size);
    expect(recap.closestGames.map(game => game.margin)).toEqual([
      1.2000000000000028,
      10.299999999999997,
      31,
    ]);

    for (let i = 0; i < recap.closestGames.length - 1; i++) {
      expect(recap.closestGames[i].margin).toBeLessThanOrEqual(
        recap.closestGames[i + 1].margin
      );
    }
  });

  it("should return unique blowouts", async () => {
    const recap = await generateWeeklyRecap(1, 1, 2018);

    const blowoutKeys = recap.blowouts.map(b =>
      [b.winner, b.loser].sort().join("-")
    );
    const uniqueBlowoutKeys = new Set(blowoutKeys);

    expect(blowoutKeys.length).toBe(uniqueBlowoutKeys.size);
    expect(recap.blowouts[0].margin).toBeCloseTo(47.4);
    expect(recap.blowouts[1].margin).toBe(31);

    for (let i = 0; i < recap.blowouts.length - 1; i++) {
      expect(recap.blowouts[i].margin).toBeGreaterThanOrEqual(
        recap.blowouts[i + 1].margin
      );
    }
  });

  it("should include correct season year in response", async () => {
    const recap = await generateWeeklyRecap(1, 1, 2018);

    expect(recap.seasonYear).toBe(2018);
    expect(recap.week).toBe(1);
    expect(getDb).toHaveBeenCalledOnce();
    expect(invokeLLM).toHaveBeenCalledOnce();
  });
});
