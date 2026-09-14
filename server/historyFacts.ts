import type { Team, Matchup, LeagueSeason } from "../drizzle/schema";
type HistoryTeam = Pick<
  Team,
  "espnTeamId" | "seasonYear" | "name" | "ownerName" | "franchiseKey"
>;
type HistoryGame = Pick<
  Matchup,
  | "id"
  | "seasonYear"
  | "week"
  | "homeTeamId"
  | "awayTeamId"
  | "homeScore"
  | "awayScore"
  | "isComplete"
  | "isPlayoffs"
  | "scoringWeeks"
>;
type SeasonPodium = Pick<
  LeagueSeason,
  "seasonYear" | "championName" | "runnerUpName"
>;
const normalize = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
const identity = (t: HistoryTeam) =>
  t.franchiseKey || t.ownerName || `${t.seasonYear}:${t.espnTeamId}`;
const label = (t: HistoryTeam) => (t.ownerName || t.name).trim();
const scoring =
  /\b(?:highest|lowest|best|worst|top|most|least)\b.*\b(?:scor\w*|points?|performances?)\b/i;
const titles = /\b(?:champions?|championships?|titles?)\b/i;
const career = /\b(?:career|record|wins|losses|victories|defeats)\b/i;
const h2h =
  /head[ -]to[ -]head|\bh2h\b|\b(?:record|history|series|meetings|faced|played|wins|won|beat|beaten)\b.*\b(?:against|versus|vs\.?|each other)\b/i;
export const isHistoricalQuestion = (q: string) =>
  scoring.test(q) ||
  titles.test(q) ||
  /\b(?:most|fewest|least|many)\s+(?:career\s+)?(?:wins|losses|victories|defeats)\b/i.test(
    q
  ) ||
  h2h.test(q) ||
  (/\b(?:beat|beaten|faced|meetings|versus|vs)\b|\bwho leads\b/i.test(q) &&
    !/\b(?:this week|next|lineup|roster|weather|forecast|projected|projection)\b/i.test(
      q
    )) ||
  /\b(?:histor\w*|all[ -]time|career|records?|championships?|titles?|last season|past seasons?)\b|\b(?:19|20)\d{2}\b/i.test(
    q
  );
const unsupported =
  "I don't have a verified calculation for that historical question yet. Try a head-to-head record (Roger vs Daly all-time), a manager's highest scoring performances, or a specific season and week. I won't estimate historical numbers from a summary.";

/** Answers supported record questions without asking a language model to count or infer results. */
export function answerHistoryQuestion(
  teams: HistoryTeam[],
  games: HistoryGame[],
  q: string,
  currentSeason: number,
  myTeamId?: number | null,
  podium: SeasonPodium[] = []
): string {
  const years = Array.from(new Set(q.match(/\b(?:19|20)\d{2}\b/g) ?? []));
  if (years.length > 1)
    return "Please ask for one season or all-time history; a range of seasons is not supported yet.";
  const season = years.length
    ? Number(years[0])
    : /\b(?:this|current) season\b/i.test(q)
      ? currentSeason
      : /\blast season\b/i.test(q)
        ? currentSeason - 1
        : undefined;
  const week = Number(q.match(/\bweek\s+(\d{1,2})\b/i)?.[1]) || undefined;
  if (week && !season) return "Please include the season as well as the week.";
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
  const normalized = ` ${normalize(q)} `;
  const selected = new Map<string, HistoryTeam>();
  const latest = new Map<string, HistoryTeam>();
  for (const t of [...teams].sort((a, b) => a.seasonYear - b.seasonYear))
    latest.set(identity(t), t);
  for (const t of teams)
    if (
      [t.ownerName, t.name].some(
        n => n && normalized.includes(` ${normalize(n)} `)
      )
    )
      selected.set(identity(t), latest.get(identity(t))!);
  if (/\bmy\b|\bhave i\b|\bdid i\b/i.test(q)) {
    const me = teams.find(
      t => t.seasonYear === currentSeason && t.espnTeamId === myTeamId
    );
    if (!me)
      return "Choose your team in the league dashboard first so I can identify your history.";
    selected.set(identity(me), me);
  }
  const named = Array.from(selected.values());
  if (titles.test(q)) {
    if (
      week ||
      (/\b(?:consecutive|streak|before|after|since|first|last|runner|second|third)\b/i.test(
        q
      ) &&
        !/\blast season\b/i.test(q))
    )
      return unsupported;
    const known = podium.filter(
      p => p.championName && (!season || p.seasonYear === season)
    );
    if (!known.length)
      return "No championship record is stored for this selection; I won't infer a champion from standings.";
    const ownerNames = new Set(named.map(t => normalize(label(t))));
    const rows = new Map<string, { name: string; years: number[] }>();
    for (const p of known) {
      const key = normalize(p.championName!);
      const row = rows.get(key) || { name: p.championName!.trim(), years: [] };
      if (!row.years.includes(p.seasonYear)) row.years.push(p.seasonYear);
      rows.set(key, row);
    }
    for (const t of named)
      if (!rows.has(normalize(label(t))))
        rows.set(normalize(label(t)), { name: label(t), years: [] });
    const ranked = Array.from(rows.entries())
      .filter(([key]) => !named.length || ownerNames.has(key))
      .map(([, r]) => r)
      .sort(
        (a, b) =>
          b.years.length - a.years.length || a.name.localeCompare(b.name)
      );
    return `**Championship records${season ? ` — ${season}` : " — all stored seasons"}**\n${ranked.map(r => `- ${r.name}: ${r.years.length} championship${r.years.length === 1 ? "" : "s"}${r.years.length ? ` (${r.years.sort((a, b) => a - b).join(", ")})` : ""}.`).join("\n")}\n\nSource: this league's stored championship table, covering ${known
      .map(p => p.seasonYear)
      .sort((a, b) => a - b)
      .join(", ")}. Titles are not inferred from regular-season wins.`;
  }
  const headToHead =
    h2h.test(q) ||
    (named.length === 2 &&
      /\b(?:vs|versus|against|record|history|series|meetings|beat|beaten|faced|leads|times)\b/i.test(
        q
      ));
  if (headToHead && scoring.test(q)) return unsupported;
  if (headToHead && named.length !== 2)
    return "Please name exactly two managers for the head-to-head record.";
  if (scoring.test(q) && named.length > 1)
    return "Please ask for one manager's scoring performances at a time, or the league-wide scoring leaders.";
  if (
    scoring.test(q) &&
    !named.length &&
    !/\b(?:league|anyone|ever|all[ -]time)\b/i.test(q)
  )
    return "Please name the manager as listed in the league, or ask for league-wide scoring leaders.";
  const careerRecord =
    !headToHead && !scoring.test(q) && !week && career.test(q);
  if (!headToHead && !scoring.test(q) && !careerRecord && !(season && week))
    return unsupported;
  if (
    /\b(?:average|total|margin|combined|home|away|consecutive|first|last|since|before|after)\b/i.test(
      q
    ) &&
    !/\blast season\b/i.test(q)
  )
    return unsupported;
  const lookup = new Map(
    teams.map(t => [`${t.seasonYear}:${t.espnTeamId}`, t])
  );
  const seen = new Set<number>();
  const fixtures = new Set<string>();
  let omitted = 0;
  const completed = games
    .filter(
      g =>
        g.isComplete &&
        (!season || g.seasonYear === season) &&
        (!week || g.week === week) &&
        (scope !== "regular" || !g.isPlayoffs) &&
        (scope !== "playoffs" || g.isPlayoffs)
    )
    .flatMap(g => {
      if (seen.has(g.id)) return [];
      seen.add(g.id);
      const h = lookup.get(`${g.seasonYear}:${g.homeTeamId}`),
        a = lookup.get(`${g.seasonYear}:${g.awayTeamId}`);
      if (
        !h ||
        !a ||
        identity(h) === identity(a) ||
        g.homeScore === null ||
        g.awayScore === null ||
        !Number.isFinite(g.homeScore) ||
        !Number.isFinite(g.awayScore)
      ) {
        omitted++;
        return [];
      }
      const fixture = `${g.seasonYear}:${g.week}:${[identity(h), identity(a)].sort().join(":")}`;
      if (fixtures.has(fixture)) {
        omitted++;
        return [];
      }
      fixtures.add(fixture);
      return [{ g, h, a, hs: g.homeScore, as: g.awayScore }];
    });
  if (omitted)
    return "The selected history contains missing scores, unresolved teams, or duplicate matchups. I can't give a reliable record until those rows are checked.";
  const source = `Source: this league's stored completed matchups; ${season ?? "all seasons"}${week ? `, Week ${week}` : ""}; ${scope === "all" ? "regular season and postseason" : scope === "regular" ? "regular season only" : "postseason only"}. Unfinished games are excluded. This reports stored history, not an independent audit of the original records.`;
  if (headToHead) {
    const [one, two] = named,
      k1 = identity(one),
      k2 = identity(two);
    const series = completed
      .filter(
        r =>
          [identity(r.h), identity(r.a)].includes(k1) &&
          [identity(r.h), identity(r.a)].includes(k2)
      )
      .sort((a, b) => a.g.seasonYear - b.g.seasonYear || a.g.week - b.g.week);
    const wins = series.filter(
      r => (identity(r.h) === k1 ? r.hs - r.as : r.as - r.hs) > 0
    ).length;
    const ties = series.filter(r => r.hs === r.as).length;
    const losses = series.length - wins - ties;
    const last = series.at(-1);
    const result = last
      ? `${label(one)} ${(identity(last.h) === k1 ? last.hs : last.as).toFixed(2)} – ${label(two)} ${(identity(last.h) === k2 ? last.hs : last.as).toFixed(2)}; ${last.hs === last.as ? "tie" : `${label(last.hs > last.as ? last.h : last.a)} won`}`
      : "";
    return `**${label(one)} vs ${label(two)}: ${series.length} completed meetings**\n- ${label(one)}: ${wins} wins\n- ${label(two)}: ${losses} wins\n- Ties: ${ties}${last ? `\n- Latest meeting: ${last.g.seasonYear} Week ${last.g.week} — ${result}${last.g.scoringWeeks > 1 ? ` (${last.g.scoringWeeks}-week combined matchup)` : ""}.` : ""}\n\n${source} Multiweek playoff matchups count once. Home/away splits are not reported because the historical source does not establish venue assignments.`;
  }
  if (careerRecord) {
    if (/\b(?:percentage|percent|average|points|best|worst)\b/i.test(q))
      return unsupported;
    // Career W-L defaults to regular-season results, consistent with the dashboard.
    const includePostseason = /playoff|postseason/i.test(q);
    const rows = new Map<
      string,
      { name: string; wins: number; losses: number; ties: number }
    >();
    for (const r of completed.filter(
      r => includePostseason || !r.g.isPlayoffs
    )) {
      for (const [t, score, against] of [
        [r.h, r.hs, r.as],
        [r.a, r.as, r.hs],
      ] as const) {
        const key = identity(t);
        if (named.length && !selected.has(key)) continue;
        const row = rows.get(key) || {
          name: label(latest.get(key) || t),
          wins: 0,
          losses: 0,
          ties: 0,
        };
        if (score > against) row.wins++;
        else if (score < against) row.losses++;
        else row.ties++;
        rows.set(key, row);
      }
    }
    const metric =
      /losses|defeats/i.test(q) && !/wins|victories/i.test(q)
        ? "losses"
        : "wins";
    const direction = /fewest|least/i.test(q) ? 1 : -1;
    const ranked = Array.from(rows.values()).sort(
      (a, b) =>
        direction * (a[metric] - b[metric]) || a.name.localeCompare(b.name)
    );
    return `**Completed ${includePostseason ? (scope === "playoffs" ? "postseason" : "regular-season and postseason") : "regular-season"} records — ${season ?? "all seasons"}**\n${ranked.length ? ranked.map(r => `- ${r.name}: ${r.wins} wins, ${r.losses} losses, ${r.ties} ties.`).join("\n") : "No qualifying completed results found."}\n\nSource: this league's stored completed matchups, following franchise identity across seasons. Multiweek matchups count once; unfinished games are excluded. This reports the stored archive, not an independent audit of the original records.`;
  }
  if (scoring.test(q)) {
    const low = /\b(?:lowest|worst|least)\b/i.test(q);
    const requested = Number(q.match(/\btop\s+(\d+)\b/i)?.[1] ?? 5);
    if (requested < 1 || requested > 50)
      return "Please request between 1 and 50 scoring performances.";
    const candidates = completed
      .filter(r => r.g.scoringWeeks === 1)
      .flatMap(r => [
        { g: r.g, t: r.h, opponent: r.a, score: r.hs, against: r.as },
        { g: r.g, t: r.a, opponent: r.h, score: r.as, against: r.hs },
      ])
      .filter(r => !named.length || identity(r.t) === identity(named[0]))
      .sort(
        (a, b) =>
          (low ? a.score - b.score : b.score - a.score) ||
          a.g.seasonYear - b.g.seasonYear ||
          a.g.week - b.g.week
      );
    const limitScore = candidates[requested - 1]?.score;
    const ranked = candidates.filter(
      (r, i) => i < requested || r.score === limitScore
    );
    return `**${named.length ? label(named[0]) : "League"}: ${low ? "lowest" : "highest"} single-week scoring performances**\n${ranked.length ? ranked.map((r, i) => `${i + 1}. ${r.g.seasonYear} Week ${r.g.week}: ${label(r.t)} **${r.score.toFixed(2)}** vs ${label(r.opponent)} ${r.against.toFixed(2)} — ${r.score === r.against ? "tied" : r.score > r.against ? "won" : "lost"}.`).join("\n") : "No qualifying completed performances found."}\n\n${source} Ranked by the manager's own points; multiweek totals are excluded. Ties at the cutoff are included.`;
  }
  const results = completed.filter(
    r =>
      !named.length ||
      selected.has(identity(r.h)) ||
      selected.has(identity(r.a))
  );
  return `${results.length ? results.map(r => `- ${r.g.seasonYear} Week ${r.g.week}: ${label(r.h)} ${r.hs.toFixed(2)} – ${label(r.a)} ${r.as.toFixed(2)}; ${r.hs === r.as ? "tie" : `${label(r.hs > r.as ? r.h : r.a)} won`}${r.g.scoringWeeks > 1 ? ` (${r.g.scoringWeeks}-week combined matchup)` : ""}.`).join("\n") : "No qualifying completed matchups found."}\n\n${source}`;
}
