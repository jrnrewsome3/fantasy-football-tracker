export const MIN_OWNER_PERCENTAGE_GAMES = 30;

export interface OwnerRankingRecord {
  ownerName: string;
  totalWins: number;
  totalPointsFor: number;
  totalGames: number;
  winPercentage: number;
  isCurrentOwner: boolean;
}

export function isWinPercentageEligible(owner: OwnerRankingRecord) {
  return owner.isCurrentOwner && owner.totalGames >= MIN_OWNER_PERCENTAGE_GAMES;
}

export function summarizeOwnerLeaderboard<T extends OwnerRankingRecord>(
  owners: T[]
) {
  const highest = (rows: T[], score: (owner: T) => number) =>
    rows.reduce<T | undefined>(
      (best, owner) => (!best || score(owner) > score(best) ? owner : best),
      undefined
    );
  return {
    mostWins: highest(owners, owner => owner.totalWins),
    mostPoints: highest(owners, owner => owner.totalPointsFor),
    bestWinPercentage: highest(
      owners.filter(isWinPercentageEligible),
      owner => owner.winPercentage
    ),
  };
}

export function sortOwnerLeaderboard<T extends OwnerRankingRecord>(
  owners: T[],
  sortBy: "wins" | "winPct" | "points"
) {
  return [...owners].sort((a, b) => {
    if (sortBy === "winPct") {
      const qualification =
        Number(isWinPercentageEligible(b)) - Number(isWinPercentageEligible(a));
      if (qualification) return qualification;
      return (
        b.winPercentage - a.winPercentage ||
        b.totalWins - a.totalWins ||
        a.ownerName.localeCompare(b.ownerName)
      );
    }
    return (
      (sortBy === "wins"
        ? b.totalWins - a.totalWins
        : b.totalPointsFor - a.totalPointsFor) ||
      a.ownerName.localeCompare(b.ownerName)
    );
  });
}
