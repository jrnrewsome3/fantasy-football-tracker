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

## Historical Team Profile Page
- [x] Create backend query to get team history across all seasons
- [x] Build team profile page route (/team/:espnTeamId/:espnLeagueId/history)
- [x] Display team header with name and logo
- [x] Show year-over-year stats table (Season, W-L-T, PF, PA, Diff)
- [x] Add career stats summary cards (record, points, differential)
- [x] Calculate win percentages and point averages
- [x] Add navigation from standings table (click team rows)
- [x] Show total career stats summary with 4 stat cards
- [x] Write vitest tests for team history query

## Browse Seasons Page
- [x] Create backend query to get all seasons with summary stats
- [x] Build browse seasons page route (/seasons/:espnLeagueId)
- [x] Display season cards in grid layout with visual design
- [x] Show quick stats for each season (teams, total games, top scorer, weeks)
- [x] Add season year prominently on each card with calendar icon
- [x] Link cards to league detail page (click to navigate)
- [x] Add 'Browse Seasons' button on dashboard league cards
- [x] Sort seasons by year (newest first)
- [x] Add archive summary card with total stats
- [x] Write vitest tests for seasons summary query

## Weekly Recap Duplicate Data Issue
- [x] Fix duplicate top performers (all showing same team)
- [x] Implement team deduplication logic keeping highest score
- [x] Fix duplicate biggest upsets (all showing same matchup)
- [x] Fix duplicate closest games (all showing same game)
- [x] Fix duplicate biggest blowouts (all showing same game)
- [x] Add season selector dropdown to Weekly Recap page
- [x] Allow users to view recaps for any available season
- [x] Ensure recap data is filtered by selected season
- [x] Update header to show effective season year
- [x] Reset week to 1 when changing seasons
- [x] Write and pass vitest tests for deduplication logic
- [x] Test that each section shows unique, accurate data

## League Deletion Persistence Issue (PAUSED)
- [ ] Investigate why deleted leagues reappear on dashboard
- [ ] Check database for duplicate league entries
- [ ] Identify code that recreates leagues after deletion
- [ ] Fix the root cause of league recreation
- [ ] Ensure delete operation properly removes leagues from database
- [ ] Test that deleted leagues stay deleted after page refresh

## League Detail Page Season Clarity
- [x] Fix confusing "2018" label - make it clear which season's data is being displayed
- [x] Add prominent season selector to league detail page header
- [x] Allow switching between all available seasons (2018, 2019... 2025)
- [x] Update all stats and highlights when season changes
- [x] Show "Viewing [YEAR] Season Data" prominently in header
- [x] Add calendar icon and bordered selector for visibility
- [x] Highlight selected season year in primary color

## AI Component Enhancement
- [x] Make AI query component more prominent and visible
- [x] Add strategic planning prompts (e.g., "Plan your strategy for next week")
- [x] Include suggested questions users can ask
- [x] Add visual indicators that AI can help with game planning
- [x] Improve AI component design to stand out on the page
- [x] Add examples like "Who should I start this week?" or "Analyze my team's weaknesses"
- [x] Rename to "AI Strategy Assistant" with pulsing sparkles icon
- [x] Add gradient background with border shadow for prominence
- [x] Separate strategic planning questions from stats questions
- [x] Add emoji indicators for question categories

## Team History Interactive Charts
- [x] Install Recharts library for interactive chart visualization
- [x] Create scoring trends line chart showing points scored per season
- [x] Create win/loss pattern bar chart showing W-L-T record per season
- [x] Add Points For and Points Against dual-line chart
- [x] Integrate charts into TeamHistory page in 2-column grid
- [x] Make charts responsive and interactive with tooltips
- [x] Add chart legends and axis labels
- [x] Style charts to match dark theme with proper colors
- [x] Add icons to chart card headers for visual clarity

## Duplicate Team Entries in Standings (CRITICAL)
- [x] Fix standings showing duplicate entries for same team with different names
- [x] Group teams by espnTeamId instead of team name
- [x] Aggregate stats (W-L-T, PF, PA) across all seasons for same espnTeamId
- [x] Display most recent team name in standings
- [x] Update backend query to consolidate team data by espnTeamId
- [x] Implement Map-based grouping logic in getTeamsByLeagueAndSeason
- [x] Use highest team.id to determine most recent name and logo
- [x] Sort consolidated teams by wins descending
- [x] Write and pass vitest tests for team consolidation logic
- [x] Test that teams with name changes appear as single entry
- [x] Verify stats are correctly summed across name changes

## Mobile Responsiveness (CRITICAL - iPhone/iPad)
- [x] Fix overlapping text in matchup cards on mobile
- [x] Prevent team names from cutting into scores
- [x] Optimize font sizes for mobile screens (text-xs sm:text-sm pattern)
- [x] Fix card layouts to stack properly on small screens
- [x] Redesign matchup cards with mobile-first layout (vertical on mobile, horizontal on desktop)
- [x] Add score display on mobile next to each team
- [x] Implement text truncation with line-clamp-1 for long team names
- [x] Set max-width constraints for team names on mobile (140px)
- [x] Make navigation tabs touch-friendly and properly spaced
- [x] Add horizontal scrolling for tabs with proper padding
- [x] Reduce tab font sizes on mobile (text-xs) and padding (px-3)
- [x] Ensure all text is readable without horizontal scrolling
- [x] Add proper padding and margins for mobile
- [x] Make buttons and interactive elements thumb-friendly
- [x] Optimize standings table for mobile viewing
- [x] Add horizontal scroll wrapper for standings table
- [x] Hide less critical columns on mobile (T, PA, Diff)
- [x] Reduce font sizes in table cells for mobile
- [x] Add min-width constraints to prevent column collapse

## Add Owner Names to Team Displays
- [x] Show owner names in matchup cards alongside team names
- [x] Add getOwnerName helper function to WeeklyMatchups component
- [x] Display owner names below team names in matchup cards
- [x] Add proper text truncation for owner names on mobile (line-clamp-1)
- [x] Ensure owner names are visible on mobile without causing overflow
- [x] Owner names already visible in standings table (desktop)
- [x] Weekly recap uses team names from backend (already includes proper names)

## Owner Leaderboard Page
- [x] Create backend query to aggregate owner stats across all seasons
- [x] Calculate total wins, losses, ties for each owner
- [x] Calculate total points scored and points against
- [x] Calculate win percentage for each owner
- [x] Track best season wins and year for each owner
- [x] Track worst season wins and year for each owner
- [x] Build OwnerLeaderboard page component
- [x] Display rankings with owner names and lifetime stats
- [x] Add sorting options (by wins, win %, points)
- [x] Show owner's best season with wins and year
- [x] Add trophy icons for top 3 rankings (gold, silver, bronze)
- [x] Add navigation link to leaderboard from dashboard
- [x] Create "Leaderboard" button on league cards
- [x] Make leaderboard mobile-responsive with hidden columns on small screens
- [x] Add stats summary cards at top of leaderboard
- [x] Write vitest tests for owner stats aggregation
- [x] Add ownerLeaderboard procedure to tRPC router
- [x] Add route /leaderboard/:espnLeagueId to App.tsx
