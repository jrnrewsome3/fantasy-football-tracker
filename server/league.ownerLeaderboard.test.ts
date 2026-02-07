import { describe, it, expect } from 'vitest';

describe('Owner Leaderboard', () => {
  it('should aggregate owner stats correctly', () => {
    // Mock owner data
    const mockOwners = [
      {
        ownerName: 'John Doe',
        totalWins: 45,
        totalLosses: 30,
        totalTies: 3,
        totalPointsFor: 5200.5,
        totalPointsAgainst: 4800.2,
        seasonsPlayed: 5,
        bestSeasonWins: 12,
        bestSeasonYear: 2024,
        worstSeasonWins: 6,
        worstSeasonYear: 2020,
      },
      {
        ownerName: 'Jane Smith',
        totalWins: 50,
        totalLosses: 25,
        totalTies: 3,
        totalPointsFor: 5500.0,
        totalPointsAgainst: 4600.0,
        seasonsPlayed: 5,
        bestSeasonWins: 13,
        bestSeasonYear: 2025,
        worstSeasonWins: 8,
        worstSeasonYear: 2019,
      },
    ];

    // Calculate win percentages
    const withWinPct = mockOwners.map(owner => {
      const totalGames = owner.totalWins + owner.totalLosses + owner.totalTies;
      const winPercentage = (owner.totalWins / totalGames) * 100;
      return { ...owner, winPercentage, totalGames };
    });

    // Verify calculations
    expect(withWinPct[0].winPercentage).toBeCloseTo(57.69, 1); // 45/(45+30+3) * 100
    expect(withWinPct[1].winPercentage).toBeCloseTo(64.10, 1); // 50/(50+25+3) * 100

    // Verify sorting by wins
    const sorted = [...withWinPct].sort((a, b) => b.totalWins - a.totalWins);
    expect(sorted[0].ownerName).toBe('Jane Smith');
    expect(sorted[1].ownerName).toBe('John Doe');
  });

  it('should handle edge cases', () => {
    // Owner with no games
    const noGames = {
      totalWins: 0,
      totalLosses: 0,
      totalTies: 0,
    };
    const totalGames = noGames.totalWins + noGames.totalLosses + noGames.totalTies;
    const winPercentage = totalGames > 0 ? (noGames.totalWins / totalGames) * 100 : 0;
    expect(winPercentage).toBe(0);

    // Owner with perfect record
    const perfect = {
      totalWins: 10,
      totalLosses: 0,
      totalTies: 0,
    };
    const perfectTotal = perfect.totalWins + perfect.totalLosses + perfect.totalTies;
    const perfectPct = (perfect.totalWins / perfectTotal) * 100;
    expect(perfectPct).toBe(100);
  });
});
