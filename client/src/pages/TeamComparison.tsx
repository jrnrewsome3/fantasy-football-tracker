import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Trophy, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useLocation, useRoute } from "wouter";
import { getLoginUrl } from "@/const";
import { useState } from "react";

export default function TeamComparison() {
  const { user, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/league/:id/compare");
  
  const leagueId = params?.id ? parseInt(params.id) : 0;
  const [team1Id, setTeam1Id] = useState<number | null>(null);
  const [team2Id, setTeam2Id] = useState<number | null>(null);

  const { data: leagues } = trpc.league.list.useQuery(undefined, {
    enabled: !!user,
  });

  const league = leagues?.find(l => l.id === leagueId);

  const { data: teams } = trpc.league.teams.useQuery(
    { leagueId },
    { enabled: !!user && leagueId > 0 }
  );

  const { data: matchups } = trpc.league.allMatchups.useQuery(
    { leagueId },
    { enabled: !!user && leagueId > 0 && !!team1Id && !!team2Id }
  );

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Authentication Required</CardTitle>
            <CardDescription>Please log in to compare teams</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => window.location.href = getLoginUrl()} className="w-full">
              Log In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!league) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container py-8">
          <Button variant="ghost" onClick={() => setLocation("/dashboard")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
          <div className="mt-8 text-center">
            <p className="text-muted-foreground">League not found</p>
          </div>
        </div>
      </div>
    );
  }

  const team1 = teams?.find(t => t.id === team1Id);
  const team2 = teams?.find(t => t.id === team2Id);

  // Matchup rows store ESPN team ids (stable for a franchise slot across
  // seasons), so head-to-head history matches on espnTeamId — never on the
  // internal teams.id used by the dropdowns.
  const team1EspnId = team1?.espnTeamId;
  const team2EspnId = team2?.espnTeamId;

  // Calculate head-to-head record
  const h2hMatchups = (team1EspnId != null && team2EspnId != null
    ? matchups?.filter(m =>
        (m.homeTeamId === team1EspnId && m.awayTeamId === team2EspnId) ||
        (m.homeTeamId === team2EspnId && m.awayTeamId === team1EspnId)
      )
    : []) || [];

  let team1Wins = 0;
  let team2Wins = 0;
  let ties = 0;
  let team1TotalPoints = 0;
  let team2TotalPoints = 0;

  h2hMatchups.forEach(m => {
    const team1Score = m.homeTeamId === team1EspnId ? m.homeScore : m.awayScore;
    const team2Score = m.homeTeamId === team2EspnId ? m.homeScore : m.awayScore;
    
    team1TotalPoints += team1Score || 0;
    team2TotalPoints += team2Score || 0;

    if (team1Score && team2Score) {
      if (team1Score > team2Score) team1Wins++;
      else if (team2Score > team1Score) team2Wins++;
      else ties++;
    }
  });

  const team1AvgPoints = h2hMatchups.length > 0 ? team1TotalPoints / h2hMatchups.length : 0;
  const team2AvgPoints = h2hMatchups.length > 0 ? team2TotalPoints / h2hMatchups.length : 0;

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-8">
        <Button variant="ghost" onClick={() => setLocation(`/league/${leagueId}`)} className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to League
        </Button>

        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-card-foreground">Team Comparison</h1>
            <p className="text-muted-foreground mt-1">
              Compare head-to-head records and statistics between two teams
            </p>
          </div>

          {/* Team Selectors */}
          <Card>
            <CardHeader>
              <CardTitle>Select Teams to Compare</CardTitle>
              <CardDescription>Choose two teams to view their matchup history</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-card-foreground">Team 1</label>
                  <Select
                    value={team1Id?.toString() || ''}
                    onValueChange={(value) => setTeam1Id(parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select first team" />
                    </SelectTrigger>
                    <SelectContent>
                      {teams?.filter(t => t.id !== team2Id).map((team) => (
                        <SelectItem key={team.id} value={team.id.toString()}>
                          {team.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-card-foreground">Team 2</label>
                  <Select
                    value={team2Id?.toString() || ''}
                    onValueChange={(value) => setTeam2Id(parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select second team" />
                    </SelectTrigger>
                    <SelectContent>
                      {teams?.filter(t => t.id !== team1Id).map((team) => (
                        <SelectItem key={team.id} value={team.id.toString()}>
                          {team.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Comparison Results */}
          {team1 && team2 && (
            <>
              {/* Head-to-Head Record */}
              <Card>
                <CardHeader>
                  <CardTitle>Head-to-Head Record</CardTitle>
                  <CardDescription>All-time matchup history between these teams</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">{team1.name}</p>
                      <p className="text-4xl font-bold text-green-500">{team1Wins}</p>
                      <p className="text-xs text-muted-foreground">Wins</p>
                    </div>
                    <div className="space-y-2 flex flex-col items-center justify-center">
                      <Minus className="h-8 w-8 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">{ties} Ties</p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">{team2.name}</p>
                      <p className="text-4xl font-bold text-green-500">{team2Wins}</p>
                      <p className="text-xs text-muted-foreground">Wins</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Statistics Comparison */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>{team1.name}</CardTitle>
                    <CardDescription>Overall Statistics</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Overall Record</span>
                      <span className="font-semibold text-card-foreground">
                        {team1.wins}-{team1.losses}-{team1.ties}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Points For</span>
                      <span className="font-semibold text-card-foreground">
                        {(team1.pointsFor || 0).toFixed(1)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Points Against</span>
                      <span className="font-semibold text-card-foreground">
                        {(team1.pointsAgainst || 0).toFixed(1)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Avg vs {team2.name}</span>
                      <span className="font-semibold text-card-foreground">
                        {team1AvgPoints.toFixed(1)} pts/game
                      </span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>{team2.name}</CardTitle>
                    <CardDescription>Overall Statistics</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Overall Record</span>
                      <span className="font-semibold text-card-foreground">
                        {team2.wins}-{team2.losses}-{team2.ties}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Points For</span>
                      <span className="font-semibold text-card-foreground">
                        {(team2.pointsFor || 0).toFixed(1)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Points Against</span>
                      <span className="font-semibold text-card-foreground">
                        {(team2.pointsAgainst || 0).toFixed(1)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Avg vs {team1.name}</span>
                      <span className="font-semibold text-card-foreground">
                        {team2AvgPoints.toFixed(1)} pts/game
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Matchup History */}
              {h2hMatchups.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Matchup History</CardTitle>
                    <CardDescription>All games between these teams</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Season</TableHead>
                          <TableHead>Week</TableHead>
                          <TableHead className="text-right">{team1.name}</TableHead>
                          <TableHead className="text-center">vs</TableHead>
                          <TableHead>{team2.name}</TableHead>
                          <TableHead>Result</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {h2hMatchups.map((matchup) => {
                          const team1Score = matchup.homeTeamId === team1EspnId ? matchup.homeScore : matchup.awayScore;
                          const team2Score = matchup.homeTeamId === team2EspnId ? matchup.homeScore : matchup.awayScore;
                          const team1Won = (team1Score || 0) > (team2Score || 0);
                          const team2Won = (team2Score || 0) > (team1Score || 0);
                          
                          return (
                            <TableRow key={matchup.id}>
                              <TableCell>{matchup.seasonYear}</TableCell>
                              <TableCell>Week {matchup.week}</TableCell>
                              <TableCell className="text-right">
                                <span className={team1Won ? "font-bold text-green-500" : ""}>
                                  {team1Score?.toFixed(1) || '0.0'}
                                </span>
                              </TableCell>
                              <TableCell className="text-center text-muted-foreground">-</TableCell>
                              <TableCell>
                                <span className={team2Won ? "font-bold text-green-500" : ""}>
                                  {team2Score?.toFixed(1) || '0.0'}
                                </span>
                              </TableCell>
                              <TableCell>
                                {team1Won && (
                                  <div className="flex items-center gap-1 text-green-500">
                                    <TrendingUp className="h-4 w-4" />
                                    <span className="text-sm">{team1.name}</span>
                                  </div>
                                )}
                                {team2Won && (
                                  <div className="flex items-center gap-1 text-green-500">
                                    <TrendingUp className="h-4 w-4" />
                                    <span className="text-sm">{team2.name}</span>
                                  </div>
                                )}
                                {!team1Won && !team2Won && (
                                  <span className="text-sm text-muted-foreground">Tie</span>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}

              {h2hMatchups.length === 0 && (
                <Card>
                  <CardContent className="py-8 text-center">
                    <p className="text-muted-foreground">
                      No matchup history found between these teams
                    </p>
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {(!team1 || !team2) && (
            <Card>
              <CardContent className="py-12 text-center">
                <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  Select two teams above to view their head-to-head comparison
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
