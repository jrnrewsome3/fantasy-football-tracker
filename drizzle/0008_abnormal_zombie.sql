ALTER TABLE `matchups` MODIFY COLUMN `homeScore` double;--> statement-breakpoint
ALTER TABLE `matchups` MODIFY COLUMN `awayScore` double;--> statement-breakpoint
ALTER TABLE `matchups` MODIFY COLUMN `homeProjected` double;--> statement-breakpoint
ALTER TABLE `matchups` MODIFY COLUMN `awayProjected` double;--> statement-breakpoint
ALTER TABLE `playerStats` MODIFY COLUMN `points` double;--> statement-breakpoint
ALTER TABLE `playerStats` MODIFY COLUMN `projectedPoints` double;--> statement-breakpoint
ALTER TABLE `teamAllTimeStats` MODIFY COLUMN `totalPointsFor` double;--> statement-breakpoint
ALTER TABLE `teamAllTimeStats` MODIFY COLUMN `totalPointsAgainst` double;--> statement-breakpoint
ALTER TABLE `teamAllTimeStats` MODIFY COLUMN `highestWeeklyScore` double;--> statement-breakpoint
ALTER TABLE `teamAllTimeStats` MODIFY COLUMN `lowestWeeklyScore` double DEFAULT 999999;--> statement-breakpoint
ALTER TABLE `teams` MODIFY COLUMN `pointsFor` double;--> statement-breakpoint
ALTER TABLE `teams` MODIFY COLUMN `pointsAgainst` double;--> statement-breakpoint
ALTER TABLE `matchups` ADD `scoringWeeks` int DEFAULT 1 NOT NULL;