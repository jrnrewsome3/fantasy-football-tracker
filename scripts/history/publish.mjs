/**
 * Publish validated seasons into the application database — STAGE 3.
 *
 * Reads a staging directory (from extract.mjs or parse-doc.mjs), and for each
 * season replaces ONLY that league+season's teams and matchups, inside a
 * transaction. Users, league members, invite codes, and every other season are
 * never touched. Re-running is idempotent: the same input produces the same
 * rows.
 *
 * Refuses to publish a season that does not pass validation unless --force is
 * given, and always prints what it is about to do.
 *
 * Usage:
 *   DATABASE_URL=... node scripts/history/publish.mjs \
 *     --dir staging/doc --league 1489106 [--dry-run] [--only 2018,2019]
 */

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import mysql from "mysql2/promise";
import { validateSeason } from "./validate.mjs";

const args = { dryRun: false, force: false };
for (let i = 2; i < process.argv.length; i++) {
  const k = process.argv[i];
  if (k === "--dir") args.dir = process.argv[++i];
  else if (k === "--league") args.league = process.argv[++i];
  else if (k === "--only") args.only = process.argv[++i].split(",").map(Number);
  else if (k === "--dry-run") args.dryRun = true;
  else if (k === "--force") args.force = true;
}
if (!args.dir || !args.league) {
  console.error(
    "Usage: node scripts/history/publish.mjs --dir <dir> --league <espnLeagueId> [--dry-run] [--only 2018,2019] [--force]"
  );
  process.exit(1);
}
if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is required.");
  process.exit(1);
}

/**
 * Stable synthetic team id for a historical franchise. Negative so it can
 * never collide with a real ESPN team id. Matches the existing convention in
 * server/manualHistoryImport.ts.
 */
function franchiseId(value) {
  let hash = 2166136261;
  for (const char of value.trim().toLowerCase()) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return -(Math.abs(hash | 0) || 1);
}

const round2 = n => Math.round(n * 100) / 100;

const conn = await mysql.createConnection(process.env.DATABASE_URL);

const [leagueRows] = await conn.execute(
  "SELECT id, name, seasonYear FROM leagues WHERE espnLeagueId = ?",
  [String(args.league)]
);
if (!leagueRows.length) {
  console.error(`No league found with espnLeagueId ${args.league}.`);
  process.exit(1);
}
const league = leagueRows[0];
console.log(
  `\nLeague: ${league.name} (id ${league.id}), current season ${league.seasonYear}`
);
console.log(args.dryRun ? "DRY RUN — nothing will be written.\n" : "");

const files = (await readdir(args.dir))
  .filter(f => /^season-\d{4}\.json$/.test(f))
  .sort();

let published = 0;
const skipped = [];

for (const file of files) {
  const year = Number(file.match(/\d{4}/)[0]);
  if (args.only && !args.only.includes(year)) continue;

  // Never overwrite the live current season with historical records.
  if (year >= league.seasonYear) {
    skipped.push(`${year}: not an archived season (current is ${league.seasonYear})`);
    continue;
  }

  const payload = JSON.parse(await readFile(path.join(args.dir, file), "utf8"));
  const verdict = validateSeason(year, payload);
  if (verdict.verdict !== "READY" && !args.force) {
    skipped.push(`${year}: ${verdict.problems.join("; ")}`);
    continue;
  }

  const d = payload.season;
  const nameById = Object.fromEntries(d.teams.map(t => [t.id, t.name]));

  // Per-owner season record, computed from the regular-season games only.
  const record = new Map();
  const bump = (name, field, pf, pa) => {
    const r = record.get(name) || {
      wins: 0, losses: 0, ties: 0, pointsFor: 0, pointsAgainst: 0,
    };
    if (field) r[field]++;
    r.pointsFor += pf;
    r.pointsAgainst += pa;
    record.set(name, r);
  };

  for (const g of d.schedule) {
    const h = nameById[g.home.teamId];
    const a = nameById[g.away.teamId];
    if (!h || !a) continue;
    const hs = g.home.totalPoints ?? 0;
    const as = g.away.totalPoints ?? 0;
    const regular = g.playoffTierType === "NONE";
    const hField = !regular ? null : hs > as ? "wins" : hs < as ? "losses" : "ties";
    const aField = !regular ? null : as > hs ? "wins" : as < hs ? "losses" : "ties";
    bump(h, hField, hs, as);
    bump(a, aField, as, hs);
  }

  const rank = Object.fromEntries(
    d.teams.filter(t => t.rankCalculatedFinal > 0).map(t => [t.rankCalculatedFinal, t.name])
  );

  console.log(
    `${year}: ${d.teams.length} owners, ${d.schedule.length} matchups, ` +
      `champion ${rank[1] || "(none)"}`
  );

  if (args.dryRun) {
    published++;
    continue;
  }

  await conn.beginTransaction();
  try {
    // Scoped replace: this league, this season only.
    await conn.execute(
      "DELETE FROM matchups WHERE leagueId = ? AND seasonYear = ?",
      [league.id, year]
    );
    await conn.execute(
      "DELETE FROM teams WHERE leagueId = ? AND seasonYear = ?",
      [league.id, year]
    );

    for (const t of d.teams) {
      const r = record.get(t.name) || {
        wins: 0, losses: 0, ties: 0, pointsFor: 0, pointsAgainst: 0,
      };
      await conn.execute(
        `INSERT INTO teams
           (leagueId, espnTeamId, seasonYear, name, abbreviation, ownerName,
            franchiseKey, historySource, wins, losses, ties, pointsFor, pointsAgainst)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
          league.id,
          franchiseId(t.name),
          year,
          t.name,
          t.rankCalculatedFinal ? `#${t.rankCalculatedFinal}` : null,
          t.name,
          t.name.toLowerCase(),
          "league-records-doc",
          r.wins,
          r.losses,
          r.ties,
          round2(r.pointsFor),
          round2(r.pointsAgainst),
        ]
      );
    }

    for (const g of d.schedule) {
      const h = nameById[g.home.teamId];
      const a = nameById[g.away.teamId];
      if (!h || !a) continue;
      await conn.execute(
        `INSERT INTO matchups
           (leagueId, week, seasonYear, homeTeamId, awayTeamId, homeScore,
            awayScore, isComplete, isPlayoffs, scoringWeeks)
         VALUES (?,?,?,?,?,?,?,?,?,?)`,
        [
          league.id,
          g.matchupPeriodId,
          year,
          franchiseId(h),
          franchiseId(a),
          round2(g.home.totalPoints ?? 0),
          round2(g.away.totalPoints ?? 0),
          1,
          g.playoffTierType === "NONE" ? 0 : 1,
          g.scoringWeeks || 1,
        ]
      );
    }

    await conn.execute(
      `INSERT INTO leagueSeasons
         (leagueId, seasonYear, championName, runnerUpName, thirdPlaceName,
          standingsComplete, matchupsComplete, ownershipComplete, source)
       VALUES (?,?,?,?,?,1,1,1,?)
       ON DUPLICATE KEY UPDATE
         championName = VALUES(championName),
         runnerUpName = VALUES(runnerUpName),
         thirdPlaceName = VALUES(thirdPlaceName),
         standingsComplete = 1, matchupsComplete = 1, ownershipComplete = 1,
         source = VALUES(source), updatedAt = NOW()`,
      [
        league.id,
        year,
        rank[1] || null,
        rank[2] || null,
        rank[3] || null,
        "league-records-doc",
      ]
    );

    await conn.commit();
    published++;
  } catch (err) {
    await conn.rollback();
    console.error(`  ${year} FAILED, rolled back: ${err.message}`);
    skipped.push(`${year}: ${err.message}`);
  }
}

console.log(
  `\n${args.dryRun ? "Would publish" : "Published"} ${published} season(s).`
);
if (skipped.length) {
  console.log("Skipped:");
  for (const s of skipped) console.log("  - " + s);
}

if (!args.dryRun && published) {
  const [check] = await conn.execute(
    `SELECT seasonYear, COUNT(*) AS matchups,
            SUM(isPlayoffs) AS playoffGames,
            SUM(scoringWeeks > 1) AS twoWeekRounds
       FROM matchups WHERE leagueId = ? GROUP BY seasonYear ORDER BY seasonYear`,
    [league.id]
  );
  console.log("\nIn the database now:");
  for (const r of check)
    console.log(
      `  ${r.seasonYear}: ${r.matchups} matchups, ${r.playoffGames} playoff, ${r.twoWeekRounds} two-week`
    );
}

await conn.end();
