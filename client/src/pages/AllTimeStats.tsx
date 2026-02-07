import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trophy, TrendingUp, TrendingDown, Award } from "lucide-react";
import HeadToHeadMatrix from "./HeadToHeadMatrix";

interface AllTimeStatsProps {
  leagueId: number;
}

export default function AllTimeStats({ leagueId }: AllTimeStatsProps) {
  const { data: teams, isLoading: teamsLoading } = trpc.league.teams.useQuery({ leagueId });
  const { data: allMatchups, isLoading: matchupsLoading } = trpc.league.allMatchups.useQuery({ leagueId });

  // Calculate all-time records
  const allTimeRecords = teams?.map(team => {
    const teamMatchups = allMatchups?.filter(
      m => m.homeTeamId === team.espnTeamId || m.awayTeamId === team.espnTeamId
    ) || [];

    let totalWins = 0;
    let totalLosses = 0;
    let totalPointsFor = 0;
    let highestScore = 0;
    let lowestScore = 999;

    teamMatchups.forEach(matchup => {
      const isHome = matchup.homeTeamId === team.espnTeamId;
      const teamScore = isHome ? (matchup.homeScore || 0) : (matchup.awayScore || 0);
      const oppScore = isHome ? (matchup.awayScore || 0) : (matchup.homeScore || 0);

      if (matchup.isComplete) {
        if (teamScore > oppScore) totalWins++;
        else if (teamScore < oppScore) totalLosses++;
        
        totalPointsFor += teamScore;
        if (teamScore > highestScore) highestScore = teamScore;
        if (teamScore < lowestScore && teamScore > 0) lowestScore = teamScore;
      }
    });

    return {
      ...team,
      allTimeWins: totalWins,
      allTimeLosses: totalLosses,
      allTimePointsFor: totalPointsFor,
      highestScore,
      lowestScore: lowestScore === 999 ? 0 : lowestScore,
      gamesPlayed: totalWins + totalLosses,
    };
  }) || [];

  const sortedByWins = [...allTimeRecords].sort((a, b) => b.allTimeWins - a.allTimeWins);
  const sortedByPoints = [...allTimeRecords].sort((a, b) => b.allTimePointsFor - a.allTimePointsFor);
  const highestScoringGame = [...allTimeRecords].sort((a, b) => b.highestScore - a.highestScore)[0];

  const isLoading = teamsLoading || matchupsLoading;

  return (
    <div className="space-y-6">
      {/* Top Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Most Wins</CardTitle>
            <Trophy className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-full" />
            ) : sortedByWins[0] ? (
              <>
                <div className="text-2xl font-bold text-card-foreground">{sortedByWins[0].name}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {sortedByWins[0].allTimeWins} wins
                </p>
              </>
            ) : (
              <div className="text-sm text-muted-foreground">No data</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Most Points</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-full" />
            ) : sortedByPoints[0] ? (
              <>
                <div className="text-2xl font-bold text-card-foreground">{sortedByPoints[0].name}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {sortedByPoints[0].allTimePointsFor.toFixed(1)} points
                </p>
              </>
            ) : (
              <div className="text-sm text-muted-foreground">No data</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Highest Score</CardTitle>
            <Award className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-full" />
            ) : highestScoringGame ? (
              <>
                <div className="text-2xl font-bold text-card-foreground">{highestScoringGame.highestScore.toFixed(1)}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {highestScoringGame.name}
                </p>
              </>
            ) : (
              <div className="text-sm text-muted-foreground">No data</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* All-Time Standings */}
      <Card>
        <CardHeader>
          <CardTitle>All-Time Standings</CardTitle>
          <CardDescription>Historical performance across all seasons</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : sortedByWins.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Team</TableHead>
                  <TableHead className="text-center">W</TableHead>
                  <TableHead className="text-center">L</TableHead>
                  <TableHead className="text-center">Win %</TableHead>
                  <TableHead className="text-right">Total PF</TableHead>
                  <TableHead className="text-right">Avg PF</TableHead>
                  <TableHead className="text-right">High</TableHead>
                  <TableHead className="text-right">Low</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedByWins.map((team, index) => {
                  const winPct = team.gamesPlayed > 0 
                    ? (team.allTimeWins / team.gamesPlayed * 100).toFixed(1)
                    : "0.0";
                  const avgPF = team.gamesPlayed > 0
                    ? (team.allTimePointsFor / team.gamesPlayed).toFixed(1)
                    : "0.0";

                  return (
                    <TableRow key={team.id}>
                      <TableCell className="font-medium">{index + 1}</TableCell>
                      <TableCell>
                        <div className="font-semibold text-card-foreground">{team.name}</div>
                      </TableCell>
                      <TableCell className="text-center">{team.allTimeWins}</TableCell>
                      <TableCell className="text-center">{team.allTimeLosses}</TableCell>
                      <TableCell className="text-center">{winPct}%</TableCell>
                      <TableCell className="text-right">{team.allTimePointsFor.toFixed(1)}</TableCell>
                      <TableCell className="text-right">{avgPF}</TableCell>
                      <TableCell className="text-right text-green-500">{team.highestScore.toFixed(1)}</TableCell>
                      <TableCell className="text-right text-red-500">{team.lowestScore.toFixed(1)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No historical data available. Sync your league to see all-time stats.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Head-to-Head Matrix */}
      <HeadToHeadMatrix leagueId={leagueId} />
    </div>
  );
}
