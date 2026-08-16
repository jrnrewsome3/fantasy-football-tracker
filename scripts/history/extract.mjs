/**
 * ESPN historical season extractor — STAGE 1 of the history rebuild.
 *
 * Fetches raw season payloads from ESPN and writes them to local JSON files.
 * It does not touch the application database; publishing is a later, separate
 * step that runs only after validation. Re-running is safe and idempotent:
 * each run writes a fresh, self-describing directory.
 *
 * Works two ways, automatically:
 *   - Public seasons        → no credentials needed
 *   - Private seasons       → uses ESPN_S2 / ESPN_SWID from the environment
 *
 * Credentials are read from the environment, used only as a request header,
 * and never logged, echoed, or written to disk.
 *
 * Usage:
 *   node scripts/history/extract.mjs --league 1489106 --from 2018 --to 2025
 *   node scripts/history/extract.mjs --league 1489106 --from 2018 --to 2025 --rosters
 *
 * For private seasons, first (values never printed):
 *   export ESPN_S2='...'   # or: read -rs ESPN_S2 && export ESPN_S2
 *   export ESPN_SWID='{...}'
 */

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

// ---------------------------------------------------------------------------
// Arguments
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const args = { rosters: false };
  for (let i = 2; i < argv.length; i++) {
    const key = argv[i];
    if (key === "--rosters") {
      args.rosters = true;
      continue;
    }
    const value = argv[++i];
    if (key === "--league") args.league = value;
    else if (key === "--from") args.from = Number(value);
    else if (key === "--to") args.to = Number(value);
    else if (key === "--out") args.out = value;
  }
  return args;
}

const args = parseArgs(process.argv);
if (!args.league || !args.from || !args.to) {
  console.error(
    "Usage: node scripts/history/extract.mjs --league <id> --from <year> --to <year> [--rosters] [--out <dir>]"
  );
  process.exit(1);
}

const RUN_ID = new Date().toISOString().replace(/[:.]/g, "-");
const OUT_DIR = args.out || path.join("staging", `run-${RUN_ID}`);

// ---------------------------------------------------------------------------
// ESPN access
// ---------------------------------------------------------------------------

const BASE = "https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl";

/** Present only if the operator exported them; never logged. */
const ESPN_S2 = process.env.ESPN_S2 || "";
const ESPN_SWID = process.env.ESPN_SWID || "";
const HAS_COOKIES = Boolean(ESPN_S2 && ESPN_SWID);

function headers() {
  const base = { accept: "application/json" };
  if (!HAS_COOKIES) return base;
  const swid = ESPN_SWID.startsWith("{") ? ESPN_SWID : `{${ESPN_SWID}}`;
  return { ...base, cookie: `espn_s2=${ESPN_S2}; SWID=${swid}` };
}

/** GET with retry. Returns { ok, status, data } — never throws on HTTP status. */
async function get(url, attempt = 1) {
  let res;
  try {
    res = await fetch(url, { headers: headers() });
  } catch (err) {
    if (attempt < 3) {
      await sleep(1000 * attempt);
      return get(url, attempt + 1);
    }
    return { ok: false, status: 0, error: err.message };
  }

  // ESPN rate-limits aggressively on bursts; back off and retry.
  if ((res.status === 429 || res.status >= 500) && attempt < 4) {
    await sleep(1500 * attempt);
    return get(url, attempt + 1);
  }

  if (!res.ok) return { ok: false, status: res.status };
  return { ok: true, status: res.status, data: await res.json() };
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

function seasonUrl(year, views, extra = "") {
  const q = views.map(v => `view=${v}`).join("&");
  return `${BASE}/seasons/${year}/segments/0/leagues/${args.league}?${q}${extra}`;
}

function historyUrl(year, views) {
  const q = views.map(v => `view=${v}`).join("&");
  return `${BASE}/leagueHistory/${args.league}?seasonId=${year}&${q}`;
}

/**
 * Fetch one season. Tries the modern endpoint, then the legacy leagueHistory
 * endpoint used for older seasons. Reports 401 (exists but private) distinctly
 * from 404 (does not exist) — they mean very different things for recovery.
 */
async function fetchSeason(year) {
  const views = ["mTeam", "mSettings", "mMatchupScore", "mStandings"];

  const modern = await get(seasonUrl(year, views));
  if (modern.ok) return { ok: true, via: "seasons", data: modern.data };

  const legacy = await get(historyUrl(year, views));
  if (legacy.ok) {
    const data = Array.isArray(legacy.data) ? legacy.data[0] : legacy.data;
    if (data) return { ok: true, via: "leagueHistory", data };
  }

  const statuses = [modern.status, legacy.status];
  return {
    ok: false,
    locked: statuses.includes(401),
    status: statuses.join("/"),
  };
}

/**
 * Optional player-level detail. One request per scoring period, so this is by
 * far the heaviest part of an extraction — off unless --rosters is passed.
 */
async function fetchRosters(year, periods) {
  const out = {};
  for (const period of periods) {
    const res = await get(
      seasonUrl(year, ["mBoxscore", "mRoster"], `&scoringPeriodId=${period}`)
    );
    if (res.ok) out[period] = res.data;
    await sleep(400);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Summarize (for the operator's eyes — the raw payload is what gets saved)
// ---------------------------------------------------------------------------

function summarize(year, via, d) {
  const teams = d.teams || [];
  const members = d.members || [];
  const schedule = d.schedule || [];
  const sched = d.settings?.scheduleSettings || {};

  const played = schedule.filter(
    g => (g.home?.totalPoints || 0) > 0 || (g.away?.totalPoints || 0) > 0
  );
  const decided = schedule.filter(g => g.winner && g.winner !== "UNDECIDED");
  const champion = teams.find(t => t.rankCalculatedFinal === 1);

  return {
    year,
    via,
    leagueName: d.settings?.name || null,
    teams: teams.length,
    members: members.length,
    coOwnedTeams: teams.filter(t => (t.owners || []).length > 1).length,
    teamsWithOwners: teams.filter(t => (t.owners || []).length > 0).length,
    regularSeasonPeriods: sched.matchupPeriodCount ?? null,
    playoffTeamCount: sched.playoffTeamCount ?? null,
    matchupPeriods: new Set(schedule.map(g => g.matchupPeriodId)).size,
    games: schedule.length,
    gamesPlayed: played.length,
    gamesDecided: decided.length,
    playoffTiers: [
      ...new Set(schedule.map(g => g.playoffTierType).filter(Boolean)),
    ],
    finalRankings: teams.filter(t => t.rankCalculatedFinal > 0).length,
    champion: champion
      ? champion.name ||
        `${champion.location || ""} ${champion.nickname || ""}`.trim()
      : null,
  };
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

await mkdir(OUT_DIR, { recursive: true });

console.log(`\nESPN history extraction`);
console.log(`  league   ${args.league}`);
console.log(`  seasons  ${args.from}–${args.to}`);
console.log(`  auth     ${HAS_COOKIES ? "cookies present (private seasons readable)" : "public only"}`);
console.log(`  output   ${OUT_DIR}\n`);

const summaries = [];
const failures = [];

for (let year = args.to; year >= args.from; year--) {
  process.stdout.write(`  ${year} ... `);
  const season = await fetchSeason(year);

  if (!season.ok) {
    const why = season.locked
      ? "LOCKED (exists but private — needs cookies or public visibility)"
      : `unavailable (HTTP ${season.status})`;
    console.log(why);
    failures.push({ year, locked: season.locked, status: season.status });
    await sleep(300);
    continue;
  }

  const summary = summarize(year, season.via, season.data);
  const payload = { season: season.data };

  if (args.rosters && summary.matchupPeriods > 0) {
    const lastPeriod = Math.max(
      summary.regularSeasonPeriods || 0,
      ...(season.data.schedule || []).map(g => g.matchupPeriodId || 0)
    );
    // Scoring periods run at least as long as matchup periods; +3 covers
    // multi-week playoff rounds without guessing an exact schedule shape.
    const periods = Array.from({ length: lastPeriod + 3 }, (_, i) => i + 1);
    process.stdout.write(`rosters(${periods.length}) ... `);
    payload.rosters = await fetchRosters(year, periods);
  }

  await writeFile(
    path.join(OUT_DIR, `season-${year}.json`),
    JSON.stringify(payload, null, 2)
  );

  summaries.push(summary);
  console.log(
    `ok — ${summary.teams} teams, ${summary.games} games ` +
      `(${summary.gamesPlayed} played), champion: ${summary.champion || "none recorded"}`
  );
  await sleep(300);
}

const manifest = {
  runId: RUN_ID,
  extractedAt: new Date().toISOString(),
  leagueId: args.league,
  requestedRange: { from: args.from, to: args.to },
  usedCookies: HAS_COOKIES, // whether, never which
  includesRosters: args.rosters,
  seasons: summaries,
  failures,
};

await writeFile(
  path.join(OUT_DIR, "manifest.json"),
  JSON.stringify(manifest, null, 2)
);

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

console.log(`\n${"=".repeat(78)}`);
console.log("YEAR  TEAMS  OWNERS  CO  PERIODS  GAMES  PLAYED  DECIDED  CHAMPION");
for (const s of summaries) {
  console.log(
    [
      s.year,
      String(s.teams).padStart(5),
      String(s.teamsWithOwners).padStart(7),
      String(s.coOwnedTeams).padStart(3),
      String(s.matchupPeriods).padStart(8),
      String(s.games).padStart(6),
      String(s.gamesPlayed).padStart(7),
      String(s.gamesDecided).padStart(8),
      "  " + (s.champion || "(none)"),
    ].join(" ")
  );
}

const locked = failures.filter(f => f.locked).map(f => f.year);
if (locked.length) {
  console.log(
    `\nLOCKED: ${locked.join(", ")}\n` +
      `  These seasons exist but are private. Either have the ESPN League\n` +
      `  Manager make them publicly viewable, or export ESPN_S2 / ESPN_SWID\n` +
      `  from an account that can see them and re-run.`
  );
}

console.log(
  `\nExtracted ${summaries.length} season(s) to ${OUT_DIR}` +
    `\nNothing was written to the application database. Validation is the next step.\n`
);
