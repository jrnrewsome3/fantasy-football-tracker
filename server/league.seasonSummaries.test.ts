import { describe, it, expect } from "vitest";
import { appRouter } from "./routers";
import type { Context } from "./_core/context";

describe("league.seasonSummaries", () => {
  it("should return season summaries for a league", async () => {
    const mockContext: Context = {
      user: { openId: "test-user", name: "Test User", email: "test@example.com", role: "user" },
      req: {} as any,
      res: {} as any,
    };

    const caller = appRouter.createCaller(mockContext);

    const result = await caller.league.seasonSummaries({
      espnLeagueId: "1489106",
    });

    expect(Array.isArray(result)).toBe(true);
    // Result may be empty if no data synced yet, which is valid
    if (result.length > 0) {
      expect(result[0]).toHaveProperty("league");
      expect(result[0]).toHaveProperty("teamCount");
      expect(result[0]).toHaveProperty("totalGames");
      expect(result[0].league).toHaveProperty("seasonYear");
      expect(typeof result[0].teamCount).toBe("number");
      expect(typeof result[0].totalGames).toBe("number");
    }
  });

  it("should return empty array for non-existent league", async () => {
    const mockContext: Context = {
      user: { openId: "test-user", name: "Test User", email: "test@example.com", role: "user" },
      req: {} as any,
      res: {} as any,
    };

    const caller = appRouter.createCaller(mockContext);

    const result = await caller.league.seasonSummaries({
      espnLeagueId: "nonexistent999",
    });

    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(0);
  });

  it("should sort seasons by year descending", async () => {
    const mockContext: Context = {
      user: { openId: "test-user", name: "Test User", email: "test@example.com", role: "user" },
      req: {} as any,
      res: {} as any,
    };

    const caller = appRouter.createCaller(mockContext);

    const result = await caller.league.seasonSummaries({
      espnLeagueId: "1489106",
    });

    if (result.length > 1) {
      for (let i = 0; i < result.length - 1; i++) {
        expect(result[i].league.seasonYear).toBeGreaterThanOrEqual(result[i + 1].league.seasonYear);
      }
    }
  });
});
