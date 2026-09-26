import { describe, expect, it } from "vitest";
import {
  buildWeekThreePlayoffContext,
  formatWeekThreePlayoffBenchmark,
  getWeekThreePlayoffBenchmark,
  WEEK_THREE_PLAYOFF_BENCHMARKS,
  WEEK_THREE_PLAYOFF_BENCHMARK_SOURCE,
} from "./editorialFacts";

describe("Week 3 playoff benchmark", () => {
  it("stores all six commissioner-supplied transitions exactly", () => {
    expect(
      WEEK_THREE_PLAYOFF_BENCHMARKS.map(row => [
        `${row.enteringWins}-${row.enteringLosses}`,
        row.wonWeekThree ? "W" : "L",
        row.resultingRecord,
        row.playoffPercentage,
      ])
    ).toEqual([
      ["2-0", "W", "3-0", 86.3],
      ["2-0", "L", "2-1", 64.8],
      ["1-1", "W", "2-1", 68.1],
      ["1-1", "L", "1-2", 41.3],
      ["0-2", "W", "1-2", 42.9],
      ["0-2", "L", "0-3", 19.5],
    ]);
  });

  it("keeps the source and 2025 basis attached", () => {
    expect(WEEK_THREE_PLAYOFF_BENCHMARK_SOURCE).toContain("Sleeper");
    expect(WEEK_THREE_PLAYOFF_BENCHMARK_SOURCE).toContain("@FantasyGeniusHQ");
    expect(WEEK_THREE_PLAYOFF_BENCHMARK_SOURCE).toContain("2025 results");
  });

  it("formats a matched team without asking the model to calculate", () => {
    expect(formatWeekThreePlayoffBenchmark("Roger", 1, 1, true)).toBe(
      "Roger: entered Week 3 1-1, won to reach 2-1 — 68.1% playoff rate in the 2025 benchmark"
    );
  });

  it("fails closed for records outside the supplied table", () => {
    expect(getWeekThreePlayoffBenchmark(1, 0, true)).toBeNull();
    expect(formatWeekThreePlayoffBenchmark("Roger", 1, 0, true)).toBeNull();
  });

  it("matches the benchmark to each team's actual Week 3 path", () => {
    const identity = new Map([
      [1, { label: "Roger" }],
      [2, { label: "Bradley" }],
    ]);
    const games = [
      {
        week: 1,
        isPlayoffs: 0,
        homeTeamId: 1,
        awayTeamId: 2,
        homeScore: 110,
        awayScore: 90,
      },
      {
        week: 2,
        isPlayoffs: 0,
        homeTeamId: 2,
        awayTeamId: 1,
        homeScore: 80,
        awayScore: 120,
      },
      {
        week: 3,
        isPlayoffs: 0,
        homeTeamId: 1,
        awayTeamId: 2,
        homeScore: 95,
        awayScore: 100,
      },
    ];

    expect(buildWeekThreePlayoffContext(identity, games)).toEqual([
      "\nWEEK 3 PLAYOFF-RATE CONTEXT (external historical benchmark, not this league's calculated odds)",
      `- Source: ${WEEK_THREE_PLAYOFF_BENCHMARK_SOURCE}`,
      "- Roger: entered Week 3 2-0, lost to reach 2-1 — 64.8% playoff rate in the 2025 benchmark",
      "- Bradley: entered Week 3 0-2, won to reach 1-2 — 42.9% playoff rate in the 2025 benchmark",
    ]);
  });
});
