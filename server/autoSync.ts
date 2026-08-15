import { fullLeagueSync } from "./espnSync";
import { getAutoSyncLeagues, updateLeagueSyncState } from "./leagueDb";

let schedulerStarted = false;
let schedulerRunning = false;

export async function syncDueLeagues() {
  if (schedulerRunning) return;
  schedulerRunning = true;
  try {
    const dueLeagues = await getAutoSyncLeagues();
    for (const league of dueLeagues) {
      await updateLeagueSyncState(league.id, "syncing");
      const result = await fullLeagueSync(
        league.espnLeagueId,
        league.seasonYear,
        Math.max(1, league.currentWeek || 1)
      );
      if (result.success) {
        await updateLeagueSyncState(league.id, "success");
      } else {
        await updateLeagueSyncState(
          league.id,
          "error",
          result.message.slice(0, 1000)
        );
      }
    }
  } catch (error) {
    console.error("[Auto Sync] Scheduler failed", error);
  } finally {
    schedulerRunning = false;
  }
}

export function startLeagueAutoSync() {
  if (schedulerStarted) return;
  schedulerStarted = true;
  console.log("[Auto Sync] Commissioner league refresh scheduler started");

  const initial = setTimeout(() => void syncDueLeagues(), 10_000);
  initial.unref();
  const interval = setInterval(() => void syncDueLeagues(), 60_000);
  interval.unref();
}
