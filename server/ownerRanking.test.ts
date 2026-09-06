import { describe, expect, it, vi } from "vitest";
import {
  isWinPercentageEligible,
  sortOwnerLeaderboard,
  summarizeOwnerLeaderboard,
} from "../shared/ownerRanking";
import { getOwnerLeaderboard } from "./leagueDb";
import { getDb } from "./db";
vi.mock("./db", () => ({ getDb: vi.fn() }));
const owner = (
  ownerName: string,
  wins: number,
  losses: number,
  isCurrentOwner = true,
  points = 0
) => ({
  ownerName,
  totalWins: wins,
  totalGames: wins + losses,
  winPercentage: (100 * wins) / (wins + losses),
  isCurrentOwner,
  totalPointsFor: points,
});

describe("owner percentage qualification", () => {
  it("requires current participation and includes the exact 30-game boundary", () => {
    expect(isWinPercentageEligible(owner("Current", 29, 0))).toBe(false);
    expect(isWinPercentageEligible(owner("Current", 30, 0))).toBe(true);
    expect(isWinPercentageEligible(owner("Former", 40, 0, false))).toBe(false);
  });
  it("selects Roger over short-tenure and former owners without deleting their history", () => {
    const rows = [
      owner("Bennett", 10, 3, false),
      owner("Roger", 65, 46, true, 17000),
      owner("Daly", 63, 48, true, 17911),
      owner("Former", 50, 0, false),
      owner("New", 29, 0),
    ];
    const summary = summarizeOwnerLeaderboard(rows);
    expect(summary.bestWinPercentage?.ownerName).toBe("Roger");
    expect(summary.bestWinPercentage?.winPercentage).toBeCloseTo(58.5586);
    expect(summary.mostWins?.ownerName).toBe("Roger");
    expect(summary.mostPoints?.ownerName).toBe("Daly");
    const ranked = sortOwnerLeaderboard(rows, "winPct");
    expect(ranked.slice(0, 2).map(o => o.ownerName)).toEqual(["Roger", "Daly"]);
    expect(ranked).toHaveLength(rows.length);
    expect(rows[0].ownerName).toBe("Bennett");
    expect(
      summarizeOwnerLeaderboard(sortOwnerLeaderboard(rows, "points")).mostWins
        ?.ownerName
    ).toBe("Roger");
  });
  it("has no award when no owner qualifies", () => {
    expect(summarizeOwnerLeaderboard([]).bestWinPercentage).toBeUndefined();
    expect(
      summarizeOwnerLeaderboard([owner("Bennett", 10, 3, false)])
        .bestWinPercentage
    ).toBeUndefined();
  });
  it("recognizes current zero-game teams by franchise while retaining historic totals", async () => {
    const team = (
      franchiseKey: string,
      seasonYear: number,
      wins: number,
      losses: number,
      name = franchiseKey
    ) => ({
      teams: {
        franchiseKey,
        ownerName: name,
        name,
        seasonYear,
        wins,
        losses,
        ties: 0,
        pointsFor: 0,
        pointsAgainst: 0,
      },
      leagues: { seasonYear: 2026 },
    });
    vi.mocked(getDb).mockResolvedValue({
      select: () => ({
        from: () => ({
          innerJoin: () => ({
            where: async () => [
              team("roger", 2025, 8, 5),
              team("roger", 2026, 0, 0, "New team label"),
              team("bennett", 2020, 10, 3),
            ],
          }),
        }),
      }),
    } as any);
    const result = await getOwnerLeaderboard("1489106");
    expect(result.find(o => o.franchiseKey === "roger")).toMatchObject({
      isCurrentOwner: true,
      totalGames: 13,
      totalWins: 8,
      seasonsPlayed: 1,
    });
    expect(result.find(o => o.franchiseKey === "bennett")).toMatchObject({
      isCurrentOwner: false,
      totalGames: 13,
    });
  });
});
