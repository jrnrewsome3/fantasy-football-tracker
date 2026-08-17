/**
 * All-play records: what everyone's record would be if they played the entire
 * league every week instead of one scheduled opponent.
 *
 * A fantasy schedule is random, so a season's record is part scoring and part
 * draw. Scoring every week against the whole field removes the draw, and the
 * gap between a manager's real record and their all-play record is the size of
 * the favour the schedule did them.
 *
 * Regular season only — playoffs are a bracket, not a schedule — and completed
 * games only.
 */

import { and, eq, lt } from "drizzle-orm";
import { leagues, matchups, teams } from "../drizzle/schema";
import { getDb } from "./db";

export interface AllPlayRow {
  key: string;
  label: string;
  seasons: number;
  games: number;
  actualWins: number;
  actualLosses: number;
  allPlayWins: number;
  allPlayLosses: number;
  allPlayPct: number;
  /** Wins the all-play rate would predict over the same number of games. */
  expectedWins: number;
  /** Actual wins minus expected. Positive means the schedule was kind. */
  luck: number;
  pointsFor: number;
}

interface WeekEntry {
  key: string;
  score: number;
  won: boolean;
  lost: boolean;
}

/** Every completed regular-season game, resolved to the person who played it. */
async function loadWeeks(espnLeagueId: string, seasonYear?: number) {
  const db = await getDb();
  if (!db) return { weeks: new Map<string, WeekEntry[]>(), labels: new Map() };

  const leagueRows = await db
    .select()
    .from(leagues)
    .where(eq(leagues.espnLeagueId, espnLeagueId))
    .limit(1);
  const league = leagueRows[0];
  if (!league) return { weeks: new Map<string, WeekEntry[]>(), labels: new Map() };

  const teamRows = await db
    .select()
    .from(teams)
    .where(eq(teams.leagueId, league.id));

  // (season, espnTeamId) -> person. Team ids differ per season, names change.
  const identity = new Map<string, string>();
  const labels = new Map<string, { label: string; season: number }>();
  for (const t of teamRows) {
    const key = t.franchiseKey || t.ownerName || t.name;
    if (!key) continue;
    identity.set(`${t.seasonYear}:${t.espnTeamId}`, key);
    const existing = labels.get(key);
    if (!existing || t.seasonYear > existing.season) {
      labels.set(key, { label: t.ownerName || t.name, season: t.seasonYear });
    }
  }

  const matchupRows = await db
    .select()
    .from(matchups)
    .where(
      seasonYear
        ? and(
            eq(matchups.leagueId, league.id),
            eq(matchups.seasonYear, seasonYear),
            eq(matchups.isPlayoffs, 0),
            eq(matchups.isComplete, 1)
          )
        : and(
            eq(matchups.leagueId, league.id),
            eq(matchups.isPlayoffs, 0),
            eq(matchups.isComplete, 1),
            lt(matchups.seasonYear, league.seasonYear + 1)
          )
    );

  const weeks = new Map<string, WeekEntry[]>();
  for (const m of matchupRows) {
    const home = identity.get(`${m.seasonYear}:${m.homeTeamId}`);
    const away = identity.get(`${m.seasonYear}:${m.awayTeamId}`);
    if (!home || !away) continue;
    const hs = m.homeScore ?? 0;
    const as = m.awayScore ?? 0;
    const bucket = `${m.seasonYear}:${m.week}`;
    const list = weeks.get(bucket) || [];
    list.push({ key: home, score: hs, won: hs > as, lost: hs < as });
    list.push({ key: away, score: as, won: as > hs, lost: as < hs });
    weeks.set(bucket, list);
  }

  return { weeks, labels };
}

function tally(
  weeks: Map<string, WeekEntry[]>,
  labels: Map<string, { label: string; season: number }>
): AllPlayRow[] {
  const rows = new Map<string, AllPlayRow & { seasonSet: Set<number> }>();

  for (const [bucket, entries] of Array.from(weeks.entries())) {
    const season = Number(bucket.split(":")[0]);
    for (const entry of entries) {
      const row =
        rows.get(entry.key) ||
        ({
          key: entry.key,
          label: labels.get(entry.key)?.label || entry.key,
          seasons: 0,
          games: 0,
          actualWins: 0,
          actualLosses: 0,
          allPlayWins: 0,
          allPlayLosses: 0,
          allPlayPct: 0,
          expectedWins: 0,
          luck: 0,
          pointsFor: 0,
          seasonSet: new Set<number>(),
        } as AllPlayRow & { seasonSet: Set<number> });

      row.seasonSet.add(season);
      row.games++;
      row.pointsFor += entry.score;
      if (entry.won) row.actualWins++;
      if (entry.lost) row.actualLosses++;

      // Against everyone else who played that week.
      for (const other of entries) {
        if (other === entry || other.key === entry.key) continue;
        if (entry.score > other.score) row.allPlayWins++;
        else if (entry.score < other.score) row.allPlayLosses++;
      }

      rows.set(entry.key, row);
    }
  }

  return Array.from(rows.values())
    .map(row => {
      const allPlayGames = row.allPlayWins + row.allPlayLosses;
      const pct = allPlayGames ? row.allPlayWins / allPlayGames : 0;
      const expected = pct * row.games;
      const { seasonSet, ...rest } = row;
      return {
        ...rest,
        seasons: seasonSet.size,
        allPlayPct: pct,
        expectedWins: Math.round(expected * 10) / 10,
        luck: Math.round((row.actualWins - expected) * 10) / 10,
        pointsFor: Math.round(row.pointsFor * 10) / 10,
      };
    })
    .sort((a, b) => b.allPlayPct - a.allPlayPct);
}

/** Career all-play, every completed regular-season week in league history. */
export async function getAllPlayStandings(
  espnLeagueId: string
): Promise<AllPlayRow[]> {
  const { weeks, labels } = await loadWeeks(espnLeagueId);
  return tally(weeks, labels);
}

/** All-play for a single season, for "who did the schedule carry this year". */
export async function getSeasonAllPlay(
  espnLeagueId: string,
  seasonYear: number
): Promise<AllPlayRow[]> {
  const { weeks, labels } = await loadWeeks(espnLeagueId, seasonYear);
  return tally(weeks, labels);
}
