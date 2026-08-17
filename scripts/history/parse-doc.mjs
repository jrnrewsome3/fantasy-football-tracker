/**
 * League-records document parser — an alternative STAGE 1 to extract.mjs.
 *
 * Reads the commissioner's Word document of past seasons and emits the same
 * season payload shape that validate.mjs already checks, so a hand-kept league
 * record and an ESPN pull flow through identical validation and publishing.
 *
 * Two classes of repair are applied, and every one is reported:
 *   - Name normalization  ("Ducan" -> "Duncan") against that season's roster
 *   - Opponent recovery   (a game missing a name, where exactly one rostered
 *                          player is otherwise unaccounted for that week)
 * Anything that cannot be resolved with certainty is left alone and surfaces
 * as a validation failure rather than being guessed at.
 *
 * Usage:
 *   node scripts/history/parse-doc.mjs --file "FF Past Stats.docx" --out staging/doc
 */

import { execFileSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const args = {};
for (let i = 2; i < process.argv.length; i++) {
  const key = process.argv[i];
  if (key === "--file") args.file = process.argv[++i];
  else if (key === "--out") args.out = process.argv[++i];
}
if (!args.file) {
  console.error(
    'Usage: node scripts/history/parse-doc.mjs --file "<document.docx>" [--out <dir>]'
  );
  process.exit(1);
}
const OUT_DIR = args.out || "staging/doc";

// ---------------------------------------------------------------------------
// 1. Text extraction — line structure is what makes the document parseable
// ---------------------------------------------------------------------------

function extractLines(file) {
  const xml = execFileSync("unzip", ["-p", file, "word/document.xml"], {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });

  const marked = xml
    .replace(/<w:br\s*\/>/g, "\n")
    .replace(/<\/w:p>/g, "\n")
    .replace(/<\/w:tr>/g, "\n");

  const text = [...marked.matchAll(/<w:t[^>]*>([\s\S]*?)<\/w:t>|\n/g)]
    .map(m => (m[0] === "\n" ? "\n" : m[1]))
    .join("")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#8217;|&#146;|&#39;/g, "'")
    .replace(/&#8211;|&#150;/g, "-");

  return text
    .split("\n")
    .map(s => s.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

// ---------------------------------------------------------------------------
// 2. Parse
// ---------------------------------------------------------------------------

const SEASON = /^(?:year\s*\d+\s*[-–—]?\s*)?(\d{4})\s*$/i;
const SEASON_INLINE = /^year\s*\d+\s*[-–—]\s*(\d{4})/i;
const MEMBERS = /^(\d+)\s*members?/i;
const WEEK = /^week\s*(\d+)\s*results?/i;
const PLAYOFF = /^playoff\s*round\s*(\d+)\s*\(([^)]*)\)/i;
const BYE = /^bye\s*:/i;
/**
 * Round labels, matched explicitly so a player name can never be mistaken for
 * one. The colon is optional because the document is not always consistent.
 */
const LABEL =
  /^(championship|semifinals?|quarterfinals?|consolation|(?:third|fifth|seventh|ninth|eleventh)\s*place(?:\s*game)?)\s*:?\s+/i;
const GAME = /^(.+?)\s+([\d.]+)\s+vs\.?\s*(.*?)\s*([\d.]+)?\s*$/i;

/** Playoff labels that are part of the championship path. */
const WINNERS = /champ|semifinal|quarterfinal/i;

function parse(lines) {
  const seasons = [];
  let season = null;
  let period = null;

  const startPeriod = (label, kind, week, scoringWeeks = 1) => {
    period = {
      label,
      kind,
      week,
      scoringWeeks,
      games: [],
      byes: [],
      unparsed: [],
    };
    season.periods.push(period);
  };

  for (const line of lines) {
    const yearMatch = line.match(SEASON) || line.match(SEASON_INLINE);
    if (yearMatch) {
      season = {
        year: Number(yearMatch[1]),
        members: [],
        periods: [],
        collecting: false,
      };
      seasons.push(season);
      period = null;
      continue;
    }
    if (!season) continue;

    const memberMatch = line.match(MEMBERS);
    if (memberMatch) {
      season.declaredMembers = Number(memberMatch[1]);
      season.collecting = true;
      continue;
    }

    const weekMatch = line.match(WEEK);
    if (weekMatch) {
      season.collecting = false;
      startPeriod(`Week ${weekMatch[1]}`, "regular", Number(weekMatch[1]));
      continue;
    }

    const playoffMatch = line.match(PLAYOFF);
    if (playoffMatch) {
      season.collecting = false;
      // Early seasons ran playoff rounds across two NFL weeks and recorded a
      // single combined score ("week 14 - week 15"). Read the span from the
      // heading rather than assuming, so scores are never compared across
      // different-length scoring windows.
      const weeks = (playoffMatch[2].match(/\d+/g) || []).map(Number);
      const span = weeks.length
        ? Math.max(...weeks) - Math.min(...weeks) + 1
        : 1;
      startPeriod(
        `Playoff Round ${playoffMatch[1]}`,
        "playoff",
        Number(playoffMatch[1]),
        span
      );
      continue;
    }

    if (line.startsWith("*")) continue; // commentary

    if (period && BYE.test(line)) {
      period.byes.push(line.split(":").slice(1).join(":").trim());
      continue;
    }

    // Roster names follow the "N members" line. Parenthetical annotations
    // ("returning. Same guy from 2019") are notes, not part of the name.
    const bare = line.replace(/\s*\(.*?\)\s*/g, "").trim();
    if (season.collecting && bare && !/\d/.test(bare) && !/\bvs\b/i.test(line)) {
      season.members.push(bare);
      continue;
    }

    if (!period) continue;

    // Strip trailing commentary and stray punctuation (the document contains
    // a few stray quote marks) before reading the score line.
    const cleaned = line
      .replace(/\s*\*+.*$/, "")
      .replace(/[‘’“”'"`]+\s*$/, "")
      .trim();

    const labelMatch = cleaned.match(LABEL);
    const label = labelMatch ? labelMatch[1].trim() : null;
    const body = labelMatch ? cleaned.slice(labelMatch[0].length) : cleaned;

    const g = body.match(GAME);
    if (g && g[2]) {
      period.games.push({
        label,
        home: g[1].trim(),
        homeScore: Number(g[2]),
        away: (g[3] || "").trim() || null,
        awayScore: g[4] === undefined ? null : Number(g[4]),
        source: line,
      });
    } else {
      period.unparsed.push(line);
    }
  }
  return seasons;
}

// ---------------------------------------------------------------------------
// 3. Repair — only where the answer is certain
// ---------------------------------------------------------------------------

const repairs = [];

/** Closest roster name for a misspelling, by simple edit distance. */
function closest(name, roster) {
  const distance = (a, b) => {
    const dp = Array.from({ length: a.length + 1 }, (_, i) => [i]);
    for (let j = 0; j <= b.length; j++) dp[0][j] = j;
    for (let i = 1; i <= a.length; i++)
      for (let j = 1; j <= b.length; j++)
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,
          dp[i][j - 1] + 1,
          dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
        );
    return dp[a.length][b.length];
  };

  const lower = name.toLowerCase();
  // A roster name that simply extends the written one ("Luke" -> "Luke S")
  // is only safe when exactly one roster entry matches that prefix.
  const prefixed = roster.filter(r => r.toLowerCase().startsWith(lower));
  if (prefixed.length === 1) return { match: prefixed[0], reason: "prefix" };

  const scored = roster
    .map(r => ({ r, d: distance(lower, r.toLowerCase()) }))
    .sort((a, b) => a.d - b.d);
  if (scored[0] && scored[0].d <= 2 && (!scored[1] || scored[1].d > scored[0].d))
    return { match: scored[0].r, reason: `edit distance ${scored[0].d}` };

  return null;
}

function repair(season) {
  const roster = season.members;
  const known = new Set(roster);

  for (const period of season.periods) {
    // (a) Normalize misspelled or shortened names.
    for (const game of period.games) {
      for (const side of ["home", "away"]) {
        const name = game[side];
        if (!name || known.has(name)) continue;
        const fix = closest(name, roster);
        if (fix) {
          repairs.push(
            `${season.year} ${period.label}: "${name}" -> "${fix.match}" (${fix.reason})`
          );
          game[side] = fix.match;
        }
      }
    }

    // (b) Recover a missing opponent when exactly one player is unaccounted
    //     for in the period and exactly one game is missing a name.
    const missingName = period.games.filter(g => !g.away);
    if (missingName.length === 1) {
      const used = new Set([
        ...period.games.flatMap(g => [g.home, g.away].filter(Boolean)),
        ...period.byes,
      ]);
      const absent = roster.filter(r => !used.has(r));
      if (absent.length === 1) {
        repairs.push(
          `${season.year} ${period.label}: opponent recovered as "${absent[0]}" ` +
            `(only rostered player unaccounted for) -> "${missingName[0].source}"`
        );
        missingName[0].away = absent[0];
      }
    }
  }
}

// ---------------------------------------------------------------------------
// 4. Shape into the payload validate.mjs understands
// ---------------------------------------------------------------------------

/** Final placement games map directly to finishing positions. */
const PLACEMENT = [
  [/champ/i, 1],
  [/third\s*place/i, 3],
  [/fifth\s*place/i, 5],
  [/seventh\s*place/i, 7],
  [/ninth\s*place/i, 9],
];

function toPayload(season) {
  const teamId = new Map(season.members.map((m, i) => [m, i + 1]));

  const teams = season.members.map(name => ({
    id: teamId.get(name),
    name,
    owners: [`{DOC-${name.toUpperCase().replace(/\s+/g, "-")}}`],
    rankCalculatedFinal: 0,
  }));

  const members = season.members.map(name => ({
    id: `{DOC-${name.toUpperCase().replace(/\s+/g, "-")}}`,
    displayName: name,
  }));

  const regularWeeks = season.periods.filter(p => p.kind === "regular").length;
  const schedule = [];

  for (const period of season.periods) {
    const matchupPeriodId =
      period.kind === "regular" ? period.week : regularWeeks + period.week;

    for (const game of period.games) {
      if (!game.home || !game.away || game.awayScore === null) {
        // Left deliberately incomplete so validation reports it.
        schedule.push({
          id: schedule.length + 1,
          matchupPeriodId,
          scoringWeeks: period.scoringWeeks,
          playoffTierType: period.kind === "regular" ? "NONE" : "CONSOLATION",
          winner: "UNDECIDED",
          home: { teamId: teamId.get(game.home) ?? null, totalPoints: game.homeScore },
          away: { teamId: teamId.get(game.away) ?? null, totalPoints: game.awayScore ?? 0 },
          incomplete: true,
          source: game.source,
        });
        continue;
      }

      const tier =
        period.kind === "regular"
          ? "NONE"
          : WINNERS.test(game.label || "")
            ? "WINNERS_BRACKET"
            : "CONSOLATION";

      schedule.push({
        id: schedule.length + 1,
        matchupPeriodId,
        // How many NFL weeks this single matchup was scored over. Scores are
        // only comparable between matchups with the same span.
        scoringWeeks: period.scoringWeeks,
        playoffTierType: tier,
        winner:
          game.homeScore === game.awayScore
            ? "TIE"
            : game.homeScore > game.awayScore
              ? "HOME"
              : "AWAY",
        home: { teamId: teamId.get(game.home), totalPoints: game.homeScore },
        away: { teamId: teamId.get(game.away), totalPoints: game.awayScore },
      });

      // Final standings come from the placement games, not from win totals.
      for (const [pattern, rank] of PLACEMENT) {
        if (!pattern.test(game.label || "")) continue;
        const winner = game.homeScore >= game.awayScore ? game.home : game.away;
        const loser = game.homeScore >= game.awayScore ? game.away : game.home;
        const w = teams.find(t => t.name === winner);
        const l = teams.find(t => t.name === loser);
        if (w) w.rankCalculatedFinal = rank;
        if (l) l.rankCalculatedFinal = rank + 1;
      }
    }
  }

  return {
    season: {
      settings: {
        name: "League records document",
        scheduleSettings: {
          matchupPeriodCount: regularWeeks,
          playoffTeamCount: null,
          playoffMatchupPeriodLength: null,
        },
      },
      teams,
      members,
      schedule,
    },
  };
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

const lines = extractLines(args.file);
const seasons = parse(lines);
for (const s of seasons) repair(s);

await mkdir(OUT_DIR, { recursive: true });

console.log(`\nParsed ${path.basename(args.file)} — ${lines.length} lines\n`);
console.log(
  "YEAR  PLAYERS  REG WEEKS  PLAYOFF ROUNDS  GAMES  PLAYOFF FORMAT  CHAMPION"
);

const summaries = [];
for (const s of seasons) {
  const payload = toPayload(s);
  await writeFile(
    path.join(OUT_DIR, `season-${s.year}.json`),
    JSON.stringify(payload, null, 2)
  );

  const champ = payload.season.teams.find(t => t.rankCalculatedFinal === 1);
  const games = payload.season.schedule.length;
  const incomplete = payload.season.schedule.filter(g => g.incomplete).length;
  const multiWeek = payload.season.schedule.filter(
    g => (g.scoringWeeks || 1) > 1
  ).length;

  console.log(
    [
      s.year,
      String(s.members.length).padStart(7),
      String(s.periods.filter(p => p.kind === "regular").length).padStart(10),
      String(s.periods.filter(p => p.kind === "playoff").length).padStart(15),
      String(games).padStart(6),
      (multiWeek ? `${multiWeek} two-week` : "all one-week").padStart(15),
      "  " + (champ ? champ.name : "(none)") + (incomplete ? `  [${incomplete} incomplete]` : ""),
    ].join(" ")
  );
  summaries.push({
    year: s.year,
    games,
    incomplete,
    multiWeekMatchups: multiWeek,
    champion: champ?.name,
  });
}

await writeFile(
  path.join(OUT_DIR, "manifest.json"),
  JSON.stringify(
    {
      source: path.basename(args.file),
      parsedAt: new Date().toISOString(),
      seasons: summaries,
      repairs,
    },
    null,
    2
  )
);

console.log(`\n${repairs.length} automatic repairs applied:\n`);
for (const r of repairs) console.log("  - " + r);
console.log(`\nWrote ${seasons.length} season(s) to ${OUT_DIR}`);
console.log("Nothing published. Run validate.mjs against this directory next.\n");
