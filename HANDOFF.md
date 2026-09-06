# Trouble in Paradise: start here

Updated September 6, 2026.

Repository: `/Users/lifequestaimac/fantasy-football-tracker`.
Production: https://fantasy.lifequestai.com
Server: `root@187.77.199.41`; copied source at `/opt/fantasy-football` (not a Git checkout).
Current release branch: `chore/sync-production-docker`; PR #22. Verify branch and status each session.

Read this file, DEPLOY.md, the current priorities at the top of todo.md, and the complete working diff. Preserve the unrelated untracked `.claude/` directory.

## Current product decisions

- Roger approved deployment of the existing activity guard, league-scoped draft history, and instruction cleanup on September 6.
- Draft summaries are commissioner-supplied. Keep source attribution visible. Do not invent missing annual draft orders or claim independent verification of owner averages.
- Draft history covers 2018–2026; completed championship records cover 2018–2025. Show the section only for ESPN league 1489106 with All Seasons selected.
- ESPN activity is unavailable through the installed client. Keep the guard and honest UI wording; other supported data continues to refresh.
- Matchup/player content will develop after the draft and during the season. Missing pre-draft content is not permission to fabricate projections or results.
- Defer Weekly Preview until after the draft. Start with a detailed individual preview based on selected starters for that week, then a league story paired with the recap. Compute facts in code, label projections, expose freshness and missing data, and let AI narrate only the supplied facts. Do not invent win probabilities.

## Architecture and protected data

- Franchise identity is `franchiseKey`, never team name or ESPN team ID.
- Matchups store ESPN team IDs: resolve using `teams.espnTeamId` plus season and league scope. Historical franchise IDs can be negative.
- Exclude `scoringWeeks > 1` from single-game records.
- Calculate championships, wins, margins, streaks, and all other facts in code before supplying them to a model.
- Verified league history is protected. Do not re-enable legacy import tools or run Sync All Seasons as a maintenance step.
- Keep the current Clerk instance until a separately approved migration maps users and league memberships.

## Release workflow

Make changes locally, inspect the exact diff, run TypeScript, tests, and client/server builds before deployment. Follow DEPLOY.md for copied-source deployment and image rollback. No production data repair, migration, secret change, or history import is part of routine code cleanup.

Use existing authorization for its stated scope. Future releases or consequential changes need explicit approval; this release is not blanket authorization for later features. Report what was actually verified, distinguish health from a working member journey, and explain findings in plain English.

AUDIT.md and the older checklist below todo.md are historical context, not current operating instructions. PRODUCTION_GUIDE.md is a planning document, not the live runbook.
