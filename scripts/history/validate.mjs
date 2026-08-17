/**
 * ESPN historical season validator — STAGE 2 of the history rebuild.
 *
 * Reads a staging directory produced by extract.mjs and decides, per season,
 * whether the data is complete and self-consistent enough to publish. Reads
 * local files only; touches neither ESPN nor the application database.
 *
 * A season passes only if every check below holds. Anything else is reported
 * with the specific reason so it can be fixed or left hidden — the point is to
 * never publish numbers nobody has verified.
 *
 * Usage:
 *   node scripts/history/validate.mjs --dir staging/run-<id>
 */

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const WINNERS = "WINNERS_BRACKET";

/** Human-readable team name, tolerating both old and new ESPN shapes. */
function teamName(team) {
  return (
    team.name ||
    `${team.location || ""} ${team.nickname || ""}`.trim() ||
    `Team ${team.id}`
  );
}

/**
 * Recompute each team's record from the schedule so it can be compared with
 * the record ESPN reports. Disagreement means our reading of the schedule is
 * wrong somewhere, and the season must not be published on that basis.
 */
function recomputeRecords(schedule) {
  const table = new Map();
  const bump = (teamId, field, points, against) => {
    if (teamId == null) return;
    const row = table.get(teamId) || {
      wins: 0,
      losses: 0,
      ties: 0,
      pointsFor: 0,
      pointsAgainst: 0,
    };
    row[field]++;
    row.pointsFor += points;
    row.pointsAgainst += against;
    table.set(teamId, row);
  };

  for (const game of schedule) {
    // Regular season only: ESPN's reported W-L excludes playoff results.
    if (game.playoffTierType && game.playoffTierType !== "NONE") continue;
    if (!game.winner || game.winner === "UNDECIDED") continue;

    const home = game.home?.totalPoints ?? 0;
    const away = game.away?.totalPoints ?? 0;
    const homeId = game.home?.teamId;
    const awayId = game.away?.teamId;

    if (game.winner === "HOME") {
      bump(homeId, "wins", home, away);
      bump(awayId, "losses", away, home);
    } else if (game.winner === "AWAY") {
      bump(homeId, "losses", home, away);
      bump(awayId, "wins", away, home);
    } else {
      bump(homeId, "ties", home, away);
      bump(awayId, "ties", away, home);
    }
  }
  return table;
}

/**
 * Champion from the bracket, never from win totals: the winner of the last
 * winners-bracket matchup period. Cross-checked against ESPN's own final rank.
 */
function deriveChampion(schedule, teams) {
  const byId = new Map(teams.map(t => [t.id, t]));
  const bracket = schedule.filter(
    g => g.playoffTierType === WINNERS && g.winner && g.winner !== "UNDECIDED"
  );

  let fromBracket = null;
  if (bracket.length) {
    const finalPeriod = Math.max(...bracket.map(g => g.matchupPeriodId));
    const finals = bracket.filter(g => g.matchupPeriodId === finalPeriod);
    // A true final is a single game; more than one means we are looking at a
    // round, not the championship, and cannot conclude a winner.
    if (finals.length === 1) {
      const game = finals[0];
      const winnerId =
        game.winner === "HOME" ? game.home?.teamId : game.away?.teamId;
      fromBracket = byId.get(winnerId) || null;
    }
  }

  const ranked = teams.find(t => t.rankCalculatedFinal === 1) || null;

  return {
    fromBracket,
    fromFinalRank: ranked,
    agree:
      fromBracket && ranked
        ? fromBracket.id === ranked.id
        : Boolean(fromBracket || ranked),
  };
}

export function validateSeason(year, payload) {
  const d = payload.season;
  const teams = d.teams || [];
  const schedule = d.schedule || [];
  const members = d.members || [];
  const settings = d.settings?.scheduleSettings || {};

  const problems = [];
  const notes = [];

  // --- Structural completeness ------------------------------------------
  if (teams.length < 2) problems.push(`only ${teams.length} team(s) present`);
  if (!schedule.length) problems.push("no schedule returned");

  const expectedPerPeriod = Math.floor(teams.length / 2);
  const byPeriod = new Map();
  for (const game of schedule) {
    const list = byPeriod.get(game.matchupPeriodId) || [];
    list.push(game);
    byPeriod.set(game.matchupPeriodId, list);
  }

  const regularPeriods = settings.matchupPeriodCount ?? null;
  if (regularPeriods) {
    for (let period = 1; period <= regularPeriods; period++) {
      const games = byPeriod.get(period) || [];
      if (games.length !== expectedPerPeriod) {
        problems.push(
          `week ${period}: ${games.length} games, expected ${expectedPerPeriod}`
        );
      }
    }
  } else {
    notes.push("league settings did not include a regular-season length");
  }

  // A team must never appear twice in the same matchup period.
  for (const [period, games] of byPeriod) {
    const seen = new Set();
    for (const game of games) {
      for (const id of [game.home?.teamId, game.away?.teamId]) {
        if (id == null) continue;
        if (seen.has(id)) {
          problems.push(`week ${period}: team ${id} appears in two games`);
        }
        seen.add(id);
      }
    }
  }

  // --- Was the season actually played to completion? --------------------
  const decided = schedule.filter(g => g.winner && g.winner !== "UNDECIDED");
  const played = schedule.filter(
    g => (g.home?.totalPoints || 0) > 0 || (g.away?.totalPoints || 0) > 0
  );
  const complete = decided.length === schedule.length && schedule.length > 0;
  if (!complete) {
    problems.push(
      `season not finished: ${decided.length}/${schedule.length} games decided`
    );
  }

  // --- Records must match ESPN's own ------------------------------------
  const recomputed = recomputeRecords(schedule);
  const mismatches = [];
  for (const team of teams) {
    const ours = recomputed.get(team.id);
    const theirs = team.record?.overall;
    if (!ours || !theirs) continue;
    if (ours.wins !== theirs.wins || ours.losses !== theirs.losses) {
      mismatches.push(
        `${teamName(team)}: computed ${ours.wins}-${ours.losses}, ESPN says ${theirs.wins}-${theirs.losses}`
      );
    }
  }
  if (mismatches.length) {
    problems.push(`record mismatch — ${mismatches.join("; ")}`);
  }

  // --- Owner identity ----------------------------------------------------
  const memberIds = new Set(members.map(m => m.id));
  const teamsWithoutOwner = teams.filter(t => !(t.owners || []).length);
  const unresolvedOwners = teams.filter(t =>
    (t.owners || []).some(o => !memberIds.has(o))
  );
  if (teamsWithoutOwner.length) {
    notes.push(
      `${teamsWithoutOwner.length} team(s) have no owner id — will need manual assignment`
    );
  }
  if (unresolvedOwners.length) {
    notes.push(
      `${unresolvedOwners.length} team(s) reference an owner not in the member list`
    );
  }

  // --- Champion ----------------------------------------------------------
  const champion = deriveChampion(schedule, teams);
  if (complete) {
    if (!champion.fromBracket && !champion.fromFinalRank) {
      problems.push("no champion could be determined from bracket or standings");
    } else if (!champion.agree) {
      problems.push(
        `champion disagreement — bracket says ${teamName(champion.fromBracket)}, ` +
          `final standings say ${teamName(champion.fromFinalRank)}`
      );
    } else if (!champion.fromBracket) {
      notes.push("champion taken from final standings (no bracket data)");
    }
  }

  const championTeam = champion.fromBracket || champion.fromFinalRank;

  return {
    year,
    verdict: problems.length ? "NEEDS REVIEW" : "READY",
    teams: teams.length,
    games: schedule.length,
    played: played.length,
    decided: decided.length,
    coOwned: teams.filter(t => (t.owners || []).length > 1).length,
    champion: championTeam ? teamName(championTeam) : null,
    championSource: champion.fromBracket ? "playoff bracket" : "final standings",
    problems,
    notes,
  };
}

// ---------------------------------------------------------------------------
// CLI (skipped when this file is imported, e.g. by tests)
// ---------------------------------------------------------------------------

async function main() {
  const args = {};
  for (let i = 2; i < process.argv.length; i++) {
    if (process.argv[i] === "--dir") args.dir = process.argv[++i];
  }
  if (!args.dir) {
    console.error("Usage: node scripts/history/validate.mjs --dir <staging dir>");
    process.exit(1);
  }

  const files = (await readdir(args.dir))
    .filter(f => /^season-\d{4}\.json$/.test(f))
    .sort()
    .reverse();

  if (!files.length) {
    console.error(`No season files found in ${args.dir}`);
    process.exit(1);
  }

  console.log(`\nValidating ${files.length} season(s) in ${args.dir}\n`);

  const results = [];
  for (const file of files) {
    const year = Number(file.match(/\d{4}/)[0]);
    const payload = JSON.parse(
      await readFile(path.join(args.dir, file), "utf8")
    );
    results.push(validateSeason(year, payload));
  }

  for (const r of results) {
    const mark = r.verdict === "READY" ? "PASS" : "HOLD";
    console.log(
      `[${mark}] ${r.year} — ${r.teams} teams, ${r.decided}/${r.games} games decided` +
        (r.champion ? `, champion: ${r.champion} (${r.championSource})` : "")
    );
    for (const p of r.problems) console.log(`         ✗ ${p}`);
    for (const n of r.notes) console.log(`         · ${n}`);
  }

  const ready = results.filter(r => r.verdict === "READY");
  console.log(
    `\n${ready.length} of ${results.length} season(s) ready to publish.` +
      (ready.length < results.length
        ? ` The rest stay hidden until reviewed.`
        : "") +
      `\nNothing has been published — that is a separate, explicit step.\n`
  );
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
  await main();
}
