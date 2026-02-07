# Fantasy Football Tracker - TODO

## Database Schema
- [x] Create leagues table for storing ESPN league configuration
- [x] Create teams table for league teams and their metadata
- [x] Create players table for player information and stats
- [x] Create matchups table for weekly matchup records
- [x] Create transactions table for tracking trades, waivers, and roster moves
- [x] Create team_stats table for season and all-time team statistics
- [x] Create player_stats table for weekly and season player statistics
- [x] Create league_settings table for ESPN credentials and sync configuration

## ESPN API Integration
- [x] Install espn-fantasy-football-api npm package
- [x] Create ESPN API client wrapper in server
- [x] Build league data sync service
- [x] Implement player stats fetching and storage
- [x] Create matchup data sync functionality
- [x] Build transaction history sync
- [x] Add error handling and retry logic for API calls

## Authentication & User Management
- [x] Configure role-based access (admin/user roles already in schema)
- [x] Create admin-only procedures for ESPN credentials management
- [ ] Build user profile pages
- [ ] Implement league member association with users

## All-Time Stats Dashboard
- [x] Create dashboard layout with navigation
- [x] Build career records display (wins, losses, championships)
- [ ] Implement head-to-head matchup history matrix
- [ ] Create championship history timeline
- [ ] Build league milestones and records section
- [x] Add all-time scoring leaders
- [ ] Display longest winning/losing streaks

## Weekly Matchup Viewer
- [x] Create current week matchup display
- [x] Show live scores and projected points
- [ ] Build player-level scoring breakdown
- [x] Add week selector for historical matchups
- [ ] Implement auto-refresh for live updates
- [ ] Display matchup statistics and trends

## Team Profile Pages
- [ ] Create team overview with current roster
- [ ] Build season schedule view
- [ ] Display transaction history for team
- [ ] Show performance analytics and charts
- [ ] Add team statistics (points for/against, record)
- [ ] Implement historical season records

## Player Statistics Pages
- [ ] Create player profile layout
- [ ] Display season statistics
- [ ] Show weekly performance breakdown
- [ ] Build ownership history within league
- [ ] Add player trends and analytics
- [ ] Implement player comparison tool

## League Activity Feed
- [ ] Create real-time activity feed component
- [ ] Display trade notifications
- [ ] Show waiver wire pickups
- [ ] Track roster moves and lineup changes
- [ ] Add filtering by activity type
- [ ] Implement pagination for activity history

## Power Rankings
- [ ] Build power rankings calculation algorithm
- [ ] Create rankings display page
- [ ] Show weekly ranking changes
- [ ] Add performance metrics breakdown
- [ ] Implement historical rankings chart

## Waiver Wire Assistant
- [ ] Create available players list
- [ ] Build filtering by position
- [ ] Add sorting by various stats
- [ ] Show player trends and projections
- [ ] Implement search functionality
- [ ] Display ownership percentage

## UI/UX Design
- [x] Choose color scheme and design system
- [x] Create responsive navigation layout
- [x] Design dashboard cards and components
- [x] Build loading states and skeletons
- [x] Add error handling UI
- [x] Implement mobile-responsive design

## Testing & Deployment
- [x] Write vitest tests for ESPN API integration
- [x] Test database queries and procedures
- [ ] Verify all user flows
- [ ] Test with real ESPN league data
- [ ] Create deployment checkpoint
- [ ] Document setup instructions

## Bug Fixes
- [x] Fix app loading issue reported by user

## Trade History & AI Analysis Feature
- [x] Research ESPN API transactions/trades endpoint structure
- [x] Create trades table in database schema (id, leagueId, seasonYear, tradeDate, weekNumber)
- [x] Create trade_players table (tradeId, playerId, playerName, fromTeamId, toTeamId)
- [x] Push database schema changes (trades and tradePlayers tables created)
- [x] Update ESPN sync to fetch trade transactions for all seasons
- [x] Parse trade data and store in database with proper relationships
- [x] Create getTrades query function with filtering (by league, season, team)
- [x] Add tRPC procedures for fetching trades (byLeague, bySeason)
- [x] Integrate trade sync into fullLeagueSync function
- [x] Build Trade History page route (/trades/:espnLeagueId)
- [x] Display trades in chronological timeline with season grouping
- [x] Add season filter dropdown to view trades by year
- [x] Show trade cards with date, teams involved, and players exchanged
- [x] Add player position badges to trade displays
- [x] Implement "Analyze This Trade" button for each trade (placeholder)
- [x] Add Trade History navigation button to dashboard league cards
- [x] Add route to App.tsx for Trade History page
- [x] Create AI trade analysis function that evaluates trade outcomes
- [x] Pull player stats before/after trade date (framework in place)
- [x] Calculate team performance changes after trade
- [x] Generate narrative analysis with "trade winner" determination using LLM
- [x] Add tRPC procedure for AI trade analysis (trades.analyze mutation)
- [x] Connect AI analysis to "Analyze Trade" button in UI
- [x] Display AI analysis results in dialog with winner badge and stats
- [x] Add Trade History navigation button to dashboard league cards
- [ ] Add "View Trades" option to league detail page
- [x] Write vitest tests for trade sync and queries (6 tests passing)
- [ ] Test AI analysis with real historical trades (requires actual ESPN data sync)
- [ ] Verify trade data accuracy with ESPN league (requires user to sync their league)
