# Fantasy Football Tracker — Architecture & Data Audit

**Repo:** `jrnrewsome3/fantasy-football-tracker` · **Audited:** 2026-08-15 · **Scope:** read-only code inspection; no code, schema, or data was modified.

**Companion file:** [`scripts/sql/audit_readonly.sql`](scripts/sql/audit_readonly.sql) — a SELECT-only script to run against the production MySQL database. Every finding below that depends on production data has a matching lettered section (A–J) in that script.

---

## Executive summary

The pilot goals (one commissioner connects, current-season standings/rosters/matchups/players, regular sync, invite-based member access) are close to working today. Two defects block them: a **non-transactional, non-self-healing commissioner claim** that produces the "You do not have access to this league" lockout, and **unbounded transaction duplication** on every auto-sync.

The historical analytics are built on data that is **structurally lossy and internally inconsistent** — ESPN team ids stored where half the code expects internal ids, scores rounded to integers, playoff rounds split into duplicate partial matchups, championships never actually computed from ESPN, and owners identified by a mutable (and sometimes GUID-valued) display string. This data cannot be repaired in place because the information needed to repair it (fractional scores, matchup-period structure, bracket results, owner GUID↔name mapping) was discarded at import time.

**Recommendation: hide history behind a feature flag now, launch the current-season pilot, then do a controlled re-extraction and reimport of history through a staging pipeline.** Rationale at the end.

---

## 1. Root cause: "You do not have access to this league"

The exact string comes from `requireLeagueAccess` ([server/leagueAccess.ts:25](server/leagueAccess.ts)) and fires whenever no `leagueMembers` row exists for `(leagueId, userId)`. Three code paths create leagues (or league-claim state) without a guaranteed matching membership row:

1. **`claimLeagueForCommissioner` is not transactional** ([server/leagueAccess.ts:37-75](server/leagueAccess.ts)). It first `UPDATE`s `leagues.commissionerUserId`, then separately `INSERT`s the `leagueMembers` row. If the process dies or the insert errors between the two statements, the league is permanently claimed by a user who has no membership. On the next connect attempt, `league.sync` ([server/routers.ts:50-77](server/routers.ts)) sees `commissionerUserId` set and calls `requireCommissioner` → `requireLeagueAccess` → **the exact error, thrown at the very user who owns the league**, with no repair path. Every other user gets "This league is already connected."

2. **League row is created before it is claimed.** `syncLeagueData` upserts the `leagues` row *first* ([server/espnSync.ts:63-74](server/espnSync.ts)), and the router only claims commissionership *after* the full sync succeeds ([server/routers.ts:72-75](server/routers.ts)). `fullLeagueSync` makes one ESPN round trip per week plus rosters, so the window is long. If any week's fetch throws after the league upsert, you get a **stale league record with no members** — exactly the state described in the problem statement. Retrying `league.sync` happens to pass (commissionerUserId is still null), but every other endpoint (`teams`, `matchups`, `teamHistory`, …) throws the access error in the meantime, and a *different* user retrying the connect wins the claim race.

3. **`deleteLeague` deletes children before the parent with no transaction** ([server/leagueDb.ts:176-217](server/leagueDb.ts)). `leagueMembers` are deleted second-to-last; if the final `DELETE FROM leagues` fails, the league survives with its `commissionerUserId` intact and zero members — the same permanent lockout as (1).

**Detection:** SQL audit sections **F1** (leagues with zero members) and **F2** (commissionerUserId set but no commissioner membership row).

**Fix design (Phase 1):**
- Wrap claim (league update + membership upsert) in a single DB transaction.
- Claim/repair **before** the slow ESPN sync, not after: if `existing` is null, create league shell + commissioner membership atomically, then sync; if `existing.commissionerUserId === ctx.user.id`, upsert the missing membership row (self-heal) instead of calling `requireCommissioner`.
- Add the same self-heal inside `requireCommissioner`: when `leagues.commissionerUserId === userId` but membership is missing, recreate the membership row rather than throwing.
- One-time data repair (INSERT-only, no deletes): insert missing commissioner membership rows for every league flagged by audit F2.

---

## 2. Root cause: wrong historical wins, championships, matchups

Seven independent defects compound. Ordered by impact:

### 2.1 Team-ID space collision (matchups silently mapped to wrong teams)

The sync writes **ESPN team ids** (small integers, 1–12ish) into `matchups.homeTeamId/awayTeamId` and `playerStats.teamId` ([server/espnSync.ts:264-265, 292, 320](server/espnSync.ts)), and ESPN activity team ids into `transactions.teamId` ([server/espnSync.ts:382](server/espnSync.ts)). But consumers are split between two interpretations:

| Consumer | Joins matchup team ids against | Result |
|---|---|---|
| [client/src/pages/WeeklyMatchups.tsx:58-69](client/src/pages/WeeklyMatchups.tsx) | `teams.espnTeamId` | ✅ correct |
| [client/src/pages/AllTimeStats.tsx:44,54](client/src/pages/AllTimeStats.tsx) | `teams.espnTeamId` | ✅ correct |
| [server/weeklyRecap.ts:71-76](server/weeklyRecap.ts) | `teams.id` (internal) | ❌ wrong |
| [server/aiQuery.ts:73-124](server/aiQuery.ts) | `teams.id` | ❌ wrong |
| [server/pdfExport.ts:62-119](server/pdfExport.ts) | `teams.id` | ❌ wrong |
| [server/userStatsDb.ts:119-128](server/userStatsDb.ts) | `teams.id` | ❌ wrong |
| [client/src/pages/HistoricalHighlights.tsx:116-124](client/src/pages/HistoricalHighlights.tsx) | `team.id` | ❌ wrong |
| [client/src/pages/TeamComparison.tsx:84-96](client/src/pages/TeamComparison.tsx) | internal team ids | ❌ wrong |

Because both id spaces are small integers, the wrong joins frequently *succeed* and return a **different team** rather than failing — which is precisely how you get plausible-looking but wrong historical matchups, head-to-head records, and highlights. Note the schema's own comment ("Team that owned the player this week") and `teamAllTimeStats.teamId` (which genuinely holds internal `teams.id`, per `deleteLeague`) show the intended convention was internal ids. **Assessment for audit item 4: `homeTeamId`, `awayTeamId`, and `playerStats.teamId` contain ESPN team ids, not internal ids; `teamAllTimeStats.teamId` contains internal ids; the codebase is inconsistent about which one it expects.** SQL audit section **A** proves this empirically against production.

A second-order bug: even the "correct" espnTeamId joins are only valid **per season** — client pages that fetch one season's team list and match it against all-season matchup lists conflate franchises across years.

### 2.2 Playoff rounds split into duplicate partial matchups

`fetchBoxScores(client, seasonYear, week, week)` passes the same number as both `matchupPeriodId` and `scoringPeriodId` ([server/espnSync.ts:254](server/espnSync.ts), [server/espnClient.ts:144-155](server/espnClient.ts)). In ESPN leagues, playoff matchup periods routinely span **two scoring periods**. Iterating scoring weeks 1..17 therefore stores each two-week playoff series twice — once per week, each with partial scores — as two separate rows (`matchups` unique key includes `week`, so they don't collapse). This corrupts playoff win totals, "championship game" identification, and highlights. Audit sections **D2/D3** detect this signature.

### 2.3 Hardcoded playoff boundary and completion heuristic

- `isPlayoffs: week > 14 ? 1 : 0` ([server/espnSync.ts:271](server/espnSync.ts)) — wrong for any league whose regular season isn't exactly 14 matchup periods, and for most older seasons. ESPN publishes the real value (`settings.scheduleSettings.matchupPeriodCount` / the library's league-info response); it is never read.
- `isComplete: homeScore > 0 || awayScore > 0` ([server/espnSync.ts:270](server/espnSync.ts)) — marks in-progress games complete (breaking win recomputation mid-week) and completed 0-0 forfeits incomplete. ESPN's matchup `winner`/status field is the authority and is never read.

### 2.4 Championships are never computed from ESPN at all

`leagueSeasons.championName` is populated **only** by the manual history upload ([server/manualHistoryImport.ts:120-130](server/manualHistoryImport.ts)). The ESPN multi-season importer writes `standingsComplete: 1, ownershipComplete: 1` **unconditionally** ([server/espnMultiSeasonSync.ts:36-45](server/espnMultiSeasonSync.ts)) and never sets a champion — so ESPN-imported seasons show as "complete" with missing/wrong championships. Anything in the UI that shows a champion for those seasons is inferring it from corrupted matchup data (see 2.1–2.3).

### 2.5 Scores are rounded to integers

`Math.round` on every team and player score ([server/espnClient.ts:160-163, 176-177, 191-192](server/espnClient.ts)) into `int` columns ([drizzle/schema.ts](drizzle/schema.ts) — `homeScore`, `pointsFor`, `playerStats.points`). Fantasy games are decided by fractions of a point; rounding **flips winners** in any derived computation, fabricates ties (audit section **J**), and permanently destroys precision. This alone makes the stored history unrepairable in place.

### 2.6 Owner identity is a mutable display string — sometimes a GUID

- `ownerName: espnTeam.owners?.[0]` ([server/espnSync.ts:95, 150](server/espnSync.ts)) takes the **first** owner only (co-owned teams lose an owner), and in the `espn-fantasy-football-api` library `Team.owners` holds ESPN **member GUID strings** (e.g. `{1234ABCD-…}`), not display names — verify with audit **G2**.
- `getOwnerLeaderboard` groups purely by `ownerName` text ([server/leagueDb.ts:888-931](server/leagueDb.ts)). Manual history writes human names joined with `" & "` ([server/manualHistoryImport.ts:92-97](server/manualHistoryImport.ts)). GUIDs, renamed display names, and manual names are **three disjoint identity spaces**, so the same human appears as multiple leaderboard rows and career totals fragment across seasons.
- `franchiseKey` was added to bridge this but is only set by manual import/commissioner edits; ESPN-synced rows fall back to `espn:{teamId}` ([server/leagueDb.ts:365](server/leagueDb.ts)), which breaks when ESPN reuses a team slot for a replacement owner.

### 2.7 Multi-season importer trusts unvalidated inputs

([server/espnMultiSeasonSync.ts](server/espnMultiSeasonSync.ts), [server/espnSync.ts:123-171](server/espnSync.ts))
- Final week is taken from `leagueInfo.currentScoringPeriodId` of an **archived** season (ESPN returns 0/1/final depending on era), with a blind fallback of 17.
- The `espn-fantasy-football-api` library requires **different endpoints for pre-2018 seasons** (`getHistoricalTeamsAtWeek` / `getHistoricalScoreboardForWeek`); the wrapper only ever calls the modern ones ([server/espnClient.ts:112, 151](server/espnClient.ts)), so older seasons fail or come back malformed and are silently skipped.
- Every season that returns *anything* is imported and stamped complete; there is no expected-week reconciliation (audit **H1–H3**).
- It *is* re-run idempotent for teams and matchups (both upsert on natural keys) — but **not** for transactions.

### 2.8 Transactions duplicate on every sync

`insertTransaction` is a plain INSERT with no unique key ([server/leagueDb.ts:643-654](server/leagueDb.ts), [drizzle/schema.ts:267-279](drizzle/schema.ts)), and `fullLeagueSync` → `syncLeagueActivity` re-ingests the latest 50 ESPN activities **on every auto-sync tick** (every `syncIntervalMinutes`, default 30, scheduler in [server/autoSync.ts](server/autoSync.ts)). Production likely holds thousands of duplicates (audit **I**), inflating any transaction-derived stat and table size.

---

## 3. Read-only SQL audit

Delivered as [`scripts/sql/audit_readonly.sql`](scripts/sql/audit_readonly.sql). SELECT-only, safe on production. Coverage map:

| Requested report | Script section |
|---|---|
| Seasons imported | B |
| Teams per season | B, G4 |
| Matchups per season/week | C |
| Duplicate or missing matchups | D1–D3, H1 |
| Teams referencing invalid IDs | E, A (id-space proof) |
| Memberships missing for existing leagues | F1–F3 |
| Owners whose identity changes across seasons | G1–G3 |
| Seasons with incomplete regular-season/playoff data | H1–H4 |
| Bonus: transaction duplication, rounding-induced ties | I, J |

Run it before any remediation and archive the output — it is the "before" baseline for reconciliation in Phase 4.

## 4. ID-semantics assessment

Answered in §2.1: `matchups.homeTeamId`, `matchups.awayTeamId`, `playerStats.teamId`, `transactions.teamId`, and `leagueMembers.espnTeamId` hold **ESPN team ids**; `teamAllTimeStats.teamId` and manual-history editing (`updateHistoricalOwnership`) use **internal `teams.id`**; readers are split roughly half and half. The durable fix is to standardize on **internal ids as foreign keys everywhere** (they are season-scoped and league-scoped, ESPN ids are neither) and keep `espnTeamId` purely as an external reference on `teams`. That is a Phase 3 change executed through the staging reimport — not an in-place UPDATE of production.

## 5. Owner-identity model (proposed)

Never aggregate by display name. Introduce a three-level identity:

```
owners            (id PK, leagueId, espnOwnerGuid VARCHAR(64) NULL UNIQUE-per-league,
                   displayName, createdAt, updatedAt)
teamOwners        (teamId FK -> teams.id, ownerId FK -> owners.id, isPrimary)  -- per-season, supports co-owners
-- teams keeps franchiseKey as the commissioner-curated franchise grouping,
-- but franchiseKey resolution order becomes: explicit key > owner GUID > espn slot id
```

- **ESPN member GUID** (available from the league's `members[]` payload and `team.owners[]`) is the stable machine identity for 2018+ seasons; store it, and map GUID → display name from the same payload at import time.
- **Commissioner mapping UI** (the existing `HistoryOwnership` screen, kept) resolves pre-GUID and manually-imported seasons by assigning `ownerId`/`franchiseKey`.
- Leaderboards and career stats aggregate by `ownerId` (fallback: franchiseKey), never by `ownerName`; `ownerName` becomes display-only.
- Multiple owners per team are preserved via `teamOwners` instead of `owners?.[0]`.

## 6. Championship calculation (proposed)

Do **not** infer from total wins or from `week > 14`. Per season, from ESPN data:

1. Read league settings at import: regular-season matchup-period count, playoff format, playoff matchup-period length.
2. Import the schedule keyed by **matchupPeriodId** (not scoring week), keeping ESPN's `playoffTierType` (WINNERS_BRACKET / LOSERS_BRACKET / consolation) and `winner` fields on each matchup.
3. Champion = winner of the **final WINNERS_BRACKET matchup period**. Cross-check against ESPN's own final standings (`rankCalculatedFinal === 1` on the team record) — if the two disagree, mark the season `standingsComplete = 0` and surface it for commissioner review instead of publishing a guess.
4. Persist to `leagueSeasons.championName`/`runnerUpName`/`thirdPlaceName` with `source` recording how it was derived (`espn-bracket`, `espn-final-rank`, `manual-upload`), and only set the `*Complete` flags when validation passes.
5. Manual uploads remain the override of last resort and always win over inference.

## 7. Safe reimport design

Principles: production tables are never mass-mutated in place; raw extraction is separated from derived stats; every publish is scoped, transactional, reversible, and idempotent.

1. **Backup first.** `mysqldump --single-transaction` of the full schema to off-container storage before any publish. Verify restorability (at minimum `mysql --execute="SELECT 1"` against a scratch restore, ideally a scratch-DB restore).
2. **Stage raw ESPN payloads.** New tables `importRuns (id, leagueId, seasonYear, status, startedAt, finishedAt, notes)` and `importPayloads (importRunId, kind, matchupPeriodId/scoringPeriodId, rawJson)`. The extractor only writes here — raw JSON preserved exactly as ESPN returned it (fractional scores, member GUIDs, bracket types, settings). Nothing raw is ever deleted; re-extraction creates a new run.
3. **Transform into staging mirrors** (`staging_teams`, `staging_matchups`, `staging_playerStats`, `staging_transactions`, `staging_leagueSeasons`) keyed by `importRunId`, using internal-id conventions and DECIMAL(7,2) scores.
4. **Validate staging** before publish — the same checks as the audit script, run against staging: expected matchups per week (`teamCount/2`), no team twice in a matchup period, playoff bracket resolves to exactly one champion, every matchup team resolves, wins recomputed from matchups match ESPN's reported records, owner GUIDs resolve to names. A season failing validation is marked incomplete and **not published**.
5. **Publish per (league, season) in one transaction:** delete-and-insert only rows for that league+season in `teams`, `matchups`, `playerStats`, `transactions`, `leagueSeasons` — inside a transaction so a failure rolls back to the pre-publish state. `users`, `leagueMembers`, `leagues` (including inviteCode/commissioner), and manual-history seasons the commissioner has curated are **never touched**. (This scoped replace is the one place "delete" happens; it replaces rows with validated equivalents inside a transaction and is preceded by the full backup — production records are never destroyed without their replacement committing.)
6. **Rollback:** each publish records the `importRunId` it came from; rolling back = re-publishing the previous successful run's staging rows (still present) or restoring the pre-publish dump. Derived tables (`teamAllTimeStats`) are recomputed, never migrated.
7. **Idempotency:** re-running an extraction produces a new run; re-publishing the same run is a no-op-equivalent (same natural keys, same values). Transactions get a natural-key unique index in staging (ESPN transaction id, or hash of type+team+player+date) so re-ingestion cannot duplicate.

## 8. Phased implementation plan

**Phase 1 — Connection/access fix + current-season pilot (days).**
Transactional + self-healing commissioner claim (§1); claim before sync; one-time INSERT of missing membership rows; dedupe guard on transactions (unique index or insert-ignore by natural key — additive change); fix `isComplete` to use ESPN's winner field for the current season; keep current-season sync otherwise as-is. Members join via invite code (already credential-free — ESPN cookies are intentionally never stored, [server/espnSync.ts:54-68](server/espnSync.ts)).

**Phase 2 — Feature-flag unverified history (days, parallel with 1).**
Server-driven flag (per league: `historyStatus: 'hidden' | 'beta' | 'verified'`). Hide or "Beta"-label: AllTimeStats, TeamHistory, HeadToHeadMatrix, HistoricalHighlights, TeamComparison, OwnerLeaderboard, BrowseSeasons, seasonSummaries. WeeklyRecap/aiQuery/pdfExport restricted to current season until §2.1 is fixed (they're wrong even for current data today — or fix their joins to espnTeamId+season as a quick Phase-1 patch).

**Phase 3 — Historical import rebuild (weeks).**
Staging pipeline of §7; matchup-period-based extraction with playoff tiers; pre-2018 historical endpoints; owner model of §5; championship model of §6; DECIMAL scores and internal-id FKs in staging/published rows; commissioner reconciliation UI for owner mapping and validation failures.

**Phase 4 — Enable historical analytics (after reconciliation).**
Per-season sign-off: validation green + commissioner confirms champion/owner mapping → season flips to `verified` and appears in analytics. `teamAllTimeStats` and leaderboards recomputed from verified seasons only. This is the natural boundary for the premium add-on.

## 9. Automated acceptance tests per phase

The repo already has vitest wiring (`server/*.test.ts`) — extend it.

**Phase 1**
- Claim atomicity: forced failure between league update and membership insert leaves no half-claimed league (assert rollback).
- Self-heal: league with `commissionerUserId=U`, no membership → `league.sync` as U succeeds and recreates membership; as V fails with "already connected".
- First-connect failure: ESPN teams fetch throws mid-sync → retry by same user succeeds; no access error on any league endpoint in between.
- Invite: member joins by code, can read teams/matchups, cannot sync/rename/delete; no ESPN credentials ever requested or stored.
- Transactions: two consecutive `fullLeagueSync` runs produce zero new duplicate transaction rows.
- Current-season correctness: mocked ESPN week with an in-progress game → `isComplete=0`; completed game → `isComplete=1` regardless of 0 scores.

**Phase 2**
- League with `historyStatus='hidden'` returns no historical routes/nav; `'beta'` returns data with beta flag; snapshot test that no history screen renders for a fresh league.

**Phase 3**
- Golden-fixture import: recorded ESPN JSON for a known season (including a two-week playoff round and a pre-2018 season) → staging holds exactly `teamCount/2` regular matchups per period, one row per playoff series, decimal scores intact, champion equals known champion, co-owned team yields two `teamOwners` rows.
- Validation gate: fixture with a missing week → season marked incomplete and publish refused.
- Publish scoping: publishing league A/2019 leaves league A/2020, league B, `users`, `leagueMembers`, invite codes byte-identical (checksum assertion).
- Idempotency: publish same run twice → identical table state.
- Rollback: publish run 2, roll back to run 1 → state equals run-1 publish.

**Phase 4**
- Reconciliation: recomputed wins from published matchups == ESPN reported records for every verified season; leaderboard aggregates by ownerId (rename produces one row, not two); championships sum matches `leagueSeasons` rows; audit script sections D, E, G1, H, I return zero rows against the rebuilt data.

## 10. Exact files and functions to change

**Phase 1 (access + pilot):**
- [server/leagueAccess.ts](server/leagueAccess.ts) — `claimLeagueForCommissioner` (transaction + upsert-first), `requireCommissioner` (self-heal), new `repairCommissionerMemberships` one-time task.
- [server/routers.ts](server/routers.ts) — `league.sync` and `league.syncAllSeasons` mutations (claim before sync; remove post-success claim race).
- [server/espnSync.ts](server/espnSync.ts) — `syncWeekMatchups` (`isComplete` from ESPN winner; stop writing when not yet played), `syncLeagueActivity` (natural-key dedupe), `syncLeagueData` (don't stamp `lastSyncStatus: success` before the sync actually succeeds).
- [server/leagueDb.ts](server/leagueDb.ts) — `insertTransaction` (insert-ignore on natural key), `deleteLeague` (wrap in transaction).
- [drizzle/schema.ts](drizzle/schema.ts) — additive unique index on transactions natural key (additive migration, applied via normal drizzle flow in a maintenance window — not part of this audit).
- Quick joins fix (correctness even for current season): [server/weeklyRecap.ts](server/weeklyRecap.ts) `generateWeeklyRecap`, [server/aiQuery.ts](server/aiQuery.ts), [server/pdfExport.ts](server/pdfExport.ts) `generateLeagueStatsMarkdown`, [server/userStatsDb.ts](server/userStatsDb.ts) — join matchup team ids via `teams.espnTeamId + seasonYear`; same in [client/src/pages/HistoricalHighlights.tsx](client/src/pages/HistoricalHighlights.tsx) and [client/src/pages/TeamComparison.tsx](client/src/pages/TeamComparison.tsx).

**Phase 2 (flag):**
- [drizzle/schema.ts](drizzle/schema.ts) — `leagues.historyStatus` (additive).
- [server/routers.ts](server/routers.ts) — gate `teamHistory`, `seasonSummaries`, `ownerLeaderboard`, `allMatchups` (historical scope).
- Client: nav + the eight history pages listed in §8.

**Phase 3 (rebuild):**
- New: `server/importStaging.ts` (staging schema access), `server/espnExtract.ts` (raw payload extraction incl. `getHistoricalTeamsAtWeek`/`getHistoricalScoreboardForWeek`, league settings, members), `server/importValidate.ts`, `server/importPublish.ts`.
- Rewrite: [server/espnMultiSeasonSync.ts](server/espnMultiSeasonSync.ts) (`importSeason`, `syncAllSeasons` → drive the staging pipeline; stop stamping completeness), [server/espnClient.ts](server/espnClient.ts) (`fetchBoxScores` → matchup-period-aware, remove `Math.round`; add `fetchLeagueSettings`, `fetchMembers`, historical variants).
- [drizzle/schema.ts](drizzle/schema.ts) — `owners`, `teamOwners`, `importRuns`, `importPayloads`, staging tables; DECIMAL score columns on staging.
- [server/manualHistoryImport.ts](server/manualHistoryImport.ts) — write through the same staging/validation path; map to `owners`.

**Phase 4 (analytics):**
- [server/leagueDb.ts](server/leagueDb.ts) — `getOwnerLeaderboard` (aggregate by ownerId), `getTeamsByEspnLeagueAllTime`/`getTeamHistory` (franchise via owners/franchiseKey), `getSeasonSummaries` (verified-only + real champion), recompute job for `teamAllTimeStats`.

---

## Recommendation

**Hide history now; re-extract and reimport under the staging pipeline; do not attempt in-place repair.**

- **Repairing existing history is not possible**, not merely risky: the stored data has already discarded fractional scores (§2.5), playoff matchup-period structure (§2.2), owner GUID↔name mappings (§2.6), and bracket results (§2.4). No SQL transformation can recover information that was rounded or never fetched.
- **Hiding history alone** unblocks the pilot (it's the right immediate move — Phase 2) but abandons a differentiating feature and the premium-add-on plan.
- **Controlled re-extraction wins** because ESPN still holds the source of truth for this league's viewable seasons, extraction is cheap relative to repair archaeology, and the staging design converts "import" from a destructive one-shot into a validated, reversible, per-season publish — which is also exactly the machinery you need for the premium "validated historical analytics" product. Seasons ESPN no longer exposes (or pre-GUID ownership) are covered by the existing manual-upload path plus the commissioner reconciliation UI, never by silent inference.

Constraint compliance: no production deletes or migrations are performed by this audit; the SQL script is SELECT-only; ESPN cookies/secrets are never read or reproduced (the app already refuses to store them); historical ESPN data is treated as potentially incomplete (validation gates, per-season completeness flags); championships are derived from bracket/final-rank data, never win totals; owners are keyed by GUID/franchise, never display-name text alone; raw payloads are stored separately from derived stats.
