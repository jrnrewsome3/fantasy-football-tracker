/**
 * Database operations for leagues, teams, players, and stats
 */

import { eq, and, desc } from "drizzle-orm";
import {
  leagues,
  League,
  InsertLeague,
  leagueMembers,
  teams,
  Team,
  InsertTeam,
  players,
  Player,
  InsertPlayer,
  leagueAvailablePlayers,
  InsertLeagueAvailablePlayer,
  matchups,
  Matchup,
  InsertMatchup,
  playerStats,
  PlayerStat,
  InsertPlayerStat,
  transactions,
  Transaction,
  InsertTransaction,
  teamAllTimeStats,
  TeamAllTimeStat,
  InsertTeamAllTimeStat,
} from "../drizzle/schema";
import { getDb } from "./db";

// ============ LEAGUES ============

export async function upsertLeague(
  league: InsertLeague
): Promise<League | null> {
  const db = await getDb();
  if (!db) return null;

  try {
    await db
      .insert(leagues)
      .values(league)
      .onDuplicateKeyUpdate({
        set: {
          name: league.name,
          seasonYear: league.seasonYear,
          espnS2: league.espnS2,
          swid: league.swid,
          commissionerUserId: league.commissionerUserId,
          inviteCode: league.inviteCode,
          autoSync: league.autoSync,
          syncIntervalMinutes: league.syncIntervalMinutes,
          lastSyncStatus: league.lastSyncStatus,
          lastSyncError: league.lastSyncError,
          currentWeek: league.currentWeek,
          totalWeeks: league.totalWeeks,
          lastSyncedAt: league.lastSyncedAt,
          updatedAt: new Date(),
        },
      });

    const result = await db
      .select()
      .from(leagues)
      .where(eq(leagues.espnLeagueId, league.espnLeagueId))
      .limit(1);

    return result[0] || null;
  } catch (error) {
    console.error("[LeagueDB] Error upserting league:", error);
    throw error;
  }
}

export async function getLeagueByEspnId(
  espnLeagueId: string
): Promise<League | null> {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(leagues)
    .where(eq(leagues.espnLeagueId, espnLeagueId))
    .limit(1);

  return result[0] || null;
}

export async function getLeagueById(leagueId: number): Promise<League | null> {
  const db = await getDb();
  if (!db) return null;
  const result = await db
    .select()
    .from(leagues)
    .where(eq(leagues.id, leagueId))
    .limit(1);
  return result[0] || null;
}

export async function getAllLeagues(): Promise<League[]> {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(leagues).orderBy(desc(leagues.updatedAt));
}

/** Return only leagues shared with this user, never server-only ESPN credentials. */
export async function getLeaguesForUser(userId: number) {
  const db = await getDb();
  if (!db) return [];

  const rows = await db
    .select({ league: leagues, membership: leagueMembers })
    .from(leagueMembers)
    .innerJoin(leagues, eq(leagueMembers.leagueId, leagues.id))
    .where(eq(leagueMembers.userId, userId))
    .orderBy(desc(leagues.updatedAt));

  return rows.map(({ league, membership }) => ({
    id: league.id,
    espnLeagueId: league.espnLeagueId,
    name: league.name,
    seasonYear: league.seasonYear,
    currentWeek: league.currentWeek,
    totalWeeks: league.totalWeeks,
    lastSyncedAt: league.lastSyncedAt,
    autoSync: league.autoSync,
    syncIntervalMinutes: league.syncIntervalMinutes,
    lastSyncStatus: league.lastSyncStatus,
    lastSyncError: league.lastSyncError,
    createdAt: league.createdAt,
    updatedAt: league.updatedAt,
    userRole: membership.role,
    myEspnTeamId: membership.espnTeamId,
    inviteCode: membership.role === "commissioner" ? league.inviteCode : null,
  }));
}

export async function getAutoSyncLeagues(): Promise<League[]> {
  const leaguesToCheck = await getAllLeagues();
  const now = Date.now();
  return leaguesToCheck.filter(league => {
    if (!league.autoSync || !league.commissionerUserId) return false;
    if (!league.lastSyncedAt) return true;
    return (
      now - league.lastSyncedAt.getTime() >= league.syncIntervalMinutes * 60_000
    );
  });
}

export async function updateLeagueSyncState(
  leagueId: number,
  status: "syncing" | "success" | "error",
  error?: string
) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(leagues)
    .set({
      lastSyncStatus: status,
      lastSyncError: error ?? null,
      ...(status === "success" ? { lastSyncedAt: new Date() } : {}),
      updatedAt: new Date(),
    })
    .where(eq(leagues.id, leagueId));
}

export async function deleteLeague(
  leagueId: number
): Promise<{ success: boolean; message: string }> {
  const db = await getDb();
  if (!db) return { success: false, message: "Database not available" };

  try {
    // Delete all related data first (cascade)
    // Note: teamAllTimeStats links to teamId, not leagueId
    // We need to delete stats for teams in this league
    const leagueTeams = await db
      .select()
      .from(teams)
      .where(eq(teams.leagueId, leagueId));
    for (const team of leagueTeams) {
      await db
        .delete(teamAllTimeStats)
        .where(eq(teamAllTimeStats.teamId, team.id));
    }

    await db.delete(playerStats).where(eq(playerStats.leagueId, leagueId));
    await db
      .delete(leagueAvailablePlayers)
      .where(eq(leagueAvailablePlayers.leagueId, leagueId));
    await db.delete(transactions).where(eq(transactions.leagueId, leagueId));
    await db.delete(matchups).where(eq(matchups.leagueId, leagueId));
    await db.delete(teams).where(eq(teams.leagueId, leagueId));
    await db.delete(leagueMembers).where(eq(leagueMembers.leagueId, leagueId));
    await db.delete(leagues).where(eq(leagues.id, leagueId));

    return {
      success: true,
      message: "League and all related data deleted successfully",
    };
  } catch (error: any) {
    console.error("[LeagueDB] Error deleting league:", error);
    return {
      success: false,
      message: error.message || "Failed to delete league",
    };
  }
}

export async function renameLeague(
  leagueId: number,
  newName: string
): Promise<{ success: boolean; message: string }> {
  const db = await getDb();
  if (!db) return { success: false, message: "Database not available" };

  try {
    await db
      .update(leagues)
      .set({ name: newName, updatedAt: new Date() })
      .where(eq(leagues.id, leagueId));

    return { success: true, message: "League renamed successfully" };
  } catch (error: any) {
    console.error("[LeagueDB] Error renaming league:", error);
    return {
      success: false,
      message: error.message || "Failed to rename league",
    };
  }
}

// ============ TEAMS ============

export async function upsertTeam(team: InsertTeam): Promise<Team | null> {
  const db = await getDb();
  if (!db) return null;

  try {
    await db
      .insert(teams)
      .values(team)
      .onDuplicateKeyUpdate({
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
          seasonYear: team.seasonYear,
          updatedAt: new Date(),
        },
      });

    const result = await db
      .select()
      .from(teams)
      .where(
        and(
          eq(teams.leagueId, team.leagueId),
          eq(teams.espnTeamId, team.espnTeamId)
        )
      )
      .limit(1);

    return result[0] || null;
  } catch (error) {
    console.error("[LeagueDB] Error upserting team:", error);
    throw error;
  }
}

export async function getTeamsByLeague(leagueId: number): Promise<Team[]> {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(teams)
    .where(eq(teams.leagueId, leagueId))
    .orderBy(desc(teams.wins));
}

export async function getTeamsByLeagueAndSeason(
  leagueId: number,
  seasonYear: number
): Promise<Team[]> {
  const db = await getDb();
  if (!db) return [];

  // Get all teams for this league and season
  const allTeams = await db
    .select()
    .from(teams)
    .where(and(eq(teams.leagueId, leagueId), eq(teams.seasonYear, seasonYear)));

  // Group by espnTeamId and aggregate stats
  const teamMap = new Map<number, Team>();

  for (const team of allTeams) {
    const existing = teamMap.get(team.espnTeamId);

    if (!existing) {
      // First time seeing this espnTeamId, use this team
      teamMap.set(team.espnTeamId, { ...team });
    } else {
      // Aggregate stats for same espnTeamId
      existing.wins = (existing.wins || 0) + (team.wins || 0);
      existing.losses = (existing.losses || 0) + (team.losses || 0);
      existing.ties = (existing.ties || 0) + (team.ties || 0);
      existing.pointsFor = (existing.pointsFor || 0) + (team.pointsFor || 0);
      existing.pointsAgainst =
        (existing.pointsAgainst || 0) + (team.pointsAgainst || 0);

      // Use the most recent team name (higher id = more recent)
      if (team.id > existing.id) {
        existing.name = team.name;
        existing.logoUrl = team.logoUrl;
      }
    }
  }

  // Convert map to array and sort by wins
  return Array.from(teamMap.values()).sort(
    (a, b) => (b.wins || 0) - (a.wins || 0)
  );
}

export async function getTeamsByEspnLeagueAllTime(
  espnLeagueId: string
): Promise<Team[]> {
  const db = await getDb();
  if (!db) return [];

  // Get all teams across all seasons for this ESPN league
  const allTeams = await db
    .select()
    .from(teams)
    .innerJoin(leagues, eq(teams.leagueId, leagues.id))
    .where(eq(leagues.espnLeagueId, espnLeagueId));

  // Group by espnTeamId and aggregate career stats
  const teamMap = new Map<number, Team>();

  for (const row of allTeams) {
    const team = row.teams;
    const existing = teamMap.get(team.espnTeamId);

    if (!existing) {
      // First time seeing this espnTeamId, use this team
      teamMap.set(team.espnTeamId, { ...team });
    } else {
      // Aggregate career stats for same espnTeamId
      existing.wins = (existing.wins || 0) + (team.wins || 0);
      existing.losses = (existing.losses || 0) + (team.losses || 0);
      existing.ties = (existing.ties || 0) + (team.ties || 0);
      existing.pointsFor = (existing.pointsFor || 0) + (team.pointsFor || 0);
      existing.pointsAgainst =
        (existing.pointsAgainst || 0) + (team.pointsAgainst || 0);

      // Use the most recent team name (higher id = more recent)
      if (team.id > existing.id) {
        existing.name = team.name;
        existing.logoUrl = team.logoUrl;
        existing.ownerName = team.ownerName;
      }
    }
  }

  // Convert map to array and sort by career wins
  return Array.from(teamMap.values()).sort(
    (a, b) => (b.wins || 0) - (a.wins || 0)
  );
}

export async function getTeamById(teamId: number): Promise<Team | null> {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(teams)
    .where(eq(teams.id, teamId))
    .limit(1);

  return result[0] || null;
}

// ============ PLAYERS ============

export async function upsertPlayer(
  player: InsertPlayer
): Promise<Player | null> {
  const db = await getDb();
  if (!db) return null;

  try {
    await db
      .insert(players)
      .values(player)
      .onDuplicateKeyUpdate({
        set: {
          name: player.name,
          position: player.position,
          nflTeam: player.nflTeam,
          status: player.status,
          updatedAt: new Date(),
        },
      });

    const result = await db
      .select()
      .from(players)
      .where(eq(players.espnPlayerId, player.espnPlayerId))
      .limit(1);

    return result[0] || null;
  } catch (error) {
    console.error("[LeagueDB] Error upserting player:", error);
    throw error;
  }
}

export async function getPlayerByEspnId(
  espnPlayerId: number
): Promise<Player | null> {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(players)
    .where(eq(players.espnPlayerId, espnPlayerId))
    .limit(1);

  return result[0] || null;
}

export async function replaceAvailablePlayers(
  leagueId: number,
  seasonYear: number,
  scoringPeriod: number,
  snapshots: Array<{
    player: InsertPlayer;
    availabilityStatus: string;
    percentOwned: number;
    percentStarted: number;
    ownershipTrend: number;
  }>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .delete(leagueAvailablePlayers)
    .where(
      and(
        eq(leagueAvailablePlayers.leagueId, leagueId),
        eq(leagueAvailablePlayers.seasonYear, seasonYear)
      )
    );

  for (const snapshot of snapshots) {
    const player = await upsertPlayer(snapshot.player);
    if (!player) continue;
    const values: InsertLeagueAvailablePlayer = {
      leagueId,
      playerId: player.id,
      seasonYear,
      scoringPeriod,
      availabilityStatus: snapshot.availabilityStatus,
      percentOwned: snapshot.percentOwned,
      percentStarted: snapshot.percentStarted,
      ownershipTrend: snapshot.ownershipTrend,
    };
    await db.insert(leagueAvailablePlayers).values(values);
  }
}

export async function getAvailablePlayers(
  leagueId: number,
  limit = 100,
  position?: string
) {
  const db = await getDb();
  if (!db) return [];

  const rows = await db
    .select({ snapshot: leagueAvailablePlayers, player: players })
    .from(leagueAvailablePlayers)
    .innerJoin(players, eq(leagueAvailablePlayers.playerId, players.id))
    .where(eq(leagueAvailablePlayers.leagueId, leagueId))
    .orderBy(desc(leagueAvailablePlayers.percentOwned));

  return rows
    .filter(row => !position || row.player.position === position)
    .slice(0, limit)
    .map(row => ({ ...row.player, ...row.snapshot }));
}

// ============ MATCHUPS ============

export async function upsertMatchup(
  matchup: InsertMatchup
): Promise<Matchup | null> {
  const db = await getDb();
  if (!db) return null;

  try {
    await db
      .insert(matchups)
      .values(matchup)
      .onDuplicateKeyUpdate({
        set: {
          homeScore: matchup.homeScore,
          awayScore: matchup.awayScore,
          homeProjected: matchup.homeProjected,
          awayProjected: matchup.awayProjected,
          isComplete: matchup.isComplete,
          updatedAt: new Date(),
        },
      });

    const result = await db
      .select()
      .from(matchups)
      .where(
        and(
          eq(matchups.leagueId, matchup.leagueId),
          eq(matchups.week, matchup.week),
          eq(matchups.seasonYear, matchup.seasonYear),
          eq(matchups.homeTeamId, matchup.homeTeamId),
          eq(matchups.awayTeamId, matchup.awayTeamId)
        )
      )
      .limit(1);

    return result[0] || null;
  } catch (error) {
    console.error("[LeagueDB] Error upserting matchup:", error);
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

  return await db
    .select()
    .from(matchups)
    .where(
      and(
        eq(matchups.leagueId, leagueId),
        eq(matchups.week, week),
        eq(matchups.seasonYear, seasonYear)
      )
    );
}

export async function getAllMatchupsByLeague(
  leagueId: number
): Promise<Matchup[]> {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(matchups)
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
    console.error("[LeagueDB] Error inserting player stat:", error);
  }
}

export async function getPlayerStatsByWeek(
  leagueId: number,
  week: number,
  seasonYear: number
): Promise<PlayerStat[]> {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(playerStats)
    .where(
      and(
        eq(playerStats.leagueId, leagueId),
        eq(playerStats.week, week),
        eq(playerStats.seasonYear, seasonYear)
      )
    );
}

// ============ TRANSACTIONS ============

export async function insertTransaction(
  transaction: InsertTransaction
): Promise<void> {
  const db = await getDb();
  if (!db) return;

  try {
    await db.insert(transactions).values(transaction);
  } catch (error) {
    console.error("[LeagueDB] Error inserting transaction:", error);
  }
}

export async function getRecentTransactions(
  leagueId: number,
  limit: number = 50
): Promise<Transaction[]> {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(transactions)
    .where(eq(transactions.leagueId, leagueId))
    .orderBy(desc(transactions.transactionDate))
    .limit(limit);
}

// ============ ALL-TIME STATS ============

export async function upsertTeamAllTimeStats(
  stats: InsertTeamAllTimeStat
): Promise<void> {
  const db = await getDb();
  if (!db) return;

  try {
    await db
      .insert(teamAllTimeStats)
      .values(stats)
      .onDuplicateKeyUpdate({
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
    console.error("[LeagueDB] Error upserting all-time stats:", error);
  }
}

export async function getTeamAllTimeStats(
  teamId: number
): Promise<TeamAllTimeStat | null> {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(teamAllTimeStats)
    .where(eq(teamAllTimeStats.teamId, teamId))
    .limit(1);

  return result[0] || null;
}

// ============ TEAM HISTORY ============

export async function getTeamHistory(
  espnTeamId: number,
  espnLeagueId: string
): Promise<Team[]> {
  const db = await getDb();
  if (!db) return [];

  // Get all seasons for this ESPN team across all league instances
  const leagueInstances = await db
    .select()
    .from(leagues)
    .where(eq(leagues.espnLeagueId, espnLeagueId));

  const leagueIds = leagueInstances.map(l => l.id);
  if (leagueIds.length === 0) return [];

  // Get team data for all seasons
  const teamHistory = await db
    .select()
    .from(teams)
    .where(eq(teams.espnTeamId, espnTeamId))
    .orderBy(desc(teams.seasonYear));

  return teamHistory.filter(t => leagueIds.includes(t.leagueId));
}

// ============ SEASON SUMMARIES ============

export async function getSeasonSummaries(espnLeagueId: string): Promise<
  Array<{
    league: League;
    teamCount: number;
    totalGames: number;
    topScorer: { name: string; points: number } | null;
  }>
> {
  const db = await getDb();
  if (!db) return [];

  // Get all league instances (seasons) for this ESPN league
  const leagueInstances = await db
    .select()
    .from(leagues)
    .where(eq(leagues.espnLeagueId, espnLeagueId))
    .orderBy(desc(leagues.seasonYear));

  const summaries = [];

  for (const league of leagueInstances) {
    // Get team count for this season
    const seasonTeams = await db
      .select()
      .from(teams)
      .where(
        and(
          eq(teams.leagueId, league.id),
          eq(teams.seasonYear, league.seasonYear)
        )
      );

    // Get matchup count
    const seasonMatchups = await db
      .select()
      .from(matchups)
      .where(
        and(
          eq(matchups.leagueId, league.id),
          eq(matchups.seasonYear, league.seasonYear)
        )
      );

    // Find top scorer
    const topScorerTeam =
      seasonTeams.length > 0
        ? seasonTeams.reduce((max, team) =>
            (team.pointsFor || 0) > (max.pointsFor || 0) ? team : max
          )
        : null;

    summaries.push({
      league,
      teamCount: seasonTeams.length,
      totalGames: seasonMatchups.length,
      topScorer: topScorerTeam
        ? {
            name: topScorerTeam.name,
            points: topScorerTeam.pointsFor || 0,
          }
        : null,
    });
  }

  return summaries;
}

// ============ OWNER LEADERBOARD ============

export async function getOwnerLeaderboard(espnLeagueId: string) {
  const db = await getDb();
  if (!db) return [];

  try {
    // Get all teams for this ESPN league across all seasons
    const allTeams = await db
      .select()
      .from(teams)
      .innerJoin(leagues, eq(teams.leagueId, leagues.id))
      .where(eq(leagues.espnLeagueId, espnLeagueId));

    // Group by owner name and aggregate stats
    const ownerStatsMap = new Map<
      string,
      {
        ownerName: string;
        totalWins: number;
        totalLosses: number;
        totalTies: number;
        totalPointsFor: number;
        totalPointsAgainst: number;
        seasonsPlayed: number;
        bestSeasonWins: number;
        bestSeasonYear: number;
        worstSeasonWins: number;
        worstSeasonYear: number;
      }
    >();

    for (const { teams: team, leagues: league } of allTeams) {
      if (!team.ownerName) continue;

      const existing = ownerStatsMap.get(team.ownerName);
      const wins = team.wins || 0;
      const losses = team.losses || 0;
      const ties = team.ties || 0;
      const pf = team.pointsFor || 0;
      const pa = team.pointsAgainst || 0;

      if (existing) {
        existing.totalWins += wins;
        existing.totalLosses += losses;
        existing.totalTies += ties;
        existing.totalPointsFor += pf;
        existing.totalPointsAgainst += pa;
        existing.seasonsPlayed += 1;

        // Track best season
        if (wins > existing.bestSeasonWins) {
          existing.bestSeasonWins = wins;
          existing.bestSeasonYear = league.seasonYear;
        }

        // Track worst season
        if (wins < existing.worstSeasonWins) {
          existing.worstSeasonWins = wins;
          existing.worstSeasonYear = league.seasonYear;
        }
      } else {
        ownerStatsMap.set(team.ownerName, {
          ownerName: team.ownerName,
          totalWins: wins,
          totalLosses: losses,
          totalTies: ties,
          totalPointsFor: pf,
          totalPointsAgainst: pa,
          seasonsPlayed: 1,
          bestSeasonWins: wins,
          bestSeasonYear: league.seasonYear,
          worstSeasonWins: wins,
          worstSeasonYear: league.seasonYear,
        });
      }
    }

    // Convert to array and calculate win percentages
    const leaderboard = Array.from(ownerStatsMap.values()).map(owner => {
      const totalGames = owner.totalWins + owner.totalLosses + owner.totalTies;
      const winPercentage =
        totalGames > 0 ? (owner.totalWins / totalGames) * 100 : 0;
      const avgPointsPerSeason =
        owner.seasonsPlayed > 0
          ? owner.totalPointsFor / owner.seasonsPlayed
          : 0;

      return {
        ...owner,
        winPercentage,
        avgPointsPerSeason,
        totalGames,
      };
    });

    // Sort by total wins descending
    return leaderboard.sort((a, b) => b.totalWins - a.totalWins);
  } catch (error) {
    console.error("[LeagueDB] Error getting owner leaderboard:", error);
    return [];
  }
}
