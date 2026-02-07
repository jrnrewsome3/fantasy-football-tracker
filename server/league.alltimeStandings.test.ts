import { describe, it, expect } from 'vitest';

describe('All-Time Standings', () => {
  it('should aggregate career stats across multiple seasons', async () => {
    const { getTeamsByEspnLeagueAllTime } = await import('./leagueDb');
    
    // Test with a known ESPN league ID
    const teams = await getTeamsByEspnLeagueAllTime('1489106');
    
    // Should return teams with aggregated stats
    expect(Array.isArray(teams)).toBe(true);
    
    if (teams.length > 0) {
      const firstTeam = teams[0];
      
      // Should have required fields
      expect(firstTeam).toHaveProperty('espnTeamId');
      expect(firstTeam).toHaveProperty('name');
      expect(firstTeam).toHaveProperty('wins');
      expect(firstTeam).toHaveProperty('losses');
      expect(firstTeam).toHaveProperty('pointsFor');
      expect(firstTeam).toHaveProperty('pointsAgainst');
      
      // Stats should be numbers
      expect(typeof firstTeam.wins).toBe('number');
      expect(typeof firstTeam.losses).toBe('number');
      expect(typeof firstTeam.pointsFor).toBe('number');
      expect(typeof firstTeam.pointsAgainst).toBe('number');
      
      // Teams should be sorted by wins descending
      if (teams.length > 1) {
        expect(teams[0].wins).toBeGreaterThanOrEqual(teams[1].wins || 0);
      }
    }
  });
  
  it('should deduplicate teams by espnTeamId', async () => {
    const { getTeamsByEspnLeagueAllTime } = await import('./leagueDb');
    
    const teams = await getTeamsByEspnLeagueAllTime('1489106');
    
    // Check for duplicate espnTeamIds
    const espnTeamIds = teams.map(t => t.espnTeamId);
    const uniqueIds = new Set(espnTeamIds);
    
    expect(espnTeamIds.length).toBe(uniqueIds.size);
  });
});
