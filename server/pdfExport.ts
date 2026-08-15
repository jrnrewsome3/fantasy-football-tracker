/**
 * PDF export service for league stats and standings
 */

import { getTeamsByLeague, getAllMatchupsByLeague } from "./leagueDb";
import { getDb } from "./db";
import { leagues } from "../drizzle/schema";
import { eq } from "drizzle-orm";

export interface PDFExportResult {
  success: boolean;
  markdown?: string;
  error?: string;
}

/**
 * Generate league stats report in Markdown format for download.
 */
export async function generateLeagueStatsMarkdown(
  leagueId: number
): Promise<PDFExportResult> {
  try {
    const db = await getDb();
    if (!db) {
      return {
        success: false,
        error: "Database not available",
      };
    }

    // Fetch league data
    const leagueData = await db.select().from(leagues).where(eq(leagues.id, leagueId)).limit(1);
    if (!leagueData || leagueData.length === 0) {
      return {
        success: false,
        error: "League not found",
      };
    }

    const league = leagueData[0];
    const teams = await getTeamsByLeague(leagueId);
    const allMatchups = await getAllMatchupsByLeague(leagueId);

    // Sort teams by record
    const sortedTeams = teams.sort((a, b) => {
      const aWinPct = (a.wins || 0) / ((a.wins || 0) + (a.losses || 0) + (a.ties || 0)) || 0;
      const bWinPct = (b.wins || 0) / ((b.wins || 0) + (b.losses || 0) + (b.ties || 0)) || 0;
      if (aWinPct !== bWinPct) return bWinPct - aWinPct;
      return (b.pointsFor || 0) - (a.pointsFor || 0);
    });

    // Group matchups by season
    const matchupsBySeason = allMatchups.reduce((acc, m) => {
      if (!acc[m.seasonYear]) acc[m.seasonYear] = [];
      acc[m.seasonYear].push(m);
      return acc;
    }, {} as Record<number, typeof allMatchups>);

    // Calculate season stats
    const seasonStats = Object.entries(matchupsBySeason).map(([year, matches]) => {
      const teamSeasonStats = teams.map(team => {
        const teamMatches = matches.filter(m => m.homeTeamId === team.id || m.awayTeamId === team.id);
        let wins = 0, losses = 0, pointsFor = 0;
        teamMatches.forEach(m => {
          if (m.homeTeamId === team.id) {
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
    }).sort((a, b) => parseInt(b.year) - parseInt(a.year));

    // Find highlights
    const highestScoringGame = allMatchups.length > 0
      ? allMatchups.reduce((max, m) => {
          const total = (m.homeScore || 0) + (m.awayScore || 0);
          const maxTotal = (max.homeScore || 0) + (max.awayScore || 0);
          return total > maxTotal ? m : max;
        })
      : null;

    // Build Markdown report
    let markdown = `# ${league.name}\n## League Stats Report\n\n`;
    markdown += `**Season:** ${league.seasonYear}  \n`;
    markdown += `**Week:** ${league.currentWeek} of ${league.totalWeeks}  \n`;
    markdown += `**Total Teams:** ${teams.length}  \n`;
    markdown += `**Generated:** ${new Date().toLocaleDateString()}  \n\n`;

    markdown += `---\n\n## Current Standings\n\n`;
    markdown += `| Rank | Team | Owner | Record | Win % | PF | PA | Diff |\n`;
    markdown += `|------|------|-------|--------|-------|----|----|------|\n`;
    sortedTeams.forEach((team, index) => {
      const winPct = ((team.wins || 0) / ((team.wins || 0) + (team.losses || 0) + (team.ties || 0)) * 100) || 0;
      const diff = (team.pointsFor || 0) - (team.pointsAgainst || 0);
      markdown += `| ${index + 1} | ${team.name} | ${team.ownerName} | ${team.wins}-${team.losses}${team.ties ? `-${team.ties}` : ''} | ${winPct.toFixed(1)}% | ${(team.pointsFor || 0).toFixed(1)} | ${(team.pointsAgainst || 0).toFixed(1)} | ${diff > 0 ? '+' : ''}${diff.toFixed(1)} |\n`;
    });

    markdown += `\n---\n\n## Historical Season Leaders\n\n`;
    seasonStats.forEach(season => {
      markdown += `### ${season.year} Season\n\n`;
      markdown += `| Rank | Team | Record | Points For |\n`;
      markdown += `|------|------|--------|------------|\n`;
      season.stats.slice(0, 5).forEach((team, index) => {
        markdown += `| ${index + 1} | ${team.team} | ${team.wins}-${team.losses} | ${team.pointsFor.toFixed(1)} |\n`;
      });
      markdown += `\n`;
    });

    if (highestScoringGame) {
      markdown += `---\n\n## League Highlights\n\n`;
      const homeTeam = teams.find(t => t.id === highestScoringGame.homeTeamId);
      const awayTeam = teams.find(t => t.id === highestScoringGame.awayTeamId);
      const totalPoints = (highestScoringGame.homeScore || 0) + (highestScoringGame.awayScore || 0);
      markdown += `**Highest Scoring Game:**  \n`;
      markdown += `Week ${highestScoringGame.week}, ${highestScoringGame.seasonYear}  \n`;
      markdown += `${homeTeam?.name || 'Unknown'} ${highestScoringGame.homeScore} vs ${awayTeam?.name || 'Unknown'} ${highestScoringGame.awayScore}  \n`;
      markdown += `Total: ${totalPoints.toFixed(1)} points\n\n`;
    }

    markdown += `---\n\n*Report generated by Trouble in Paradise Fantasy Football Tracker*\n`;

    return {
      success: true,
      markdown,
    };
  } catch (error: any) {
    console.error('[PDFExport] Error generating markdown:', error);
    return {
      success: false,
      error: error.message || 'Failed to generate report',
    };
  }
}
