import { beforeEach, describe, expect, it, vi } from "vitest";

const getLeagueByEspnId = vi.fn();
const syncHistoricalSeasonData = vi.fn();
const syncWeekMatchups = vi.fn();

vi.mock("./leagueDb", () => ({ getLeagueByEspnId }));
vi.mock("./espnSync", () => ({
  syncHistoricalSeasonData,
  syncWeekMatchups,
}));

describe("archived ESPN season import", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getLeagueByEspnId.mockResolvedValue({ seasonYear: 2026 });
    syncHistoricalSeasonData.mockImplementation(
      async (_leagueId: string, year: number) =>
        year === 2025
          ? { success: true, message: "ok", teamsSynced: 10, finalWeek: 2 }
          : { success: false, message: "not available" }
    );
    syncWeekMatchups.mockResolvedValue({
      success: true,
      message: "ok",
      matchupsSynced: 5,
    });
  });

  it("imports available prior seasons and skips unavailable years", async () => {
    const { syncAllSeasons } = await import("./espnMultiSeasonSync");
    const result = await syncAllSeasons("12345");

    expect(result.success).toBe(true);
    expect(result.seasonsSynced).toBe(1);
    expect(result.seasons[0]).toMatchObject({ year: 2025, success: true });
    expect(syncWeekMatchups).toHaveBeenCalledTimes(2);
    expect(syncWeekMatchups).toHaveBeenCalledWith("12345", 2025, 1);
    expect(syncWeekMatchups).toHaveBeenCalledWith("12345", 2025, 2);
  });

  it("requires the current league to be connected first", async () => {
    getLeagueByEspnId.mockResolvedValue(null);
    const { syncAllSeasons } = await import("./espnMultiSeasonSync");
    const result = await syncAllSeasons("missing");

    expect(result.success).toBe(false);
    expect(result.seasons).toEqual([]);
    expect(syncHistoricalSeasonData).not.toHaveBeenCalled();
  });
});
