/**
 * User aggregate statistics calculations
 * Calculates overall win rate, streaks, and other user-level stats
 */

import { asc } from "drizzle-orm";
import { teams, matchups } from "../drizzle/schema";
import { getDb } from "./db";

export interface UserAggregateStats {
  totalLeagues: number;
  overallWinRate: number | null;
  longestWinStreak: number;
  longestLossStreak: number;
  totalWins: number;
  totalLosses: number;
  totalTies: number;
  totalGames: number;
}

/**
 * Calculate aggregate statistics across all leagues in the system
 * Since we don't track user-team ownership, we calculate stats across all leagues
 * @returns UserAggregateStats object with calculated values
 */
export async function getUserAggregateStats(): Promise<UserAggregateStats> {
  const db = await getDb();
  if (!db) {
    return {
      totalLeagues: 0,
      overallWinRate: null,
      longestWinStreak: 0,
      longestLossStreak: 0,
      totalWins: 0,
      totalLosses: 0,
      totalTies: 0,
      totalGames: 0,
    };
  }

  try {
    // Get all teams across all leagues
    const allTeams = await db.select().from(teams);

    if (allTeams.length === 0) {
      return {
        totalLeagues: 0,
        overallWinRate: null,
        longestWinStreak: 0,
        longestLossStreak: 0,
        totalWins: 0,
        totalLosses: 0,
        totalTies: 0,
        totalGames: 0,
      };
    }

    // Count unique leagues
    const uniqueLeagues = new Set(allTeams.map(t => t.leagueId));
    const totalLeagues = uniqueLeagues.size;

    // Calculate total wins, losses, ties from all team records
    let totalWins = 0;
    let totalLosses = 0;
    let totalTies = 0;

    for (const team of allTeams) {
      totalWins += team.wins || 0;
      totalLosses += team.losses || 0;
      totalTies += team.ties || 0;
    }

    const totalGames = totalWins + totalLosses + totalTies;
    const overallWinRate = totalGames > 0 ? (totalWins / totalGames) * 100 : null;

    // Calculate streaks by analyzing matchup history. Matchup rows store
    // ESPN team ids, which repeat across leagues and seasons, so identify
    // teams by the full (leagueId, seasonYear, espnTeamId) key.
    const teamKeys = new Set(
      allTeams.map(t => `${t.leagueId}:${t.seasonYear}:${t.espnTeamId}`)
    );
    const { longestWinStreak, longestLossStreak } = await calculateStreaks(teamKeys);

    return {
      totalLeagues,
      overallWinRate,
      longestWinStreak,
      longestLossStreak,
      totalWins,
      totalLosses,
      totalTies,
      totalGames,
    };
  } catch (error) {
    console.error('[UserStatsDB] Error calculating aggregate stats:', error);
    return {
      totalLeagues: 0,
      overallWinRate: null,
      longestWinStreak: 0,
      longestLossStreak: 0,
      totalWins: 0,
      totalLosses: 0,
      totalTies: 0,
      totalGames: 0,
    };
  }
}

/**
 * Calculate longest win and loss streaks from matchup history
 * @param teamKeys - Set of "leagueId:seasonYear:espnTeamId" keys to analyze
 * @returns Object with longestWinStreak and longestLossStreak
 */
async function calculateStreaks(teamKeys: Set<string>): Promise<{ longestWinStreak: number; longestLossStreak: number }> {
  const db = await getDb();
  if (!db || teamKeys.size === 0) {
    return { longestWinStreak: 0, longestLossStreak: 0 };
  }

  try {
    // Get all matchups ordered by season and week; membership is checked per
    // row because matchup team ids are ESPN ids scoped to league + season.
    const allMatchups = await db.select().from(matchups)
      .orderBy(asc(matchups.seasonYear), asc(matchups.week));

    // Determine win/loss for each matchup
    const results: ('W' | 'L' | 'T')[] = [];
    for (const matchup of allMatchups) {
      const isHome = teamKeys.has(
        `${matchup.leagueId}:${matchup.seasonYear}:${matchup.homeTeamId}`
      );
      const isAway = teamKeys.has(
        `${matchup.leagueId}:${matchup.seasonYear}:${matchup.awayTeamId}`
      );

      if (!isHome && !isAway) continue;

      const homeScore = matchup.homeScore || 0;
      const awayScore = matchup.awayScore || 0;

      if (homeScore === awayScore) {
        results.push('T');
      } else if (isHome) {
        results.push(homeScore > awayScore ? 'W' : 'L');
      } else {
        results.push(awayScore > homeScore ? 'W' : 'L');
      }
    }

    // Calculate streaks
    let longestWinStreak = 0;
    let longestLossStreak = 0;
    let currentWinStreak = 0;
    let currentLossStreak = 0;

    for (const result of results) {
      if (result === 'W') {
        currentWinStreak++;
        currentLossStreak = 0;
        longestWinStreak = Math.max(longestWinStreak, currentWinStreak);
      } else if (result === 'L') {
        currentLossStreak++;
        currentWinStreak = 0;
        longestLossStreak = Math.max(longestLossStreak, currentLossStreak);
      } else {
        // Tie breaks both streaks
        currentWinStreak = 0;
        currentLossStreak = 0;
      }
    }

    return { longestWinStreak, longestLossStreak };
  } catch (error) {
    console.error('[UserStatsDB] Error calculating streaks:', error);
    return { longestWinStreak: 0, longestLossStreak: 0 };
  }
}
