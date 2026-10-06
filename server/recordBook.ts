/** Pure, reusable records derived from stored matchup evidence. No LLM counting. */
export type RecordTeam = {
  espnTeamId: number;
  seasonYear: number;
  name: string;
  ownerName: string | null;
  franchiseKey?: string | null;
};
export type RecordGame = {
  id: number;
  seasonYear: number;
  week: number;
  homeTeamId: number;
  awayTeamId: number;
  homeScore: number | null;
  awayScore: number | null;
  isComplete: number | null;
  isPlayoffs: number | null;
  scoringWeeks?: number | null;
};
export const recordIdentity = (t: RecordTeam) =>
  t.franchiseKey || t.ownerName || `${t.seasonYear}:${t.espnTeamId}`;
export type RecordedResult = {
  game: RecordGame;
  result: "W" | "L" | "T" | "?";
  opponent: string | null;
  score: number | null;
  opponentScore: number | null;
};
export type ManagerRecords = {
  team: RecordTeam;
  results: RecordedResult[];
  issues: string[];
};
export function buildLeagueRecordBook(
  teams: RecordTeam[],
  games: RecordGame[],
  season?: number,
  scope = "all"
): ManagerRecords[] {
  const lookup = new Map<string, RecordTeam>();
  const ambiguous = new Set<string>();
  const managers = new Map<string, ManagerRecords>();
  for (const t of [...teams].sort((a, b) => a.seasonYear - b.seasonYear)) {
    const k = `${t.seasonYear}:${t.espnTeamId}`,
      old = lookup.get(k);
    if (old && recordIdentity(old) !== recordIdentity(t)) ambiguous.add(k);
    lookup.set(k, t);
    const key = recordIdentity(t);
    const row = managers.get(key);
    if (row) row.team = t;
    else managers.set(key, { team: t, results: [], issues: [] });
  }
  const seen = new Map<number, RecordGame>();
  const signature = (g: RecordGame) =>
    JSON.stringify([
      g.seasonYear,
      g.week,
      g.homeTeamId,
      g.awayTeamId,
      g.homeScore,
      g.awayScore,
      g.isComplete,
      g.isPlayoffs,
      g.scoringWeeks ?? 1,
    ]);
  for (const g of [...games].sort(
    (a, b) => a.seasonYear - b.seasonYear || a.week - b.week || a.id - b.id
  )) {
    if (
      (season !== undefined && g.seasonYear !== season) ||
      (scope === "regular" && g.isPlayoffs) ||
      (scope === "playoffs" && !g.isPlayoffs)
    )
      continue;
    const hk = `${g.seasonYear}:${g.homeTeamId}`,
      ak = `${g.seasonYear}:${g.awayTeamId}`;
    const h = lookup.get(hk),
      a = lookup.get(ak);
    const affected = Array.from(
      new Set([h, a].filter((t): t is RecordTeam => !!t).map(recordIdentity))
    );
    const issue = (message: string) =>
      affected.forEach(key => managers.get(key)!.issues.push(message));
    const old = seen.get(g.id);
    if (old) {
      if (signature(old) !== signature(g)) {
        issue("conflicting duplicate results");
        for (const id of [old.homeTeamId, old.awayTeamId]) {
          const t = lookup.get(`${old.seasonYear}:${id}`);
          if (t)
            managers
              .get(recordIdentity(t))!
              .issues.push("conflicting duplicate results");
        }
      }
      continue;
    }
    seen.set(g.id, g);
    if (ambiguous.has(hk) || ambiguous.has(ak))
      issue("ambiguous manager ownership");
    for (const [t, opponent, home] of [
      [h, a, true],
      [a, h, false],
    ] as const) {
      if (!t) continue;
      const row = managers.get(recordIdentity(t))!;
      if (
        row.results.some(
          r => r.game.seasonYear === g.seasonYear && r.game.week === g.week
        )
      )
        issue("multiple stored matchups for the same week");
      const score = home ? g.homeScore : g.awayScore,
        opponentScore = home ? g.awayScore : g.homeScore;
      const valid =
        g.isComplete &&
        h &&
        a &&
        recordIdentity(h) !== recordIdentity(a) &&
        !ambiguous.has(hk) &&
        !ambiguous.has(ak) &&
        score !== null &&
        opponentScore !== null &&
        Number.isFinite(score) &&
        Number.isFinite(opponentScore);
      row.results.push({
        game: g,
        score,
        opponentScore,
        opponent: opponent
          ? (opponent.ownerName || opponent.name).trim()
          : null,
        result: valid
          ? score! > opponentScore!
            ? "W"
            : score! < opponentScore!
              ? "L"
              : "T"
          : "?",
      });
    }
  }
  return Array.from(managers.values());
}
/** Within-season consecutive games; absent weeks and unverified results break runs. */
export function resultWindows(
  row: ManagerRecords,
  count: number,
  type: "W" | "L"
) {
  let run: RecordedResult[] = [];
  const windows: RecordedResult[][] = [];
  for (const r of row.results) {
    if (r.result !== type) {
      run = [];
      continue;
    }
    const previous = run.at(-1)?.game;
    if (
      previous &&
      (previous.seasonYear !== r.game.seasonYear ||
        previous.week + (previous.scoringWeeks ?? 1) !== r.game.week)
    )
      run = [];
    run.push(r);
    if (run.length >= count) windows.push(run.slice(-count));
  }
  return windows;
}
export function latestResultWindow(
  row: ManagerRecords,
  count: number,
  type: "W" | "L"
) {
  return resultWindows(row, count, type).at(-1) ?? [];
}
/** A start must be proven from Week 1 through the Nth regular-season game. */
export function seasonStarts(
  row: ManagerRecords,
  wins: number,
  losses: number
) {
  const n = wins + losses,
    years = Array.from(new Set(row.results.map(r => r.game.seasonYear)));
  return years.flatMap(year => {
    const first = row.results
      .filter(r => r.game.seasonYear === year && !r.game.isPlayoffs)
      .slice(0, n);
    if (
      first.length !== n ||
      first.some(
        (r, i) =>
          r.game.week !== i + 1 ||
          (r.game.scoringWeeks ?? 1) !== 1 ||
          r.result === "?" ||
          r.result === "T"
      )
    )
      return [];
    return first.filter(r => r.result === "W").length === wins &&
      first.filter(r => r.result === "L").length === losses
      ? [{ seasonYear: year, games: first }]
      : [];
  });
}

/** Completed streaks, with a separate latest-completed result for current records. */
export function completedStreaks(row: ManagerRecords) {
  const runs: { result: string; games: RecordGame[] }[] = [];
  const state: { current: (typeof runs)[number] | null } = { current: null };
  let interrupted = false;
  if (row.issues.length) return { runs, current: state.current };
  for (const r of row.results) {
    if (r.result === "?") {
      if (r.game.isComplete) state.current = null;
      interrupted = true;
      continue;
    }
    const previous = state.current?.games.at(-1);
    if (
      state.current?.result === r.result &&
      !interrupted &&
      previous &&
      (previous.seasonYear !== r.game.seasonYear ||
        previous.week + (previous.scoringWeeks ?? 1) === r.game.week)
    ) {
      state.current!.games.push(r.game);
    } else {
      state.current = { result: r.result, games: [r.game] };
      runs.push(state.current);
    }
    interrupted = false;
  }
  return { runs, current: state.current };
}

/** Compact calculated evidence for generic responses; omissions never prove a record absent. */
export function summarizeLeagueRecords(
  teams: RecordTeam[],
  games: RecordGame[]
) {
  const describeRun = (run: { result: string; games: RecordGame[] }) => ({
    result: run.result,
    length: run.games.length,
    start: { season: run.games[0].seasonYear, week: run.games[0].week },
    end: { season: run.games.at(-1)!.seasonYear, week: run.games.at(-1)!.week },
    matchupIds: run.games.map(g => g.id),
  });
  return buildLeagueRecordBook(teams, games).map(row => {
    if (row.issues.length)
      return {
        manager: (row.team.ownerName || row.team.name).trim(),
        issues: row.issues,
      };
    const { runs, current } = completedStreaks(row);
    const longest = (type: string) => {
      const selected = runs.filter(r => r.result === type),
        best = Math.max(0, ...selected.map(r => r.games.length));
      return selected.filter(r => r.games.length === best).map(describeRun);
    };
    return {
      manager: (row.team.ownerName || row.team.name).trim(),
      longestWinning: longest("W"),
      longestLosing: longest("L"),
      currentCompleted: current ? describeRun(current) : null,
      latestTwoWins: latestResultWindow(row, 2, "W"),
      latestFourWins: latestResultWindow(row, 4, "W"),
      undefeatedStarts: Array.from({ length: 14 }, (_, i) => ({
        record: `${i + 1}-0`,
        seasons: seasonStarts(row, i + 1, 0).map(s => s.seasonYear),
      })).filter(s => s.seasons.length),
    };
  });
}
