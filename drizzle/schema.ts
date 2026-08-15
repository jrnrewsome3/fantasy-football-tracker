import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** External auth subject (Clerk user id). Unique per user. */
  openId: varchar("openId", { length: 128 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * League configuration and ESPN credentials
 */
export const leagues = mysqlTable("leagues", {
  id: int("id").autoincrement().primaryKey(),
  espnLeagueId: varchar("espnLeagueId", { length: 64 }).notNull().unique(),
  name: text("name").notNull(),
  seasonYear: int("seasonYear").notNull(),
  espnS2: text("espnS2"),
  swid: varchar("swid", { length: 128 }),
  commissionerUserId: int("commissionerUserId"),
  inviteCode: varchar("inviteCode", { length: 32 }).unique(),
  autoSync: int("autoSync").default(1).notNull(),
  syncIntervalMinutes: int("syncIntervalMinutes").default(30).notNull(),
  lastSyncStatus: varchar("lastSyncStatus", { length: 20 })
    .default("pending")
    .notNull(),
  lastSyncError: text("lastSyncError"),
  currentWeek: int("currentWeek").default(1),
  totalWeeks: int("totalWeeks").default(17),
  lastSyncedAt: timestamp("lastSyncedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type League = typeof leagues.$inferSelect;
export type InsertLeague = typeof leagues.$inferInsert;

/** Commissioner/member access to a connected league. */
export const leagueMembers = mysqlTable(
  "leagueMembers",
  {
    id: int("id").autoincrement().primaryKey(),
    leagueId: int("leagueId").notNull(),
    userId: int("userId").notNull(),
    role: mysqlEnum("role", ["commissioner", "member"])
      .default("member")
      .notNull(),
    espnTeamId: int("espnTeamId"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => ({
    leagueUserUnique: uniqueIndex("leagueMembers_league_user_unique").on(
      table.leagueId,
      table.userId
    ),
  })
);

export type LeagueMember = typeof leagueMembers.$inferSelect;
export type InsertLeagueMember = typeof leagueMembers.$inferInsert;

/**
 * Teams in the fantasy league
 */
export const teams = mysqlTable(
  "teams",
  {
    id: int("id").autoincrement().primaryKey(),
    leagueId: int("leagueId").notNull(),
    espnTeamId: int("espnTeamId").notNull(),
    seasonYear: int("seasonYear").notNull(), // Season year for this team instance
    name: text("name").notNull(),
    abbreviation: varchar("abbreviation", { length: 10 }),
    logoUrl: text("logoUrl"),
    ownerName: text("ownerName"),
    franchiseKey: varchar("franchiseKey", { length: 120 }),
    historySource: varchar("historySource", { length: 64 }),
    userId: int("userId"), // Link to users table if owner has account
    wins: int("wins").default(0),
    losses: int("losses").default(0),
    ties: int("ties").default(0),
    pointsFor: int("pointsFor").default(0),
    pointsAgainst: int("pointsAgainst").default(0),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => ({
    leagueTeamSeasonUnique: uniqueIndex("teams_league_team_season_unique").on(
      table.leagueId,
      table.espnTeamId,
      table.seasonYear
    ),
  })
);

export type Team = typeof teams.$inferSelect;
export type InsertTeam = typeof teams.$inferInsert;

/** Coverage and podium metadata for imported or synchronized seasons. */
export const leagueSeasons = mysqlTable(
  "leagueSeasons",
  {
    id: int("id").autoincrement().primaryKey(),
    leagueId: int("leagueId").notNull(),
    seasonYear: int("seasonYear").notNull(),
    championName: text("championName"),
    runnerUpName: text("runnerUpName"),
    thirdPlaceName: text("thirdPlaceName"),
    standingsComplete: int("standingsComplete").default(0).notNull(),
    matchupsComplete: int("matchupsComplete").default(0).notNull(),
    ownershipComplete: int("ownershipComplete").default(0).notNull(),
    source: varchar("source", { length: 64 }).default("espn-public").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => ({
    leagueSeasonUnique: uniqueIndex("leagueSeasons_league_year_unique").on(
      table.leagueId,
      table.seasonYear
    ),
  })
);

export type LeagueSeason = typeof leagueSeasons.$inferSelect;
export type InsertLeagueSeason = typeof leagueSeasons.$inferInsert;

/**
 * Players in the fantasy league
 */
export const players = mysqlTable("players", {
  id: int("id").autoincrement().primaryKey(),
  espnPlayerId: int("espnPlayerId").notNull().unique(),
  name: text("name").notNull(),
  position: varchar("position", { length: 10 }),
  nflTeam: varchar("nflTeam", { length: 10 }),
  status: varchar("status", { length: 20 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Player = typeof players.$inferSelect;
export type InsertPlayer = typeof players.$inferInsert;

/** Latest league-specific free-agent and waiver-wire snapshot. */
export const leagueAvailablePlayers = mysqlTable(
  "leagueAvailablePlayers",
  {
    id: int("id").autoincrement().primaryKey(),
    leagueId: int("leagueId").notNull(),
    playerId: int("playerId").notNull(),
    seasonYear: int("seasonYear").notNull(),
    scoringPeriod: int("scoringPeriod").notNull(),
    availabilityStatus: varchar("availabilityStatus", { length: 20 })
      .default("FREEAGENT")
      .notNull(),
    percentOwned: int("percentOwned").default(0),
    percentStarted: int("percentStarted").default(0),
    ownershipTrend: int("ownershipTrend").default(0),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => ({
    leaguePlayerSeasonUnique: uniqueIndex(
      "availablePlayers_league_player_season_unique"
    ).on(table.leagueId, table.playerId, table.seasonYear),
  })
);

export type LeagueAvailablePlayer = typeof leagueAvailablePlayers.$inferSelect;
export type InsertLeagueAvailablePlayer =
  typeof leagueAvailablePlayers.$inferInsert;

/**
 * Weekly matchups between teams
 */
export const matchups = mysqlTable(
  "matchups",
  {
    id: int("id").autoincrement().primaryKey(),
    leagueId: int("leagueId").notNull(),
    week: int("week").notNull(),
    seasonYear: int("seasonYear").notNull(),
    homeTeamId: int("homeTeamId").notNull(),
    awayTeamId: int("awayTeamId").notNull(),
    homeScore: int("homeScore").default(0),
    awayScore: int("awayScore").default(0),
    homeProjected: int("homeProjected").default(0),
    awayProjected: int("awayProjected").default(0),
    isComplete: int("isComplete").default(0), // 0 = false, 1 = true
    isPlayoffs: int("isPlayoffs").default(0),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => ({
    leagueWeekSeasonTeamsUnique: uniqueIndex(
      "matchups_league_week_season_teams_unique"
    ).on(
      table.leagueId,
      table.week,
      table.seasonYear,
      table.homeTeamId,
      table.awayTeamId
    ),
  })
);

export type Matchup = typeof matchups.$inferSelect;
export type InsertMatchup = typeof matchups.$inferInsert;

/**
 * Player statistics by week
 */
export const playerStats = mysqlTable(
  "playerStats",
  {
    id: int("id").autoincrement().primaryKey(),
    playerId: int("playerId").notNull(),
    leagueId: int("leagueId").notNull(),
    teamId: int("teamId"), // Team that owned the player this week
    week: int("week").notNull(),
    seasonYear: int("seasonYear").notNull(),
    points: int("points").default(0),
    projectedPoints: int("projectedPoints").default(0),
    wasStarted: int("wasStarted").default(0), // 0 = benched, 1 = started
    slotPosition: varchar("slotPosition", { length: 20 }), // QB, RB, WR, etc.
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => ({
    leaguePlayerWeekSeasonUnique: uniqueIndex(
      "playerStats_league_player_week_season_unique"
    ).on(table.leagueId, table.playerId, table.week, table.seasonYear),
  })
);

export type PlayerStat = typeof playerStats.$inferSelect;
export type InsertPlayerStat = typeof playerStats.$inferInsert;

/**
 * League transactions (trades, waivers, adds/drops)
 */
export const transactions = mysqlTable("transactions", {
  id: int("id").autoincrement().primaryKey(),
  leagueId: int("leagueId").notNull(),
  transactionType: varchar("transactionType", { length: 20 }).notNull(), // TRADE, WAIVER, FA_ADD, DROP
  teamId: int("teamId").notNull(),
  playerId: int("playerId"),
  playerName: text("playerName"),
  details: text("details"), // JSON string with additional details
  week: int("week"),
  seasonYear: int("seasonYear").notNull(),
  transactionDate: timestamp("transactionDate").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = typeof transactions.$inferInsert;

/**
 * All-time team statistics across seasons
 */
export const teamAllTimeStats = mysqlTable("teamAllTimeStats", {
  id: int("id").autoincrement().primaryKey(),
  teamId: int("teamId").notNull().unique(),
  totalWins: int("totalWins").default(0),
  totalLosses: int("totalLosses").default(0),
  totalTies: int("totalTies").default(0),
  championships: int("championships").default(0),
  playoffAppearances: int("playoffAppearances").default(0),
  totalPointsFor: int("totalPointsFor").default(0),
  totalPointsAgainst: int("totalPointsAgainst").default(0),
  highestWeeklyScore: int("highestWeeklyScore").default(0),
  lowestWeeklyScore: int("lowestWeeklyScore").default(999999),
  longestWinStreak: int("longestWinStreak").default(0),
  longestLoseStreak: int("longestLoseStreak").default(0),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type TeamAllTimeStat = typeof teamAllTimeStats.$inferSelect;
export type InsertTeamAllTimeStat = typeof teamAllTimeStats.$inferInsert;
