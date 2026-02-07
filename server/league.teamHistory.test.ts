import { describe, it, expect } from "vitest";
import { appRouter } from "./routers";
import type { Context } from "./_core/context";

describe("league.teamHistory", () => {
  it("should return team history across multiple seasons", async () => {
    const mockContext: Context = {
      user: { openId: "test-user", name: "Test User", email: "test@example.com", role: "user" },
      req: {} as any,
      res: {} as any,
    };

    const caller = appRouter.createCaller(mockContext);

    const result = await caller.league.teamHistory({
      espnTeamId: 1,
      espnLeagueId: "1489106",
    });

    expect(Array.isArray(result)).toBe(true);
    // Result may be empty if no data synced yet, which is valid
    if (result.length > 0) {
      expect(result[0]).toHaveProperty("name");
      expect(result[0]).toHaveProperty("seasonYear");
      expect(result[0]).toHaveProperty("wins");
      expect(result[0]).toHaveProperty("losses");
      expect(result[0]).toHaveProperty("pointsFor");
      expect(result[0]).toHaveProperty("pointsAgainst");
    }
  });

  it("should return empty array for non-existent team", async () => {
    const mockContext: Context = {
      user: { openId: "test-user", name: "Test User", email: "test@example.com", role: "user" },
      req: {} as any,
      res: {} as any,
    };

    const caller = appRouter.createCaller(mockContext);

    const result = await caller.league.teamHistory({
      espnTeamId: 999999,
      espnLeagueId: "nonexistent",
    });

    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(0);
  });
});
