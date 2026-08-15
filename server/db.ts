import { eq } from "drizzle-orm";
import { drizzle, type MySql2Database } from "drizzle-orm/mysql2";
import { migrate } from "drizzle-orm/mysql2/migrator";
import mysql from "mysql2/promise";
import path from "node:path";
import { InsertUser, users } from "../drizzle/schema";
import { ENV } from "./_core/env";

type Db = MySql2Database<Record<string, never>>;

let _pool: mysql.Pool | null = null;
let _db: Db | null = null;

function getPool() {
  if (_pool) return _pool;
  if (!process.env.DATABASE_URL) return null;

  _pool = mysql.createPool(process.env.DATABASE_URL);
  return _pool;
}

/** Lazily create a pooled Drizzle client so local tooling can run without a DB. */
export async function getDb() {
  if (_db) return _db;

  const pool = getPool();
  if (!pool) return null;

  try {
    // mysql2/promise Pool is the supported client for drizzle-orm/mysql2
    _db = drizzle(pool) as Db;
    return _db;
  } catch (error) {
    console.warn("[Database] Failed to connect:", error);
    _db = null;
    return null;
  }
}

/** Apply committed schema migrations before accepting production traffic. */
export async function runMigrations(): Promise<void> {
  const db = await getDb();
  if (!db) {
    throw new Error("DATABASE_URL is required to run migrations");
  }

  const migrationsFolder = path.join(process.cwd(), "drizzle");
  console.log("[Database] Applying migrations");
  await migrate(db, { migrationsFolder });
  console.log("[Database] Migrations complete");
}

/** Lightweight connectivity check for /api/health */
export async function pingDb(): Promise<boolean> {
  try {
    const pool = getPool();
    if (!pool) return false;
    const conn = await pool.getConnection();
    try {
      await conn.query("SELECT 1");
      return true;
    } finally {
      conn.release();
    }
  } catch {
    return false;
  }
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db
    .select()
    .from(users)
    .where(eq(users.openId, openId))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}
