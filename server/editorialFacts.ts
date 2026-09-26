/**
 * Commissioner-supplied context that may be used in league newsletters.
 *
 * These are external benchmarks, not facts calculated from this league's
 * database. Keep the attribution and basis attached whenever a value is used.
 */

export const WEEK_THREE_PLAYOFF_BENCHMARK_SOURCE =
  "Sleeper (@SleeperHQ), crediting @FantasyGeniusHQ; based on 2025 results";

interface WeekThreePlayoffBenchmark {
  enteringWins: number;
  enteringLosses: number;
  wonWeekThree: boolean;
  resultingRecord: string;
  playoffPercentage: number;
}

export const WEEK_THREE_PLAYOFF_BENCHMARKS: readonly WeekThreePlayoffBenchmark[] =
  [
    {
      enteringWins: 2,
      enteringLosses: 0,
      wonWeekThree: true,
      resultingRecord: "3-0",
      playoffPercentage: 86.3,
    },
    {
      enteringWins: 2,
      enteringLosses: 0,
      wonWeekThree: false,
      resultingRecord: "2-1",
      playoffPercentage: 64.8,
    },
    {
      enteringWins: 1,
      enteringLosses: 1,
      wonWeekThree: true,
      resultingRecord: "2-1",
      playoffPercentage: 68.1,
    },
    {
      enteringWins: 1,
      enteringLosses: 1,
      wonWeekThree: false,
      resultingRecord: "1-2",
      playoffPercentage: 41.3,
    },
    {
      enteringWins: 0,
      enteringLosses: 2,
      wonWeekThree: true,
      resultingRecord: "1-2",
      playoffPercentage: 42.9,
    },
    {
      enteringWins: 0,
      enteringLosses: 2,
      wonWeekThree: false,
      resultingRecord: "0-3",
      playoffPercentage: 19.5,
    },
  ];

export function getWeekThreePlayoffBenchmark(
  enteringWins: number,
  enteringLosses: number,
  wonWeekThree: boolean
) {
  return (
    WEEK_THREE_PLAYOFF_BENCHMARKS.find(
      row =>
        row.enteringWins === enteringWins &&
        row.enteringLosses === enteringLosses &&
        row.wonWeekThree === wonWeekThree
    ) ?? null
  );
}

export function formatWeekThreePlayoffBenchmark(
  label: string,
  enteringWins: number,
  enteringLosses: number,
  wonWeekThree: boolean
) {
  const benchmark = getWeekThreePlayoffBenchmark(
    enteringWins,
    enteringLosses,
    wonWeekThree
  );
  if (!benchmark) return null;

  return `${label}: entered Week 3 ${enteringWins}-${enteringLosses}, ${
    wonWeekThree ? "won" : "lost"
  } to reach ${benchmark.resultingRecord} — ${benchmark.playoffPercentage.toFixed(
    1
  )}% playoff rate in the 2025 benchmark`;
}

interface WeekThreeBenchmarkGame {
  week: number;
  isPlayoffs: number | null;
  homeTeamId: number;
  awayTeamId: number;
  homeScore: number | null;
  awayScore: number | null;
}

export function buildWeekThreePlayoffContext(
  identity: Map<number, { label: string }>,
  games: WeekThreeBenchmarkGame[]
) {
  const lines: string[] = [];

  for (const [teamId, person] of Array.from(identity.entries())) {
    let enteringWins = 0;
    let enteringLosses = 0;

    for (const game of games) {
      if (game.isPlayoffs || game.week >= 3) continue;
      const isHome = game.homeTeamId === teamId;
      const isAway = game.awayTeamId === teamId;
      if (!isHome && !isAway) continue;
      const mine = isHome ? game.homeScore : game.awayScore;
      const theirs = isHome ? game.awayScore : game.homeScore;
      if (mine == null || theirs == null || mine === theirs) continue;
      if (mine > theirs) enteringWins++;
      else enteringLosses++;
    }

    const weekThree = games.find(
      game =>
        !game.isPlayoffs &&
        game.week === 3 &&
        (game.homeTeamId === teamId || game.awayTeamId === teamId)
    );
    if (!weekThree) continue;
    const isHome = weekThree.homeTeamId === teamId;
    const mine = isHome ? weekThree.homeScore : weekThree.awayScore;
    const theirs = isHome ? weekThree.awayScore : weekThree.homeScore;
    if (mine == null || theirs == null || mine === theirs) continue;

    const line = formatWeekThreePlayoffBenchmark(
      person.label,
      enteringWins,
      enteringLosses,
      mine > theirs
    );
    if (line) lines.push(`- ${line}`);
  }

  return lines.length
    ? [
        "\nWEEK 3 PLAYOFF-RATE CONTEXT (external historical benchmark, not this league's calculated odds)",
        `- Source: ${WEEK_THREE_PLAYOFF_BENCHMARK_SOURCE}`,
        ...lines,
      ]
    : [];
}
