CREATE TABLE `tradePlayers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tradeId` int NOT NULL,
	`playerId` int,
	`espnPlayerId` int,
	`playerName` text NOT NULL,
	`playerPosition` varchar(10),
	`fromTeamId` int NOT NULL,
	`fromEspnTeamId` int NOT NULL,
	`toTeamId` int NOT NULL,
	`toEspnTeamId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `tradePlayers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `trades` (
	`id` int AUTO_INCREMENT NOT NULL,
	`leagueId` int NOT NULL,
	`espnLeagueId` varchar(64) NOT NULL,
	`seasonYear` int NOT NULL,
	`week` int,
	`tradeDate` timestamp NOT NULL,
	`team1Id` int NOT NULL,
	`team1EspnId` int NOT NULL,
	`team1Name` text,
	`team2Id` int NOT NULL,
	`team2EspnId` int NOT NULL,
	`team2Name` text,
	`rawData` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `trades_id` PRIMARY KEY(`id`)
);
