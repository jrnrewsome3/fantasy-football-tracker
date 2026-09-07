import { beforeEach, describe, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({
  membership: vi.fn(),
  league: vi.fn(),
  teams: vi.fn(),
  matchups: vi.fn(),
  roster: vi.fn(),
  games: vi.fn(),
  series: vi.fn(),
}));
vi.mock("./leagueAccess", () => ({ getLeagueMembership: m.membership }));
vi.mock("./leagueDb", () => ({
  getLeagueById: m.league,
  getTeamsByLeagueAndSeason: m.teams,
  getMatchupsByWeek: m.matchups,
  getRosterForTeamWeek: m.roster,
}));
vi.mock("./weather", () => ({ getNFLWeekOutlook: m.games }));
vi.mock("./rivalry", () => ({ getMatchupSeries: m.series }));
import { getMyWeek } from "./myWeek";
beforeEach(() => {
  vi.resetAllMocks();
  m.membership.mockResolvedValue({ espnTeamId: 2 });
  m.league.mockResolvedValue({ seasonYear: 2026, currentWeek: 1 });
  m.teams.mockResolvedValue([
    { espnTeamId: 1, name: "Home" },
    { espnTeamId: 2, name: "Away" },
  ]);
  m.matchups.mockResolvedValue([
    {
      homeTeamId: 1,
      awayTeamId: 2,
      homeProjected: 125.25,
      awayProjected: 110.75,
    },
  ]);
  m.series.mockResolvedValue(new Map());
  m.games.mockRejectedValue(new Error("schedule down"));
  m.roster.mockImplementation(async (_l, _s, _w, id) => [
    {
      name: `Starter ${id}`,
      position: "WR",
      slotPosition: "WR",
      nflTeam: "DAL",
      status: "ACTIVE",
      wasStarted: true,
      projectedPoints: 17.25,
      points: null,
      week: 1,
      syncedAt: new Date("2026-09-07T17:00:00Z"),
    },
    {
      name: `Bench ${id}`,
      wasStarted: false,
      slotPosition: "Bench",
      projectedPoints: 25,
    },
  ]);
});
describe("personal lineup payload", () => {
  it("uses member ESPN team ID and gets both exact-week starting lineups, keeping bench separate", async () => {
    const result = await getMyWeek(1, 99);
    expect(result.teamName).toBe("Away");
    expect(result.myProjected).toBe(110.75);
    expect(result.opponentName).toBe("Home");
    expect(result.starters.map(p => p.name)).toEqual(["Starter 2"]);
    expect(result.opponentStarters.map(p => p.name)).toEqual(["Starter 1"]);
    expect(result.bench.map(p => p.name)).toEqual(["Bench 2"]);
    expect(m.roster).toHaveBeenCalledWith(1, 2026, 1, 2);
    expect(result.alerts.map(a => a.message).join(" ")).not.toMatch(/on bye/);
  });
  it("does not guess a team for an unassigned member", async () => {
    m.membership.mockResolvedValue(null);
    expect((await getMyWeek(1, 99)).hasTeam).toBe(false);
    expect(m.roster).not.toHaveBeenCalled();
  });
  it("allows selected league team comparison but rejects a team outside the season", async () => {
    expect((await getMyWeek(1, 99, 1)).teamName).toBe("Home");
    await expect(getMyWeek(1, 99, 333)).rejects.toThrow("not in this league");
  });
  it("still shows the opponent if the member roster is missing", async () => {
    const load = m.roster.getMockImplementation()!;
    m.roster.mockImplementation((...args) =>
      args[3] === 2 ? [] : load(...args)
    );
    const result = await getMyWeek(1, 99);
    expect(result.hasRoster).toBe(false);
    expect(result.rosterSyncedAt).toBeNull();
    expect(result.opponentStarters).toHaveLength(1);
  });
});
