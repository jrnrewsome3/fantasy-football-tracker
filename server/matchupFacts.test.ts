import { expect, it, vi } from "vitest";
vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn(async () => ({
    choices: [
      { message: { content: '{"factIds":["slots","invented 61.97 points"]}' } },
    ],
  })),
}));
import { answerMatchupQuestion, buildMatchupFacts } from "./matchupFacts";
const data: any = {
  hasTeam: true,
  teamName: "Mine",
  opponentName: "Theirs",
  week: 1,
  starters: [
    {
      name: "QB A",
      position: "QB",
      slotPosition: "QB",
      projectedPoints: 19.02,
      status: "ACTIVE",
      game: {
        matchup: "NE @ SEA",
        kickoff: "2026-09-10T00:20Z",
        forecast: "Sunny",
        temperature: 75,
        wind: "5 mph",
        precipitationChance: 0,
        forecastSource: "https://api.weather.gov/example",
        forecastValidAt: "2026-09-10T00:00Z",
        fetchedAt: "2026-09-07T12:00Z",
      },
    },
  ],
  opponentStarters: [
    { name: "QB B", position: "QB", slotPosition: "QB", projectedPoints: 24.8 },
  ],
  bench: [],
  rosterSyncedAt: new Date(),
  opponentRosterSyncedAt: new Date(),
};
it("renders only verified evidence, rejecting model-written numbers or unknown fact IDs", async () => {
  const answer = await answerMatchupQuestion(
    data,
    "How does my lineup compare with weather?"
  );
  expect(answer).toContain("5.78");
  expect(answer).toContain("rain probability: 0%");
  expect(answer).toContain("NWS kickoff-hour forecast");
  expect(answer).not.toContain("61.97");
});
it("does not invent a personal roster for a member without an assignment", () =>
  expect(buildMatchupFacts({ ...data, hasTeam: false }).assignment).toContain(
    "Choose your team"
  ));
