import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, ArrowLeft, Users, TrendingUp, Activity, RefreshCw } from "lucide-react";
import { useLocation, useRoute } from "wouter";
import { getLoginUrl } from "@/const";
import WeeklyMatchups from "./WeeklyMatchups";
import AllTimeStats from "./AllTimeStats";

export default function LeagueDetail() {
  const { user, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/league/:id");
  
  const leagueId = params?.id ? parseInt(params.id) : 0;

  const { data: leagues } = trpc.league.list.useQuery(undefined, {
    enabled: !!user,
  });

  const { data: teams, isLoading: teamsLoading } = trpc.league.teams.useQuery(
    { leagueId },
    { enabled: !!user && leagueId > 0 }
  );

  const { data: transactions, isLoading: transactionsLoading } = trpc.league.transactions.useQuery(
    { leagueId, limit: 20 },
    { enabled: !!user && leagueId > 0 }
  );

  const league = leagues?.find(l => l.id === leagueId);

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
            <CardDescription>Please log in to view league details</CardDescription>
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

  const sortedTeams = teams ? [...teams].sort((a, b) => {
    const aWinPct = (a.wins || 0) / ((a.wins || 0) + (a.losses || 0) + (a.ties || 0)) || 0;
    const bWinPct = (b.wins || 0) / ((b.wins || 0) + (b.losses || 0) + (b.ties || 0)) || 0;
    if (aWinPct !== bWinPct) return bWinPct - aWinPct;
    return (b.pointsFor || 0) - (a.pointsFor || 0);
  }) : [];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container py-6">
          <Button variant="ghost" onClick={() => setLocation("/dashboard")} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Trophy className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-card-foreground">{league.name}</h1>
                <p className="text-sm text-muted-foreground">
                  {league.seasonYear} Season • Week {league.currentWeek} of {league.totalWeeks}
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm">
              <RefreshCw className="mr-2 h-4 w-4" />
              Sync Data
            </Button>
          </div>
        </div>
      </div>

      <div className="container py-8">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Teams</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-card-foreground">
                {teamsLoading ? <Skeleton className="h-8 w-12" /> : teams?.length || 0}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Current Week</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-card-foreground">
                Week {league.currentWeek}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-card-foreground">
                {transactionsLoading ? <Skeleton className="h-8 w-12" /> : transactions?.length || 0}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="standings" className="space-y-4">
          <TabsList>
            <TabsTrigger value="standings">Standings</TabsTrigger>
            <TabsTrigger value="matchups">Matchups</TabsTrigger>
            <TabsTrigger value="alltime">All-Time Stats</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>

          <TabsContent value="standings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>League Standings</CardTitle>
                <CardDescription>Current season standings and team statistics</CardDescription>
              </CardHeader>
              <CardContent>
                {teamsLoading ? (
                  <div className="space-y-2">
                    {[1, 2, 3, 4].map((i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : sortedTeams.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">#</TableHead>
                        <TableHead>Team</TableHead>
                        <TableHead className="text-center">W</TableHead>
                        <TableHead className="text-center">L</TableHead>
                        <TableHead className="text-center">T</TableHead>
                        <TableHead className="text-right">PF</TableHead>
                        <TableHead className="text-right">PA</TableHead>
                        <TableHead className="text-right">Diff</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedTeams.map((team, index) => (
                        <TableRow key={team.id} className="cursor-pointer hover:bg-accent/50">
                          <TableCell className="font-medium">{index + 1}</TableCell>
                          <TableCell>
                            <div>
                              <div className="font-semibold text-card-foreground">{team.name}</div>
                              {team.ownerName && (
                                <div className="text-sm text-muted-foreground">{team.ownerName}</div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">{team.wins}</TableCell>
                          <TableCell className="text-center">{team.losses}</TableCell>
                          <TableCell className="text-center">{team.ties}</TableCell>
                          <TableCell className="text-right">{(team.pointsFor || 0).toFixed(1)}</TableCell>
                          <TableCell className="text-right">{(team.pointsAgainst || 0).toFixed(1)}</TableCell>
                          <TableCell className="text-right">
                            <span className={(team.pointsFor || 0) - (team.pointsAgainst || 0) > 0 ? "text-green-500" : "text-red-500"}>
                              {((team.pointsFor || 0) - (team.pointsAgainst || 0)).toFixed(1)}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No teams found. Sync your league data to see standings.
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="matchups" className="space-y-4">
            <WeeklyMatchups
              leagueId={leagueId}
              currentWeek={league.currentWeek || 1}
              seasonYear={league.seasonYear}
            />
          </TabsContent>

          <TabsContent value="alltime" className="space-y-4">
            <AllTimeStats leagueId={leagueId} />
          </TabsContent>

          <TabsContent value="activity" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Latest transactions and league activity</CardDescription>
              </CardHeader>
              <CardContent>
                {transactionsLoading ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : transactions && transactions.length > 0 ? (
                  <div className="space-y-3">
                    {transactions.map((transaction) => (
                      <div key={transaction.id} className="flex items-start gap-3 p-3 rounded-lg border bg-card">
                        <div className="flex-1">
                          <div className="font-medium text-card-foreground">{transaction.transactionType}</div>
                          <div className="text-sm text-muted-foreground">
                            {transaction.playerName || "Unknown Player"}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {new Date(transaction.transactionDate).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No recent activity
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
