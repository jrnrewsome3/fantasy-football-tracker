import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, ArrowLeft, Users, TrendingUp, Activity, RefreshCw, Download, Calendar, GitCompare } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import { getLoginUrl } from "@/const";
import WeeklyMatchups from "./WeeklyMatchups";
import AllTimeStats from "./AllTimeStats";
import AIQueryBox from "@/components/AIQueryBox";
import { toast } from "sonner";

export default function LeagueDetail() {
  const { user, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/league/:id");
  
  const leagueId = params?.id ? parseInt(params.id) : 0;
  const utils = trpc.useUtils();
  const [selectedSeason, setSelectedSeason] = useState<number | null>(null);

  const { data: leagues } = trpc.league.list.useQuery(undefined, {
    enabled: !!user,
  });

  const league = leagues?.find(l => l.id === leagueId);

  const { data: teams, isLoading: teamsLoading } = trpc.league.teams.useQuery(
    { leagueId },
    { enabled: !!user && leagueId > 0 }
  );

  // Get unique seasons from all leagues with same ESPN ID
  const availableSeasons = leagues
    ? Array.from(new Set(
        leagues
          .filter(l => l.espnLeagueId === league?.espnLeagueId)
          .map(l => l.seasonYear)
      )).sort((a, b) => b - a)
    : [];

  // Set default season to current league's season
  useEffect(() => {
    if (league && selectedSeason === null) {
      setSelectedSeason(league.seasonYear);
    }
  }, [league, selectedSeason]);

  // Update league ID when season changes
  useEffect(() => {
    if (selectedSeason && leagues && league) {
      const seasonLeague = leagues.find(
        l => l.espnLeagueId === league.espnLeagueId && l.seasonYear === selectedSeason
      );
      if (seasonLeague && seasonLeague.id !== leagueId) {
        setLocation(`/league/${seasonLeague.id}`);
      }
    }
  }, [selectedSeason, leagues, league, leagueId, setLocation]);

  const { data: transactions, isLoading: transactionsLoading } = trpc.league.transactions.useQuery(
    { leagueId, limit: 20 },
    { enabled: !!user && leagueId > 0 }
  );

  const syncMutation = trpc.league.sync.useMutation({
    onSuccess: (result) => {
      if (result.success) {
        toast.success("League data synced successfully!");
        // Invalidate queries to refresh data
        utils.league.teams.invalidate({ leagueId });
        utils.league.matchups.invalidate();
        utils.league.allMatchups.invalidate({ leagueId });
        utils.league.transactions.invalidate({ leagueId });
      } else {
        toast.error("Failed to sync league data");
      }
    },
    onError: (error) => {
      toast.error("Error syncing league data: " + error.message);
    },
  });

  const handleSync = () => {
    if (!league) return;
    syncMutation.mutate({
      espnLeagueId: league.espnLeagueId,
      seasonYear: league.seasonYear,
      espnS2: league.espnS2 || undefined,
      swid: league.swid || undefined,
    });
  };

  const { data: exportData, refetch: refetchExport } = trpc.league.exportStats.useQuery(
    { leagueId },
    { enabled: false }
  );

  const handleExportPDF = async () => {
    if (!league) return;
    try {
      toast.info("Generating PDF report...");
      const result = await refetchExport();
      
      if (!result.data?.success || !result.data?.markdown) {
        toast.error(result.data?.error || "Failed to generate report");
        return;
      }

      // Create markdown file
      const blob = new Blob([result.data.markdown], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${league.name.replace(/[^a-z0-9]/gi, '_')}_stats_${new Date().toISOString().split('T')[0]}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success("Report downloaded! Convert to PDF using any Markdown to PDF tool.");
    } catch (error: any) {
      toast.error("Error generating report: " + error.message);
    }
  };

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
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setLocation(`/league/${leagueId}/compare`)}
              >
                <GitCompare className="mr-2 h-4 w-4" />
                Compare Teams
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setLocation(`/league/${leagueId}/highlights`)}
              >
                <Trophy className="mr-2 h-4 w-4" />
                Highlights
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleExportPDF}
              >
                <Download className="mr-2 h-4 w-4" />
                Export PDF
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleSync}
                disabled={syncMutation.isPending}
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
                {syncMutation.isPending ? 'Syncing...' : 'Sync Data'}
              </Button>
            </div>
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
            <TabsTrigger value="ai">AI Assistant</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>

          <TabsContent value="standings" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>League Standings</CardTitle>
                    <CardDescription>
                      {selectedSeason ? `${selectedSeason} Season` : 'Current season'} standings and team statistics
                    </CardDescription>
                  </div>
                  {availableSeasons.length > 1 && (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <Select
                        value={selectedSeason?.toString() || ''}
                        onValueChange={(value) => setSelectedSeason(parseInt(value))}
                      >
                        <SelectTrigger className="w-[140px]">
                          <SelectValue placeholder="Select season" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableSeasons.map((season) => (
                            <SelectItem key={season} value={season.toString()}>
                              {season} Season
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
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

          <TabsContent value="ai" className="space-y-4">
            <AIQueryBox leagueId={leagueId} />
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
