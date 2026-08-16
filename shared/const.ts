export const UNAUTHED_ERR_MSG = "Please login (10001)";
export const NOT_ADMIN_ERR_MSG = "You do not have required permission (10002)";

/**
 * Historical analytics (all-time stats, past-season browsing, owner
 * leaderboard, highlights, comparisons) are hidden while past-season data is
 * re-imported and verified — see AUDIT.md Phases 3-4. Current-season
 * standings, matchups, rosters, and sync are unaffected. Flip to true to
 * restore the history screens once seasons are validated.
 */
export const HISTORY_ENABLED = true;
