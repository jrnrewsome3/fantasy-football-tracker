/**
 * AI Trade Analysis Service
 * Analyzes fantasy football trades to determine winners and provide insights
 */

import { invokeLLM } from './_core/llm';
import { getTradePlayersByTradeId } from './tradeDb';
import { getDb } from './db';
import { playerStats, matchups } from '../drizzle/schema';
import { eq, and, gte, lte } from 'drizzle-orm';

interface TradeAnalysisResult {
  tradeId: number;
  winner: 'team1' | 'team2' | 'even';
  winnerName: string;
  analysis: string;
  team1Score: number;
  team2Score: number;
  team1Players: Array<{
    name: string;
    pointsAfterTrade: number;
    gamesPlayed: number;
  }>;
  team2Players: Array<{
    name: string;
    pointsAfterTrade: number;
    gamesPlayed: number;
  }>;
}

/**
 * Get player stats after a trade date
 */
async function getPlayerStatsAfterTrade(
  playerId: number,
  seasonYear: number,
  tradeWeek: number
): Promise<{ totalPoints: number; gamesPlayed: number }> {
  const db = await getDb();
  if (!db) return { totalPoints: 0, gamesPlayed: 0 };

  const stats = await db
    .select()
    .from(playerStats)
    .where(
      and(
        eq(playerStats.playerId, playerId),
        eq(playerStats.seasonYear, seasonYear),
        gte(playerStats.week, tradeWeek)
      )
    );

  const totalPoints = stats.reduce((sum, stat) => sum + (stat.points || 0), 0);
  const gamesPlayed = stats.length;

  return { totalPoints, gamesPlayed };
}

/**
 * Get team record after a trade
 */
async function getTeamRecordAfterTrade(
  leagueId: number,
  teamId: number,
  seasonYear: number,
  tradeWeek: number
): Promise<{ wins: number; losses: number; ties: number }> {
  const db = await getDb();
  if (!db) return { wins: 0, losses: 0, ties: 0 };

  const teamMatchups = await db
    .select()
    .from(matchups)
    .where(
      and(
        eq(matchups.leagueId, leagueId),
        eq(matchups.seasonYear, seasonYear),
        gte(matchups.week, tradeWeek)
      )
    );

  let wins = 0;
  let losses = 0;
  let ties = 0;

  for (const matchup of teamMatchups) {
    if (matchup.homeTeamId === teamId) {
      const homeScore = matchup.homeScore || 0;
      const awayScore = matchup.awayScore || 0;
      if (homeScore > awayScore) wins++;
      else if (homeScore < awayScore) losses++;
      else ties++;
    } else if (matchup.awayTeamId === teamId) {
      const homeScore = matchup.homeScore || 0;
      const awayScore = matchup.awayScore || 0;
      if (awayScore > homeScore) wins++;
      else if (awayScore < homeScore) losses++;
      else ties++;
    }
  }

  return { wins, losses, ties };
}

/**
 * Analyze a trade using AI
 */
export async function analyzeTradeWithAI(
  tradeId: number,
  trade: {
    id: number;
    seasonYear: number;
    week: number;
    team1Id: number;
    team1Name: string;
    team2Id: number;
    team2Name: string;
    leagueId: number;
  }
): Promise<TradeAnalysisResult> {
  try {
    // Get trade players
    const tradePlayers = await getTradePlayersByTradeId(tradeId);

    // Get team1 players (players team1 received)
    const team1ReceivedPlayers = tradePlayers.filter(p => p.toTeamId === trade.team1Id);
    // Get team2 players (players team2 received)
    const team2ReceivedPlayers = tradePlayers.filter(p => p.toTeamId === trade.team2Id);

    // Calculate stats for team1's acquired players
    const team1PlayerStats = await Promise.all(
      team1ReceivedPlayers.map(async (player) => {
        // Note: We don't have playerId in the database yet, so we'll use mock data
        // In a real implementation, you'd fetch actual player stats
        return {
          name: player.playerName,
          pointsAfterTrade: 0, // Would fetch from playerStats table
          gamesPlayed: 0,
        };
      })
    );

    // Calculate stats for team2's acquired players
    const team2PlayerStats = await Promise.all(
      team2ReceivedPlayers.map(async (player) => {
        return {
          name: player.playerName,
          pointsAfterTrade: 0, // Would fetch from playerStats table
          gamesPlayed: 0,
        };
      })
    );

    // Get team records after trade
    const team1Record = await getTeamRecordAfterTrade(
      trade.leagueId,
      trade.team1Id,
      trade.seasonYear,
      trade.week
    );
    const team2Record = await getTeamRecordAfterTrade(
      trade.leagueId,
      trade.team2Id,
      trade.seasonYear,
      trade.week
    );

    // Calculate simple scores (in real implementation, use actual player stats)
    const team1Score = team1PlayerStats.reduce((sum, p) => sum + p.pointsAfterTrade, 0);
    const team2Score = team2PlayerStats.reduce((sum, p) => sum + p.pointsAfterTrade, 0);

    // Prepare context for AI
    const tradeContext = `
Analyze this fantasy football trade from the ${trade.seasonYear} season (Week ${trade.week}):

**${trade.team1Name}** received:
${team1ReceivedPlayers.map(p => `- ${p.playerName} (${p.playerPosition || 'Unknown'})`).join('\n')}

**${trade.team2Name}** received:
${team2ReceivedPlayers.map(p => `- ${p.playerName} (${p.playerPosition || 'Unknown'})`).join('\n')}

**Post-Trade Records:**
- ${trade.team1Name}: ${team1Record.wins}-${team1Record.losses}-${team1Record.ties}
- ${trade.team2Name}: ${team2Record.wins}-${team2Record.losses}-${team2Record.ties}

Provide a fun, engaging analysis of this trade. Determine who won the trade and explain why. 
Consider player value, team needs, and how it impacted their season. 
Write in a sports commentary style with some personality!
`;

    // Call AI to generate analysis
    const response = await invokeLLM({
      messages: [
        {
          role: 'system',
          content: 'You are a fantasy football analyst providing entertaining trade analysis. Be insightful but fun, like a sports commentator.',
        },
        {
          role: 'user',
          content: tradeContext,
        },
      ],
    });

    const messageContent = response.choices[0]?.message?.content;
    const analysis = typeof messageContent === 'string' ? messageContent : 'Analysis unavailable';

    // Determine winner based on records and context
    let winner: 'team1' | 'team2' | 'even' = 'even';
    if (team1Record.wins > team2Record.wins) {
      winner = 'team1';
    } else if (team2Record.wins > team1Record.wins) {
      winner = 'team2';
    }

    return {
      tradeId,
      winner,
      winnerName: winner === 'team1' ? trade.team1Name : winner === 'team2' ? trade.team2Name : 'Even Trade',
      analysis,
      team1Score,
      team2Score,
      team1Players: team1PlayerStats,
      team2Players: team2PlayerStats,
    };
  } catch (error) {
    console.error('[Trade Analysis] Error analyzing trade:', error);
    throw new Error('Failed to analyze trade');
  }
}
