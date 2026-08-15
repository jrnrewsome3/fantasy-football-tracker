DELETE older FROM `matchups` older
INNER JOIN `matchups` newer
  ON older.`leagueId` = newer.`leagueId`
  AND older.`week` = newer.`week`
  AND older.`seasonYear` = newer.`seasonYear`
  AND older.`homeTeamId` = newer.`homeTeamId`
  AND older.`awayTeamId` = newer.`awayTeamId`
  AND older.`id` < newer.`id`;--> statement-breakpoint
DELETE older FROM `playerStats` older
INNER JOIN `playerStats` newer
  ON older.`leagueId` = newer.`leagueId`
  AND older.`playerId` = newer.`playerId`
  AND older.`week` = newer.`week`
  AND older.`seasonYear` = newer.`seasonYear`
  AND older.`id` < newer.`id`;--> statement-breakpoint
DELETE older FROM `teams` older
INNER JOIN `teams` newer
  ON older.`leagueId` = newer.`leagueId`
  AND older.`espnTeamId` = newer.`espnTeamId`
  AND older.`seasonYear` = newer.`seasonYear`
  AND older.`id` < newer.`id`;--> statement-breakpoint
ALTER TABLE `matchups` ADD CONSTRAINT `matchups_league_week_season_teams_unique` UNIQUE(`leagueId`,`week`,`seasonYear`,`homeTeamId`,`awayTeamId`);--> statement-breakpoint
ALTER TABLE `playerStats` ADD CONSTRAINT `playerStats_league_player_week_season_unique` UNIQUE(`leagueId`,`playerId`,`week`,`seasonYear`);--> statement-breakpoint
ALTER TABLE `teams` ADD CONSTRAINT `teams_league_team_season_unique` UNIQUE(`leagueId`,`espnTeamId`,`seasonYear`);
