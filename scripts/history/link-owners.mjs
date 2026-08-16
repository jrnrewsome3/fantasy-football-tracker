/**
 * Link current-season ESPN teams to the people who own them.
 *
 * Team names change constantly — mid-season, after a draft, on a whim — so a
 * team name can never identify a franchise. The person can. This writes a
 * stable franchiseKey (and the person's league nickname) onto each ESPN team
 * so career records follow the human, not the label on the team.
 *
 * Safe to re-run: it only sets the mapping, never touches scores or matchups.
 *
 * Usage:
 *   DATABASE_URL=... node scripts/history/link-owners.mjs --league 1489106 [--dry-run]
 */

import mysql from "mysql2/promise";

/**
 * ESPN team id -> { key, nickname }
 * `key` must match the franchiseKey used for that person's historical seasons
 * (the lower-cased league nickname).
 */
const MAPPING = {
  1: { key: "daly", nickname: "Daly" },
  2: { key: "mark", nickname: "Mark" },
  3: { key: "roger", nickname: "Roger" },
  4: { key: "willie", nickname: "Willie" },
  5: { key: "duncan", nickname: "Duncan" },
  6: { key: "finn", nickname: "Finn" },
  7: { key: "bradley", nickname: "Bradley" },
  8: { key: "ty", nickname: "Ty" },
  9: { key: "marshall", nickname: "Marshall" },
  10: { key: "dino", nickname: "Dino" },
};

const args = { dryRun: false };
for (let i = 2; i < process.argv.length; i++) {
  const k = process.argv[i];
  if (k === "--league") args.league = process.argv[++i];
  else if (k === "--dry-run") args.dryRun = true;
}
if (!args.league || !process.env.DATABASE_URL) {
  console.error(
    "Usage: DATABASE_URL=... node scripts/history/link-owners.mjs --league <espnLeagueId> [--dry-run]"
  );
  process.exit(1);
}

const conn = await mysql.createConnection(process.env.DATABASE_URL);

const [leagues] = await conn.execute(
  "SELECT id, name, seasonYear FROM leagues WHERE espnLeagueId = ?",
  [String(args.league)]
);
if (!leagues.length) {
  console.error(`No league with espnLeagueId ${args.league}`);
  process.exit(1);
}
const league = leagues[0];

const [current] = await conn.execute(
  `SELECT espnTeamId, name, ownerName, franchiseKey
     FROM teams WHERE leagueId = ? AND seasonYear = ? ORDER BY espnTeamId`,
  [league.id, league.seasonYear]
);

// Which franchise keys does the historical record actually know about?
const [historical] = await conn.execute(
  `SELECT DISTINCT franchiseKey FROM teams
     WHERE leagueId = ? AND seasonYear < ? AND franchiseKey IS NOT NULL`,
  [league.id, league.seasonYear]
);
const known = new Set(historical.map(r => r.franchiseKey));

console.log(`\n${league.name} — linking ${league.seasonYear} teams to people\n`);
console.log("ESPN TEAM                          ESPN OWNER            -> PERSON     HISTORY?");

let applied = 0;
const problems = [];

for (const team of current) {
  const map = MAPPING[team.espnTeamId];
  if (!map) {
    problems.push(
      `team ${team.espnTeamId} ("${team.name}") has no mapping — add it to MAPPING`
    );
    continue;
  }
  const hasHistory = known.has(map.key);
  console.log(
    `${(team.name || "").trim().slice(0, 33).padEnd(34)}` +
      `${(team.ownerName || "").slice(0, 21).padEnd(22)}-> ${map.nickname.padEnd(11)}` +
      (hasHistory ? "yes" : "NO PRIOR SEASONS")
  );
  if (!hasHistory) {
    problems.push(
      `"${map.key}" has no historical seasons — correct for a newcomer, wrong if it's a typo`
    );
  }

  if (!args.dryRun) {
    await conn.execute(
      `UPDATE teams SET franchiseKey = ?, ownerName = ?, updatedAt = NOW()
         WHERE leagueId = ? AND seasonYear = ? AND espnTeamId = ?`,
      [map.key, map.nickname, league.id, league.seasonYear, team.espnTeamId]
    );
  }
  applied++;
}

// Every person in the current season should now aggregate with their history.
const [check] = await conn.execute(
  `SELECT franchiseKey,
          COUNT(DISTINCT seasonYear) AS seasons,
          SUM(wins) AS wins, SUM(losses) AS losses
     FROM teams WHERE leagueId = ? AND franchiseKey IS NOT NULL
     GROUP BY franchiseKey ORDER BY wins DESC`,
  [league.id]
);

console.log(
  `\n${args.dryRun ? "Would link" : "Linked"} ${applied} team(s).` +
    (args.dryRun ? " (dry run — nothing written)" : "")
);

if (!args.dryRun) {
  console.log("\nCareer totals now grouping by person:\n");
  console.log("PERSON       SEASONS  REG W-L");
  for (const r of check)
    console.log(
      r.franchiseKey.padEnd(12) +
        String(r.seasons).padStart(7) +
        `   ${r.wins}-${r.losses}`
    );
}

if (problems.length) {
  console.log("\nWorth a look:");
  for (const p of [...new Set(problems)]) console.log("  - " + p);
}

await conn.end();
