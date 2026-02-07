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

## New Features
- [x] Add Sync Now button to league detail page for on-demand ESPN data refresh
- [x] Build head-to-head records matrix showing win/loss records between all team pairs

## Issues
- [x] Fix publish blocking issue reported by user (fixed ESPN API import for production build)

## Onboarding Tutorial
- [x] Create tutorial overlay component with step-by-step guidance
- [x] Add tutorial state management (track progress, completion)
- [x] Build welcome step explaining app features
- [x] Add ESPN league connection tutorial step
- [x] Create dashboard navigation tutorial step
- [x] Add tutorial for viewing league stats and matchups
- [x] Implement skip and restart tutorial options

## Rebranding
- [x] Update app name to "Trouble in Paradise Fantasy Football Tracker"
- [x] Update all page titles and headers
- [ ] Update meta tags and browser title (requires manual update in Management UI Settings)
- [x] Update dashboard welcome messages

## FAQ / Help Center
- [x] Create FAQ page with comprehensive questions and answers
- [x] Add sections for Getting Started, ESPN Integration, Features, Troubleshooting
- [x] Include feature showcase explaining all capabilities
- [x] Add navigation link to FAQ from dashboard

## ESPN Sync Issues & Enhancements
- [x] Debug and fix ESPN sync failure for league 1489106 (added better error messages for private leagues)
- [ ] Test with user's actual ESPN league credentials
- [x] Enhance sync to automatically pull ALL historical seasons (not just current)
- [x] Store multi-year data for comprehensive historical analysis
- [ ] Add season selector to view stats by year
- [ ] Build historical matchup stories feature
- [ ] Create championship history timeline
- [ ] Add season-over-season comparison views

## New Feature Requests
- [x] Add AI-powered data query interface (ask questions about stats and get answers)
- [x] Add league deletion functionality to clean up incorrect entries
- [x] Improve dashboard formatting and data display
- [ ] Add league name editing capability
- [ ] Better error handling for invalid league data

## Latest Feature Requests
- [x] Update AI Assistant title to indicate "AI-Generated Stat Analysis"
- [x] Improve AI output robustness with better data context and formatting
- [x] Build Historical Highlights page with season/player/matchup filters
- [x] Add visual data illustrations to Historical Highlights
- [x] Add season filter dropdown to matchup viewer for browsing historical data

## Export & Sharing Features
- [x] Build PDF export for league stats and standings
- [x] Add social media sharing for Historical Highlights
- [x] Create shareable text generation for highlight cards
- [x] Add download buttons to league detail and highlights pages

## Standings Page Improvements
- [x] Add season selector dropdown to standings page
- [x] Add descriptive labels explaining what data is shown
- [x] Clean up layout with better organization and context
- [x] Show which season's data is currently displayed

## Team Comparison Tool
- [x] Build team comparison page
- [x] Add team selector dropdowns (select 2 teams)
- [x] Display head-to-head matchup history
- [x] Show win/loss record between the two teams
- [x] Add scoring statistics comparison
- [x] Include visual display for comparison data

## Weekly Recap Feature
- [x] Build AI-powered weekly recap generator service
- [x] Analyze matchup results to identify top performers
- [x] Detect biggest upsets (underdog wins)
- [x] Identify closest games and blowouts
- [x] Generate engaging narrative summaries
- [x] Create weekly recap UI page
- [x] Add week navigation to browse historical recaps
- [x] Display recap with sections for highlights, upsets, and storylines

## League Management Improvements
- [x] Add league rename functionality (edit button on dashboard)
- [x] Create backend endpoint for updating league names
- [x] Add rename dialog with input validation
- [x] Implement pencil icon button on league cards
- [x] Add success/error toast notifications for rename operations
- [x] Write and pass vitest tests for rename functionality
- [x] Clean up invalid/duplicate league entries (users can delete via trash icon)
- [x] Improve multi-season league display and organization
- [x] Show season year prominently in league cards

## Standings Page Data Filtering Issues
- [x] Fix standings page to filter teams by selected season (currently showing all teams from all years)
- [x] Add prominent season selector to standings page
- [x] Update backend query to only return teams that played in the selected season
- [x] Add seasonYear column to teams table schema
- [x] Update ESPN sync to include seasonYear when creating teams
- [x] Migrate existing team data to include seasonYear from their leagues
- [x] Create getTeamsByLeagueAndSeason function for filtered queries
- [x] Update frontend to pass seasonYear filter to teams query
- [x] Improve page descriptions and labels to clarify what data is being shown
- [x] Update header to show which season is being viewed
- [x] Update stats cards to show season-specific team counts
- [x] Ensure team statistics (W/L/T/PF/PA) match the selected season
- [x] Write and pass vitest tests for season-filtered teams query

## Weekly Recap Page Year Clarity
- [x] Add season year to Weekly Recap page header/title
- [x] Display "Week X of [YEAR] Season" prominently
- [x] Show which league/season the recap is for
- [x] Add year context to all sections (highlights, top performers, upsets)
- [x] Update all section descriptions to include week and year
- [x] Make it immediately obvious what year's data is being displayed
