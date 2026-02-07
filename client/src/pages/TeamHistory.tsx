import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Trophy, TrendingUp, Target } from "lucide-react";
import { useLocation, useRoute } from "wouter";
import { getLoginUrl } from "@/const";

export default function TeamHistory() {
  const { user, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/team/:espnTeamId/:espnLeagueId/history");
  
  const espnTeamId = params?.espnTeamId ? parseInt(params.espnTeamId) : 0;
  const espnLeagueId = params?.espnLeagueId || "";

  const { data: history, isLoading: historyLoading } = trpc.league.teamHistory.useQuery(
    { espnTeamId, espnLeagueId },
    { enabled: !!user && espnTeamId > 0 && !!espnLeagueId }
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
            <CardDescription>Please log in to view team history</CardDescription>
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

  if (historyLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container py-8">
          <Skeleton className="h-10 w-48 mb-6" />
          <Skeleton className="h-32 w-full mb-6" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  if (!history || history.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container py-8">
          <Button variant="ghost" onClick={() => setLocation("/dashboard")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
          <div className="mt-8 text-center">
            <p className="text-muted-foreground">No team history found</p>
          </div>
        </div>
      </div>
    );
  }

  const teamName = history[0]?.name || "Team";
  const logoUrl = history[0]?.logoUrl;

  // Calculate career totals
  const careerStats = history.reduce((acc, season) => ({
    wins: acc.wins + (season.wins || 0),
    losses: acc.losses + (season.losses || 0),
    ties: acc.ties + (season.ties || 0),
    pointsFor: acc.pointsFor + (season.pointsFor || 0),
    pointsAgainst: acc.pointsAgainst + (season.pointsAgainst || 0),
  }), { wins: 0, losses: 0, ties: 0, pointsFor: 0, pointsAgainst: 0 });

  const totalGames = careerStats.wins + careerStats.losses + careerStats.ties;
  const winPercentage = totalGames > 0 ? ((careerStats.wins / totalGames) * 100).toFixed(1) : "0.0";

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-8">
        <Button variant="ghost" onClick={() => setLocation("/dashboard")} className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>

        <div className="space-y-6">
          {/* Team Header */}
          <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
            <CardHeader>
              <div className="flex items-center gap-4">
                {logoUrl && (
                  <img src={logoUrl} alt={teamName} className="h-16 w-16 rounded-lg object-cover" />
                )}
                <div>
                  <CardTitle className="text-3xl">{teamName}</CardTitle>
                  <CardDescription className="text-lg mt-1">
                    Complete history across {history.length} season{history.length !== 1 ? 's' : ''}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Career Stats Summary */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Career Record</CardTitle>
                <Trophy className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-card-foreground">
                  {careerStats.wins}-{careerStats.losses}-{careerStats.ties}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {winPercentage}% win rate
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Points For</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-card-foreground">
                  {careerStats.pointsFor.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {(careerStats.pointsFor / history.length).toFixed(1)} per season
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Points Against</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-card-foreground">
                  {careerStats.pointsAgainst.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {(careerStats.pointsAgainst / history.length).toFixed(1)} per season
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Point Differential</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-card-foreground">
                  {(careerStats.pointsFor - careerStats.pointsAgainst > 0 ? '+' : '')}
                  {(careerStats.pointsFor - careerStats.pointsAgainst).toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Career differential
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Season-by-Season History */}
          <Card>
            <CardHeader>
              <CardTitle>Season-by-Season Performance</CardTitle>
              <CardDescription>
                Year-over-year stats for {teamName}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Season</TableHead>
                    <TableHead className="text-center">Record</TableHead>
                    <TableHead className="text-right">Win %</TableHead>
                    <TableHead className="text-right">PF</TableHead>
                    <TableHead className="text-right">PA</TableHead>
                    <TableHead className="text-right">Diff</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((season) => {
                    const seasonGames = (season.wins || 0) + (season.losses || 0) + (season.ties || 0);
                    const seasonWinPct = seasonGames > 0 
                      ? ((season.wins || 0) / seasonGames * 100).toFixed(1) 
                      : "0.0";
                    const diff = (season.pointsFor || 0) - (season.pointsAgainst || 0);

                    return (
                      <TableRow key={season.id}>
                        <TableCell className="font-medium">{season.seasonYear}</TableCell>
                        <TableCell className="text-center">
                          {season.wins}-{season.losses}-{season.ties}
                        </TableCell>
                        <TableCell className="text-right">{seasonWinPct}%</TableCell>
                        <TableCell className="text-right">{season.pointsFor?.toLocaleString() || 0}</TableCell>
                        <TableCell className="text-right">{season.pointsAgainst?.toLocaleString() || 0}</TableCell>
                        <TableCell className={`text-right font-medium ${diff > 0 ? 'text-green-500' : diff < 0 ? 'text-red-500' : 'text-muted-foreground'}`}>
                          {diff > 0 ? '+' : ''}{diff}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
