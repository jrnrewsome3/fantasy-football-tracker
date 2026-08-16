/**
 * One manager's week in a single payload: their matchup, their starters, the
 * kickoff and weather for each of those players' games, and anything that
 * needs attention before lineups lock.
 *
 * Everything here already exists on separate screens. The point is to answer
 * "what do I need to do before kickoff" without visiting four of them.
 */

import { getLeagueMembership } from "./leagueAccess";
import {
  getLeagueById,
  getMatchupsByWeek,
  getRosterForTeamWeek,
  getTeamsByLeagueAndSeason,
} from "./leagueDb";
import { getMatchupSeries, type SeriesContext } from "./rivalry";
import { getNFLWeekOutlook, type GameOutlook } from "./weather";

export interface MyWeekPlayer {
  name: string;
  position: string | null;
  slotPosition: string | null;
  nflTeam: string | null;
  status: string | null;
  started: boolean;
  game: {
    matchup: string;
    kickoff: string;
    indoor: boolean;
    forecast: string;
    temperature: number | null;
    wind: string | null;
    precipitationChance: number | null;
  } | null;
}

export interface MyWeekAlert {
  level: "warning" | "info";
  message: string;
}

export interface MyWeek {
  week: number;
  seasonYear: number;
  hasTeam: boolean;
  hasRoster: boolean;
  teamName: string | null;
  opponentName: string | null;
  myScore: number | null;
  opponentScore: number | null;
  myProjected: number | null;
  opponentProjected: number | null;
  isComplete: boolean;
  series: SeriesContext | null;
  starters: MyWeekPlayer[];
  bench: MyWeekPlayer[];
  alerts: MyWeekAlert[];
}

/** Injury tags that should stop a manager before lineups lock. */
const CONCERNING = ["OUT", "INJURY_RESERVE", "DOUBTFUL", "SUSPENSION"];

function attachGame(
  nflTeam: string | null,
  games: GameOutlook[]
): MyWeekPlayer["game"] {
  if (!nflTeam) return null;
  const game = games.find(
    g => g.homeTeam === nflTeam || g.awayTeam === nflTeam
  );
  if (!game) return null;
  return {
    matchup: game.matchup,
    kickoff: game.kickoff,
    indoor: game.indoor,
    forecast: game.forecast,
    temperature: game.temperature,
    wind: game.wind,
    precipitationChance: game.precipitationChance,
  };
}

/** Sustained wind worth a second look at a kicker or a deep passing game. */
function windSpeed(wind: string | null): number {
  if (!wind) return 0;
  const numbers = wind.match(/\d+/g);
  if (!numbers) return 0;
  return Math.max(...numbers.map(Number));
}

export async function getMyWeek(
  leagueId: number,
  userId: number
): Promise<MyWeek> {
  const league = await getLeagueById(leagueId);
  if (!league) throw new Error("League not found");

  const week = Math.max(1, league.currentWeek || 1);
  const seasonYear = league.seasonYear;

  const membership = await getLeagueMembership(leagueId, userId);
  const base: MyWeek = {
    week,
    seasonYear,
    hasTeam: Boolean(membership?.espnTeamId),
    hasRoster: false,
    teamName: null,
    opponentName: null,
    myScore: null,
    opponentScore: null,
    myProjected: null,
    opponentProjected: null,
    isComplete: false,
    series: null,
    starters: [],
    bench: [],
    alerts: [],
  };

  if (!membership?.espnTeamId) return base;
  const myTeamId = membership.espnTeamId;

  const seasonTeams = await getTeamsByLeagueAndSeason(leagueId, seasonYear);
  const nameOf = (espnTeamId: number) =>
    seasonTeams.find(t => t.espnTeamId === espnTeamId)?.name ?? null;
  base.teamName = nameOf(myTeamId);

  // This week's matchup, from my side.
  const weekMatchups = await getMatchupsByWeek(leagueId, week, seasonYear);
  const mine = weekMatchups.find(
    m => m.homeTeamId === myTeamId || m.awayTeamId === myTeamId
  );

  if (mine) {
    const iAmHome = mine.homeTeamId === myTeamId;
    base.opponentName = nameOf(iAmHome ? mine.awayTeamId : mine.homeTeamId);
    base.myScore = (iAmHome ? mine.homeScore : mine.awayScore) ?? null;
    base.opponentScore = (iAmHome ? mine.awayScore : mine.homeScore) ?? null;
    base.myProjected = (iAmHome ? mine.homeProjected : mine.awayProjected) ?? null;
    base.opponentProjected =
      (iAmHome ? mine.awayProjected : mine.homeProjected) ?? null;
    base.isComplete = mine.isComplete === 1;

    const series = await getMatchupSeries(leagueId, [
      {
        seasonYear,
        homeTeamId: mine.homeTeamId,
        awayTeamId: mine.awayTeamId,
      },
    ]);
    const context =
      series.get(`${seasonYear}:${mine.homeTeamId}:${mine.awayTeamId}`) ?? null;

    // Report the series from this manager's point of view.
    base.series =
      context && !iAmHome
        ? {
            ...context,
            homeWins: context.awayWins,
            awayWins: context.homeWins,
            leader:
              context.leader === "home"
                ? "away"
                : context.leader === "away"
                  ? "home"
                  : "even",
            lastMeeting: context.lastMeeting
              ? {
                  ...context.lastMeeting,
                  homeScore: context.lastMeeting.awayScore,
                  awayScore: context.lastMeeting.homeScore,
                  homeWon: !context.lastMeeting.homeWon,
                }
              : null,
            streak: context.streak
              ? {
                  ...context.streak,
                  key: context.streak.key === "home" ? "away" : "home",
                }
              : null,
          }
        : context;
  }

  // Roster plus the NFL game each player is in.
  const roster = await getRosterForTeamWeek(
    leagueId,
    seasonYear,
    week,
    myTeamId
  );
  base.hasRoster = roster.length > 0;
  if (!roster.length) return base;

  let games: GameOutlook[] = [];
  try {
    games = await getNFLWeekOutlook(seasonYear, week);
  } catch {
    games = []; // Weather is a bonus here, never a reason to fail the page.
  }

  const enrich = (p: (typeof roster)[number]): MyWeekPlayer => ({
    name: p.name,
    position: p.position,
    slotPosition: p.slotPosition,
    nflTeam: p.nflTeam,
    status: p.status,
    started: p.wasStarted,
    game: attachGame(p.nflTeam, games),
  });

  base.starters = roster.filter(p => p.wasStarted).map(enrich);
  base.bench = roster.filter(p => !p.wasStarted).map(enrich);

  // Anything worth acting on before lineups lock.
  for (const player of base.starters) {
    if (player.status && CONCERNING.includes(player.status)) {
      base.alerts.push({
        level: "warning",
        message: `${player.name} is listed ${player.status.replace(/_/g, " ").toLowerCase()} and is in your starting lineup.`,
      });
    } else if (player.status === "QUESTIONABLE") {
      base.alerts.push({
        level: "info",
        message: `${player.name} is questionable — worth checking before kickoff.`,
      });
    }

    if (!player.game && player.nflTeam) {
      base.alerts.push({
        level: "warning",
        message: `${player.name} has no game this week. ${player.nflTeam} is on bye.`,
      });
    }

    const wind = windSpeed(player.game?.wind ?? null);
    if (
      player.game &&
      !player.game.indoor &&
      wind >= 15 &&
      (player.position === "K" || player.position === "QB")
    ) {
      base.alerts.push({
        level: "info",
        message: `${player.name} plays in ${player.game.wind} wind (${player.game.matchup}).`,
      });
    }
  }

  return base;
}
