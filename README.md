# Trouble in Paradise — Fantasy Football Stats Tracker

A full-stack web application for tracking, analyzing, and visualizing ESPN Fantasy Football league data across multiple seasons. Built for the **Trouble in Paradise** league, this app syncs historical data from 2018 to present and provides rich analytics, AI-powered insights, and a clean dashboard experience.

**Production target:** self-hosted on Railway (or any Node host) with **Clerk** auth and **OpenAI** for AI features.

See [`DEPLOY.md`](./DEPLOY.md) for the production deploy checklist.

---

## Overview

This application connects directly to ESPN's Fantasy Football API to pull league data — teams, matchups, standings, player stats, and transactions — and stores it in a persistent database for fast querying and historical analysis. Users authenticate via **Clerk**, add their ESPN league credentials, and can then explore everything from weekly matchups to all-time standings.

---

## Features

### Dashboard
- Displays all connected leagues with quick-access buttons for Leaderboard, Browse Seasons, and View League
- Shows the total number of tracked leagues
- Onboarding tutorial guides new users through setup in four steps

### League Management
- Add a new ESPN league by providing the League ID, season year, and optional private credentials (`espnS2` and `SWID` cookies for private leagues)
- Rename leagues with a custom display name
- Delete leagues from the tracker
- Sync a single season or all historical seasons (2018–present) in one operation

### League Detail Page
- Defaults to **All-Time** view, aggregating records across every synced season
- Toggle to **Single Season** view with a season selector dropdown
- Header displays the full data range (e.g., "Viewing Data from 2018 to 2026")
- Tabs: **Standings**, **Matchups**, **All-Time Stats**, **AI Assistant**, **Activity**

### Standings
- All-Time standings aggregate wins, losses, ties, and points across all seasons
- Single Season standings filter to the selected year
- Columns: Rank, Team Name, ESPN Team ID, W, L, T, Points For, Points Against
- ESPN Team ID column enables owner identification independent of team name changes

### Weekly Matchups
- View head-to-head matchups for any week and season
- Displays home and away scores with projected vs. actual comparison
- Playoff matchups are flagged separately

### All-Time Stats
- Comprehensive historical statistics per team
- Includes championships, playoff appearances, highest/lowest weekly scores, and longest streaks

### Historical Highlights
- Season-by-season summary cards showing champion, runner-up, most points scored, and biggest blowout
- Filterable by season year

### Team History
- Deep-dive profile for any individual team across all seasons they participated
- Season-by-season record with points, rank, and playoff result

### Team Comparison
- Side-by-side comparison of two teams across any season
- Head-to-head record, scoring averages, and performance trends

### Owner Leaderboard
- Ranks owners by all-time win percentage, total wins, championships, and playoff appearances
- Accounts for team name changes by grouping records by ESPN Team ID

### Browse Seasons
- Season-by-season overview with standings summary for each year
- Quick navigation to any historical season

### Weekly Recap (AI-Generated)
- AI-powered narrative recap for any completed week
- Highlights top performers, biggest upsets, and key matchup results
- Shareable summary format

### AI Strategy Assistant
- Natural language query interface for any league-related question
- Powered by the built-in LLM integration
- Example queries: "Who has the best all-time record?", "What was the highest scoring week in 2022?"

### PDF Export
- Export league standings and stats to a downloadable PDF report

### Activity Feed
- Recent transactions log including trades, waiver pickups, free agent adds, and drops

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Tailwind CSS 4, shadcn/ui |
| Routing | Wouter |
| API Layer | tRPC 11 (end-to-end type safety) |
| Backend | Express 4, Node.js 22 |
| Database | MySQL (via Drizzle ORM + connection pool) |
| Auth | Clerk (session JWT → Bearer token) |
| ESPN Data | espn-fantasy-football-api (Node production build) |
| AI | OpenAI-compatible chat completions (`OPENAI_API_KEY`) |
| Hosting | Railway / Docker (`Dockerfile`, `railway.toml`) |
| Testing | Vitest |

---

## Database Schema

| Table | Purpose |
|---|---|
| `users` | Authenticated user accounts (Clerk subject id in `openId`) |
| `leagues` | ESPN league configurations and credentials |
| `teams` | Team records per season, linked to leagues |
| `players` | Player registry with position and NFL team |
| `matchups` | Weekly head-to-head matchup results |
| `playerStats` | Weekly player scoring and roster slot data |
| `transactions` | Trade, waiver, add/drop activity log |
| `teamAllTimeStats` | Aggregated career statistics per team |

---

## API Procedures (tRPC)

### `auth`
- `me` — Returns the currently authenticated user
- `logout` — Clears the session cookie

### `league`
- `list` — Returns all leagues in the system
- `sync` — Syncs a single season from ESPN
- `syncAllSeasons` — Syncs all historical seasons for a league
- `teams` — Returns teams for a league (single season or all-time aggregate)
- `matchups` — Returns matchups for a specific week and season
- `allMatchups` — Returns all matchups for a league
- `transactions` — Returns recent activity/transactions
- `delete` — Removes a league from the tracker
- `rename` — Updates the display name of a league
- `aiQuery` — Sends a natural language question to the AI assistant
- `exportStats` — Generates a PDF export of league stats
- `weeklyRecap` — Generates an AI-powered weekly recap narrative
- `teamHistory` — Returns a team's full history across all seasons
- `seasonSummaries` — Returns season-by-season summary cards
- `ownerLeaderboard` — Returns all-time owner rankings

### `stats`
- `aggregateStats` — Returns aggregate statistics across all leagues

---

## Project Structure

```
client/
  src/
    pages/           ← All page-level components
    components/      ← Reusable UI components (shadcn/ui + custom)
    contexts/        ← ThemeContext
    hooks/           ← Custom React hooks
    lib/trpc.ts      ← tRPC client binding
    App.tsx          ← Route definitions
    index.css        ← Global theme and Tailwind config

drizzle/
  schema.ts          ← Database table definitions
  relations.ts       ← Drizzle ORM relations

server/
  routers.ts         ← All tRPC procedures
  db.ts              ← Core database connection
  leagueDb.ts        ← League and team query helpers
  espnClient.ts      ← ESPN API client (production build)
  espnSync.ts        ← Single-season sync logic
  espnMultiSeasonSync.ts ← Multi-season historical sync
  aiQuery.ts         ← AI query handler
  weeklyRecap.ts     ← Weekly recap generator
  pdfExport.ts       ← PDF report generation
  userStatsDb.ts     ← User aggregate statistics
  storage.ts         ← S3 file storage helpers
  *.test.ts          ← Vitest test files

shared/
  types.ts           ← Shared TypeScript types
  const.ts           ← Shared constants
```

---

## Pages and Routes

| Route | Page | Description |
|---|---|---|
| `/` | Home | Landing page with login CTA |
| `/sign-in` | SignIn | Clerk sign-in |
| `/sign-up` | SignUp | Clerk sign-up |
| `/dashboard` | Dashboard | League overview and quick stats |
| `/setup` | LeagueSetup | Add a new ESPN league |
| `/faq` | FAQ | Help and frequently asked questions |
| `/league/:id` | LeagueDetail | Full league detail with standings and tabs |
| `/league/:id/highlights` | HistoricalHighlights | Season-by-season highlights |
| `/league/:id/compare` | TeamComparison | Side-by-side team comparison |
| `/league/:id/recap` | WeeklyRecap | AI-generated weekly recap |
| `/team/:espnTeamId/:espnLeagueId/history` | TeamHistory | Individual team history |
| `/seasons/:espnLeagueId` | BrowseSeasons | Browse all seasons |
| `/leaderboard/:espnLeagueId` | OwnerLeaderboard | All-time owner rankings |

---

## Environment Variables

Copy `.env.example` to `.env`. Do not commit real secrets.

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | MySQL connection string |
| `DB_POOL_SIZE` | Optional pool size (default 10) |
| `JWT_SECRET` | Reserved/legacy secret (keep set) |
| `VITE_CLERK_PUBLISHABLE_KEY` | Clerk publishable key (browser) |
| `CLERK_SECRET_KEY` | Clerk secret key (server) |
| `OWNER_OPEN_ID` | Optional Clerk user id granted `admin` |
| `OPENAI_API_KEY` | OpenAI API key for AI features |
| `OPENAI_API_URL` | Chat completions base (default OpenAI) |
| `OPENAI_MODEL` | Model id (default `gpt-4o-mini`) |
| `PORT` | Listen port (default 3000) |

Full deploy steps: [`DEPLOY.md`](./DEPLOY.md).

---

## Development

```bash
# Install dependencies
pnpm install

# Copy env template and fill in Clerk + DB + OpenAI values
cp .env.example .env

# Push database schema changes
pnpm db:push

# Start development server
pnpm dev

# Run all tests
pnpm test
```

Production start after `pnpm build`:

```bash
pnpm start
# Health: GET /api/health
```

---

## Testing

Vitest is used for all unit and integration tests. Test files are co-located with server logic under `server/*.test.ts`.

### Prerequisites

- **Node.js 22+** and **pnpm 10+** installed
- No database or ESPN credentials are required — the test suite runs without external services
- Copy `.env.example` to `.env` when running the app locally (not needed for tests)

### Running tests

```bash
# Run all tests once (used in CI)
pnpm test

# Watch mode — re-runs affected tests on file save
pnpm test:watch

# Run with coverage report (outputs to ./coverage/)
pnpm test:coverage
```

### Test files

| Test File | Coverage |
|---|---|
| `auth.logout.test.ts` | Auth logout procedure |
| `league.sync.test.ts` | ESPN sync and data persistence |
| `league.teams.test.ts` | Team query functions |
| `league.alltimeStandings.test.ts` | All-time standings aggregation |
| `league.ownerLeaderboard.test.ts` | Owner leaderboard rankings |
| `league.rename.test.ts` | League rename procedure |
| `league.seasonSummaries.test.ts` | Season summary generation |
| `league.teamConsolidation.test.ts` | Team deduplication by ESPN ID |
| `league.teamHistory.test.ts` | Team history across seasons |
| `weeklyRecap.test.ts` | Weekly recap generation |

### Common failure notes

| Symptom | Cause | Fix |
|---|---|---|
| `Error: Database not available` | `DATABASE_URL` not set — expected in CI/local without a DB | Tests skip DB-dependent assertions; this is not a failure |
| `Error: No matchups found` | No data synced for the test league/week | Same — tests skip gracefully |
| `Cannot find module '@shared/...'` | Path aliases not resolved | Run tests via `pnpm test`, not directly with `node` |
| TypeScript errors in test files | Test files are excluded from `tsc` by design | Run `pnpm check` for production code only; test types are checked by Vitest |

---

## ESPN Private League Setup

To sync a private ESPN league, you need two cookies from your ESPN session:

1. Log in to [ESPN Fantasy Football](https://fantasy.espn.com)
2. Open browser DevTools → Application → Cookies
3. Copy the value of `espn_s2` (your `espnS2` credential)
4. Copy the value of `SWID` (your `swid` credential)
5. Enter both values when adding your league in the app

These credentials are stored securely and used only to authenticate ESPN API requests.

---

## Version History

| Version | Date | Notes |
|---|---|---|
| v1.0 | Feb 2026 | Initial production release — dashboard, standings, matchups, AI assistant, multi-season sync, owner leaderboard, weekly recap, PDF export |
