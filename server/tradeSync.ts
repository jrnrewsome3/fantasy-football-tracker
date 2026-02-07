/**
 * Trade Sync Service
 * Syncs trade data from ESPN API to database
 */

import {
  createESPNClient,
  fetchRecentActivity,
  ESPNCredentials,
} from './espnClient';
import {
  insertTrade,
  insertTradePlayer,
  tradeExists,
} from './tradeDb';
import { getLeagueByEspnId, getTeamByEspnTeamId } from './leagueDb';

interface TradePlayer {
  playerId: number;
  playerName: string;
  position?: string;
  fromTeamId: number;
  toTeamId: number;
}

interface ParsedTrade {
  team1EspnId: number;
  team2EspnId: number;
  players: TradePlayer[];
  tradeDate: Date;
}

/**
 * Parse ESPN activity data to extract trade information
 */
function parseTradeFromActivity(activity: any): ParsedTrade | null {
  try {
    // ESPN trade activities have a specific structure
    // We need to extract the teams involved and players exchanged
    
    if (!activity.actions || activity.actions.length < 2) {
      return null;
    }

    const tradeDate = new Date(activity.date);
    const players: TradePlayer[] = [];
    const teams = new Set<number>();

    // Parse each action in the trade
    for (const action of activity.actions) {
      if (action.type === 'TRADED') {
        const playerId = action.playerId;
        const playerName = action.playerName || 'Unknown Player';
        const position = action.position;
        const fromTeamId = action.fromTeamId;
        const toTeamId = action.toTeamId;

        if (fromTeamId && toTeamId) {
          teams.add(fromTeamId);
          teams.add(toTeamId);
          
          players.push({
            playerId,
            playerName,
            position,
            fromTeamId,
            toTeamId,
          });
        }
      }
    }

    if (teams.size !== 2 || players.length === 0) {
      return null;
    }

    const [team1EspnId, team2EspnId] = Array.from(teams);

    return {
      team1EspnId,
      team2EspnId,
      players,
      tradeDate,
    };
  } catch (error) {
    console.error('[Trade Sync] Error parsing trade:', error);
    return null;
  }
}

/**
 * Sync trades for a specific season
 */
export async function syncTradesForSeason(
  espnLeagueId: string,
  seasonYear: number,
  espnS2?: string,
  swid?: string
): Promise<{ success: boolean; tradesSynced: number; message: string }> {
  try {
    const credentials: ESPNCredentials = {
      leagueId: parseInt(espnLeagueId),
      seasonId: seasonYear,
      espnS2,
      SWID: swid,
    };

    const client = createESPNClient(credentials);
    
    // Get league from database
    const league = await getLeagueByEspnId(espnLeagueId);
    if (!league) {
      return {
        success: false,
        tradesSynced: 0,
        message: 'League not found in database',
      };
    }

    // Fetch recent activity (includes trades)
    const activities = await fetchRecentActivity(client, seasonYear);
    
    let tradesSynced = 0;

    // Filter for trade activities
    const tradeActivities = activities.filter((act: any) => 
      act.type === 'TRADED' || (act.actions && act.actions.some((a: any) => a.type === 'TRADED'))
    );

    console.log(`[Trade Sync] Found ${tradeActivities.length} trade activities for ${seasonYear}`);

    for (const activity of tradeActivities) {
      const parsedTrade = parseTradeFromActivity(activity);
      
      if (!parsedTrade) {
        continue;
      }

      // Check if trade already exists
      const exists = await tradeExists(
        espnLeagueId,
        seasonYear,
        parsedTrade.tradeDate,
        parsedTrade.team1EspnId,
        parsedTrade.team2EspnId
      );

      if (exists) {
        console.log(`[Trade Sync] Trade already exists, skipping`);
        continue;
      }

      // Get team database IDs
      const team1 = await getTeamByEspnTeamId(league.id, parsedTrade.team1EspnId, seasonYear);
      const team2 = await getTeamByEspnTeamId(league.id, parsedTrade.team2EspnId, seasonYear);

      if (!team1 || !team2) {
        console.warn(`[Trade Sync] Could not find teams in database: ${parsedTrade.team1EspnId}, ${parsedTrade.team2EspnId}`);
        continue;
      }

      // Calculate week number (rough estimate based on date)
      const seasonStart = new Date(seasonYear, 8, 1); // September 1st
      const weeksDiff = Math.floor((parsedTrade.tradeDate.getTime() - seasonStart.getTime()) / (7 * 24 * 60 * 60 * 1000));
      const week = Math.max(1, Math.min(weeksDiff + 1, 17));

      // Insert trade
      const trade = await insertTrade({
        leagueId: league.id,
        espnLeagueId,
        seasonYear,
        week,
        tradeDate: parsedTrade.tradeDate,
        team1Id: team1.id,
        team1EspnId: parsedTrade.team1EspnId,
        team1Name: team1.name,
        team2Id: team2.id,
        team2EspnId: parsedTrade.team2EspnId,
        team2Name: team2.name,
        rawData: JSON.stringify(activity),
      });

      // Insert trade players
      for (const player of parsedTrade.players) {
        const fromTeam = player.fromTeamId === parsedTrade.team1EspnId ? team1 : team2;
        const toTeam = player.toTeamId === parsedTrade.team1EspnId ? team1 : team2;

        await insertTradePlayer({
          tradeId: trade.id,
          playerId: null, // We don't have player DB IDs yet
          espnPlayerId: player.playerId,
          playerName: player.playerName,
          playerPosition: player.position,
          fromTeamId: fromTeam.id,
          fromEspnTeamId: player.fromTeamId,
          toTeamId: toTeam.id,
          toEspnTeamId: player.toTeamId,
        });
      }

      tradesSynced++;
    }

    return {
      success: true,
      tradesSynced,
      message: `Successfully synced ${tradesSynced} trades for ${seasonYear}`,
    };
  } catch (error: any) {
    console.error('[Trade Sync] Error syncing trades:', error);
    return {
      success: false,
      tradesSynced: 0,
      message: error.message || 'Failed to sync trades',
    };
  }
}

/**
 * Sync trades for all available seasons
 */
export async function syncAllTrades(
  espnLeagueId: string,
  seasons: number[],
  espnS2?: string,
  swid?: string
): Promise<{ success: boolean; totalTradesSynced: number; message: string }> {
  let totalTradesSynced = 0;
  const results: string[] = [];

  for (const seasonYear of seasons) {
    const result = await syncTradesForSeason(espnLeagueId, seasonYear, espnS2, swid);
    totalTradesSynced += result.tradesSynced;
    results.push(`${seasonYear}: ${result.tradesSynced} trades`);
  }

  return {
    success: true,
    totalTradesSynced,
    message: `Synced trades across ${seasons.length} seasons. ${results.join(', ')}`,
  };
}
