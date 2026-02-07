/**
 * Trade Database Tests
 * Tests for trade-related database operations
 */

import { describe, it, expect, beforeAll } from 'vitest';
import {
  insertTrade,
  insertTradePlayer,
  getTradesByLeague,
  getTradesWithPlayers,
  tradeExists,
} from './tradeDb';

describe('Trade Database Operations', () => {
  const testEspnLeagueId = '123456';
  const testSeasonYear = 2024;
  let testTradeId: number;

  it('should insert a new trade', async () => {
    const trade = await insertTrade({
      leagueId: 1,
      espnLeagueId: testEspnLeagueId,
      seasonYear: testSeasonYear,
      week: 5,
      tradeDate: new Date('2024-10-15'),
      team1Id: 1,
      team1EspnId: 1,
      team1Name: 'Team Alpha',
      team2Id: 2,
      team2EspnId: 2,
      team2Name: 'Team Beta',
      rawData: JSON.stringify({ test: 'data' }),
    });

    expect(trade).toBeDefined();
    expect(trade.id).toBeGreaterThan(0);
    expect(trade.team1Name).toBe('Team Alpha');
    expect(trade.team2Name).toBe('Team Beta');
    
    testTradeId = trade.id;
  });

  it('should insert trade players', async () => {
    await insertTradePlayer({
      tradeId: testTradeId,
      playerId: null,
      espnPlayerId: 1001,
      playerName: 'Patrick Mahomes',
      playerPosition: 'QB',
      fromTeamId: 1,
      fromEspnTeamId: 1,
      toTeamId: 2,
      toEspnTeamId: 2,
    });

    await insertTradePlayer({
      tradeId: testTradeId,
      playerId: null,
      espnPlayerId: 1002,
      playerName: 'Travis Kelce',
      playerPosition: 'TE',
      fromTeamId: 2,
      fromEspnTeamId: 2,
      toTeamId: 1,
      toEspnTeamId: 1,
    });

    // If no error is thrown, the test passes
    expect(true).toBe(true);
  });

  it('should retrieve trades by league', async () => {
    const trades = await getTradesByLeague(testEspnLeagueId);
    
    expect(trades).toBeDefined();
    expect(Array.isArray(trades)).toBe(true);
    expect(trades.length).toBeGreaterThan(0);
    expect(trades[0].espnLeagueId).toBe(testEspnLeagueId);
  });

  it('should retrieve trades with players', async () => {
    const tradesWithPlayers = await getTradesWithPlayers(testEspnLeagueId);
    
    expect(tradesWithPlayers).toBeDefined();
    expect(Array.isArray(tradesWithPlayers)).toBe(true);
    expect(tradesWithPlayers.length).toBeGreaterThan(0);
    
    const trade = tradesWithPlayers[0];
    expect(trade.players).toBeDefined();
    expect(Array.isArray(trade.players)).toBe(true);
  });

  it('should check if trade exists', async () => {
    const exists = await tradeExists(
      testEspnLeagueId,
      testSeasonYear,
      new Date('2024-10-15'),
      1,
      2
    );
    
    expect(exists).toBe(true);
  });

  it('should return false for non-existent trade', async () => {
    const exists = await tradeExists(
      'nonexistent',
      2099,
      new Date(),
      999,
      888
    );
    
    expect(exists).toBe(false);
  });
});
