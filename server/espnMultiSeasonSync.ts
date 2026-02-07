/**
 * Multi-Season ESPN Sync Service
 * Automatically syncs all available historical seasons
 */

import { syncLeagueData, syncWeekMatchups } from './espnSync';
import { createESPNClient, ESPNCredentials, fetchLeagueInfo } from './espnClient';

export interface MultiSeasonSyncResult {
  success: boolean;
  message: string;
  seasonsSynced: number;
  seasons: {
    year: number;
    success: boolean;
    message: string;
  }[];
}

/**
 * Sync all available historical seasons for a league
 * Automatically detects available years and syncs each one
 */
export async function syncAllSeasons(
  espnLeagueId: string,
  espnS2?: string,
  swid?: string
): Promise<MultiSeasonSyncResult> {
  const currentYear = new Date().getFullYear();
  const results: { year: number; success: boolean; message: string }[] = [];
  let seasonsSynced = 0;

  try {
    // Try to detect available seasons by testing recent years
    // ESPN leagues typically go back 5-10 years
    const yearsToTry = [];
    for (let year = currentYear; year >= currentYear - 10; year--) {
      yearsToTry.push(year);
    }

    console.log(`[Multi-Season Sync] Attempting to sync ${yearsToTry.length} seasons for league ${espnLeagueId}`);

    for (const year of yearsToTry) {
      try {
        // Test if this season exists
        const credentials: ESPNCredentials = {
          leagueId: parseInt(espnLeagueId),
          seasonId: year,
          espnS2,
          SWID: swid,
        };

        const client = createESPNClient(credentials);
        
        // Try to fetch league info for this year
        try {
          await fetchLeagueInfo(client, year);
          
          // If successful, sync this season
          console.log(`[Multi-Season Sync] Found season ${year}, syncing...`);
          
          const syncResult = await syncLeagueData(
            espnLeagueId,
            year,
            espnS2,
            swid
          );

          if (syncResult.success) {
            // Also sync matchups for all weeks (1-17)
            for (let week = 1; week <= 17; week++) {
              await syncWeekMatchups(
                espnLeagueId,
                year,
                week,
                espnS2,
                swid
              );
            }

            seasonsSynced++;
            results.push({
              year,
              success: true,
              message: `Synced ${year} season successfully`,
            });
          } else {
            results.push({
              year,
              success: false,
              message: syncResult.message,
            });
          }
        } catch (error: any) {
          // Season doesn't exist or is inaccessible, skip it
          console.log(`[Multi-Season Sync] Season ${year} not available`);
          continue;
        }
      } catch (error: any) {
        console.error(`[Multi-Season Sync] Error syncing season ${year}:`, error);
        results.push({
          year,
          success: false,
          message: error.message || 'Failed to sync season',
        });
      }
    }

    if (seasonsSynced === 0) {
      return {
        success: false,
        message: 'No seasons could be synced. Please check your ESPN credentials and league ID.',
        seasonsSynced: 0,
        seasons: results,
      };
    }

    return {
      success: true,
      message: `Successfully synced ${seasonsSynced} season(s)`,
      seasonsSynced,
      seasons: results,
    };
  } catch (error: any) {
    console.error('[Multi-Season Sync] Fatal error:', error);
    return {
      success: false,
      message: error.message || 'Failed to sync seasons',
      seasonsSynced: 0,
      seasons: results,
    };
  }
}

/**
 * Sync specific season range
 */
export async function syncSeasonRange(
  espnLeagueId: string,
  startYear: number,
  endYear: number,
  espnS2?: string,
  swid?: string
): Promise<MultiSeasonSyncResult> {
  const results: { year: number; success: boolean; message: string }[] = [];
  let seasonsSynced = 0;

  for (let year = startYear; year <= endYear; year++) {
    try {
      const syncResult = await syncLeagueData(
        espnLeagueId,
        year,
        espnS2,
        swid
      );

      if (syncResult.success) {
        // Sync all weeks
        for (let week = 1; week <= 17; week++) {
          await syncWeekMatchups(
            espnLeagueId,
            year,
            week,
            espnS2,
            swid
          );
        }

        seasonsSynced++;
        results.push({
          year,
          success: true,
          message: `Synced ${year} season successfully`,
        });
      } else {
        results.push({
          year,
          success: false,
          message: syncResult.message,
        });
      }
    } catch (error: any) {
      results.push({
        year,
        success: false,
        message: error.message || 'Failed to sync season',
      });
    }
  }

  return {
    success: seasonsSynced > 0,
    message: `Synced ${seasonsSynced} out of ${endYear - startYear + 1} seasons`,
    seasonsSynced,
    seasons: results,
  };
}
