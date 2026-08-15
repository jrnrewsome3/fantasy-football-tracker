import { and, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { leagueMembers, leagues } from "../drizzle/schema";
import { getDb } from "./db";

export async function getLeagueMembership(leagueId: number, userId: number) {
  const db = await getDb();
  if (!db) return null;

  const rows = await db
    .select()
    .from(leagueMembers)
    .where(
      and(
        eq(leagueMembers.leagueId, leagueId),
        eq(leagueMembers.userId, userId)
      )
    )
    .limit(1);
  return rows[0] ?? null;
}

export async function requireLeagueAccess(leagueId: number, userId: number) {
  const membership = await getLeagueMembership(leagueId, userId);
  if (!membership) throw new Error("You do not have access to this league");
  return membership;
}

export async function requireCommissioner(leagueId: number, userId: number) {
  const membership = await requireLeagueAccess(leagueId, userId);
  if (membership.role !== "commissioner") {
    throw new Error("Only the league commissioner can perform this action");
  }
  return membership;
}

export async function claimLeagueForCommissioner(
  leagueId: number,
  userId: number
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const leagueRows = await db
    .select()
    .from(leagues)
    .where(eq(leagues.id, leagueId))
    .limit(1);
  const league = leagueRows[0];
  if (!league) throw new Error("League not found");
  if (league.commissionerUserId && league.commissionerUserId !== userId) {
    throw new Error(
      "This league is already connected. Ask its commissioner for an invite code."
    );
  }

  const inviteCode = league.inviteCode || nanoid(12);
  await db
    .update(leagues)
    .set({ commissionerUserId: userId, inviteCode, updatedAt: new Date() })
    .where(eq(leagues.id, leagueId));

  await db
    .insert(leagueMembers)
    .values({
      leagueId,
      userId,
      role: "commissioner",
    })
    .onDuplicateKeyUpdate({
      set: { role: "commissioner", updatedAt: new Date() },
    });

  return { inviteCode };
}

export async function joinLeagueByInvite(inviteCode: string, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const rows = await db
    .select()
    .from(leagues)
    .where(eq(leagues.inviteCode, inviteCode))
    .limit(1);
  const league = rows[0];
  if (!league) throw new Error("That invite code is invalid or has expired");

  await db
    .insert(leagueMembers)
    .values({
      leagueId: league.id,
      userId,
      role: league.commissionerUserId === userId ? "commissioner" : "member",
    })
    .onDuplicateKeyUpdate({
      set: { updatedAt: new Date() },
    });

  return { leagueId: league.id, leagueName: league.name };
}

export async function assignMemberTeam(
  leagueId: number,
  userId: number,
  espnTeamId: number
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await requireLeagueAccess(leagueId, userId);

  await db
    .update(leagueMembers)
    .set({ espnTeamId, updatedAt: new Date() })
    .where(
      and(
        eq(leagueMembers.leagueId, leagueId),
        eq(leagueMembers.userId, userId)
      )
    );
  return { success: true } as const;
}
