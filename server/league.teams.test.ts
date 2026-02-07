import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };

  return ctx;
}

describe("league.teams", () => {
  it("validates input schema - requires leagueId", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Test missing leagueId
    await expect(
      // @ts-expect-error - testing invalid input
      caller.league.teams({})
    ).rejects.toThrow();
  });

  it("accepts leagueId without seasonYear", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Valid input with just leagueId
    try {
      await caller.league.teams({ leagueId: 1 });
    } catch (error: any) {
      // Should fail at DB level, not validation
      expect(error.code).not.toBe("BAD_REQUEST");
    }
  });

  it("accepts leagueId with optional seasonYear filter", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Valid input with leagueId and seasonYear
    try {
      await caller.league.teams({ leagueId: 1, seasonYear: 2024 });
    } catch (error: any) {
      // Should fail at DB level, not validation
      expect(error.code).not.toBe("BAD_REQUEST");
    }
  });

  it("rejects invalid seasonYear type", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Test invalid seasonYear type
    await expect(
      // @ts-expect-error - testing invalid input
      caller.league.teams({ leagueId: 1, seasonYear: "2024" })
    ).rejects.toThrow();
  });
});
