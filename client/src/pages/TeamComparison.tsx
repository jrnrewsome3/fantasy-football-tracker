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
  const [team1Key, setTeam1Key] = useState<string | null>(null);
  const [team2Key, setTeam2Key] = useState<string | null>(null);

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
    { enabled: !!user && leagueId > 0 && !!team1Key && !!team2Key }
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

  // The comparison is between PEOPLE, not team rows. `teams` holds one row
  // per person per season (team names change constantly), so rows are folded
  // into one entry per franchiseKey with career totals and every team id that
  // person has ever played under.
  interface Person {
    key: string;
    label: string;
    latestSeason: number;
    ids: Set<number>;
    seasons: Set<number>;
    wins: number;
    losses: number;
    ties: number;
    pointsFor: number;
    pointsAgainst: number;
  }

  const peopleMap = new Map<string, Person>();
  for (const t of teams || []) {
    const key = t.franchiseKey || t.ownerName || t.name;
    if (!key) continue;
    let person = peopleMap.get(key);
    if (!person) {
      person = {
        key,
        label: t.ownerName || t.name,
        latestSeason: t.seasonYear,
        ids: new Set(),
        seasons: new Set(),
        wins: 0,
        losses: 0,
        ties: 0,
        pointsFor: 0,
        pointsAgainst: 0,
      };
      peopleMap.set(key, person);
    }
    person.ids.add(t.espnTeamId);
    // A season with no games yet (the upcoming year) shouldn't count toward
    // career totals or seasons played.
    const played =
      (t.wins || 0) + (t.losses || 0) + (t.ties || 0) > 0 ||
      (t.pointsFor || 0) > 0;
    if (played) {
      person.seasons.add(t.seasonYear);
      person.wins += t.wins || 0;
      person.losses += t.losses || 0;
      person.ties += t.ties || 0;
      person.pointsFor += t.pointsFor || 0;
      person.pointsAgainst += t.pointsAgainst || 0;
    }
    if (t.seasonYear > person.latestSeason && t.ownerName) {
      person.label = t.ownerName;
      person.latestSeason = t.seasonYear;
    }
  }
  const people = Array.from(peopleMap.values()).sort((a, b) =>
    a.label.localeCompare(b.label)
  );

  const person1 = team1Key ? peopleMap.get(team1Key) : undefined;
  const person2 = team2Key ? peopleMap.get(team2Key) : undefined;

  // Every completed meeting between the two people, across all seasons.
  const h2hMatchups = (person1 && person2
    ? matchups?.filter(
        m =>
          m.isComplete &&
          ((person1.ids.has(m.homeTeamId) && person2.ids.has(m.awayTeamId)) ||
            (person2.ids.has(m.homeTeamId) && person1.ids.has(m.awayTeamId)))
      )
    : []) || [];

  let team1Wins = 0;
  let team2Wins = 0;
  let ties = 0;
  let team1TotalPoints = 0;
  let team2TotalPoints = 0;

  h2hMatchups.forEach(m => {
    const team1Score = person1!.ids.has(m.homeTeamId) ? m.homeScore : m.awayScore;
    const team2Score = person2!.ids.has(m.homeTeamId) ? m.homeScore : m.awayScore;

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
              Compare career records and head-to-head history between two owners
            </p>
          </div>

          {/* Team Selectors */}
          <Card>
            <CardHeader>
              <CardTitle>Select Owners to Compare</CardTitle>
              <CardDescription>Choose two owners to view their all-time matchup history</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-card-foreground">Owner 1</label>
                  <Select
                    value={team1Key || ''}
                    onValueChange={setTeam1Key}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select first owner" />
                    </SelectTrigger>
                    <SelectContent>
                      {people.filter(p => p.key !== team2Key).map(p => (
                        <SelectItem key={p.key} value={p.key}>
                          {p.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-card-foreground">Owner 2</label>
                  <Select
                    value={team2Key || ''}
                    onValueChange={setTeam2Key}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select second owner" />
                    </SelectTrigger>
                    <SelectContent>
                      {people.filter(p => p.key !== team1Key).map(p => (
                        <SelectItem key={p.key} value={p.key}>
                          {p.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Comparison Results */}
          {person1 && person2 && (
            <>
              {/* Head-to-Head Record */}
              <Card>
                <CardHeader>
                  <CardTitle>Head-to-Head Record</CardTitle>
                  <CardDescription>All-time matchup history between these owners, every season included</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">{person1.label}</p>
                      <p className="text-4xl font-bold text-green-500">{team1Wins}</p>
                      <p className="text-xs text-muted-foreground">Wins</p>
                    </div>
                    <div className="space-y-2 flex flex-col items-center justify-center">
                      <Minus className="h-8 w-8 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">{ties} Ties</p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">{person2.label}</p>
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
                    <CardTitle>{person1.label}</CardTitle>
                    <CardDescription>Overall Statistics</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Overall Record</span>
                      <span className="font-semibold text-card-foreground">
                        {person1.wins}-{person1.losses}-{person1.ties}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Points For</span>
                      <span className="font-semibold text-card-foreground">
                        {person1.pointsFor.toFixed(1)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Points Against</span>
                      <span className="font-semibold text-card-foreground">
                        {person1.pointsAgainst.toFixed(1)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Avg vs {person2.label}</span>
                      <span className="font-semibold text-card-foreground">
                        {team1AvgPoints.toFixed(1)} pts/game
                      </span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>{person2.label}</CardTitle>
                    <CardDescription>Overall Statistics</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Overall Record</span>
                      <span className="font-semibold text-card-foreground">
                        {person2.wins}-{person2.losses}-{person2.ties}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Points For</span>
                      <span className="font-semibold text-card-foreground">
                        {person2.pointsFor.toFixed(1)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Points Against</span>
                      <span className="font-semibold text-card-foreground">
                        {person2.pointsAgainst.toFixed(1)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Avg vs {person1.label}</span>
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
                    <CardDescription>All completed games between these owners</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Season</TableHead>
                          <TableHead>Week</TableHead>
                          <TableHead className="text-right">{person1.label}</TableHead>
                          <TableHead className="text-center">vs</TableHead>
                          <TableHead>{person2.label}</TableHead>
                          <TableHead>Result</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {h2hMatchups.map((matchup) => {
                          const team1Score = person1!.ids.has(matchup.homeTeamId) ? matchup.homeScore : matchup.awayScore;
                          const team2Score = person2!.ids.has(matchup.homeTeamId) ? matchup.homeScore : matchup.awayScore;
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
                                    <span className="text-sm">{person1.label}</span>
                                  </div>
                                )}
                                {team2Won && (
                                  <div className="flex items-center gap-1 text-green-500">
                                    <TrendingUp className="h-4 w-4" />
                                    <span className="text-sm">{person2.label}</span>
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

          {(!person1 || !person2) && (
            <Card>
              <CardContent className="py-12 text-center">
                <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  Select two owners above to view their head-to-head comparison
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
