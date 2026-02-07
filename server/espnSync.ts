/**
 * ESPN Data Sync Service
 * Handles syncing data from ESPN API to database
 */

import {
  createESPNClient,
  fetchTeams,
  fetchBoxScores,
  fetchRecentActivity,
  ESPNCredentials,
} from './espnClient';
import {
  upsertLeague,
  upsertTeam,
  upsertPlayer,
  upsertMatchup,
  insertPlayerStat,
  insertTransaction,
  getLeagueByEspnId,
} from './leagueDb';

export interface SyncResult {
  success: boolean;
  message: string;
  teamsSynced?: number;
  matchupsSynced?: number;
  playersSynced?: number;
  transactionsSynced?: number;
}

/**
 * Sync league and teams data from ESPN
 */
export async function syncLeagueData(
  espnLeagueId: string,
  seasonYear: number,
  espnS2?: string,
  swid?: string
): Promise<SyncResult> {
  try {
    const credentials: ESPNCredentials = {
      leagueId: parseInt(espnLeagueId),
      seasonId: seasonYear,
      espnS2,
      SWID: swid,
    };

    const client = createESPNClient(credentials);

    // Upsert league
    const league = await upsertLeague({
      espnLeagueId,
      name: `League ${espnLeagueId}`, // Will be updated with actual name if available
      seasonYear,
      espnS2,
      swid,
      currentWeek: 1,
      totalWeeks: 17,
      lastSyncedAt: new Date(),
    });

    if (!league) {
      return {
        success: false,
        message: 'Failed to create/update league in database',
      };
    }

    // Fetch and sync teams
    const espnTeams = await fetchTeams(client, seasonYear);
    let teamsSynced = 0;

    for (const espnTeam of espnTeams) {
      await upsertTeam({
        leagueId: league.id,
        espnTeamId: espnTeam.id,
        name: espnTeam.name,
        abbreviation: espnTeam.abbreviation,
        logoUrl: espnTeam.logoURL,
        ownerName: espnTeam.owners?.[0],
        wins: espnTeam.wins,
        losses: espnTeam.losses,
        ties: espnTeam.ties,
        pointsFor: espnTeam.pointsFor,
        pointsAgainst: espnTeam.pointsAgainst,
      });
      teamsSynced++;
    }

    return {
      success: true,
      message: `Successfully synced league data`,
      teamsSynced,
    };
  } catch (error: any) {
    console.error('[ESPN Sync] Error syncing league data:', error);
    return {
      success: false,
      message: error.message || 'Failed to sync league data',
    };
  }
}

/**
 * Sync matchup data for a specific week
 */
export async function syncWeekMatchups(
  espnLeagueId: string,
  seasonYear: number,
  week: number,
  espnS2?: string,
  swid?: string
): Promise<SyncResult> {
  try {
    const league = await getLeagueByEspnId(espnLeagueId);
    if (!league) {
      return {
        success: false,
        message: 'League not found in database. Please sync league data first.',
      };
    }

    const credentials: ESPNCredentials = {
      leagueId: parseInt(espnLeagueId),
      seasonId: seasonYear,
      espnS2,
      SWID: swid,
    };

    const client = createESPNClient(credentials);

    // Fetch boxscores for the week
    const boxscores = await fetchBoxScores(client, seasonYear, week, week);
    let matchupsSynced = 0;
    let playersSynced = 0;

    for (const box of boxscores) {
      // Upsert matchup
      await upsertMatchup({
        leagueId: league.id,
        week,
        seasonYear,
        homeTeamId: box.homeTeamId,
        awayTeamId: box.awayTeamId,
        homeScore: box.homeScore,
        awayScore: box.awayScore,
        homeProjected: box.homeProjectedScore,
        awayProjected: box.awayProjectedScore,
        isComplete: box.homeScore > 0 || box.awayScore > 0 ? 1 : 0,
        isPlayoffs: week > 14 ? 1 : 0,
      });
      matchupsSynced++;

      // Process home roster
      for (const rosterPlayer of box.homeRoster) {
        if (rosterPlayer.player?.id) {
          // Upsert player
          const player = await upsertPlayer({
            espnPlayerId: rosterPlayer.player.id,
            name: rosterPlayer.player.fullName,
            position: rosterPlayer.player.position,
            nflTeam: rosterPlayer.player.proTeam,
            status: rosterPlayer.player.injuryStatus,
          });

          // Insert player stat
          if (player) {
            await insertPlayerStat({
              playerId: player.id,
              leagueId: league.id,
              teamId: box.homeTeamId,
              week,
              seasonYear,
              points: rosterPlayer.totalPoints,
              projectedPoints: rosterPlayer.projectedPoints,
              wasStarted: rosterPlayer.position !== 'Bench' ? 1 : 0,
              slotPosition: rosterPlayer.position,
            });
            playersSynced++;
          }
        }
      }

      // Process away roster
      for (const rosterPlayer of box.awayRoster) {
        if (rosterPlayer.player?.id) {
          const player = await upsertPlayer({
            espnPlayerId: rosterPlayer.player.id,
            name: rosterPlayer.player.fullName,
            position: rosterPlayer.player.position,
            nflTeam: rosterPlayer.player.proTeam,
            status: rosterPlayer.player.injuryStatus,
          });

          if (player) {
            await insertPlayerStat({
              playerId: player.id,
              leagueId: league.id,
              teamId: box.awayTeamId,
              week,
              seasonYear,
              points: rosterPlayer.totalPoints,
              projectedPoints: rosterPlayer.projectedPoints,
              wasStarted: rosterPlayer.position !== 'Bench' ? 1 : 0,
              slotPosition: rosterPlayer.position,
            });
            playersSynced++;
          }
        }
      }
    }

    return {
      success: true,
      message: `Successfully synced week ${week} data`,
      matchupsSynced,
      playersSynced,
    };
  } catch (error: any) {
    console.error('[ESPN Sync] Error syncing week matchups:', error);
    return {
      success: false,
      message: error.message || 'Failed to sync week matchups',
    };
  }
}

/**
 * Sync recent league activity/transactions
 */
export async function syncLeagueActivity(
  espnLeagueId: string,
  seasonYear: number,
  espnS2?: string,
  swid?: string
): Promise<SyncResult> {
  try {
    const league = await getLeagueByEspnId(espnLeagueId);
    if (!league) {
      return {
        success: false,
        message: 'League not found in database',
      };
    }

    const credentials: ESPNCredentials = {
      leagueId: parseInt(espnLeagueId),
      seasonId: seasonYear,
      espnS2,
      SWID: swid,
    };

    const client = createESPNClient(credentials);
    const activities = await fetchRecentActivity(client, seasonYear);
    let transactionsSynced = 0;

    for (const activity of activities) {
      await insertTransaction({
        leagueId: league.id,
        transactionType: activity.type,
        teamId: activity.teamId,
        playerId: activity.playerId,
        playerName: activity.playerName,
        details: JSON.stringify(activity.details),
        week: 1, // Activity doesn't always have week info
        seasonYear,
        transactionDate: activity.date,
      });
      transactionsSynced++;
    }

    return {
      success: true,
      message: `Successfully synced ${transactionsSynced} transactions`,
      transactionsSynced,
    };
  } catch (error: any) {
    console.error('[ESPN Sync] Error syncing activity:', error);
    // Don't fail if activity sync fails - it's not critical
    return {
      success: true,
      message: 'Activity sync not available for this league',
      transactionsSynced: 0,
    };
  }
}

/**
 * Full sync - league, teams, and all weeks
 */
export async function fullLeagueSync(
  espnLeagueId: string,
  seasonYear: number,
  currentWeek: number,
  espnS2?: string,
  swid?: string
): Promise<SyncResult> {
  try {
    // Sync league and teams
    const leagueResult = await syncLeagueData(espnLeagueId, seasonYear, espnS2, swid);
    if (!leagueResult.success) {
      return leagueResult;
    }

    let totalMatchups = 0;
    let totalPlayers = 0;

    // Sync all weeks up to current week
    for (let week = 1; week <= currentWeek; week++) {
      const weekResult = await syncWeekMatchups(espnLeagueId, seasonYear, week, espnS2, swid);
      if (weekResult.success) {
        totalMatchups += weekResult.matchupsSynced || 0;
        totalPlayers += weekResult.playersSynced || 0;
      }
    }

    // Sync activity
    await syncLeagueActivity(espnLeagueId, seasonYear, espnS2, swid);

    // Sync trades
    const { syncTradesForSeason } = await import('./tradeSync');
    const tradeResult = await syncTradesForSeason(espnLeagueId, seasonYear, espnS2, swid);
    console.log(`[ESPN Sync] Trade sync result: ${tradeResult.message}`);

    return {
      success: true,
      message: `Full sync completed successfully`,
      teamsSynced: leagueResult.teamsSynced,
      matchupsSynced: totalMatchups,
      playersSynced: totalPlayers,
    };
  } catch (error: any) {
    console.error('[ESPN Sync] Error in full sync:', error);
    return {
      success: false,
      message: error.message || 'Failed to complete full sync',
    };
  }
}
