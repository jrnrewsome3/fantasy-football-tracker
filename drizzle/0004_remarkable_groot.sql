CREATE TABLE `leagueAvailablePlayers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`leagueId` int NOT NULL,
	`playerId` int NOT NULL,
	`seasonYear` int NOT NULL,
	`scoringPeriod` int NOT NULL,
	`availabilityStatus` varchar(20) NOT NULL DEFAULT 'FREEAGENT',
	`percentOwned` int DEFAULT 0,
	`percentStarted` int DEFAULT 0,
	`ownershipTrend` int DEFAULT 0,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `leagueAvailablePlayers_id` PRIMARY KEY(`id`),
	CONSTRAINT `availablePlayers_league_player_season_unique` UNIQUE(`leagueId`,`playerId`,`seasonYear`)
);
--> statement-breakpoint
CREATE TABLE `leagueMembers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`leagueId` int NOT NULL,
	`userId` int NOT NULL,
	`role` enum('commissioner','member') NOT NULL DEFAULT 'member',
	`espnTeamId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `leagueMembers_id` PRIMARY KEY(`id`),
	CONSTRAINT `leagueMembers_league_user_unique` UNIQUE(`leagueId`,`userId`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `openId` varchar(128) NOT NULL;--> statement-breakpoint
ALTER TABLE `leagues` ADD `commissionerUserId` int;--> statement-breakpoint
ALTER TABLE `leagues` ADD `inviteCode` varchar(32);--> statement-breakpoint
ALTER TABLE `leagues` ADD `autoSync` int DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `leagues` ADD `syncIntervalMinutes` int DEFAULT 30 NOT NULL;--> statement-breakpoint
ALTER TABLE `leagues` ADD `lastSyncStatus` varchar(20) DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE `leagues` ADD `lastSyncError` text;--> statement-breakpoint
ALTER TABLE `leagues` ADD CONSTRAINT `leagues_inviteCode_unique` UNIQUE(`inviteCode`);