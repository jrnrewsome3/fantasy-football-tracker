# Starting a new session

Paste the block below into a fresh Claude Code session started in
`/Users/lifequestaimac/LifeQuestAIWebsite`.

Memory files load automatically, so most context arrives on its own — this
prompt just points at the work and sets the ground rules.

---

```
Picking up the Trouble in Paradise fantasy football app (fantasy.lifequestai.com).
Read your memory for fantasy-football-tracker-status first — it has the
architecture rules, deploy process, and outstanding items. The repo is at
fantasy-football-tracker/ on branch chore/sync-production-docker.

The 2026 season starts soon and the league is testing the app now. My work from
here is fixing what testers report and adding features, so expect small
iterative changes rather than big builds.

Ground rules that matter, learned the hard way this project:

- Identity is franchiseKey (the person), never team name or team id. Team names
  change mid-season.
- matchups store ESPN team ids — join via teams.espnTeamId AND seasonYear.
  Historical franchise ids are negative.
- Exclude scoringWeeks > 1 from any single-game record (2018-2020 playoff rounds
  were two weeks combined).
- For anything AI-written: compute the facts in code and hand the model a brief.
  Never let it derive records, margins or streaks.
- Run pnpm run check and pnpm test BEFORE deploying, not alongside. Two tests in
  league.sync.test.ts and league.teams.test.ts are flaky — they call live ESPN.
- Verify against real data before telling me something works. Several bugs this
  project only surfaced by testing a case whose answer I already knew.

Explain things in plain English first — I build with AI but I'm not a developer.
Lead with what to do, then the detail.

Here's what I need:
[describe the bug report or feature]
```

---

## If a tester reports a bug

Include: which screen, what they saw, what they expected, phone or computer.
Screenshots help most. The UAT plan with expected values is at
https://claude.ai/code/artifact/d34d064e-c776-4136-b4a0-999a195080f8

## Quick reference

| Thing | Where |
| --- | --- |
| App | https://fantasy.lifequestai.com |
| Server | `root@187.77.199.41`, app at `/opt/fantasy-football` |
| League guide (Craft) | 🏈 Trouble in Paradise folder |
| Audit + rationale | `AUDIT.md` |
| History tooling | `scripts/history/` |
| Feature flags | `shared/const.ts` |
