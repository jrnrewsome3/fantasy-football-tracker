import { beforeEach, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({
  boxes: vi.fn(),
  replace: vi.fn(),
  player: vi.fn(),
}));
vi.mock("./espnClient", () => ({
  createESPNClient: () => ({}),
  fetchBoxScores: m.boxes,
}));
vi.mock("./leagueDb", () => ({
  getLeagueByEspnId: async () => ({ id: 1, seasonYear: 2026, currentWeek: 1 }),
  upsertPlayer: m.player,
  upsertMatchup: async () => {},
  replaceWeekPlayerStats: m.replace,
  pruneWeekMatchups: async () => {},
}));
import { syncWeekMatchups } from "./espnSync";
beforeEach(() => {
  vi.clearAllMocks();
  m.player.mockImplementation(async p => ({ id: p.espnPlayerId }));
  const player = (id: number, position: string) => ({
    player: { id, fullName: `Player ${id}` },
    position,
    totalPoints: null,
    projectedPoints: 12.125,
  });
  m.boxes.mockResolvedValue([
    {
      homeTeamId: 3,
      awayTeamId: 10,
      homeRoster: [player(1, "WR"), player(2, "IR")],
      awayRoster: [player(3, "QB"), player(4, "Bench")],
    },
  ]);
  m.replace.mockResolvedValue(undefined);
});
it("replaces the week snapshot once and keeps IR and bench out of starters", async () => {
  expect((await syncWeekMatchups("1489106", 2026, 1)).success).toBe(true);
  expect(m.replace).toHaveBeenCalledTimes(1);
  const [league, year, week, rows] = m.replace.mock.calls[0];
  expect([league, year, week]).toEqual([1, 2026, 1]);
  expect(rows.map((r: any) => r.wasStarted)).toEqual([1, 0, 1, 0]);
  expect(rows[0].projectedPoints).toBe(12.125);
});
it("preserves the old snapshot when one ESPN side is missing", async () => {
  m.boxes.mockResolvedValue([
    { homeTeamId: 3, awayTeamId: 10, homeRoster: [], awayRoster: [] },
  ]);
  expect((await syncWeekMatchups("1489106", 2026, 1)).success).toBe(false);
  expect(m.replace).not.toHaveBeenCalled();
});
it("does not replace rosters when saving a player fails", async () => {
  m.player.mockRejectedValue(new Error("database unavailable"));
  expect((await syncWeekMatchups("1489106", 2026, 1)).success).toBe(false);
  expect(m.replace).not.toHaveBeenCalled();
});
it("reports a snapshot persistence failure", async () => {
  m.replace.mockRejectedValue(new Error("write failed"));
  expect((await syncWeekMatchups("1489106", 2026, 1)).success).toBe(false);
});
