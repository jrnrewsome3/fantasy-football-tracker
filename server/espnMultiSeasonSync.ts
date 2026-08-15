/** Import archived ESPN seasons into one connected league record. */

import { getLeagueByEspnId } from "./leagueDb";
import { syncHistoricalSeasonData, syncWeekMatchups } from "./espnSync";

export interface MultiSeasonSyncResult {
  success: boolean;
  message: string;
  seasonsSynced: number;
  seasons: { year: number; success: boolean; message: string }[];
}

async function importSeason(espnLeagueId: string, year: number) {
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
      : "No public archived seasons were found for this ESPN league ID.",
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
