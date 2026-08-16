import { and, eq } from "drizzle-orm";
import { leagueSeasons, matchups, teams } from "../drizzle/schema";
import { getDb } from "./db";
import { getLeagueByEspnId, upsertLeagueSeason, upsertTeam } from "./leagueDb";

export interface ManualHistoryTeam {
  rank: number;
  teamName: string;
  wins: number;
  losses: number;
  ties?: number;
  ownerNames?: string[];
  franchiseKey?: string;
}

export interface ManualHistorySeason {
  year: number;
  champion?: string | null;
  runnerUp?: string | null;
  thirdPlace?: string | null;
  teams: ManualHistoryTeam[];
}

export interface ManualHistoryPayload {
  leagueId: string;
  source?: string;
  standingsComplete?: boolean;
  matchupsComplete?: boolean;
  seasons: ManualHistorySeason[];
}

/** Stable negative ID keeps manual history separate from ESPN team IDs. */
export function historicalFranchiseId(value: string): number {
  let hash = 2166136261;
  for (const char of value.trim().toLowerCase()) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return -(Math.abs(hash | 0) || 1);
}

export async function importManualHistory(payload: ManualHistoryPayload) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const league = await getLeagueByEspnId(payload.leagueId);
  if (!league)
    throw new Error("Connect the current league before uploading history.");

  let seasonsImported = 0;
  let teamsImported = 0;
  const warnings: string[] = [];

  for (const season of payload.seasons) {
    if (season.year >= league.seasonYear) {
      warnings.push(
        `${season.year} was skipped because it is not an archived season.`
      );
      continue;
    }

    const existingMatchup = await db
      .select({ id: matchups.id })
      .from(matchups)
      .where(
        and(
          eq(matchups.leagueId, league.id),
          eq(matchups.seasonYear, season.year)
        )
      )
      .limit(1);

    if (existingMatchup.length > 0 && !payload.matchupsComplete) {
      warnings.push(
        `${season.year} already has weekly matchups, so its more complete data was preserved.`
      );
      continue;
    }

    // Manual standings uploads are replaceable so the commissioner can clean
    // up renamed teams and co-manager assignments and upload the file again.
    await db
      .delete(teams)
      .where(
        and(eq(teams.leagueId, league.id), eq(teams.seasonYear, season.year))
      );

    for (const team of season.teams) {
      const franchiseKey =
        team.franchiseKey?.trim() ||
        `team-name:${team.teamName.trim().toLowerCase()}`;
      const ownerName =
        team.ownerNames && team.ownerNames.length > 0
          ? team.ownerNames
              .map(name => name.trim())
              .filter(Boolean)
              .join(" & ")
          : null;

      await upsertTeam({
        leagueId: league.id,
        espnTeamId: historicalFranchiseId(franchiseKey),
        seasonYear: season.year,
        name: team.teamName.trim(),
        abbreviation: `#${team.rank}`,
        ownerName,
        franchiseKey,
        historySource: payload.source || "espn-history-upload",
        wins: team.wins,
        losses: team.losses,
        ties: team.ties || 0,
        pointsFor: 0,
        pointsAgainst: 0,
      });
      teamsImported++;
    }

    const ownershipComplete = season.teams.every(
      team => team.ownerNames && team.ownerNames.some(name => name.trim())
    );
    await upsertLeagueSeason({
      leagueId: league.id,
      seasonYear: season.year,
      championName: season.champion || null,
      runnerUpName: season.runnerUp || null,
      thirdPlaceName: season.thirdPlace || null,
      standingsComplete: payload.standingsComplete === false ? 0 : 1,
      matchupsComplete: payload.matchupsComplete ? 1 : 0,
      ownershipComplete: ownershipComplete ? 1 : 0,
      source: (payload.source || "espn-history-upload").slice(0, 64),
    });
    seasonsImported++;
  }

  return {
    success: seasonsImported > 0,
    seasonsImported,
    teamsImported,
    warnings,
    message: seasonsImported
      ? `Imported ${seasonsImported} archived seasons and ${teamsImported} team records.`
      : "No archived seasons were imported.",
  };
}

export async function getHistoricalOwnershipRows(leagueId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const rows = await db
    .select()
    .from(teams)
    .where(eq(teams.leagueId, leagueId));
  return rows
    .filter(team => Boolean(team.historySource))
    .sort(
      (a, b) =>
        b.seasonYear - a.seasonYear ||
        Number(a.abbreviation?.replace("#", "") || 99) -
          Number(b.abbreviation?.replace("#", "") || 99)
    );
}

export async function updateHistoricalOwnership(
  leagueId: number,
  assignments: Array<{
    teamId: number;
    ownerNames: string[];
    franchiseKey: string;
  }>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const leagueRows = await db
    .select()
    .from(teams)
    .where(eq(teams.leagueId, leagueId));
  const historicalById = new Map(
    leagueRows
      .filter(team => Boolean(team.historySource))
      .map(team => [team.id, team])
  );
  const touchedYears = new Set<number>();
  let completedSeasons = 0;
  let incompleteSeasons = 0;

  for (const assignment of assignments) {
    const team = historicalById.get(assignment.teamId);
    if (!team) throw new Error("A historical team assignment is invalid.");
    const ownerName = assignment.ownerNames
      .map(name => name.trim())
      .filter(Boolean)
      .join(" & ");
    const franchiseKey = assignment.franchiseKey.trim();
    await db
      .update(teams)
      .set({
        ownerName: ownerName || null,
        franchiseKey,
        espnTeamId: historicalFranchiseId(franchiseKey),
        updatedAt: new Date(),
      })
      .where(and(eq(teams.id, team.id), eq(teams.leagueId, leagueId)));
    touchedYears.add(team.seasonYear);
  }

  for (const year of Array.from(touchedYears)) {
    const seasonTeams = await db
      .select()
      .from(teams)
      .where(and(eq(teams.leagueId, leagueId), eq(teams.seasonYear, year)));
    const ownershipComplete = seasonTeams.every(team =>
      Boolean(team.ownerName)
    );
    if (ownershipComplete) completedSeasons += 1;
    else incompleteSeasons += 1;
    await db
      .update(leagueSeasons)
      .set({
        ownershipComplete: ownershipComplete ? 1 : 0,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(leagueSeasons.leagueId, leagueId),
          eq(leagueSeasons.seasonYear, year)
        )
      );
  }

  return {
    success: true,
    assignmentsUpdated: assignments.length,
    completedSeasons,
    incompleteSeasons,
    message: `Saved ${assignments.length} historical ownership assignments.`,
  };
}
