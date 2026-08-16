-- ============================================================================
-- Fantasy Football Tracker — READ-ONLY production data audit
-- Safe to run against production: SELECT statements only. No writes, no DDL.
-- Run with:  mysql --batch < audit_readonly.sql   (or paste sections into a client)
-- Table names are camelCase as defined in drizzle/schema.ts.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- A. WHICH ID SPACE DO MATCHUPS ACTUALLY USE?
-- The sync code writes ESPN team ids into matchups.homeTeamId/awayTeamId
-- (server/espnSync.ts:264-265) while several readers treat them as internal
-- teams.id. This query proves which interpretation fits the stored data.
-- Expect matchesEspnId ~= total*2 and matchesInternalId to be coincidental.
-- ----------------------------------------------------------------------------
SELECT
  m.leagueId,
  COUNT(*)                                            AS totalMatchups,
  SUM(te_h.id IS NOT NULL AND te_a.id IS NOT NULL)    AS bothSidesMatchEspnId,
  SUM(ti_h.id IS NOT NULL AND ti_a.id IS NOT NULL)    AS bothSidesMatchInternalId
FROM matchups m
LEFT JOIN teams te_h ON te_h.leagueId = m.leagueId
  AND te_h.seasonYear = m.seasonYear AND te_h.espnTeamId = m.homeTeamId
LEFT JOIN teams te_a ON te_a.leagueId = m.leagueId
  AND te_a.seasonYear = m.seasonYear AND te_a.espnTeamId = m.awayTeamId
LEFT JOIN teams ti_h ON ti_h.leagueId = m.leagueId AND ti_h.id = m.homeTeamId
LEFT JOIN teams ti_a ON ti_a.leagueId = m.leagueId AND ti_a.id = m.awayTeamId
GROUP BY m.leagueId;

-- Same check for playerStats.teamId (written from ESPN box teamId,
-- server/espnSync.ts:292,320).
SELECT
  ps.leagueId,
  COUNT(*)                          AS totalStats,
  SUM(te.id IS NOT NULL)            AS matchesEspnId,
  SUM(ti.id IS NOT NULL)            AS matchesInternalId,
  SUM(ps.teamId IS NULL)            AS nullTeamId
FROM playerStats ps
LEFT JOIN teams te ON te.leagueId = ps.leagueId
  AND te.seasonYear = ps.seasonYear AND te.espnTeamId = ps.teamId
LEFT JOIN teams ti ON ti.leagueId = ps.leagueId AND ti.id = ps.teamId
GROUP BY ps.leagueId;

-- And transactions.teamId (written from ESPN activity teamId).
SELECT
  tr.leagueId,
  COUNT(*)               AS totalTransactions,
  SUM(te.id IS NOT NULL) AS matchesEspnId,
  SUM(ti.id IS NOT NULL) AS matchesInternalId
FROM transactions tr
LEFT JOIN teams te ON te.leagueId = tr.leagueId
  AND te.seasonYear = tr.seasonYear AND te.espnTeamId = tr.teamId
LEFT JOIN teams ti ON ti.leagueId = tr.leagueId AND ti.id = tr.teamId
GROUP BY tr.leagueId;

-- ----------------------------------------------------------------------------
-- B. SEASONS IMPORTED (per league) with team and matchup coverage
-- ----------------------------------------------------------------------------
SELECT
  l.id AS leagueId, l.espnLeagueId, l.name AS leagueName,
  t.seasonYear,
  COUNT(DISTINCT t.id)  AS teamCount,
  SUM(t.historySource IS NOT NULL) AS manualHistoryTeams,
  ls.championName, ls.standingsComplete, ls.matchupsComplete,
  ls.ownershipComplete, ls.source
FROM leagues l
JOIN teams t ON t.leagueId = l.id
LEFT JOIN leagueSeasons ls
  ON ls.leagueId = l.id AND ls.seasonYear = t.seasonYear
GROUP BY l.id, l.espnLeagueId, l.name, t.seasonYear,
         ls.championName, ls.standingsComplete, ls.matchupsComplete,
         ls.ownershipComplete, ls.source
ORDER BY l.id, t.seasonYear DESC;

-- ----------------------------------------------------------------------------
-- C. MATCHUPS PER SEASON AND WEEK
-- A healthy full-league week has teamCount/2 matchups. Playoff weeks have fewer.
-- ----------------------------------------------------------------------------
SELECT
  m.leagueId, m.seasonYear, m.week,
  COUNT(*)            AS matchupCount,
  SUM(m.isComplete)   AS completeCount,
  SUM(m.isPlayoffs)   AS playoffFlagged,
  SUM(m.homeScore = 0 AND m.awayScore = 0) AS zeroZeroGames
FROM matchups m
GROUP BY m.leagueId, m.seasonYear, m.week
ORDER BY m.leagueId, m.seasonYear, m.week;

-- ----------------------------------------------------------------------------
-- D. DUPLICATE MATCHUPS
-- D1: same unordered team pair appears more than once in the same week
--     (home/away swap slips past the unique index).
-- ----------------------------------------------------------------------------
SELECT
  leagueId, seasonYear, week,
  LEAST(homeTeamId, awayTeamId)    AS teamA,
  GREATEST(homeTeamId, awayTeamId) AS teamB,
  COUNT(*) AS copies
FROM matchups
GROUP BY leagueId, seasonYear, week, teamA, teamB
HAVING COUNT(*) > 1;

-- D2: a team appearing in more than one matchup in the same week
--     (symptom of matchupPeriod vs scoringPeriod conflation in playoffs).
SELECT leagueId, seasonYear, week, teamId, COUNT(*) AS appearances
FROM (
  SELECT leagueId, seasonYear, week, homeTeamId AS teamId FROM matchups
  UNION ALL
  SELECT leagueId, seasonYear, week, awayTeamId FROM matchups
) sides
GROUP BY leagueId, seasonYear, week, teamId
HAVING COUNT(*) > 1;

-- D3: same team pair repeated across consecutive late-season weeks with the
--     playoff flag set — the signature of a two-week playoff round stored as
--     two separate one-week matchups (each with partial scores).
SELECT
  a.leagueId, a.seasonYear, a.week AS week1, b.week AS week2,
  a.homeTeamId, a.awayTeamId,
  a.homeScore AS w1Home, a.awayScore AS w1Away,
  b.homeScore AS w2Home, b.awayScore AS w2Away
FROM matchups a
JOIN matchups b
  ON b.leagueId = a.leagueId AND b.seasonYear = a.seasonYear
  AND b.week = a.week + 1
  AND LEAST(b.homeTeamId, b.awayTeamId)    = LEAST(a.homeTeamId, a.awayTeamId)
  AND GREATEST(b.homeTeamId, b.awayTeamId) = GREATEST(a.homeTeamId, a.awayTeamId)
WHERE a.isPlayoffs = 1 OR b.isPlayoffs = 1;

-- ----------------------------------------------------------------------------
-- E. MATCHUPS REFERENCING TEAM IDS THAT DON'T RESOLVE for that league+season
--    (under the ESPN-id interpretation the writers use).
-- ----------------------------------------------------------------------------
SELECT m.id, m.leagueId, m.seasonYear, m.week, m.homeTeamId, m.awayTeamId
FROM matchups m
LEFT JOIN teams th ON th.leagueId = m.leagueId
  AND th.seasonYear = m.seasonYear AND th.espnTeamId = m.homeTeamId
LEFT JOIN teams ta ON ta.leagueId = m.leagueId
  AND ta.seasonYear = m.seasonYear AND ta.espnTeamId = m.awayTeamId
WHERE th.id IS NULL OR ta.id IS NULL
ORDER BY m.leagueId, m.seasonYear, m.week;

-- teamAllTimeStats rows pointing at teams that no longer exist (internal ids).
SELECT s.*
FROM teamAllTimeStats s
LEFT JOIN teams t ON t.id = s.teamId
WHERE t.id IS NULL;

-- ----------------------------------------------------------------------------
-- F. MEMBERSHIP GAPS (root of "You do not have access to this league")
-- F1: leagues with zero members at all.
-- ----------------------------------------------------------------------------
SELECT l.id, l.espnLeagueId, l.name, l.commissionerUserId, l.lastSyncStatus
FROM leagues l
LEFT JOIN leagueMembers lm ON lm.leagueId = l.id
WHERE lm.id IS NULL;

-- F2: leagues whose commissionerUserId has NO matching commissioner membership
--     row — the stale state that permanently locks the commissioner out.
SELECT l.id, l.espnLeagueId, l.name, l.commissionerUserId,
       u.email AS commissionerEmail
FROM leagues l
LEFT JOIN leagueMembers lm
  ON lm.leagueId = l.id AND lm.userId = l.commissionerUserId
LEFT JOIN users u ON u.id = l.commissionerUserId
WHERE l.commissionerUserId IS NOT NULL AND lm.id IS NULL;

-- F3: membership rows pointing at missing users or leagues.
SELECT lm.*
FROM leagueMembers lm
LEFT JOIN users u   ON u.id = lm.userId
LEFT JOIN leagues l ON l.id = lm.leagueId
WHERE u.id IS NULL OR l.id IS NULL;

-- ----------------------------------------------------------------------------
-- G. OWNER-IDENTITY DRIFT ACROSS SEASONS
-- G1: same franchise slot (espnTeamId) with different ownerName strings by
--     season — these split into separate rows on the owner leaderboard.
-- ----------------------------------------------------------------------------
SELECT
  t.leagueId, t.espnTeamId,
  COUNT(DISTINCT t.seasonYear)                     AS seasons,
  COUNT(DISTINCT t.ownerName)                      AS distinctOwnerNames,
  GROUP_CONCAT(DISTINCT t.ownerName SEPARATOR ' | ') AS ownerNames
FROM teams t
WHERE t.ownerName IS NOT NULL
GROUP BY t.leagueId, t.espnTeamId
HAVING COUNT(DISTINCT t.ownerName) > 1;

-- G2: ownerName values that are ESPN member GUIDs rather than display names
--     (the espn-fantasy-football-api Team.owners array holds GUID strings).
SELECT leagueId, seasonYear, espnTeamId, name, ownerName
FROM teams
WHERE ownerName LIKE '{%}'
ORDER BY leagueId, seasonYear;

-- G3: team rows with no owner identity at all.
SELECT leagueId, seasonYear, COUNT(*) AS teamsMissingOwner
FROM teams
WHERE ownerName IS NULL OR ownerName = ''
GROUP BY leagueId, seasonYear;

-- G4: franchiseKey coverage (manual-history vs ESPN-sync identity spaces).
SELECT leagueId, seasonYear,
       SUM(franchiseKey IS NOT NULL) AS withFranchiseKey,
       SUM(espnTeamId < 0)           AS syntheticManualIds,
       COUNT(*)                      AS teamRows
FROM teams
GROUP BY leagueId, seasonYear
ORDER BY leagueId, seasonYear;

-- ----------------------------------------------------------------------------
-- H. SEASON COMPLETENESS
-- H1: regular-season weeks that have fewer matchups than teamCount/2.
-- ----------------------------------------------------------------------------
SELECT
  wk.leagueId, wk.seasonYear, wk.week, wk.matchupCount,
  tc.teamCount, FLOOR(tc.teamCount / 2) AS expectedMatchups
FROM (
  SELECT leagueId, seasonYear, week, COUNT(*) AS matchupCount
  FROM matchups WHERE isPlayoffs = 0
  GROUP BY leagueId, seasonYear, week
) wk
JOIN (
  SELECT leagueId, seasonYear, COUNT(*) AS teamCount
  FROM teams GROUP BY leagueId, seasonYear
) tc ON tc.leagueId = wk.leagueId AND tc.seasonYear = wk.seasonYear
WHERE wk.matchupCount < FLOOR(tc.teamCount / 2)
ORDER BY wk.leagueId, wk.seasonYear, wk.week;

-- H2: seasons that have teams but zero matchups (standings-only imports).
SELECT t.leagueId, t.seasonYear, COUNT(DISTINCT t.id) AS teams
FROM teams t
LEFT JOIN matchups m
  ON m.leagueId = t.leagueId AND m.seasonYear = t.seasonYear
WHERE m.id IS NULL
GROUP BY t.leagueId, t.seasonYear;

-- H3: seasons with matchups but no playoff-flagged games, or no champion.
SELECT
  m.leagueId, m.seasonYear,
  MAX(m.week)         AS lastWeek,
  SUM(m.isPlayoffs)   AS playoffGames,
  ls.championName
FROM matchups m
LEFT JOIN leagueSeasons ls
  ON ls.leagueId = m.leagueId AND ls.seasonYear = m.seasonYear
GROUP BY m.leagueId, m.seasonYear, ls.championName
HAVING SUM(m.isPlayoffs) = 0 OR ls.championName IS NULL
ORDER BY m.leagueId, m.seasonYear;

-- H4: stored team records vs records recomputed from completed regular-season
--     matchups (ESPN-id join). Rows returned = win/loss totals that disagree.
SELECT
  t.leagueId, t.seasonYear, t.espnTeamId, t.name,
  t.wins  AS storedWins,  calc.wins  AS matchupWins,
  t.losses AS storedLosses, calc.losses AS matchupLosses
FROM teams t
JOIN (
  SELECT leagueId, seasonYear, teamId,
         SUM(won)  AS wins,
         SUM(lost) AS losses
  FROM (
    SELECT leagueId, seasonYear, homeTeamId AS teamId,
           (homeScore > awayScore) AS won, (homeScore < awayScore) AS lost
    FROM matchups WHERE isComplete = 1 AND isPlayoffs = 0
    UNION ALL
    SELECT leagueId, seasonYear, awayTeamId,
           (awayScore > homeScore), (awayScore < homeScore)
    FROM matchups WHERE isComplete = 1 AND isPlayoffs = 0
  ) sides
  GROUP BY leagueId, seasonYear, teamId
) calc ON calc.leagueId = t.leagueId
      AND calc.seasonYear = t.seasonYear
      AND calc.teamId = t.espnTeamId
WHERE t.wins <> calc.wins OR t.losses <> calc.losses
ORDER BY t.leagueId, t.seasonYear, t.espnTeamId;

-- ----------------------------------------------------------------------------
-- I. TRANSACTION DUPLICATES
-- insertTransaction has no natural key, and every fullLeagueSync (every ~30
-- minutes via autoSync) re-inserts the latest ESPN activity feed.
-- ----------------------------------------------------------------------------
SELECT
  leagueId, seasonYear, transactionType, teamId, playerId,
  playerName, transactionDate,
  COUNT(*) AS copies
FROM transactions
GROUP BY leagueId, seasonYear, transactionType, teamId, playerId,
         playerName, transactionDate
HAVING COUNT(*) > 1
ORDER BY copies DESC
LIMIT 100;

-- Total duplicate inflation per league.
SELECT leagueId,
       COUNT(*) AS totalRows,
       COUNT(DISTINCT CONCAT_WS('|', seasonYear, transactionType, teamId,
                                playerId, playerName, transactionDate))
         AS distinctEvents
FROM transactions
GROUP BY leagueId;

-- ----------------------------------------------------------------------------
-- J. SCORE-PRECISION SPOT CHECK
-- All scores are Math.round()ed into int columns; exact ties in stored data
-- are often artifacts of rounding. Real fantasy ties are rare.
-- ----------------------------------------------------------------------------
SELECT leagueId, seasonYear, COUNT(*) AS storedTies
FROM matchups
WHERE isComplete = 1 AND homeScore = awayScore
  AND (homeScore > 0 OR awayScore > 0)
GROUP BY leagueId, seasonYear;
