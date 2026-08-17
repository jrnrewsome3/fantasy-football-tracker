/** Import archived ESPN seasons into one connected league record. */

import { and, eq } from "drizzle-orm";
import { leagueSeasons } from "../drizzle/schema";
import { getDb } from "./db";
import { getLeagueByEspnId, upsertLeagueSeason } from "./leagueDb";
import { syncHistoricalSeasonData, syncWeekMatchups } from "./espnSync";

export interface MultiSeasonSyncResult {
  success: boolean;
  message: string;
  seasonsSynced: number;
  seasons: { year: number; success: boolean; message: string }[];
}

/**
 * A season reconciled from league records and published after validation must
 * never be silently replaced by an ESPN re-pull, which carries none of that
 * verification. Guarded here rather than only in the UI so the protection
 * holds however the import is triggered.
 */
async function isVerifiedFromRecords(leagueId: number, year: number) {
  const db = await getDb();
  if (!db) return false;
  const rows = await db
    .select({ source: leagueSeasons.source })
    .from(leagueSeasons)
    .where(
      and(
        eq(leagueSeasons.leagueId, leagueId),
        eq(leagueSeasons.seasonYear, year)
      )
    )
    .limit(1);
  return rows[0]?.source === "league-records-doc";
}

async function importSeason(espnLeagueId: string, year: number) {
  const existing = await getLeagueByEspnId(espnLeagueId);
  if (existing && (await isVerifiedFromRecords(existing.id, year))) {
    return {
      year,
      success: false,
      message: `${year} is already reconciled from league records and was left untouched.`,
    };
  }

  const season = await syncHistoricalSeasonData(espnLeagueId, year);
  if (!season.success) return { year, success: false, message: season.message };

  const finalWeek = season.finalWeek || 17;
  let matchupsSynced = 0;

  // Small batches keep the import quick without flooding ESPN with requests.
  for (let firstWeek = 1; firstWeek <= finalWeek; firstWeek += 4) {
    const weeks = Array.from(
      { length: Math.min(4, finalWeek - firstWeek + 1) },
      (_, index) => firstWeek + index
    );
    const results = await Promise.all(
      weeks.map(week => syncWeekMatchups(espnLeagueId, year, week))
    );
    matchupsSynced += results.reduce(
      (total, result) => total + (result.matchupsSynced || 0),
      0
    );
  }

  const league = await getLeagueByEspnId(espnLeagueId);
  if (league) {
    await upsertLeagueSeason({
      leagueId: league.id,
      seasonYear: year,
      standingsComplete: 1,
      matchupsComplete: matchupsSynced > 0 ? 1 : 0,
      ownershipComplete: 1,
      source: "espn-public",
    });
  }

  return {
    year,
    success: true,
    message: `Imported ${year}: ${season.teamsSynced || 0} teams and ${matchupsSynced} matchups`,
  };
}

export async function syncAllSeasons(
  espnLeagueId: string
): Promise<MultiSeasonSyncResult> {
  const league = await getLeagueByEspnId(espnLeagueId);
  if (!league) {
    return {
      success: false,
      message: "Connect the current league before importing its history.",
      seasonsSynced: 0,
      seasons: [],
    };
  }

  const results: MultiSeasonSyncResult["seasons"] = [];
  // ESPN commonly retains league IDs across seasons. Search up to 15 prior
  // seasons and quietly skip years that are not part of this league.
  for (
    let year = league.seasonYear - 1;
    year >= league.seasonYear - 15;
    year--
  ) {
    results.push(await importSeason(espnLeagueId, year));
  }

  const imported = results.filter(result => result.success);
  return {
    success: imported.length > 0,
    message: imported.length
      ? `Imported ${imported.length} archived season${imported.length === 1 ? "" : "s"}.`
      : "ESPN did not expose any archived seasons. Archived seasons can have separate privacy settings; the League Manager must make the prior season publicly viewable in ESPN, then retry.",
    seasonsSynced: imported.length,
    seasons: results,
  };
}

export async function syncSeasonRange(
  espnLeagueId: string,
  startYear: number,
  endYear: number
): Promise<MultiSeasonSyncResult> {
  const results: MultiSeasonSyncResult["seasons"] = [];
  for (let year = endYear; year >= startYear; year--) {
    results.push(await importSeason(espnLeagueId, year));
  }
  const imported = results.filter(result => result.success);
  return {
    success: imported.length > 0,
    message: `Imported ${imported.length} of ${results.length} requested seasons.`,
    seasonsSynced: imported.length,
    seasons: results,
  };
}
