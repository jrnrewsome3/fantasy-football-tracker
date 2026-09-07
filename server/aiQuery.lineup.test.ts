import { beforeEach, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({
  llm: vi.fn(),
  myWeek: vi.fn(),
  rosters: vi.fn(),
}));
vi.mock("./_core/llm", () => ({ invokeLLM: m.llm }));
vi.mock("./myWeek", () => ({ getMyWeek: m.myWeek }));
vi.mock("./weather", () => ({ getNFLWeekOutlook: async () => [] }));
vi.mock("./leagueDb", () => ({
  getTeamsByLeague: async () => [
    {
      espnTeamId: 3,
      seasonYear: 2026,
      name: "Mayhem Rising",
      ownerName: "Roger",
    },
    { espnTeamId: 10, seasonYear: 2026, name: "Dino" },
  ],
  getAllMatchupsByLeague: async () => [
    { seasonYear: 2026, week: 1, homeTeamId: 10, awayTeamId: 3 },
  ],
  getRecentTransactions: async () => [],
  getRosterForTeamWeek: m.rosters,
}));
vi.mock("./db", () => ({
  getDb: async () => ({
    select: () => ({
      from: () => ({
        where: () => ({
          limit: async () => [{ id: 1, seasonYear: 2026, name: "Test league" }],
          then: (resolve: (v: unknown[]) => unknown) => resolve([]),
        }),
      }),
    }),
  }),
}));
import { answerLeagueQuestion } from "./aiQuery";
beforeEach(() => {
  vi.clearAllMocks();
  m.myWeek.mockResolvedValue({
    hasTeam: true,
    teamName: "Mayhem Rising",
    week: 1,
    seasonYear: 2026,
    starters: [{ name: "Starter A", projectedPoints: 17.25 }],
  });
  m.rosters.mockImplementation(async (_l, _s, _w, id) => [
    {
      name: id === 3 ? "Starter A" : "Starter B",
      slotPosition: "WR",
      wasStarted: true,
      projectedPoints: id === 3 ? 17.25 : 12.5,
    },
    {
      name: "Bench C",
      slotPosition: "Bench",
      wasStarted: false,
      projectedPoints: 20,
    },
  ]);
  m.llm.mockResolvedValue({
    choices: [{ message: { content: "Lineup answer" } }],
  });
});
it("supplies personal identity, both lineups, bench and computed starter-only margin to the model", async () => {
  expect(
    (await answerLeagueQuestion(1, "How does my lineup look?", 77)).answer
  ).toBe("Lineup answer");
  expect(m.myWeek).toHaveBeenCalledWith(1, 77);
  const prompt = m.llm.mock.calls[0][0].messages[0].content;
  for (const text of [
    "Mayhem Rising",
    "Starter A",
    "Starter B",
    "Bench C",
    '"projectedHomeMargin":-4.75',
    "Null means unavailable",
    "never infer",
    "win probabilities",
  ])
    expect(prompt).toContain(text);
});
