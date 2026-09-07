type Team = {
  espnTeamId: number;
  seasonYear: number;
  name: string;
  ownerName: string | null;
  franchiseKey?: string | null;
};
type Game = {
  id: number;
  seasonYear: number;
  week: number;
  homeTeamId: number;
  awayTeamId: number;
  homeScore: number | null;
  awayScore: number | null;
  isComplete: number | null;
  isPlayoffs: number | null;
};
type Run = { result: string; games: Game[] };
const identity = (t: Team) =>
  t.franchiseKey || t.ownerName || `${t.seasonYear}:${t.espnTeamId}`;
export const isStreakQuestion = (q: string) =>
  /\bstreaks?\b|\b(?:consecutive|straight)\s+(?:wins?|losses|victories|defeats)\b/i.test(
    q
  );
export function calculateLeagueStreaks(
  teams: Team[],
  games: Game[],
  season?: number,
  scope = "all"
) {
  const lookup = new Map(
    teams.map(t => [`${t.seasonYear}:${t.espnTeamId}`, t])
  );
  const rows = new Map<
    string,
    { team: Team; current: Run | null; runs: Run[] }
  >();
  for (const t of [...teams].sort((a, b) => a.seasonYear - b.seasonYear)) {
    const old = rows.get(identity(t));
    if (old) old.team = t;
    else rows.set(identity(t), { team: t, current: null, runs: [] });
  }
  const seen = new Set<number>();
  let counted = 0;
  for (const g of [...games].sort(
    (a, b) => a.seasonYear - b.seasonYear || a.week - b.week || a.id - b.id
  )) {
    if (
      seen.has(g.id) ||
      !g.isComplete ||
      (season !== undefined && g.seasonYear !== season) ||
      (scope === "regular" && g.isPlayoffs) ||
      (scope === "playoffs" && !g.isPlayoffs)
    )
      continue;
    seen.add(g.id);
    const h = lookup.get(`${g.seasonYear}:${g.homeTeamId}`),
      a = lookup.get(`${g.seasonYear}:${g.awayTeamId}`);
    const valid =
      h &&
      a &&
      identity(h) !== identity(a) &&
      g.homeScore !== null &&
      g.awayScore !== null &&
      Number.isFinite(g.homeScore) &&
      Number.isFinite(g.awayScore);
    if (valid) counted++;
    for (const [t, sign] of [
      [h, 1],
      [a, -1],
    ] as const) {
      if (!t) continue;
      const row = rows.get(identity(t))!;
      if (!valid) {
        row.current = null;
        continue;
      }
      const diff = (g.homeScore! - g.awayScore!) * sign,
        result = diff > 0 ? "W" : diff < 0 ? "L" : "T";
      if (row.current?.result === result) row.current.games.push(g);
      else {
        row.current = { result, games: [g] };
        row.runs.push(row.current);
      }
    }
  }
  return { rows: Array.from(rows.values()), counted };
}
export function answerStreakQuestion(
  teams: Team[],
  games: Game[],
  q: string,
  currentSeason: number,
  myTeamId?: number | null
) {
  const years = q.match(/\b(?:19|20)\d{2}\b/g) ?? [];
  if (new Set(years).size > 1)
    return "Please ask for one season or all-time streaks. A range of seasons is not supported yet.";
  const season = years.length
    ? Number(years[0])
    : /\b(?:this|current) season\b/i.test(q)
      ? currentSeason
      : undefined;
  const scope =
    /includ(?:e|ing).*playoff|regular[ -]season and (?:the )?(?:playoff|postseason)/i.test(
      q
    )
      ? "all"
      : /regular[ -]season/i.test(q)
        ? "regular"
        : /playoff|postseason/i.test(q)
          ? "playoffs"
          : "all";
  const current = /\bcurrent(?:ly)?\b(?!\s+season)|\bright now\b/i.test(q);
  const report = calculateLeagueStreaks(teams, games, season, scope);
  let rows = report.rows;
  if (/\bmy\b|\bhave i\b/i.test(q)) {
    const t = teams.find(
      t => t.seasonYear === currentSeason && t.espnTeamId === myTeamId
    );
    if (!t)
      return "Choose your team in the league dashboard first so I can find your streak records.";
    rows = rows.filter(r => identity(r.team) === identity(t));
  } else {
    const named = teams.filter(t =>
      [t.name, t.ownerName].some(
        n =>
          n &&
          ` ${q.toLowerCase().replace(/[^a-z0-9]+/g, " ")} `.includes(
            ` ${n
              .trim()
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, " ")} `
          )
      )
    );
    if (named.length) {
      const keys = new Set(named.map(identity));
      rows = rows.filter(r => keys.has(identity(r.team)));
    }
  }
  if (current) {
    const active = new Set(
      teams
        .filter(t => t.seasonYear === (season ?? currentSeason))
        .map(identity)
    );
    rows = rows.filter(r => active.has(identity(r.team)));
  }
  const loss = /los(?:ing|s|ses)|defeats?/i.test(q),
    win = /win(?:ning|s)?|victor/i.test(q);
  const types = loss && !win ? ["L"] : win && !loss ? ["W"] : ["W", "L"];
  return (
    types
      .map(type => {
        const candidates = rows.flatMap(r =>
          (current ? (r.current ? [r.current] : []) : r.runs)
            .filter(run => run.result === type)
            .map(run => ({ team: r.team, run }))
        );
        const best = Math.max(0, ...candidates.map(c => c.run.games.length));
        const title = `${current ? "Current" : "Longest"} ${type === "W" ? "winning" : "losing"} streak`;
        if (!best)
          return `**${title}:** No qualifying completed-game streak found for this selection.`;
        return (
          `**${title}: ${best} ${best === 1 ? "game" : "games"}**\n` +
          candidates
            .filter(c => c.run.games.length === best)
            .map(c => {
              const start = c.run.games[0],
                end = c.run.games[c.run.games.length - 1];
              return `- ${(c.team.ownerName || c.team.name).trim()} (${c.team.name.trim()}): ${start.seasonYear} Week ${start.week} through ${end.seasonYear} Week ${end.week}.`;
            })
            .join("\n")
        );
      })
      .join("\n\n") +
    `\n\nSource: ${report.counted} completed matchups in this league's stored history. Scope: ${season ?? "all seasons"}; ${scope === "all" ? "regular season and postseason" : scope === "regular" ? "regular season only" : "postseason only"}. Consecutive recorded results follow each manager across team-name changes and seasons. Ties break streaks; unfinished games do not count. A multiweek playoff matchup counts as one result. Dates identify recorded games, not a claim that the archive is complete.${current ? " Current means through the latest completed game in this scope; a streak can carry over from the prior season." : ""}`
  );
}
