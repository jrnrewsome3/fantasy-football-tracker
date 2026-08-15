CREATE TABLE `leagueSeasons` (
	`id` int AUTO_INCREMENT NOT NULL,
	`leagueId` int NOT NULL,
	`seasonYear` int NOT NULL,
	`championName` text,
	`runnerUpName` text,
	`thirdPlaceName` text,
	`standingsComplete` int NOT NULL DEFAULT 0,
	`matchupsComplete` int NOT NULL DEFAULT 0,
	`ownershipComplete` int NOT NULL DEFAULT 0,
	`source` varchar(64) NOT NULL DEFAULT 'espn-public',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `leagueSeasons_id` PRIMARY KEY(`id`),
	CONSTRAINT `leagueSeasons_league_year_unique` UNIQUE(`leagueId`,`seasonYear`)
);
