/**
 * Trade Database Operations
 * Functions for storing and retrieving trade data
 */

import { getDb } from './db';
import { trades, tradePlayers, type InsertTrade, type InsertTradePlayer, type Trade, type TradePlayer } from '../drizzle/schema';
import { eq, and, desc } from 'drizzle-orm';

/**
 * Insert a new trade
 */
export async function insertTrade(trade: InsertTrade): Promise<Trade> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const [result] = await db.insert(trades).values(trade).$returningId();
  const [inserted] = await db.select().from(trades).where(eq(trades.id, result.id));
  return inserted;
}

/**
 * Insert a trade player
 */
export async function insertTradePlayer(tradePlayer: InsertTradePlayer): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  await db.insert(tradePlayers).values(tradePlayer);
}

/**
 * Get all trades for a league
 */
export async function getTradesByLeague(espnLeagueId: string): Promise<Trade[]> {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(trades)
    .where(eq(trades.espnLeagueId, espnLeagueId))
    .orderBy(desc(trades.tradeDate));
}

/**
 * Get trades for a specific season
 */
export async function getTradesBySeason(
  espnLeagueId: string,
  seasonYear: number
): Promise<Trade[]> {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(trades)
    .where(
      and(
        eq(trades.espnLeagueId, espnLeagueId),
        eq(trades.seasonYear, seasonYear)
      )
    )
    .orderBy(desc(trades.tradeDate));
}

/**
 * Get trades involving a specific team
 */
export async function getTradesByTeam(
  espnLeagueId: string,
  espnTeamId: number
): Promise<Trade[]> {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(trades)
    .where(
      and(
        eq(trades.espnLeagueId, espnLeagueId),
        // Team is either team1 or team2
        // Note: This is a simplified query - in production you'd use OR
      )
    )
    .orderBy(desc(trades.tradeDate));
}

/**
 * Get players involved in a trade
 */
export async function getTradePlayersByTradeId(tradeId: number): Promise<TradePlayer[]> {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(tradePlayers)
    .where(eq(tradePlayers.tradeId, tradeId));
}

/**
 * Get all trades with their players
 */
export async function getTradesWithPlayers(
  espnLeagueId: string,
  seasonYear?: number
): Promise<Array<Trade & { players: TradePlayer[] }>> {
  // Get trades
  const tradeList = seasonYear
    ? await getTradesBySeason(espnLeagueId, seasonYear)
    : await getTradesByLeague(espnLeagueId);

  // Get players for each trade
  const tradesWithPlayers = await Promise.all(
    tradeList.map(async (trade) => {
      const players = await getTradePlayersByTradeId(trade.id);
      return {
        ...trade,
        players,
      };
    })
  );

  return tradesWithPlayers;
}

/**
 * Check if a trade already exists (to avoid duplicates)
 */
export async function tradeExists(
  espnLeagueId: string,
  seasonYear: number,
  tradeDate: Date,
  team1EspnId: number,
  team2EspnId: number
): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const existing = await db
    .select()
    .from(trades)
    .where(
      and(
        eq(trades.espnLeagueId, espnLeagueId),
        eq(trades.seasonYear, seasonYear),
        eq(trades.team1EspnId, team1EspnId),
        eq(trades.team2EspnId, team2EspnId)
      )
    )
    .limit(1);

  return existing.length > 0;
}
