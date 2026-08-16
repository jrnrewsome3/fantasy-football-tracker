-- ============================================================================
-- Phase 1 production data repair
--
-- Fixes the two kinds of bad data the Phase 1 code fixes can't repair on
-- their own:
--   1. Missing commissioner membership rows (the access-lockout state)
--   2. Duplicate transactions piled up by the old auto-sync
--   3. Matchups from finished weeks left marked "not complete"
--
-- HOW TO RUN (on the VPS, from the host):
--
--   Step 1 — BACK UP FIRST. Do not skip this.
--     docker exec <mysql-container> mysqldump --single-transaction \
--       -u<user> -p<password> <database> > backup_before_repair_$(date +%F).sql
--
--   Step 2 — run this script:
--     docker exec -i <mysql-container> mysql -u<user> -p<password> <database> \
--       < phase1_data_repair.sql
--
-- Everything runs in one transaction: if any statement fails, nothing is
-- changed. The only DELETE removes exact duplicate copies of transaction
-- rows, always keeping the original (lowest id).
-- ============================================================================

START TRANSACTION;

-- ----------------------------------------------------------------------------
-- 1. Recreate missing commissioner memberships.
-- A league whose commissionerUserId is set but has no matching leagueMembers
-- row locks its commissioner out. Insert the missing row. (The app now also
-- self-heals this on access, but repairing it here fixes every league at once.)
-- ----------------------------------------------------------------------------
INSERT INTO leagueMembers (leagueId, userId, role)
SELECT l.id, l.commissionerUserId, 'commissioner'
FROM leagues l
WHERE l.commissionerUserId IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM leagueMembers lm
    WHERE lm.leagueId = l.id AND lm.userId = l.commissionerUserId
  );

-- ----------------------------------------------------------------------------
-- 2. Remove duplicate transactions, keeping the earliest copy of each event.
-- The old sync re-inserted the ESPN activity feed on every 30-minute refresh.
-- Two rows are duplicates when every identifying field matches.
-- ----------------------------------------------------------------------------
DELETE t1 FROM transactions t1
JOIN transactions t2
  ON t2.leagueId = t1.leagueId
  AND t2.seasonYear = t1.seasonYear
  AND t2.transactionType = t1.transactionType
  AND t2.teamId = t1.teamId
  AND t2.transactionDate = t1.transactionDate
  AND (t2.playerId = t1.playerId OR (t2.playerId IS NULL AND t1.playerId IS NULL))
  AND (t2.playerName = t1.playerName OR (t2.playerName IS NULL AND t1.playerName IS NULL))
  AND t2.id < t1.id;

-- ----------------------------------------------------------------------------
-- 3. Mark matchups from finished weeks as complete.
-- The old sync flagged completion from "any score > 0", which missed some
-- finished games and counted in-progress ones. Any matchup from an archived
-- season, or from a week before the league's current week, is final.
-- ----------------------------------------------------------------------------
UPDATE matchups m
JOIN leagues l ON l.id = m.leagueId
SET m.isComplete = 1
WHERE m.isComplete = 0
  AND (m.seasonYear < l.seasonYear
       OR (m.seasonYear = l.seasonYear AND m.week < COALESCE(l.currentWeek, 1)));

COMMIT;

-- Quick after-check (read-only): each should return an empty result.
SELECT l.id AS leagueStillLockedOut
FROM leagues l
LEFT JOIN leagueMembers lm
  ON lm.leagueId = l.id AND lm.userId = l.commissionerUserId
WHERE l.commissionerUserId IS NOT NULL AND lm.id IS NULL;

SELECT leagueId, seasonYear, transactionType, teamId, playerId, transactionDate,
       COUNT(*) AS stillDuplicated
FROM transactions
GROUP BY leagueId, seasonYear, transactionType, teamId, playerId,
         playerName, transactionDate
HAVING COUNT(*) > 1;
