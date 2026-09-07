import type { ESPNBoxPlayer, ESPNBoxScore } from "./espnClient";
// Official response fields verified against the league's September 7 Week 1 response.
export const finitePoints = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;
const slots: Record<number, string> = {
  0: "QB",
  1: "TQB",
  2: "RB",
  3: "RB/WR",
  4: "WR",
  5: "WR/TE",
  6: "TE",
  7: "OP",
  8: "DT",
  9: "DE",
  10: "LB",
  11: "DL",
  12: "CB",
  13: "S",
  14: "DB",
  15: "DP",
  16: "D/ST",
  17: "K",
  18: "P",
  19: "HC",
  20: "Bench",
  21: "IR",
  23: "RB/WR/TE",
  24: "ER",
  25: "Rookie",
};
const positions: Record<number, string> = {
  1: "QB",
  2: "RB",
  3: "WR",
  4: "TE",
  5: "K",
  16: "D/ST",
};
const nflTeams: Record<number, string> = {
  1: "ATL",
  2: "BUF",
  3: "CHI",
  4: "CIN",
  5: "CLE",
  6: "DAL",
  7: "DEN",
  8: "DET",
  9: "GB",
  10: "TEN",
  11: "IND",
  12: "KC",
  13: "LV",
  14: "LAR",
  15: "MIA",
  16: "MIN",
  17: "NE",
  18: "NO",
  19: "NYG",
  20: "NYJ",
  21: "PHI",
  22: "ARI",
  23: "PIT",
  24: "LAC",
  25: "SF",
  26: "SEA",
  27: "TB",
  28: "WSH",
  29: "CAR",
  30: "JAX",
  33: "BAL",
  34: "HOU",
};
export function isStartingSlot(slot: string | null): boolean {
  return Boolean(
    slot && !["BENCH", "IR", "RESERVE", "UNKNOWN"].includes(slot.toUpperCase())
  );
}
export function mapRawPlayer(
  entry: any,
  season: number,
  week: number
): ESPNBoxPlayer {
  const p = entry.playerPoolEntry?.player;
  if (!Number.isInteger(p?.id) || !p.fullName)
    throw new Error("Invalid ESPN roster player");
  const stat = (source: number) =>
    (p.stats ?? []).find(
      (s: any) =>
        s.seasonId === season &&
        s.scoringPeriodId === week &&
        s.statSplitTypeId === 1 &&
        s.statSourceId === source
    );
  return {
    player: {
      id: p.id,
      firstName: p.firstName ?? "",
      lastName: p.lastName ?? "",
      fullName: p.fullName,
      position: positions[p.defaultPositionId] ?? "Unknown",
      proTeam: nflTeams[p.proTeamId],
      injuryStatus: p.injuryStatus ?? entry.injuryStatus,
    },
    position: slots[entry.lineupSlotId] ?? "Unknown",
    totalPoints:
      finitePoints(stat(0)?.appliedTotal) ??
      finitePoints(entry.appliedStatTotal),
    // Use ESPN's full league-scored total: the SDK's breakdown omits some scoring categories.
    projectedPoints: finitePoints(stat(1)?.appliedTotal),
  };
}
export function mapRawBoxScores(
  data: any,
  season: number,
  matchupWeek: number,
  scoringWeek: number
): ESPNBoxScore[] {
  if (!Array.isArray(data.schedule))
    throw new Error("ESPN schedule unavailable");
  return data.schedule
    .filter((b: any) => b.matchupPeriodId === matchupWeek && b.home && b.away)
    .map((b: any) => ({
      homeTeamId: b.home.teamId,
      awayTeamId: b.away.teamId,
      homeScore:
        finitePoints(b.home.totalPointsLive) ??
        finitePoints(b.home.totalPoints) ??
        0,
      awayScore:
        finitePoints(b.away.totalPointsLive) ??
        finitePoints(b.away.totalPoints) ??
        0,
      homeProjectedScore: finitePoints(b.home.totalProjectedPointsLive),
      awayProjectedScore: finitePoints(b.away.totalProjectedPointsLive),
      homeRoster: (b.home.rosterForCurrentScoringPeriod?.entries ?? []).map(
        (p: any) => mapRawPlayer(p, season, scoringWeek)
      ),
      awayRoster: (b.away.rosterForCurrentScoringPeriod?.entries ?? []).map(
        (p: any) => mapRawPlayer(p, season, scoringWeek)
      ),
    }));
}
