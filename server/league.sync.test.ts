import { describe, expect, it } from "vitest";
import { appRouter, ensureLeagueSetupAccess } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "clerk",
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

  return { ctx };
}

describe("league.list", () => {
  it("returns an array of leagues for authenticated user", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.league.list();

    expect(Array.isArray(result)).toBe(true);
    // Should return empty array if no leagues synced yet
    expect(result.length).toBeGreaterThanOrEqual(0);
  });
});

describe("league.sync validation", () => {
  it("directs members to the invite-code flow for an existing league", () => {
    expect(() => ensureLeagueSetupAccess(99, 1)).toThrow(
      /Join Team League.*invite code/i
    );
    expect(() => ensureLeagueSetupAccess(1, 1)).not.toThrow();
  });

  it("returns error for invalid ESPN credentials", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // This should return an error result due to invalid ESPN credentials
    const result = await caller.league.sync({
      espnLeagueId: "invalid",
      seasonYear: 2026,
      currentWeek: 1,
    });

    expect(result.success).toBe(false);
    expect(result.message).toBeTruthy();
  });

  it("accepts valid league sync parameters", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Note: This will fail to actually sync without valid ESPN credentials,
    // but it should accept the parameters and return a structured error
    const result = await caller.league.sync({
      espnLeagueId: "123456",
      seasonYear: 2026,
      currentWeek: 1,
    });

    expect(result).toHaveProperty("success");
    expect(result).toHaveProperty("message");
    expect(typeof result.success).toBe("boolean");
    expect(typeof result.message).toBe("string");
  });
});
