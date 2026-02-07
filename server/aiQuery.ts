/**
 * AI-powered query service for answering questions about league data
 */

import { invokeLLM } from "./_core/llm";
import { 
  getAllMatchupsByLeague, 
  getTeamsByLeague,
  getRecentTransactions 
} from "./leagueDb";
import { getDb } from "./db";
import { leagues, teams, matchups, playerStats } from "../drizzle/schema";
import { eq } from "drizzle-orm";

export interface AIQueryResult {
  success: boolean;
  answer: string;
  data?: any;
}

/**
 * Answer natural language questions about league data using AI
 */
export async function answerLeagueQuestion(
  leagueId: number,
  question: string
): Promise<AIQueryResult> {
  try {
    const db = await getDb();
    if (!db) {
      return {
        success: false,
        answer: "Database not available",
      };
    }

    // Fetch league data
    const league = await db.select().from(leagues).where(eq(leagues.id, leagueId)).limit(1);
    if (!league || league.length === 0) {
      return {
        success: false,
        answer: "League not found",
      };
    }

    // Fetch teams
    const leagueTeams = await getTeamsByLeague(leagueId);
    
    // Fetch all matchups
    const allMatchups = await getAllMatchupsByLeague(leagueId);

    // Fetch recent transactions
    const recentTransactions = await getRecentTransactions(leagueId, 100);

    // Build context for AI
    const context = {
      league: league[0],
      teams: leagueTeams,
      matchups: allMatchups,
      transactions: recentTransactions.slice(0, 50), // Limit to avoid token overflow
    };

    // Create prompt for LLM
    const systemPrompt = `You are a fantasy football data analyst. Answer questions about league data accurately and concisely.

League Data:
- League: ${league[0].name} (${league[0].seasonYear} Season)
- Teams: ${leagueTeams.length} teams
- Total Matchups: ${allMatchups.length}

Teams:
${leagueTeams.map(t => `- ${t.name} (Owner: ${t.ownerName}): ${t.wins}-${t.losses}${t.ties ? `-${t.ties}` : ''}, ${t.pointsFor} PF, ${t.pointsAgainst} PA`).join('\n')}

Recent Matchups (last 20):
${allMatchups.slice(-20).map(m => {
  const homeTeam = leagueTeams.find(t => t.id === m.homeTeamId);
  const awayTeam = leagueTeams.find(t => t.id === m.awayTeamId);
  return `Week ${m.week} (${m.seasonYear}): ${homeTeam?.name || 'Unknown'} ${m.homeScore} vs ${awayTeam?.name || 'Unknown'} ${m.awayScore}`;
}).join('\n')}

Answer the user's question based on this data. Be specific with numbers and names. If asking about a specific year, filter the data accordingly.`;

    const response = await invokeLLM({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: question },
      ],
    });

    const content = response.choices[0]?.message?.content;
    const answer = typeof content === 'string' ? content : "Unable to generate answer";

    return {
      success: true,
      answer,
      data: {
        teamsCount: leagueTeams.length,
        matchupsCount: allMatchups.length,
      },
    };
  } catch (error: any) {
    console.error('[AIQuery] Error answering question:', error);
    return {
      success: false,
      answer: `Error: ${error.message || 'Failed to process question'}`,
    };
  }
}
