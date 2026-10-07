# League records and natural-language answers

`server/recordBook.ts` rebuilds manager records from the league's stored teams and matchups whenever they are queried. It follows `franchiseKey` across team IDs, seasons and team-name changes. No imported historical values are rewritten and no separate stale record table is maintained.

`server/streakFacts.ts` answers supported record questions directly. The generic AI context also receives calculated evidence for every manager, rather than only league leaders. Existing league membership checks still apply.

Examples:

- When was the last time Willie won two games in a row?
- Has Willie won 2 in a row ever?
- When did anyone last win four straight?
- List all instances when Willie won two in a row.
- How many times has Willie won two in a row?
- Who has the longest winning streak?
- Who has the longest current losing streak?
- What is my longest winning streak in the regular season?
- When was the last time someone went 4-0?
- Who last started 0-4?
- Who started 3-1 in 2025?
- List all 4-0 season starts.
- How many times has Willie started 4-0?

Numeric season-start records support 1–18 games. Consecutive-result thresholds support digits and number words two through ten, with numeric thresholds up to 100. Questions can specify a manager, selected member's own team, everyone in the league, a season, this/last season, regular season, or postseason.

Definitions:

- `4-0` means the record after the first four regular-season games beginning Week 1. Later losses do not erase that start. It is distinct from four wins later in a season.
- Latest N-result sequences stay within one season and require consecutive scoring weeks. Multiweek matchups count once.
- Longest/current streaks follow consecutive recorded results across seasons. Current means through the latest completed result; an unfinished game is not a win.
- Occurrence counts include overlapping windows: three straight wins contain two two-win sequences.
- Ties, invalid results and missing weeks break continuity. Conflicting duplicate matchups or ambiguous ownership cause a verification refusal. Exact duplicate result rows are counted once.
- A missing qualifying result means none was found in stored evidence; it does not prove unrecorded history contains none.

The supported grammar is intentionally explicit. Add a calculation and routing regression tests for new record types or wording; do not ask a language model to infer chronology from career totals or absence from a leaderboard. This is not a claim to understand every possible natural-language question.
