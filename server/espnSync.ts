/**
 * ESPN Data Sync Service
 * Handles syncing data from ESPN API to database
 */

import {
  createESPNClient,
  fetchTeams,
  fetchBoxScores,
  fetchFreeAgents,
  fetchLeagueInfo,
  fetchRecentActivity,
  ESPNCredentials,
} from "./espnClient";
import {
  upsertLeague,
  upsertTeam,
  upsertPlayer,
  upsertMatchup,
  insertPlayerStat,
  insertTransaction,
  getLeagueByEspnId,
  replaceAvailablePlayers,
} from "./leagueDb";

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

    // Confirm the league is publicly viewable before storing it. Private
    // league session cookies are intentionally not collected by this app.
    const leagueInfo = await fetchLeagueInfo(client, seasonYear);
    const detectedWeek = Math.max(
      1,
      Number(leagueInfo.currentScoringPeriodId || 1)
    );

    // Upsert league
    const league = await upsertLeague({
      espnLeagueId,
      name: leagueInfo.name || `ESPN League ${espnLeagueId}`,
      seasonYear,
      espnS2: null,
      swid: null,
      currentWeek: detectedWeek,
      totalWeeks: 17,
      lastSyncedAt: new Date(),
      lastSyncStatus: "success",
      lastSyncError: null,
    });

    if (!league) {
      return {
        success: false,
        message: "Failed to create/update league in database",
      };
    }

    // Fetch and sync teams
    const espnTeams = await fetchTeams(client, seasonYear, detectedWeek);
    let teamsSynced = 0;

    for (const espnTeam of espnTeams) {
      await upsertTeam({
        leagueId: league.id,
        espnTeamId: espnTeam.id,
        seasonYear: seasonYear,
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
    console.error("[ESPN Sync] Error syncing league data:", error);
    return {
      success: false,
      message: error.message || "Failed to sync league data",
    };
  }
}

/**
 * Import one archived season into the already-connected league without
 * changing which season is considered current for automatic refreshes.
 */
export async function syncHistoricalSeasonData(
  espnLeagueId: string,
  seasonYear: number
): Promise<SyncResult & { finalWeek?: number }> {
  try {
    const league = await getLeagueByEspnId(espnLeagueId);
    if (!league) return { success: false, message: "League not found" };

    const client = createESPNClient({
      leagueId: Number(espnLeagueId),
      seasonId: seasonYear,
    });
    const leagueInfo = await fetchLeagueInfo(client, seasonYear);
    const finalWeek = Math.min(
      18,
      Math.max(1, Number(leagueInfo.currentScoringPeriodId || 17))
    );
    const espnTeams = await fetchTeams(client, seasonYear, finalWeek);

    for (const espnTeam of espnTeams) {
      await upsertTeam({
        leagueId: league.id,
        espnTeamId: espnTeam.id,
        seasonYear,
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
    }

    return {
      success: true,
      message: `Imported ${seasonYear} league standings`,
      teamsSynced: espnTeams.length,
      finalWeek,
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.message || `The ${seasonYear} season is not available`,
    };
  }
}

/** Refresh the league-specific waiver wire/free-agent pool. */
export async function syncAvailablePlayers(
  espnLeagueId: string,
  seasonYear: number,
  scoringPeriod: number
): Promise<SyncResult> {
  try {
    const league = await getLeagueByEspnId(espnLeagueId);
    if (!league) return { success: false, message: "League not found" };

    const client = createESPNClient({
      leagueId: Number(espnLeagueId),
      seasonId: seasonYear,
    });
    const freeAgents = await fetchFreeAgents(
      client,
      seasonYear,
      Math.max(1, scoringPeriod)
    );
    await replaceAvailablePlayers(
      league.id,
      seasonYear,
      Math.max(1, scoringPeriod),
      freeAgents.slice(0, 300).map(player => ({
        player: {
          espnPlayerId: player.id,
          name: player.fullName,
          position: player.position,
          nflTeam: player.proTeam,
          status: player.injuryStatus,
        },
        availabilityStatus: player.availabilityStatus || "FREEAGENT",
        percentOwned: Math.round(player.percentOwned || 0),
        percentStarted: Math.round(player.percentStarted || 0),
        ownershipTrend: Math.round((player.percentChange || 0) * 100),
      }))
    );

    return {
      success: true,
      message: `Synced ${Math.min(freeAgents.length, 300)} available players`,
      playersSynced: Math.min(freeAgents.length, 300),
    };
  } catch (error: any) {
    console.error("[ESPN Sync] Error syncing available players:", error);
    return {
      success: false,
      message: error.message || "Failed to sync available players",
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
        message: "League not found in database. Please sync league data first.",
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

    // A matchup is complete when its week is behind ESPN's active scoring
    // period (or the whole season is archived) — a nonzero score only means
    // the game is underway, not finished.
    const isArchivedSeason = seasonYear < league.seasonYear;
    const isPastWeek = week < Math.max(1, league.currentWeek || 1);

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
        isComplete: isArchivedSeason || isPastWeek ? 1 : 0,
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
              wasStarted: rosterPlayer.position !== "Bench" ? 1 : 0,
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
              wasStarted: rosterPlayer.position !== "Bench" ? 1 : 0,
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
    console.error("[ESPN Sync] Error syncing week matchups:", error);
    return {
      success: false,
      message: error.message || "Failed to sync week matchups",
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
        message: "League not found in database",
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
    console.error("[ESPN Sync] Error syncing activity:", error);
    // Don't fail if activity sync fails - it's not critical
    return {
      success: true,
      message: "Activity sync not available for this league",
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
    const leagueResult = await syncLeagueData(
      espnLeagueId,
      seasonYear,
      espnS2,
      swid
    );
    if (!leagueResult.success) {
      return leagueResult;
    }

    // ESPN is the source of truth for the active scoring period. This matters
    // on first connection, when the UI does not know the league's current week.
    const refreshedLeague = await getLeagueByEspnId(espnLeagueId);
    const effectiveWeek = Math.max(
      1,
      refreshedLeague?.currentWeek || currentWeek
    );

    let totalMatchups = 0;
    let totalPlayers = 0;

    // Sync all weeks up to current week
    for (let week = 1; week <= effectiveWeek; week++) {
      const weekResult = await syncWeekMatchups(
        espnLeagueId,
        seasonYear,
        week,
        espnS2,
        swid
      );
      if (weekResult.success) {
        totalMatchups += weekResult.matchupsSynced || 0;
        totalPlayers += weekResult.playersSynced || 0;
      }
    }

    // Sync activity
    await syncLeagueActivity(espnLeagueId, seasonYear, espnS2, swid);
    await syncAvailablePlayers(espnLeagueId, seasonYear, effectiveWeek);

    return {
      success: true,
      message: `Full sync completed successfully`,
      teamsSynced: leagueResult.teamsSynced,
      matchupsSynced: totalMatchups,
      playersSynced: totalPlayers,
    };
  } catch (error: any) {
    console.error("[ESPN Sync] Error in full sync:", error);
    return {
      success: false,
      message: error.message || "Failed to complete full sync",
    };
  }
}
