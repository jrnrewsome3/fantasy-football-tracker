import { createClerkClient, verifyToken } from "@clerk/backend";
import type { Request } from "express";
import type { User } from "../../drizzle/schema";
import * as db from "../db";
import { ForbiddenError } from "@shared/_core/errors";
import { ENV } from "./env";

let clerkClient: ReturnType<typeof createClerkClient> | null = null;

function getClerk() {
  if (!ENV.clerkSecretKey) {
    throw new Error("CLERK_SECRET_KEY is not configured");
  }
  if (!clerkClient) {
    clerkClient = createClerkClient({ secretKey: ENV.clerkSecretKey });
  }
  return clerkClient;
}

function extractBearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) {
    return header.slice("Bearer ".length).trim() || null;
  }
  return null;
}

/**
 * Authenticate an incoming request using a Clerk session JWT
 * (Authorization: Bearer <token>) and upsert the local user row.
 */
export async function authenticateClerkRequest(req: Request): Promise<User> {
  if (!ENV.clerkSecretKey) {
    throw ForbiddenError("Authentication is not configured");
  }

  const token = extractBearerToken(req);
  if (!token) {
    throw ForbiddenError("Missing auth token");
  }

  let userId: string;
  try {
    const payload = await verifyToken(token, {
      secretKey: ENV.clerkSecretKey,
    });
    if (!payload.sub) {
      throw ForbiddenError("Invalid auth token");
    }
    userId = payload.sub;
  } catch (error) {
    console.warn("[Auth] Clerk token verification failed", String(error));
    throw ForbiddenError("Invalid auth token");
  }

  const signedInAt = new Date();
  let user = await db.getUserByOpenId(userId);

  if (!user) {
    const clerk = getClerk();
    const clerkUser = await clerk.users.getUser(userId);
    const primaryEmail =
      clerkUser.emailAddresses.find((e) => e.id === clerkUser.primaryEmailAddressId)
        ?.emailAddress ??
      clerkUser.emailAddresses[0]?.emailAddress ??
      null;
    const name =
      [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") ||
      clerkUser.username ||
      primaryEmail ||
      "User";

    const isOwner = ENV.ownerOpenId && userId === ENV.ownerOpenId;

    await db.upsertUser({
      openId: userId,
      name,
      email: primaryEmail,
      loginMethod: "clerk",
      role: isOwner ? "admin" : "user",
      lastSignedIn: signedInAt,
    });
    user = await db.getUserByOpenId(userId);
  } else {
    await db.upsertUser({
      openId: user.openId,
      lastSignedIn: signedInAt,
    });
  }

  if (!user) {
    throw ForbiddenError("User not found");
  }

  return user;
}
