type Player = { slotPosition: string | null; projectedPoints: number | null };
export function projectedTotal(players: Player[]): number | null {
  if (
    !players.length ||
    players.some(
      p => p.projectedPoints === null || !Number.isFinite(p.projectedPoints)
    )
  )
    return null;
  return players.reduce((sum, p) => sum + p.projectedPoints!, 0);
}
export function compareLineups(mine: Player[], opponent: Player[]) {
  return Array.from(
    new Set([...mine, ...opponent].map(p => p.slotPosition || "Unknown"))
  ).map(slot => ({
    slot,
    mine: projectedTotal(
      mine.filter(p => (p.slotPosition || "Unknown") === slot)
    ),
    opponent: projectedTotal(
      opponent.filter(p => (p.slotPosition || "Unknown") === slot)
    ),
  }));
}
