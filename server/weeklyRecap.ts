import { invokeLLM } from "./_core/llm";
import { getDb } from "./db";
import { matchups, teams } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";

export interface WeeklyRecap {
  week: number;
  seasonYear: number;
  summary: string;
  topPerformers: Array<{
    teamName: string;
    score: number;
    highlight: string;
  }>;
  biggestUpsets: Array<{
    winner: string;
    loser: string;
    winnerScore: number;
    loserScore: number;
    description: string;
  }>;
  closestGames: Array<{
    team1: string;
    team2: string;
    score1: number;
    score2: number;
    margin: number;
  }>;
  blowouts: Array<{
    winner: string;
    loser: string;
    winnerScore: number;
    loserScore: number;
    margin: number;
  }>;
  storylines: string[];
}

export async function generateWeeklyRecap(
  leagueId: number,
  week: number,
  seasonYear: number
): Promise<WeeklyRecap> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  // Fetch all matchups for this week
  const weekMatchups = await db
    .select()
    .from(matchups)
    .where(
      and(
        eq(matchups.leagueId, leagueId),
        eq(matchups.week, week),
        eq(matchups.seasonYear, seasonYear)
      )
    );

  if (weekMatchups.length === 0) {
    throw new Error(`No matchups found for week ${week} of ${seasonYear} season`);
  }

  // Fetch all teams for this league
  const allTeams = await db
    .select()
    .from(teams)
    .where(eq(teams.leagueId, leagueId));

  const teamMap = new Map(allTeams.map(t => [t.id, t]));

  // Analyze matchups
  const matchupData = weekMatchups.map(m => {
    const homeTeam = teamMap.get(m.homeTeamId);
    const awayTeam = teamMap.get(m.awayTeamId);
    return {
      homeTeam: homeTeam?.name || "Unknown",
      awayTeam: awayTeam?.name || "Unknown",
      homeScore: m.homeScore || 0,
      awayScore: m.awayScore || 0,
      homeRecord: `${homeTeam?.wins || 0}-${homeTeam?.losses || 0}`,
      awayRecord: `${awayTeam?.wins || 0}-${awayTeam?.losses || 0}`,
    };
  });

  // Find top performers
  const allScores = matchupData.flatMap(m => [
    { team: m.homeTeam, score: m.homeScore },
    { team: m.awayTeam, score: m.awayScore },
  ]);
  const topPerformers = allScores
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  // Find upsets (teams with worse records winning)
  const upsets = matchupData.filter(m => {
    const homeWins = parseInt(m.homeRecord.split('-')[0]);
    const awayWins = parseInt(m.awayRecord.split('-')[0]);
    const homeWon = m.homeScore > m.awayScore;
    const awayWon = m.awayScore > m.homeScore;
    
    // Upset if team with fewer wins won
    return (homeWon && homeWins < awayWins) || (awayWon && awayWins < homeWins);
  });

  // Find closest games
  const closestGames = matchupData
    .map(m => ({
      team1: m.homeTeam,
      team2: m.awayTeam,
      score1: m.homeScore,
      score2: m.awayScore,
      margin: Math.abs(m.homeScore - m.awayScore),
    }))
    .sort((a, b) => a.margin - b.margin)
    .slice(0, 3);

  // Find blowouts
  const blowouts = matchupData
    .map(m => {
      const margin = Math.abs(m.homeScore - m.awayScore);
      const homeWon = m.homeScore > m.awayScore;
      return {
        winner: homeWon ? m.homeTeam : m.awayTeam,
        loser: homeWon ? m.awayTeam : m.homeTeam,
        winnerScore: homeWon ? m.homeScore : m.awayScore,
        loserScore: homeWon ? m.awayScore : m.homeScore,
        margin,
      };
    })
    .sort((a, b) => b.margin - a.margin)
    .slice(0, 2);

  // Generate AI summary
  const prompt = `You are a fantasy football analyst writing an engaging weekly recap. Analyze the following Week ${week} results and create a compelling narrative.

MATCHUP RESULTS:
${matchupData.map(m => `${m.homeTeam} (${m.homeRecord}) ${m.homeScore} vs ${m.awayTeam} (${m.awayRecord}) ${m.awayScore}`).join('\n')}

TOP PERFORMERS:
${topPerformers.map((p, i) => `${i + 1}. ${p.team}: ${p.score.toFixed(1)} points`).join('\n')}

UPSETS:
${upsets.length > 0 ? upsets.map(u => {
  const homeWon = u.homeScore > u.awayScore;
  return `${homeWon ? u.homeTeam : u.awayTeam} (${homeWon ? u.homeRecord : u.awayRecord}) defeated ${homeWon ? u.awayTeam : u.homeTeam} (${homeWon ? u.awayRecord : u.homeRecord}) ${homeWon ? u.homeScore : u.awayScore} - ${homeWon ? u.awayScore : u.homeScore}`;
}).join('\n') : 'No major upsets this week'}

CLOSEST GAMES:
${closestGames.map(g => `${g.team1} ${g.score1.toFixed(1)} vs ${g.team2} ${g.score2.toFixed(1)} (${g.margin.toFixed(1)} point margin)`).join('\n')}

Generate a response in the following JSON format:
{
  "summary": "A 2-3 sentence exciting overview of the week",
  "topPerformerHighlights": ["Brief highlight for top performer 1", "Brief highlight for top performer 2", "Brief highlight for top performer 3"],
  "upsetDescriptions": ["Description of upset 1", "Description of upset 2"],
  "storylines": ["Interesting storyline 1", "Interesting storyline 2", "Interesting storyline 3"]
}

Make it entertaining, use sports commentary style, and highlight the drama and competition.`;

  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: "You are an enthusiastic fantasy football analyst who writes engaging weekly recaps. Always respond with valid JSON." },
        { role: "user", content: prompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "weekly_recap",
          strict: true,
          schema: {
            type: "object",
            properties: {
              summary: { type: "string" },
              topPerformerHighlights: {
                type: "array",
                items: { type: "string" },
              },
              upsetDescriptions: {
                type: "array",
                items: { type: "string" },
              },
              storylines: {
                type: "array",
                items: { type: "string" },
              },
            },
            required: ["summary", "topPerformerHighlights", "upsetDescriptions", "storylines"],
            additionalProperties: false,
          },
        },
      },
    });

    const content = response.choices[0]?.message?.content;
    const aiContent = JSON.parse(typeof content === 'string' ? content : "{}");

    return {
      week,
      seasonYear,
      summary: aiContent.summary || "Week recap generated",
      topPerformers: topPerformers.map((p, i) => ({
        teamName: p.team,
        score: p.score,
        highlight: aiContent.topPerformerHighlights?.[i] || `Scored ${p.score.toFixed(1)} points`,
      })),
      biggestUpsets: upsets.slice(0, 2).map((u, i) => {
        const homeWon = u.homeScore > u.awayScore;
        return {
          winner: homeWon ? u.homeTeam : u.awayTeam,
          loser: homeWon ? u.awayTeam : u.homeTeam,
          winnerScore: homeWon ? u.homeScore : u.awayScore,
          loserScore: homeWon ? u.awayScore : u.homeScore,
          description: aiContent.upsetDescriptions?.[i] || "Unexpected victory",
        };
      }),
      closestGames,
      blowouts,
      storylines: aiContent.storylines || [],
    };
  } catch (error) {
    console.error("[Weekly Recap] AI generation error:", error);
    
    // Fallback to basic recap without AI
    return {
      week,
      seasonYear,
      summary: `Week ${week} featured ${matchupData.length} matchups with exciting finishes and standout performances.`,
      topPerformers: topPerformers.map(p => ({
        teamName: p.team,
        score: p.score,
        highlight: `Scored ${p.score.toFixed(1)} points this week`,
      })),
      biggestUpsets: upsets.slice(0, 2).map(u => {
        const homeWon = u.homeScore > u.awayScore;
        return {
          winner: homeWon ? u.homeTeam : u.awayTeam,
          loser: homeWon ? u.awayTeam : u.homeTeam,
          winnerScore: homeWon ? u.homeScore : u.awayScore,
          loserScore: homeWon ? u.awayScore : u.homeScore,
          description: "Pulled off an unexpected victory",
        };
      }),
      closestGames,
      blowouts,
      storylines: [
        `${topPerformers[0]?.team} led all teams with ${topPerformers[0]?.score.toFixed(1)} points`,
        closestGames.length > 0 ? `${closestGames[0].team1} narrowly defeated ${closestGames[0].team2} by ${closestGames[0].margin.toFixed(1)} points` : "",
        blowouts.length > 0 ? `${blowouts[0].winner} dominated ${blowouts[0].loser} with a ${blowouts[0].margin.toFixed(1)} point victory` : "",
      ].filter(Boolean),
    };
  }
}
