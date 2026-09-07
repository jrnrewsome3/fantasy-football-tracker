/** Scores are oriented to the current card by the rivalry service. */
export function completedResult(
  home: string,
  away: string,
  homeScore: number,
  awayScore: number
): string {
  if (homeScore === awayScore)
    return `${home} and ${away} tied ${homeScore.toFixed(1)}–${awayScore.toFixed(1)}`;
  const winner = homeScore > awayScore ? home : away;
  const loser = homeScore > awayScore ? away : home;
  return `${winner} won ${Math.max(homeScore, awayScore).toFixed(1)}–${Math.min(homeScore, awayScore).toFixed(1)} over ${loser}`;
}
