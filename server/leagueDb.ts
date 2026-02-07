/**
 * Database operations for leagues, teams, players, and stats
 */

import { eq, and, desc } from "drizzle-orm";
import { 
  leagues, League, InsertLeague,
  teams, Team, InsertTeam,
  players, Player, InsertPlayer,
  matchups, Matchup, InsertMatchup,
  playerStats, PlayerStat, InsertPlayerStat,
  transactions, Transaction, InsertTransaction,
  teamAllTimeStats, TeamAllTimeStat, InsertTeamAllTimeStat
} from "../drizzle/schema";
import { getDb } from "./db";

// ============ LEAGUES ============

export async function upsertLeague(league: InsertLeague): Promise<League | null> {
  const db = await getDb();
  if (!db) return null;

  try {
    await db.insert(leagues).values(league).onDuplicateKeyUpdate({
      set: {
        name: league.name,
        seasonYear: league.seasonYear,
        espnS2: league.espnS2,
        swid: league.swid,
        currentWeek: league.currentWeek,
        totalWeeks: league.totalWeeks,
        lastSyncedAt: league.lastSyncedAt,
        updatedAt: new Date(),
      },
    });

    const result = await db.select().from(leagues)
      .where(eq(leagues.espnLeagueId, league.espnLeagueId))
      .limit(1);

    return result[0] || null;
  } catch (error) {
    console.error('[LeagueDB] Error upserting league:', error);
    throw error;
  }
}

export async function getLeagueByEspnId(espnLeagueId: string): Promise<League | null> {
  const db = await getDb();
  if (!db) return null;

  const result = await db.select().from(leagues)
    .where(eq(leagues.espnLeagueId, espnLeagueId))
    .limit(1);

  return result[0] || null;
}

export async function getAllLeagues(): Promise<League[]> {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(leagues).orderBy(desc(leagues.updatedAt));
}

export async function deleteLeague(leagueId: number): Promise<{ success: boolean; message: string }> {
  const db = await getDb();
  if (!db) return { success: false, message: 'Database not available' };

  try {
    // Delete all related data first (cascade)
    // Note: teamAllTimeStats links to teamId, not leagueId
    // We need to delete stats for teams in this league
    const leagueTeams = await db.select().from(teams).where(eq(teams.leagueId, leagueId));
    for (const team of leagueTeams) {
      await db.delete(teamAllTimeStats).where(eq(teamAllTimeStats.teamId, team.id));
    }
    
    await db.delete(playerStats).where(eq(playerStats.leagueId, leagueId));
    await db.delete(transactions).where(eq(transactions.leagueId, leagueId));
    await db.delete(matchups).where(eq(matchups.leagueId, leagueId));
    await db.delete(teams).where(eq(teams.leagueId, leagueId));
    await db.delete(leagues).where(eq(leagues.id, leagueId));

    return { success: true, message: 'League and all related data deleted successfully' };
  } catch (error: any) {
    console.error('[LeagueDB] Error deleting league:', error);
    return { success: false, message: error.message || 'Failed to delete league' };
  }
}

// ============ TEAMS ============

export async function upsertTeam(team: InsertTeam): Promise<Team | null> {
  const db = await getDb();
  if (!db) return null;

  try {
    await db.insert(teams).values(team).onDuplicateKeyUpdate({
      set: {
        name: team.name,
        abbreviation: team.abbreviation,
        logoUrl: team.logoUrl,
        ownerName: team.ownerName,
        userId: team.userId,
        wins: team.wins,
        losses: team.losses,
        ties: team.ties,
        pointsFor: team.pointsFor,
        pointsAgainst: team.pointsAgainst,
        updatedAt: new Date(),
      },
    });

    const result = await db.select().from(teams)
      .where(and(
        eq(teams.leagueId, team.leagueId),
        eq(teams.espnTeamId, team.espnTeamId)
      ))
      .limit(1);

    return result[0] || null;
  } catch (error) {
    console.error('[LeagueDB] Error upserting team:', error);
    throw error;
  }
}

export async function getTeamsByLeague(leagueId: number): Promise<Team[]> {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(teams)
    .where(eq(teams.leagueId, leagueId))
    .orderBy(desc(teams.wins));
}

export async function getTeamById(teamId: number): Promise<Team | null> {
  const db = await getDb();
  if (!db) return null;

  const result = await db.select().from(teams)
    .where(eq(teams.id, teamId))
    .limit(1);

  return result[0] || null;
}

// ============ PLAYERS ============

export async function upsertPlayer(player: InsertPlayer): Promise<Player | null> {
  const db = await getDb();
  if (!db) return null;

  try {
    await db.insert(players).values(player).onDuplicateKeyUpdate({
      set: {
        name: player.name,
        position: player.position,
        nflTeam: player.nflTeam,
        status: player.status,
        updatedAt: new Date(),
      },
    });

    const result = await db.select().from(players)
      .where(eq(players.espnPlayerId, player.espnPlayerId))
      .limit(1);

    return result[0] || null;
  } catch (error) {
    console.error('[LeagueDB] Error upserting player:', error);
    throw error;
  }
}

export async function getPlayerByEspnId(espnPlayerId: number): Promise<Player | null> {
  const db = await getDb();
  if (!db) return null;

  const result = await db.select().from(players)
    .where(eq(players.espnPlayerId, espnPlayerId))
    .limit(1);

  return result[0] || null;
}

// ============ MATCHUPS ============

export async function upsertMatchup(matchup: InsertMatchup): Promise<Matchup | null> {
  const db = await getDb();
  if (!db) return null;

  try {
    await db.insert(matchups).values(matchup).onDuplicateKeyUpdate({
      set: {
        homeScore: matchup.homeScore,
        awayScore: matchup.awayScore,
        homeProjected: matchup.homeProjected,
        awayProjected: matchup.awayProjected,
        isComplete: matchup.isComplete,
        updatedAt: new Date(),
      },
    });

    const result = await db.select().from(matchups)
      .where(and(
        eq(matchups.leagueId, matchup.leagueId),
        eq(matchups.week, matchup.week),
        eq(matchups.seasonYear, matchup.seasonYear),
        eq(matchups.homeTeamId, matchup.homeTeamId),
        eq(matchups.awayTeamId, matchup.awayTeamId)
      ))
      .limit(1);

    return result[0] || null;
  } catch (error) {
    console.error('[LeagueDB] Error upserting matchup:', error);
    throw error;
  }
}

export async function getMatchupsByWeek(
  leagueId: number,
  week: number,
  seasonYear: number
): Promise<Matchup[]> {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(matchups)
    .where(and(
      eq(matchups.leagueId, leagueId),
      eq(matchups.week, week),
      eq(matchups.seasonYear, seasonYear)
    ));
}

export async function getAllMatchupsByLeague(leagueId: number): Promise<Matchup[]> {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(matchups)
    .where(eq(matchups.leagueId, leagueId))
    .orderBy(desc(matchups.seasonYear), desc(matchups.week));
}

// ============ PLAYER STATS ============

export async function insertPlayerStat(stat: InsertPlayerStat): Promise<void> {
  const db = await getDb();
  if (!db) return;

  try {
    await db.insert(playerStats).values(stat);
  } catch (error) {
    console.error('[LeagueDB] Error inserting player stat:', error);
  }
}

export async function getPlayerStatsByWeek(
  leagueId: number,
  week: number,
  seasonYear: number
): Promise<PlayerStat[]> {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(playerStats)
    .where(and(
      eq(playerStats.leagueId, leagueId),
      eq(playerStats.week, week),
      eq(playerStats.seasonYear, seasonYear)
    ));
}

// ============ TRANSACTIONS ============

export async function insertTransaction(transaction: InsertTransaction): Promise<void> {
  const db = await getDb();
  if (!db) return;

  try {
    await db.insert(transactions).values(transaction);
  } catch (error) {
    console.error('[LeagueDB] Error inserting transaction:', error);
  }
}

export async function getRecentTransactions(leagueId: number, limit: number = 50): Promise<Transaction[]> {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(transactions)
    .where(eq(transactions.leagueId, leagueId))
    .orderBy(desc(transactions.transactionDate))
    .limit(limit);
}

// ============ ALL-TIME STATS ============

export async function upsertTeamAllTimeStats(stats: InsertTeamAllTimeStat): Promise<void> {
  const db = await getDb();
  if (!db) return;

  try {
    await db.insert(teamAllTimeStats).values(stats).onDuplicateKeyUpdate({
      set: {
        totalWins: stats.totalWins,
        totalLosses: stats.totalLosses,
        totalTies: stats.totalTies,
        championships: stats.championships,
        playoffAppearances: stats.playoffAppearances,
        totalPointsFor: stats.totalPointsFor,
        totalPointsAgainst: stats.totalPointsAgainst,
        highestWeeklyScore: stats.highestWeeklyScore,
        lowestWeeklyScore: stats.lowestWeeklyScore,
        longestWinStreak: stats.longestWinStreak,
        longestLoseStreak: stats.longestLoseStreak,
        updatedAt: new Date(),
      },
    });
  } catch (error) {
    console.error('[LeagueDB] Error upserting all-time stats:', error);
  }
}

export async function getTeamAllTimeStats(teamId: number): Promise<TeamAllTimeStat | null> {
  const db = await getDb();
  if (!db) return null;

  const result = await db.select().from(teamAllTimeStats)
    .where(eq(teamAllTimeStats.teamId, teamId))
    .limit(1);

  return result[0] || null;
}
