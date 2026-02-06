CREATE TABLE `leagues` (
	`id` int AUTO_INCREMENT NOT NULL,
	`espnLeagueId` varchar(64) NOT NULL,
	`name` text NOT NULL,
	`seasonYear` int NOT NULL,
	`espnS2` text,
	`swid` varchar(128),
	`currentWeek` int DEFAULT 1,
	`totalWeeks` int DEFAULT 17,
	`lastSyncedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `leagues_id` PRIMARY KEY(`id`),
	CONSTRAINT `leagues_espnLeagueId_unique` UNIQUE(`espnLeagueId`)
);
--> statement-breakpoint
CREATE TABLE `matchups` (
	`id` int AUTO_INCREMENT NOT NULL,
	`leagueId` int NOT NULL,
	`week` int NOT NULL,
	`seasonYear` int NOT NULL,
	`homeTeamId` int NOT NULL,
	`awayTeamId` int NOT NULL,
	`homeScore` int DEFAULT 0,
	`awayScore` int DEFAULT 0,
	`homeProjected` int DEFAULT 0,
	`awayProjected` int DEFAULT 0,
	`isComplete` int DEFAULT 0,
	`isPlayoffs` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `matchups_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `playerStats` (
	`id` int AUTO_INCREMENT NOT NULL,
	`playerId` int NOT NULL,
	`leagueId` int NOT NULL,
	`teamId` int,
	`week` int NOT NULL,
	`seasonYear` int NOT NULL,
	`points` int DEFAULT 0,
	`projectedPoints` int DEFAULT 0,
	`wasStarted` int DEFAULT 0,
	`slotPosition` varchar(20),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `playerStats_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `players` (
	`id` int AUTO_INCREMENT NOT NULL,
	`espnPlayerId` int NOT NULL,
	`name` text NOT NULL,
	`position` varchar(10),
	`nflTeam` varchar(10),
	`status` varchar(20),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `players_id` PRIMARY KEY(`id`),
	CONSTRAINT `players_espnPlayerId_unique` UNIQUE(`espnPlayerId`)
);
--> statement-breakpoint
CREATE TABLE `teamAllTimeStats` (
	`id` int AUTO_INCREMENT NOT NULL,
	`teamId` int NOT NULL,
	`totalWins` int DEFAULT 0,
	`totalLosses` int DEFAULT 0,
	`totalTies` int DEFAULT 0,
	`championships` int DEFAULT 0,
	`playoffAppearances` int DEFAULT 0,
	`totalPointsFor` int DEFAULT 0,
	`totalPointsAgainst` int DEFAULT 0,
	`highestWeeklyScore` int DEFAULT 0,
	`lowestWeeklyScore` int DEFAULT 999999,
	`longestWinStreak` int DEFAULT 0,
	`longestLoseStreak` int DEFAULT 0,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `teamAllTimeStats_id` PRIMARY KEY(`id`),
	CONSTRAINT `teamAllTimeStats_teamId_unique` UNIQUE(`teamId`)
);
--> statement-breakpoint
CREATE TABLE `teams` (
	`id` int AUTO_INCREMENT NOT NULL,
	`leagueId` int NOT NULL,
	`espnTeamId` int NOT NULL,
	`name` text NOT NULL,
	`abbreviation` varchar(10),
	`logoUrl` text,
	`ownerName` text,
	`userId` int,
	`wins` int DEFAULT 0,
	`losses` int DEFAULT 0,
	`ties` int DEFAULT 0,
	`pointsFor` int DEFAULT 0,
	`pointsAgainst` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `teams_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `transactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`leagueId` int NOT NULL,
	`transactionType` varchar(20) NOT NULL,
	`teamId` int NOT NULL,
	`playerId` int,
	`playerName` text,
	`details` text,
	`week` int,
	`seasonYear` int NOT NULL,
	`transactionDate` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `transactions_id` PRIMARY KEY(`id`)
);
