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
import { leagues, teams, matchups, playerStats, leagueSeasons } from "../drizzle/schema";
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

    // Group matchups by season for better analysis
    const matchupsBySeason = allMatchups.reduce((acc, m) => {
      if (!acc[m.seasonYear]) acc[m.seasonYear] = [];
      acc[m.seasonYear].push(m);
      return acc;
    }, {} as Record<number, typeof allMatchups>);

    // Matchup rows store ESPN team ids; resolve teams by espnTeamId within
    // the matching season, never by internal teams.id (a different id space).
    const findTeam = (espnTeamId: number, seasonYear: number) =>
      leagueTeams.find(
        t => t.espnTeamId === espnTeamId && t.seasonYear === seasonYear
      );
    const currentTeams = leagueTeams.filter(
      t => t.seasonYear === league[0].seasonYear
    );

    // Calculate season-specific stats
    const seasonStats = Object.entries(matchupsBySeason).map(([year, matches]) => {
      const seasonTeams = leagueTeams.filter(t => t.seasonYear === Number(year));
      const teamSeasonStats = seasonTeams.map(team => {
        const teamMatches = matches.filter(m => m.homeTeamId === team.espnTeamId || m.awayTeamId === team.espnTeamId);
        let wins = 0, losses = 0, pointsFor = 0;
        teamMatches.forEach(m => {
          if (m.homeTeamId === team.espnTeamId) {
            pointsFor += m.homeScore || 0;
            if ((m.homeScore || 0) > (m.awayScore || 0)) wins++;
            else if ((m.homeScore || 0) < (m.awayScore || 0)) losses++;
          } else {
            pointsFor += m.awayScore || 0;
            if ((m.awayScore || 0) > (m.homeScore || 0)) wins++;
            else if ((m.awayScore || 0) < (m.homeScore || 0)) losses++;
          }
        });
        return { team: team.name, wins, losses, pointsFor };
      }).sort((a, b) => b.wins - a.wins || b.pointsFor - a.pointsFor);
      return { year, stats: teamSeasonStats };
    });

    // Find highest scoring games. Only completed single-week games qualify:
    // early playoff rounds were scored over two combined weeks and would
    // otherwise top every list without being a bigger week.
    const highScoringGames = allMatchups
      .filter(m => m.isComplete && (m.scoringWeeks ?? 1) === 1)
      .map(m => ({
        ...m,
        totalPoints: (m.homeScore || 0) + (m.awayScore || 0),
        homeTeam: findTeam(m.homeTeamId, m.seasonYear)?.name,
        awayTeam: findTeam(m.awayTeamId, m.seasonYear)?.name,
      }))
      .sort((a, b) => b.totalPoints - a.totalPoints)
      .slice(0, 10);

    // Championships are the single most asked-about fact in a league and were
    // absent from this context entirely: season leaders are ranked by
    // regular-season wins, so a champion who had a losing record never
    // appeared. Read the verified podium for every season instead.
    const seasonRows = await db
      .select()
      .from(leagueSeasons)
      .where(eq(leagueSeasons.leagueId, leagueId));
    const podium = seasonRows
      .slice()
      .sort((a, b) => a.seasonYear - b.seasonYear)
      .filter(s => s.championName);

    // Career totals per person, so "who has the most wins/titles" is answerable.
    const titlesByOwner = new Map<string, number[]>();
    for (const s of podium) {
      if (!s.championName) continue;
      const list = titlesByOwner.get(s.championName) || [];
      list.push(s.seasonYear);
      titlesByOwner.set(s.championName, list);
    }

    const careers = new Map<
      string,
      { label: string; wins: number; losses: number; seasons: Set<number> }
    >();
    for (const team of leagueTeams) {
      const key = team.franchiseKey || team.ownerName || team.name;
      if (!key) continue;
      const row = careers.get(key) || {
        label: team.ownerName || team.name,
        wins: 0,
        losses: 0,
        seasons: new Set<number>(),
      };
      row.wins += team.wins || 0;
      row.losses += team.losses || 0;
      if ((team.wins || 0) + (team.losses || 0) > 0)
        row.seasons.add(team.seasonYear);
      if (team.seasonYear >= Math.max(...Array.from(row.seasons), 0))
        row.label = team.ownerName || team.name;
      careers.set(key, row);
    }

    const careerLines = Array.from(careers.values())
      .filter(c => c.seasons.size > 0)
      .sort((a, b) => b.wins - a.wins)
      .map(c => {
        const titles = titlesByOwner.get(c.label) || [];
        return `- ${c.label}: ${c.wins}-${c.losses} regular season over ${c.seasons.size} season${c.seasons.size === 1 ? "" : "s"}, ${titles.length} championship${titles.length === 1 ? "" : "s"}${titles.length ? ` (${titles.join(", ")})` : ""}`;
      });

    // Create prompt for LLM
    const systemPrompt = `You are an expert fantasy football data analyst. Provide detailed, accurate answers with specific numbers, team names, and context.

Answer only from the data below. If something is not here, say so plainly rather than guessing. Note that a champion is decided in the playoffs, so a season's champion is often not the team with the best regular-season record — use the championship table for anything about titles, never the regular-season standings.

League Overview:
- Name: ${league[0].name}
- Current Season: ${league[0].seasonYear}
- Total Teams: ${currentTeams.length}
- Historical Seasons: ${Object.keys(matchupsBySeason).join(', ')}
- Total Games Played: ${allMatchups.length}

CHAMPIONSHIP HISTORY (authoritative — this is who actually won):
${podium.length ? podium.map(s => `- ${s.seasonYear}: champion ${s.championName}${s.runnerUpName ? `, runner-up ${s.runnerUpName}` : ""}${s.thirdPlaceName ? `, third ${s.thirdPlaceName}` : ""}`).join("\n") : "- No championship records available"}

CAREER RECORDS (regular season, by owner, across all seasons):
${careerLines.join("\n")}

Current Season Teams (${league[0].seasonYear}):
${currentTeams.map(t => `- ${t.name} (${t.ownerName}): ${t.wins}-${t.losses}${t.ties ? `-${t.ties}` : ''} record, ${(t.pointsFor || 0).toFixed(1)} PF, ${(t.pointsAgainst || 0).toFixed(1)} PA`).join('\n')}

Historical Season Leaders:
${seasonStats.map(s => `\n${s.year} Season Top 3:\n${s.stats.slice(0, 3).map((t, i) => `  ${i + 1}. ${t.team}: ${t.wins}-${t.losses}, ${t.pointsFor.toFixed(1)} PF`).join('\n')}`).join('\n')}

Top 5 Highest Scoring Games (All-Time):
${highScoringGames.slice(0, 5).map((g, i) => `${i + 1}. Week ${g.week} ${g.seasonYear}: ${g.homeTeam} ${g.homeScore} vs ${g.awayTeam} ${g.awayScore} (${g.totalPoints.toFixed(1)} total)`).join('\n')}

Recent Matchups (Last 15):
${allMatchups.slice(-15).map(m => {
  const homeTeam = findTeam(m.homeTeamId, m.seasonYear);
  const awayTeam = findTeam(m.awayTeamId, m.seasonYear);
  return `Week ${m.week} (${m.seasonYear}): ${homeTeam?.name || 'Unknown'} ${m.homeScore} vs ${awayTeam?.name || 'Unknown'} ${m.awayScore}`;
}).join('\n')}

Instructions:
- Answer with specific numbers, team names, and years
- When asked about a specific season, use that season's data
- Format your response clearly with bullet points or numbered lists when appropriate
- Include context and comparisons to make insights meaningful
- If data is missing or unclear, state that explicitly`;

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
