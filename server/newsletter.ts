/**
 * League newsletters — a pre-week preview and a post-week recap, written to be
 * pasted straight into the league chat.
 *
 * The facts are computed here, exactly, and handed to the model as a compact
 * brief. The model's job is voice, not arithmetic: it never sees raw tables and
 * is never asked to work out a record, a margin, or a streak. That keeps the
 * writing entertaining and the numbers true, which is the whole trick.
 */

import { and, eq, lt } from "drizzle-orm";
import { matchups, teams } from "../drizzle/schema";
import { getDb } from "./db";
import { invokeLLM } from "./_core/llm";
import { getLeagueById } from "./leagueDb";
import { getMatchupSeries } from "./rivalry";

export interface Newsletter {
  kind: "preview" | "recap";
  week: number;
  seasonYear: number;
  leagueName: string;
  markdown: string;
  /** The verified facts the text was written from, for spot-checking. */
  brief: string;
}

interface Person {
  key: string;
  label: string;
}

/** Season-to-date form for everyone, plus the identity map for the season. */
async function loadSeason(leagueId: number, seasonYear: number, week: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const teamRows = await db
    .select()
    .from(teams)
    .where(and(eq(teams.leagueId, leagueId), eq(teams.seasonYear, seasonYear)));

  const identity = new Map<number, Person>();
  for (const t of teamRows) {
    identity.set(t.espnTeamId, {
      key: t.franchiseKey || t.ownerName || t.name,
      label: t.ownerName || t.name,
    });
  }

  const played = await db
    .select()
    .from(matchups)
    .where(
      and(
        eq(matchups.leagueId, leagueId),
        eq(matchups.seasonYear, seasonYear),
        eq(matchups.isComplete, 1),
        lt(matchups.week, week)
      )
    );

  const form = new Map<
    number,
    { wins: number; losses: number; points: number; games: number; last: string[] }
  >();
  const bump = (id: number, mine: number, theirs: number) => {
    const row = form.get(id) || {
      wins: 0,
      losses: 0,
      points: 0,
      games: 0,
      last: [] as string[],
    };
    row.games++;
    row.points += mine;
    if (mine > theirs) {
      row.wins++;
      row.last.push("W");
    } else if (mine < theirs) {
      row.losses++;
      row.last.push("L");
    }
    form.set(id, row);
  };

  for (const m of played) {
    if (m.isPlayoffs) continue;
    bump(m.homeTeamId, m.homeScore ?? 0, m.awayScore ?? 0);
    bump(m.awayTeamId, m.awayScore ?? 0, m.homeScore ?? 0);
  }

  return { identity, form, played };
}

const record = (
  form: Map<number, { wins: number; losses: number }>,
  id: number
) => {
  const row = form.get(id);
  return row ? `${row.wins}-${row.losses}` : "0-0";
};

const average = (
  form: Map<number, { points: number; games: number }>,
  id: number
) => {
  const row = form.get(id);
  return row && row.games ? (row.points / row.games).toFixed(1) : null;
};

/** A compact, factual brief. Everything the model is allowed to assert. */
async function buildPreviewBrief(
  leagueId: number,
  seasonYear: number,
  week: number
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { identity, form, played } = await loadSeason(
    leagueId,
    seasonYear,
    week
  );

  const upcoming = await db
    .select()
    .from(matchups)
    .where(
      and(
        eq(matchups.leagueId, leagueId),
        eq(matchups.seasonYear, seasonYear),
        eq(matchups.week, week)
      )
    );

  const series = await getMatchupSeries(
    leagueId,
    upcoming.map(m => ({
      seasonYear,
      homeTeamId: m.homeTeamId,
      awayTeamId: m.awayTeamId,
    }))
  );

  const lines: string[] = [];
  for (const m of upcoming) {
    const home = identity.get(m.homeTeamId);
    const away = identity.get(m.awayTeamId);
    if (!home || !away) continue;

    const s = series.get(`${seasonYear}:${m.homeTeamId}:${m.awayTeamId}`);
    const parts = [
      `${home.label} (${record(form, m.homeTeamId)}) vs ${away.label} (${record(form, m.awayTeamId)})`,
    ];

    const homeAvg = average(form, m.homeTeamId);
    const awayAvg = average(form, m.awayTeamId);
    if (homeAvg && awayAvg)
      parts.push(
        `scoring averages ${home.label} ${homeAvg}, ${away.label} ${awayAvg}`
      );

    if (m.homeProjected && m.awayProjected)
      parts.push(
        `projected ${home.label} ${m.homeProjected.toFixed(1)}, ${away.label} ${m.awayProjected.toFixed(1)}`
      );

    if (s && s.meetings > 0) {
      parts.push(
        s.leader === "even"
          ? `all-time series tied ${s.homeWins}-${s.awayWins} over ${s.meetings} meetings`
          : `${s.leader === "home" ? home.label : away.label} leads the all-time series ${Math.max(s.homeWins, s.awayWins)}-${Math.min(s.homeWins, s.awayWins)} over ${s.meetings} meetings`
      );
      if (s.streak && s.streak.count > 1)
        parts.push(
          `${s.streak.key === "home" ? home.label : away.label} has won ${s.streak.count} straight in this series`
        );
      if (s.lastMeeting)
        parts.push(
          `last met ${s.lastMeeting.seasonYear}${s.lastMeeting.isPlayoffs ? " playoffs" : ` week ${s.lastMeeting.week}`}, ${s.lastMeeting.homeScore.toFixed(1)}-${s.lastMeeting.awayScore.toFixed(1)}`
        );
    } else {
      parts.push("they have never played each other");
    }

    // A rematch inside this same season is worth flagging.
    const earlier = played.find(
      p =>
        !p.isPlayoffs &&
        ((p.homeTeamId === m.homeTeamId && p.awayTeamId === m.awayTeamId) ||
          (p.homeTeamId === m.awayTeamId && p.awayTeamId === m.homeTeamId))
    );
    if (earlier) {
      const eh = identity.get(earlier.homeTeamId);
      const ea = identity.get(earlier.awayTeamId);
      const winner =
        (earlier.homeScore ?? 0) > (earlier.awayScore ?? 0) ? eh : ea;
      if (winner)
        parts.push(
          `rematch — ${winner.label} won the week ${earlier.week} meeting ${(earlier.homeScore ?? 0).toFixed(1)}-${(earlier.awayScore ?? 0).toFixed(1)}`
        );
    }

    lines.push("- " + parts.join("; "));
  }

  const standings = Array.from(form.entries())
    .map(([id, row]) => ({
      label: identity.get(id)?.label ?? "Unknown",
      ...row,
    }))
    .sort((a, b) => b.wins - a.wins || b.points - a.points)
    .map(
      row =>
        `${row.label} ${row.wins}-${row.losses}, ${row.points.toFixed(1)} points${
          row.last.length
            ? `, last ${Math.min(3, row.last.length)}: ${row.last.slice(-3).join("")}`
            : ""
        }`
    );

  return [
    `WEEK ${week} MATCHUPS`,
    ...lines,
    standings.length ? `\nSTANDINGS ENTERING WEEK ${week}` : "",
    ...standings.map(s => `- ${s}`),
  ]
    .filter(Boolean)
    .join("\n");
}

async function buildRecapBrief(
  leagueId: number,
  seasonYear: number,
  week: number
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { identity, form } = await loadSeason(leagueId, seasonYear, week);

  const results = await db
    .select()
    .from(matchups)
    .where(
      and(
        eq(matchups.leagueId, leagueId),
        eq(matchups.seasonYear, seasonYear),
        eq(matchups.week, week),
        eq(matchups.isComplete, 1)
      )
    );
  if (!results.length) throw new Error(`Week ${week} has no completed games`);

  // Season context so records can be called out truthfully.
  const seasonGames = await db
    .select()
    .from(matchups)
    .where(
      and(
        eq(matchups.leagueId, leagueId),
        eq(matchups.seasonYear, seasonYear),
        eq(matchups.isComplete, 1)
      )
    );
  const seasonScores = seasonGames
    .filter(g => (g.scoringWeeks ?? 1) === 1)
    .flatMap(g => [g.homeScore ?? 0, g.awayScore ?? 0]);
  const seasonHigh = seasonScores.length ? Math.max(...seasonScores) : 0;

  // Records after this week, computed here so the model never has to add.
  const updated = new Map(
    Array.from(form.entries()).map(([id, row]) => [id, { ...row }])
  );
  const applyResult = (id: number, won: boolean, points: number) => {
    const row = updated.get(id) || {
      wins: 0,
      losses: 0,
      points: 0,
      games: 0,
      last: [] as string[],
    };
    row.games++;
    row.points += points;
    won ? row.wins++ : row.losses++;
    updated.set(id, row);
  };

  const lines: string[] = [];
  for (const m of results) {
    const home = identity.get(m.homeTeamId);
    const away = identity.get(m.awayTeamId);
    if (!home || !away) continue;
    const hs = m.homeScore ?? 0;
    const as = m.awayScore ?? 0;
    const homeWon = hs > as;
    const winner = homeWon ? home : away;
    const loser = homeWon ? away : home;
    const winnerId = homeWon ? m.homeTeamId : m.awayTeamId;
    const loserId = homeWon ? m.awayTeamId : m.homeTeamId;
    const margin = Math.abs(hs - as);

    const before = {
      winner: form.get(winnerId),
      loser: form.get(loserId),
    };

    applyResult(m.homeTeamId, homeWon, hs);
    applyResult(m.awayTeamId, !homeWon, as);

    const w = updated.get(winnerId)!;
    const l = updated.get(loserId)!;

    // Form entering this week, so a streak never has to be inferred.
    const streakOf = (row?: { last: string[] }) => {
      if (!row || !row.last.length) return null;
      const latest = row.last[row.last.length - 1];
      let count = 0;
      for (let i = row.last.length - 1; i >= 0; i--) {
        if (row.last[i] !== latest) break;
        count++;
      }
      return { result: latest, count };
    };

    const parts = [
      `${winner.label} def. ${loser.label} ${Math.max(hs, as).toFixed(1)}-${Math.min(hs, as).toFixed(1)} (margin ${margin.toFixed(2)})`,
      `${winner.label} is now ${w.wins}-${w.losses}`,
      `${loser.label} is now ${l.wins}-${l.losses}`,
    ];

    for (const [who, row] of [
      [winner.label, before.winner],
      [loser.label, before.loser],
    ] as const) {
      const streak = streakOf(row);
      if (streak && streak.count > 1) {
        parts.push(
          `${who} had ${streak.result === "W" ? "won" : "lost"} ${streak.count} straight going into this week`
        );
      }
    }
    if (margin < 5) parts.push("decided by under 5 points");
    if (margin > 50) parts.push("a blowout");
    if (Math.max(hs, as) >= seasonHigh && (m.scoringWeeks ?? 1) === 1)
      parts.push("highest score of the season so far");
    if (
      before.winner &&
      before.loser &&
      before.winner.wins < before.loser.wins
    )
      parts.push("an upset: the winner had the worse record going in");

    lines.push("- " + parts.join("; "));
  }

  const standingsAfter = Array.from(updated.entries())
    .map(([id, row]) => ({ label: identity.get(id)?.label ?? "?", ...row }))
    .sort((a, b) => b.wins - a.wins || b.points - a.points);

  return [
    `WEEK ${week} RESULTS`,
    ...lines,
    `\nSTANDINGS AFTER WEEK ${week} (these already include the results above)`,
    ...standingsAfter.map(
      (r, index) =>
        `- ${index + 1}. ${r.label} ${r.wins}-${r.losses} (${r.wins > r.losses ? "winning record" : r.wins < r.losses ? "losing record" : "even record"}), ${r.points.toFixed(1)} points`
    ),
  ].join("\n");
}

const VOICE = `You write the weekly newsletter for a long-running fantasy football league of friends.

Voice: a sportswriter who has covered this league for years and is not impressed by any of them. Dry, confident, funny. You roast — but you roast performance, never the person. Nothing about anyone's appearance, family, job, or character. A manager's bad lineup is fair game; a manager is not.

Hard rules:
- Every number, record, score and streak you use must come from the brief. Never invent, round differently, or estimate.
- Never state anything the brief does not. In particular: do not say anyone has clinched, won, been eliminated from, or locked up anything unless the brief says so in those words. Standing first in November is not winning anything.
- The brief labels every record as winning, losing or even. Use that label. A record with more losses than wins is a losing record no matter how the team is playing.
- Streaks are given to you when they exist. Never count one yourself and never say "first loss in N weeks" unless the brief states that streak.
- Do not predict outcomes as if certain. This league has produced seven champions in eight years.
- No generic filler. Never write "fans on the edge of their seats", "kicked off with a bang", or "an exhilarating season ahead". If a sentence could describe any league in America, cut it.
- The specific detail is always better than the adjective. "Marshall has beaten him seven straight times" beats "a heated rivalry".
- Write in markdown, ready to paste into a group chat. Short paragraphs. No preamble, no sign-off, no emoji.`;

async function write(kind: "preview" | "recap", brief: string, week: number) {
  const instruction =
    kind === "preview"
      ? `Write the Week ${week} preview. Open with one short paragraph on the state of the league. Then give each matchup its own short section with a bold headline of a few words and two or three sentences that use the actual history. End with one line worth arguing about.`
      : `Write the Week ${week} recap. Open with the single most interesting thing that happened. Then cover the results, leading with whatever mattered most rather than going in order. Call out the blowout, the close one, and any upset. End with what it means for the standings.`;

  const response = await invokeLLM({
    messages: [
      { role: "system", content: VOICE },
      {
        role: "user",
        content: `${instruction}\n\nEvery fact you may use is below. Use nothing else.\n\n${brief}`,
      },
    ],
  });

  const content = response.choices[0]?.message?.content;
  return typeof content === "string" ? content.trim() : "";
}

export async function generateNewsletter(
  leagueId: number,
  kind: "preview" | "recap",
  week: number,
  seasonYear?: number
): Promise<Newsletter> {
  const league = await getLeagueById(leagueId);
  if (!league) throw new Error("League not found");
  const year = seasonYear ?? league.seasonYear;

  const brief =
    kind === "preview"
      ? await buildPreviewBrief(leagueId, year, week)
      : await buildRecapBrief(leagueId, year, week);

  const markdown = await write(kind, brief, week);

  return {
    kind,
    week,
    seasonYear: year,
    leagueName: league.name,
    markdown,
    brief,
  };
}
