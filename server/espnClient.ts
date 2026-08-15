/**
 * ESPN Fantasy Football API Client
 * Wrapper around espn-fantasy-football-api library for Node.js
 */

// @ts-ignore - ESPN library doesn't have TypeScript definitions
import pkg from "espn-fantasy-football-api/node-dev.js";
const { Client } = pkg;

export interface ESPNCredentials {
  leagueId: number;
  seasonId: number;
  espnS2?: string;
  SWID?: string;
}

export interface ESPNTeam {
  id: number;
  name: string;
  abbreviation?: string;
  logoURL?: string;
  owners?: string[];
  wins: number;
  losses: number;
  ties: number;
  pointsFor: number;
  pointsAgainst: number;
}

export interface ESPNPlayer {
  id: number;
  firstName: string;
  lastName: string;
  fullName: string;
  position: string;
  proTeam?: string;
  injuryStatus?: string;
  availabilityStatus?: string;
  percentOwned?: number;
  percentStarted?: number;
  percentChange?: number;
}

export interface ESPNBoxScore {
  homeTeamId: number;
  awayTeamId: number;
  homeScore: number;
  awayScore: number;
  homeProjectedScore: number;
  awayProjectedScore: number;
  homeRoster: ESPNBoxPlayer[];
  awayRoster: ESPNBoxPlayer[];
}

export interface ESPNBoxPlayer {
  player: ESPNPlayer;
  position: string;
  totalPoints: number;
  projectedPoints: number;
}

export interface ESPNActivity {
  type: string;
  date: Date;
  teamId: number;
  playerId?: number;
  playerName?: string;
  details: any;
}

/**
 * Create and configure ESPN API client
 */
export function createESPNClient(credentials: ESPNCredentials): any {
  const config: any = {
    leagueId: credentials.leagueId,
  };

  // Add authentication for private leagues
  if (credentials.espnS2 && credentials.SWID) {
    config.espnS2 = credentials.espnS2;
    config.SWID = credentials.SWID;
  }

  return new Client(config);
}

/**
 * Fetch league information
 */
export async function fetchLeagueInfo(client: any, seasonId: number) {
  try {
    const leagueInfo = await client.getLeagueInfo({ seasonId });
    return leagueInfo;
  } catch (error) {
    console.error("[ESPN Client] Error fetching league info:", error);
    throw new Error(
      "ESPN could not read this league. Confirm the League ID and ask the League Manager to enable public viewability in ESPN."
    );
  }
}

/**
 * Fetch teams for a season
 */
export async function fetchTeams(
  client: any,
  seasonId: number
): Promise<ESPNTeam[]> {
  try {
    const teams = await client.getTeamsAtWeek({ seasonId, scoringPeriodId: 1 });
    return teams.map((team: any) => ({
      id: team.id,
      name: team.name,
      abbreviation: team.abbreviation,
      logoURL: team.logoURL,
      owners: team.owners || (team.ownerName ? [team.ownerName] : []),
      wins: team.wins || 0,
      losses: team.losses || 0,
      ties: team.ties || 0,
      pointsFor: Math.round(
        team.pointsFor ??
          team.regularSeasonPointsFor ??
          team.totalPointsScored ??
          0
      ),
      pointsAgainst: Math.round(
        team.pointsAgainst ??
          team.regularSeasonPointsAgainst ??
          team.totalPointsAgainst ??
          0
      ),
    }));
  } catch (error) {
    console.error("[ESPN Client] Error fetching teams:", error);
    throw new Error("Failed to fetch teams from ESPN");
  }
}

/**
 * Fetch boxscores for a specific week
 */
export async function fetchBoxScores(
  client: any,
  seasonId: number,
  matchupPeriodId: number,
  scoringPeriodId: number
): Promise<ESPNBoxScore[]> {
  try {
    const boxscores = await client.getBoxscoreForWeek({
      seasonId,
      matchupPeriodId,
      scoringPeriodId,
    });

    return boxscores.map((box: any) => ({
      homeTeamId: box.homeTeamId,
      awayTeamId: box.awayTeamId,
      homeScore: Math.round(box.homeScore || 0),
      awayScore: Math.round(box.awayScore || 0),
      homeProjectedScore: Math.round(box.homeProjectedScore || 0),
      awayProjectedScore: Math.round(box.awayProjectedScore || 0),
      homeRoster:
        box.homeRoster?.map((p: any) => ({
          player: {
            id: p.player?.id,
            firstName: p.player?.firstName,
            lastName: p.player?.lastName,
            fullName: p.player?.fullName,
            position: p.player?.position,
            proTeam: p.player?.proTeam,
            injuryStatus: p.player?.injuryStatus,
          },
          position: p.position,
          totalPoints: Math.round(p.totalPoints || 0),
          projectedPoints: Math.round(p.projectedPoints || 0),
        })) || [],
      awayRoster:
        box.awayRoster?.map((p: any) => ({
          player: {
            id: p.player?.id,
            firstName: p.player?.firstName,
            lastName: p.player?.lastName,
            fullName: p.player?.fullName,
            position: p.player?.position,
            proTeam: p.player?.proTeam,
            injuryStatus: p.player?.injuryStatus,
          },
          position: p.position,
          totalPoints: Math.round(p.totalPoints || 0),
          projectedPoints: Math.round(p.projectedPoints || 0),
        })) || [],
    }));
  } catch (error) {
    console.error("[ESPN Client] Error fetching boxscores:", error);
    throw new Error("Failed to fetch boxscores from ESPN");
  }
}

/**
 * Fetch free agents (available players)
 */
export async function fetchFreeAgents(
  client: any,
  seasonId: number,
  scoringPeriodId: number,
  position?: string
): Promise<ESPNPlayer[]> {
  try {
    const freeAgents = await client.getFreeAgents({
      seasonId,
      scoringPeriodId,
    });

    let players = freeAgents.map((player: any) => ({
      id: player.id,
      firstName: player.firstName,
      lastName: player.lastName,
      fullName: player.fullName,
      position: player.defaultPosition || player.position,
      proTeam: player.proTeamAbbreviation || player.proTeam,
      injuryStatus: player.injuryStatus,
      availabilityStatus: player.availabilityStatus,
      percentOwned: player.percentOwned,
      percentStarted: player.percentStarted,
      percentChange: player.percentChange,
    }));

    // Filter by position if specified
    if (position) {
      players = players.filter((p: ESPNPlayer) => p.position === position);
    }

    return players;
  } catch (error) {
    console.error("[ESPN Client] Error fetching free agents:", error);
    throw new Error("Failed to fetch free agents from ESPN");
  }
}

/**
 * Fetch recent league activity
 */
export async function fetchRecentActivity(
  client: any,
  seasonId: number
): Promise<ESPNActivity[]> {
  try {
    const activity = await client.getRecentActivity({
      seasonId,
      size: 50,
    });

    return activity.map((act: any) => ({
      type: act.type,
      date: new Date(act.date),
      teamId: act.teamId,
      playerId: act.playerId,
      playerName: act.playerName,
      details: act,
    }));
  } catch (error) {
    console.error("[ESPN Client] Error fetching activity:", error);
    // Don't throw - activity might not be available for all leagues
    return [];
  }
}
