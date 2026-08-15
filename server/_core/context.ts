import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { authenticateClerkRequest } from "./clerkAuth";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    user = await authenticateClerkRequest(opts.req);
  } catch (error) {
    // Authentication is optional for public procedures, but log the safe error
    // message so production failures are diagnosable without exposing tokens.
    console.warn("[Auth] Request authentication failed", {
      message: error instanceof Error ? error.message : "Unknown error",
      path: opts.req.path,
    });
    user = null;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
