import { describe, it, expect } from 'vitest';

describe('Team Consolidation by ESPN Team ID', () => {
  it('should group teams with same espnTeamId but different names', () => {
    // Simulate teams with name changes
    const teams = [
      { id: 1, espnTeamId: 1, name: 'Old Name', wins: 5, losses: 3, ties: 0, pointsFor: 500, pointsAgainst: 450, logoUrl: 'old.jpg', leagueId: 1, seasonYear: 2018 },
      { id: 2, espnTeamId: 1, name: 'New Name', wins: 7, losses: 2, ties: 0, pointsFor: 600, pointsAgainst: 500, logoUrl: 'new.jpg', leagueId: 1, seasonYear: 2018 },
      { id: 3, espnTeamId: 2, name: 'Another Team', wins: 4, losses: 5, ties: 0, pointsFor: 400, pointsAgainst: 450, logoUrl: 'other.jpg', leagueId: 1, seasonYear: 2018 },
    ];

    // Simulate the consolidation logic
    const teamMap = new Map();
    
    for (const team of teams) {
      const existing = teamMap.get(team.espnTeamId);
      
      if (!existing) {
        teamMap.set(team.espnTeamId, { ...team });
      } else {
        existing.wins = (existing.wins || 0) + (team.wins || 0);
        existing.losses = (existing.losses || 0) + (team.losses || 0);
        existing.ties = (existing.ties || 0) + (team.ties || 0);
        existing.pointsFor = (existing.pointsFor || 0) + (team.pointsFor || 0);
        existing.pointsAgainst = (existing.pointsAgainst || 0) + (team.pointsAgainst || 0);
        
        if (team.id > existing.id) {
          existing.name = team.name;
          existing.logoUrl = team.logoUrl;
        }
      }
    }

    const result = Array.from(teamMap.values());

    // Should only have 2 unique teams (espnTeamId 1 and 2)
    expect(result.length).toBe(2);

    // Team with espnTeamId 1 should have aggregated stats
    const team1 = result.find(t => t.espnTeamId === 1);
    expect(team1).toBeDefined();
    expect(team1?.name).toBe('New Name'); // Most recent name
    expect(team1?.wins).toBe(12); // 5 + 7
    expect(team1?.losses).toBe(5); // 3 + 2
    expect(team1?.pointsFor).toBe(1100); // 500 + 600
    expect(team1?.pointsAgainst).toBe(950); // 450 + 500
    expect(team1?.logoUrl).toBe('new.jpg'); // Most recent logo

    // Team with espnTeamId 2 should remain unchanged
    const team2 = result.find(t => t.espnTeamId === 2);
    expect(team2).toBeDefined();
    expect(team2?.name).toBe('Another Team');
    expect(team2?.wins).toBe(4);
    expect(team2?.losses).toBe(5);
  });

  it('should handle teams with no duplicates', () => {
    const teams = [
      { id: 1, espnTeamId: 1, name: 'Team A', wins: 5, losses: 3, ties: 0, pointsFor: 500, pointsAgainst: 450, logoUrl: 'a.jpg', leagueId: 1, seasonYear: 2018 },
      { id: 2, espnTeamId: 2, name: 'Team B', wins: 7, losses: 2, ties: 0, pointsFor: 600, pointsAgainst: 500, logoUrl: 'b.jpg', leagueId: 1, seasonYear: 2018 },
    ];

    const teamMap = new Map();
    
    for (const team of teams) {
      const existing = teamMap.get(team.espnTeamId);
      
      if (!existing) {
        teamMap.set(team.espnTeamId, { ...team });
      }
    }

    const result = Array.from(teamMap.values());

    expect(result.length).toBe(2);
    expect(result[0].name).toBe('Team A');
    expect(result[1].name).toBe('Team B');
  });
});
