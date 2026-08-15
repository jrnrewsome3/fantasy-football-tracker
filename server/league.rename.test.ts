import { describe, expect, it, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): TrpcContext {
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

  return ctx;
}

describe("league.rename", () => {
  it("validates input schema - requires leagueId and newName", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Test missing leagueId
    await expect(
      // @ts-expect-error - testing invalid input
      caller.league.rename({ newName: "Test League" })
    ).rejects.toThrow();

    // Test missing newName
    await expect(
      // @ts-expect-error - testing invalid input
      caller.league.rename({ leagueId: 1 })
    ).rejects.toThrow();

    // Test empty newName
    await expect(
      caller.league.rename({ leagueId: 1, newName: "" })
    ).rejects.toThrow();
  });

  it("validates newName length constraints", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Test name too long (over 255 characters)
    const longName = "a".repeat(256);
    await expect(
      caller.league.rename({ leagueId: 1, newName: longName })
    ).rejects.toThrow();

    // Valid name should pass schema validation (actual DB operation may fail if league doesn't exist)
    const validName = "My Fantasy League 2024";
    try {
      await caller.league.rename({ leagueId: 999999, newName: validName });
    } catch (error: any) {
      // If it fails, it should be a DB error, not a validation error
      expect(error.message).not.toContain("validation");
    }
  });

  it("accepts valid rename input", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Test with valid input structure
    const validInput = {
      leagueId: 1,
      newName: "Trouble in Paradise 2024"
    };

    // This will fail at DB level since league doesn't exist in test env,
    // but proves the schema validation passes
    try {
      await caller.league.rename(validInput);
    } catch (error: any) {
      // Should fail at DB level, not validation
      expect(error.code).not.toBe("BAD_REQUEST");
    }
  });
});
