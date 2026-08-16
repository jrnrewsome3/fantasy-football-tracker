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

/**
 * The original ESPN history importer and its manual-upload companions
 * (Import History, Upload History File, Clean Up History).
 *
 * Superseded: past seasons are now rebuilt from reconciled league records and
 * verified season by season before publishing. These tools would re-pull from
 * ESPN — which no longer exposes seasons before the current one — or overwrite
 * verified results from a file. Left off so a stray click cannot damage the
 * archive; the code stays in place for leagues that have no records to import
 * from and must start from ESPN.
 */
export const LEGACY_HISTORY_TOOLS = false;
