import { beforeEach, describe, expect, it, vi } from "vitest";

const getDb = vi.fn();
const getLeagueByEspnId = vi.fn();
const upsertLeagueSeason = vi.fn();
const upsertTeam = vi.fn();
const deleteWhere = vi.fn();
const matchupLimit = vi.fn();

vi.mock("./db", () => ({ getDb }));
vi.mock("./leagueDb", () => ({
  getLeagueByEspnId,
  upsertLeagueSeason,
  upsertTeam,
}));

describe("manual historical standings import", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    matchupLimit.mockResolvedValue([]);
    getDb.mockResolvedValue({
      select: () => ({
        from: () => ({ where: () => ({ limit: matchupLimit }) }),
      }),
      delete: () => ({ where: deleteWhere }),
    });
    deleteWhere.mockResolvedValue(undefined);
    getLeagueByEspnId.mockResolvedValue({ id: 1, seasonYear: 2026 });
    upsertTeam.mockResolvedValue({ id: 1 });
    upsertLeagueSeason.mockResolvedValue(undefined);
  });

  it("imports partial standings and preserves co-manager names", async () => {
    const { importManualHistory } = await import("./manualHistoryImport");
    const result = await importManualHistory({
      leagueId: "1489106",
      standingsComplete: true,
      matchupsComplete: false,
      seasons: [
        {
          year: 2025,
          champion: "Team Alpha",
          teams: [
            {
              rank: 1,
              teamName: "Team Alpha",
              ownerNames: ["Alex", "Jordan"],
              wins: 10,
              losses: 4,
              ties: 0,
            },
            {
              rank: 2,
              teamName: "Team Beta",
              ownerNames: ["Sam"],
              wins: 8,
              losses: 6,
              ties: 0,
            },
          ],
        },
      ],
    });

    expect(result).toMatchObject({
      success: true,
      seasonsImported: 1,
      teamsImported: 2,
    });
    expect(upsertTeam).toHaveBeenCalledWith(
      expect.objectContaining({ ownerName: "Alex & Jordan", seasonYear: 2025 })
    );
    expect(upsertLeagueSeason).toHaveBeenCalledWith(
      expect.objectContaining({
        championName: "Team Alpha",
        standingsComplete: 1,
        matchupsComplete: 0,
        ownershipComplete: 1,
      })
    );
  });

  it("does not overwrite a season with weekly matchup data", async () => {
    matchupLimit.mockResolvedValue([{ id: 9 }]);
    const { importManualHistory } = await import("./manualHistoryImport");
    const result = await importManualHistory({
      leagueId: "1489106",
      matchupsComplete: false,
      seasons: [
        {
          year: 2025,
          teams: [
            { rank: 1, teamName: "A", wins: 1, losses: 0 },
            { rank: 2, teamName: "B", wins: 0, losses: 1 },
          ],
        },
      ],
    });

    expect(result.success).toBe(false);
    expect(result.warnings[0]).toContain("more complete data was preserved");
    expect(deleteWhere).not.toHaveBeenCalled();
  });
});
