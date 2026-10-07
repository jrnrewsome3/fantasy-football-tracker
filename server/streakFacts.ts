import {
  buildLeagueRecordBook,
  completedStreaks,
  resultWindows,
  seasonStarts,
} from "./recordBook";
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
  scoringWeeks?: number | null;
};
const identity = (t: Team) =>
  t.franchiseKey || t.ownerName || `${t.seasonYear}:${t.espnTeamId}`;
const numberWords: Record<string, number> = {
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
};
const countPattern = "(\\d+|two|three|four|five|six|seven|eight|nine|ten)";
function requestedCount(q: string): number | undefined {
  const match = q.match(
    new RegExp(
      `\\b${countPattern}\\s+(?:(?:games?|wins?|losses|victories|defeats)\\s+)?(?:in a row|straight|consecutiv(?:e|ely)|back[ -]to[ -]back)\\b`,
      "i"
    )
  );
  const streakCount =
    match ??
    q.match(
      new RegExp(
        `\\b${countPattern}[ -](?:games?|wins?|losses)[ -](?:(?:winning|losing)[ -])?streak\\b`,
        "i"
      )
    );
  return streakCount
    ? (numberWords[streakCount[1].toLowerCase()] ?? Number(streakCount[1]))
    : undefined;
}
function requestedStart(q: string) {
  const match = q.match(/\b(\d{1,2})\s*[-–—]\s*(\d{1,2})\b/);
  return match
    ? { wins: Number(match[1]), losses: Number(match[2]) }
    : undefined;
}
function isStartQuestion(q: string) {
  return (
    !/head[ -]to[ -]head|\b(?:against|versus|vs)\b/i.test(q) &&
    requestedStart(q) !== undefined &&
    /\b(?:start(?:ed|s|ing)?|open(?:ed|ing)?|went|go|gone|begin|began|record|undefeated|who|last|list|all|ever|currently|was|is|how)\b/i.test(
      q
    )
  );
}
function answerSeasonStart(
  teams: Team[],
  games: Game[],
  selected: Team[],
  q: string,
  season?: number
) {
  const target = requestedStart(q)!;
  if (target.wins + target.losses < 1 || target.wins + target.losses > 18)
    return "Please ask for a season-start record covering 1 to 18 regular-season games.";
  const book = buildLeagueRecordBook(teams, games, season, "regular").filter(
    r => selected.some(t => identity(t) === identity(r.team))
  );
  const issues = Array.from(new Set(book.flatMap(r => r.issues)));
  if (issues.length)
    return `I can't verify season starts because the stored matchups contain ${issues.join("; ")}.`;
  let matches = book
    .flatMap(r =>
      seasonStarts(r, target.wins, target.losses).map(start => ({
        team: r.team,
        ...start,
      }))
    )
    .sort((a, b) => b.seasonYear - a.seasonYear);
  const frequency = /\b(?:how many times|how often|number of times)\b/i.test(q);
  const all = frequency || /\b(?:every|all|list)\b/i.test(q);
  if (!all && matches.length)
    matches = matches.filter(m => m.seasonYear === matches[0].seasonYear);
  const label = `${target.wins}–${target.losses}`;
  return (
    (frequency
      ? `**Confirmed ${label} season starts:**\n` +
        book
          .map(
            row =>
              `- ${(row.team.ownerName || row.team.name).trim()}: ${matches.filter(m => identity(m.team) === identity(row.team)).length} (${
                matches
                  .filter(m => identity(m.team) === identity(row.team))
                  .map(m => m.seasonYear)
                  .join(", ") || "none found"
              }).`
          )
          .join("\n")
      : matches.length
        ? `**${all ? "Recorded" : "Most recent confirmed"} ${label} season starts:**\n` +
          matches
            .map(
              m =>
                `- ${(m.team.ownerName || m.team.name).trim()}: ${m.seasonYear}, Weeks 1–${target.wins + target.losses} (${m.games.map(r => r.result).join("–")}).`
            )
            .join("\n")
        : `No confirmed ${label} season start was found for this selection in the stored results.`) +
    `\n\nMeaning: the record after the first ${target.wins + target.losses} regular-season games, starting in Week 1; not any later stretch. Source: this league's stored game-by-game results; ${season ?? "all seasons"}. Every game must have a completed, valid result. Missing weeks, ties and unfinished games do not qualify. A later win or loss does not erase an earlier ${label} start.`
  );
}
export const isStreakQuestion = (q: string) =>
  isStartQuestion(q) ||
  ((/\bstreaks?\b|\b(?:consecutive|straight)\s+(?:wins?|losses|victories|defeats)\b|\b(?:in a row|back[ -]to[ -]back)\b/i.test(
    q
  ) ||
    requestedCount(q) !== undefined) &&
    /\b(?:streaks?|win(?:ning|s)?|won|los(?:ing|s|ses|t)|victor(?:y|ies)|defeats?)\b/i.test(
      q
    ));

/** Latest qualifying window, occurrence counts or an evidence list for any manager. */
function answerLatestStreak(
  teams: Team[],
  games: Game[],
  selected: Team[],
  count: number,
  type: string,
  season: number | undefined,
  scope: string,
  q = ""
): string {
  if (!Number.isInteger(count) || count < 2 || count > 100)
    return "Please ask for a streak of 2 to 100 games.";
  const book = buildLeagueRecordBook(teams, games, season, scope).filter(row =>
    selected.some(t => identity(t) === identity(row.team))
  );
  const issues = Array.from(new Set(book.flatMap(r => r.issues)));
  if (issues.length)
    return `I can't verify this streak because the stored matchups contain ${issues.join("; ")}.`;
  const frequency = /\b(?:how many times|how often|number of times)\b/i.test(q);
  const list =
    /\blist\b|\bevery\b|\ball (?:instances|occurrences|streaks)\b/i.test(q);
  const windows = book.flatMap(row =>
    resultWindows(row, count, type as "W" | "L").map(window => ({
      row,
      window,
    }))
  );
  windows.sort(
    (a, b) =>
      b.window.at(-1)!.game.seasonYear - a.window.at(-1)!.game.seasonYear ||
      b.window.at(-1)!.game.week - a.window.at(-1)!.game.week
  );
  const action = type === "W" ? "won" : "lost",
    name = (t: Team) => (t.ownerName || t.name).trim();
  let text: string;
  if (frequency) {
    text =
      `**Confirmed ${count}-game ${type === "W" ? "winning" : "losing"} sequences:**\n` +
      book
        .map(
          row =>
            `- ${name(row.team)}: ${windows.filter(w => w.row === row).length}.`
        )
        .join("\n") +
      "\nOverlapping sequences count separately: three consecutive wins contain two two-win sequences.";
  } else if (!windows.length) {
    text = `No confirmed instance of ${book.length === 1 ? name(book[0].team) : "a selected manager"} having ${action} ${count} games in a row was found in the stored results for this scope.`;
  } else {
    const end = windows[0].window.at(-1)!.game;
    const matches = list
      ? windows
      : windows.filter(
          w =>
            w.window.at(-1)!.game.seasonYear === end.seasonYear &&
            w.window.at(-1)!.game.week === end.week
        );
    text = matches
      .map(
        ({ row, window }) =>
          `**${name(row.team)} has ${action} ${count} games in a row. ${list ? "Recorded occurrence" : "Most recent confirmed occurrence"}:**\n` +
          window
            .map(
              r =>
                `- ${r.game.seasonYear} Week ${r.game.week}${r.game.isPlayoffs ? " (postseason)" : ""}: ${type === "W" ? "beat" : "lost to"} ${r.opponent}, ${Number(r.score).toFixed(2)}–${Number(r.opponentScore).toFixed(2)}.`
            )
            .join("\n")
      )
      .join("\n\n");
  }
  const pending = book
    .flatMap(row =>
      row.results
        .filter(r => !r.game.isComplete)
        .map(r => ({ row, game: r.game }))
    )
    .sort(
      (a, b) =>
        b.game.seasonYear - a.game.seasonYear || b.game.week - a.game.week
    )[0];
  return (
    text +
    (pending
      ? `\n\n${pending.game.seasonYear} Week ${pending.game.week} is still marked unfinished and is excluded, even if the live score shows a lead.`
      : "") +
    `\n\nSource: this league's stored game-by-game results. Scope: ${season ?? "all seasons"}; ${scope === "all" ? "regular season and postseason" : scope === "regular" ? "regular season only" : "postseason only"}. Each qualifying sequence stays within one season. Ties, missing weeks, invalid scores and unfinished games break the sequence. A multiweek matchup counts as one game. This does not establish that missing history contains no streaks.`
  );
}
export function calculateLeagueStreaks(
  teams: Team[],
  games: Game[],
  season?: number,
  scope = "all"
) {
  const book = buildLeagueRecordBook(teams, games, season, scope);
  const rows = book.map(row => ({
    team: row.team,
    issues: row.issues,
    ...completedStreaks(row),
  }));
  const counted = new Set(
    book.flatMap(row =>
      row.results.filter(r => r.result !== "?").map(r => r.game.id)
    )
  ).size;
  return { rows, counted };
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
      : /\blast season\b/i.test(q)
        ? currentSeason - 1
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
  let selectedManager = false;
  if (/\b(?:my|i)\b/i.test(q)) {
    const t = teams.find(
      t => t.seasonYear === currentSeason && t.espnTeamId === myTeamId
    );
    if (!t)
      return "Choose your team in the league dashboard first so I can find your streak records.";
    rows = rows.filter(r => identity(r.team) === identity(t));
    selectedManager = true;
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
      selectedManager = true;
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
  const issues = Array.from(new Set(rows.flatMap(r => r.issues)));
  if (issues.length)
    return `I can't verify these records because the stored matchups contain ${issues.join("; ")}.`;
  const leagueSelection =
    /\b(?:who|someone|anyone|anybody|everyone|league|list|every|all managers|all \d|any manager)\b/i.test(
      q
    );
  if (isStartQuestion(q)) {
    if (!selectedManager && !leagueSelection)
      return "Please name one manager or ask who in the league had that season start.";
    return answerSeasonStart(
      teams,
      games,
      rows.map(r => r.team),
      q,
      season ?? (current ? currentSeason : undefined)
    );
  }
  const loss = /\b(?:los(?:ing|s|ses|t)|defeats?)\b/i.test(q),
    win = /\b(?:win(?:ning|s)?|won|victor(?:y|ies))\b/i.test(q);
  const count = requestedCount(q);
  const latest =
    !current &&
    !/\blongest\b/i.test(q) &&
    (count !== undefined ||
      /\b(?:last time|most recent|when|ever|back[ -]to[ -]back)\b/i.test(q));
  if (latest) {
    if (!selectedManager && !leagueSelection)
      return "Please name one manager or select your team and ask about my streak.";
    if (win === loss)
      return "Please specify wins or losses for the latest streak.";
    return answerLatestStreak(
      teams,
      games,
      rows.map(r => r.team),
      count ?? 2,
      loss ? "L" : "W",
      season,
      scope,
      q
    );
  }
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
    `\n\nSource: ${report.counted} completed matchups in this league's stored history. Scope: ${season ?? "all seasons"}; ${scope === "all" ? "regular season and postseason" : scope === "regular" ? "regular season only" : "postseason only"}. Consecutive recorded results follow each manager across team-name changes and seasons. Ties and missing weeks break streaks; unfinished games do not count. A multiweek playoff matchup counts as one result. Dates identify recorded games, not a claim that the archive is complete.${current ? " Current means through the latest completed game in this scope; a streak can carry over from the prior season." : ""}`
  );
}
