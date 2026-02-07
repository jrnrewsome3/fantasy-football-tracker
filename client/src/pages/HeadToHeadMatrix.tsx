import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface HeadToHeadMatrixProps {
  leagueId: number;
}

interface H2HRecord {
  wins: number;
  losses: number;
  ties: number;
}

export default function HeadToHeadMatrix({ leagueId }: HeadToHeadMatrixProps) {
  const { data: teams, isLoading: teamsLoading } = trpc.league.teams.useQuery({ leagueId });
  const { data: allMatchups, isLoading: matchupsLoading } = trpc.league.allMatchups.useQuery({ leagueId });

  const isLoading = teamsLoading || matchupsLoading;

  // Build head-to-head records matrix
  const h2hMatrix = new Map<string, H2HRecord>();

  if (teams && allMatchups) {
    // Initialize matrix
    teams.forEach(team1 => {
      teams.forEach(team2 => {
        if (team1.espnTeamId !== team2.espnTeamId) {
          const key = `${team1.espnTeamId}-${team2.espnTeamId}`;
          h2hMatrix.set(key, { wins: 0, losses: 0, ties: 0 });
        }
      });
    });

    // Calculate records from matchups
    allMatchups.forEach(matchup => {
      if (!matchup.isComplete) return;

      const homeScore = matchup.homeScore || 0;
      const awayScore = matchup.awayScore || 0;

      if (homeScore > awayScore) {
        // Home team won
        const homeKey = `${matchup.homeTeamId}-${matchup.awayTeamId}`;
        const awayKey = `${matchup.awayTeamId}-${matchup.homeTeamId}`;
        const homeRecord = h2hMatrix.get(homeKey);
        const awayRecord = h2hMatrix.get(awayKey);
        if (homeRecord) homeRecord.wins++;
        if (awayRecord) awayRecord.losses++;
      } else if (awayScore > homeScore) {
        // Away team won
        const homeKey = `${matchup.homeTeamId}-${matchup.awayTeamId}`;
        const awayKey = `${matchup.awayTeamId}-${matchup.homeTeamId}`;
        const homeRecord = h2hMatrix.get(homeKey);
        const awayRecord = h2hMatrix.get(awayKey);
        if (homeRecord) homeRecord.losses++;
        if (awayRecord) awayRecord.wins++;
      } else {
        // Tie
        const homeKey = `${matchup.homeTeamId}-${matchup.awayTeamId}`;
        const awayKey = `${matchup.awayTeamId}-${matchup.homeTeamId}`;
        const homeRecord = h2hMatrix.get(homeKey);
        const awayRecord = h2hMatrix.get(awayKey);
        if (homeRecord) homeRecord.ties++;
        if (awayRecord) awayRecord.ties++;
      }
    });
  }

  const getH2HRecord = (team1Id: number, team2Id: number): H2HRecord => {
    const key = `${team1Id}-${team2Id}`;
    return h2hMatrix.get(key) || { wins: 0, losses: 0, ties: 0 };
  };

  const formatRecord = (record: H2HRecord): string => {
    if (record.ties > 0) {
      return `${record.wins}-${record.losses}-${record.ties}`;
    }
    return `${record.wins}-${record.losses}`;
  };

  const getRecordColor = (record: H2HRecord): string => {
    if (record.wins > record.losses) return "text-green-500";
    if (record.losses > record.wins) return "text-red-500";
    return "text-muted-foreground";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Head-to-Head Records</CardTitle>
        <CardDescription>
          All-time matchup records between teams. Row team vs Column team.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : teams && teams.length > 0 ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky left-0 bg-card z-10 min-w-[150px]">Team</TableHead>
                  {teams.map(team => (
                    <TableHead key={team.id} className="text-center min-w-[80px]">
                      <div className="text-xs font-medium">{team.abbreviation || team.name.substring(0, 3).toUpperCase()}</div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {teams.map(rowTeam => (
                  <TableRow key={rowTeam.id}>
                    <TableCell className="sticky left-0 bg-card z-10 font-medium">
                      <div className="flex flex-col">
                        <span className="text-sm">{rowTeam.name}</span>
                        {rowTeam.ownerName && (
                          <span className="text-xs text-muted-foreground">{rowTeam.ownerName}</span>
                        )}
                      </div>
                    </TableCell>
                    {teams.map(colTeam => {
                      if (rowTeam.espnTeamId === colTeam.espnTeamId) {
                        return (
                          <TableCell key={colTeam.id} className="text-center bg-accent/20">
                            <span className="text-muted-foreground">—</span>
                          </TableCell>
                        );
                      }

                      const record = getH2HRecord(rowTeam.espnTeamId, colTeam.espnTeamId);
                      const totalGames = record.wins + record.losses + record.ties;

                      return (
                        <TableCell key={colTeam.id} className="text-center">
                          {totalGames > 0 ? (
                            <div className="flex flex-col items-center">
                              <span className={`text-sm font-semibold ${getRecordColor(record)}`}>
                                {formatRecord(record)}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">0-0</span>
                          )}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            No matchup data available. Sync your league to see head-to-head records.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
