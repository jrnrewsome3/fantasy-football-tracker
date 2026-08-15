import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  Calendar,
  Users,
  Trophy,
  TrendingUp,
  Info,
} from "lucide-react";
import { useLocation, useRoute } from "wouter";
import { getLoginUrl } from "@/const";

export default function BrowseSeasons() {
  const { user, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/seasons/:espnLeagueId");

  const espnLeagueId = params?.espnLeagueId || "";

  const { data: leagues } = trpc.league.list.useQuery(undefined, {
    enabled: !!user,
  });

  const { data: seasonSummaries, isLoading: summariesLoading } =
    trpc.league.seasonSummaries.useQuery(
      { espnLeagueId },
      { enabled: !!user && !!espnLeagueId }
    );

  // Get league name from first available league with this ESPN ID
  const leagueName =
    leagues?.find(l => l.espnLeagueId === espnLeagueId)?.name || "League";

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
            <CardDescription>Please log in to browse seasons</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => (window.location.href = getLoginUrl())}
              className="w-full"
            >
              Log In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (summariesLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container py-8">
          <Skeleton className="h-10 w-48 mb-6" />
          <Skeleton className="h-32 w-full mb-6" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-64 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!seasonSummaries || seasonSummaries.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container py-8">
          <Button variant="ghost" onClick={() => setLocation("/dashboard")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
          <div className="mt-8 text-center">
            <p className="text-muted-foreground">No seasons found</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-8">
        <Button
          variant="ghost"
          onClick={() => setLocation("/dashboard")}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>

        <div className="space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold text-card-foreground">
              Browse Seasons
            </h1>
            <p className="text-muted-foreground mt-1">
              Complete season archive for {leagueName}
            </p>
          </div>

          {/* Season Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {seasonSummaries.map(
              ({ league, teamCount, totalGames, topScorer, coverage }) => (
                <Card
                  key={`${league.id}-${league.seasonYear}`}
                  className="cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => setLocation(`/league/${league.id}`)}
                >
                  <CardHeader className="border-b bg-gradient-to-br from-primary/5 to-transparent">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-2xl">
                          {league.seasonYear}
                        </CardTitle>
                        <CardDescription>Season</CardDescription>
                      </div>
                      <Calendar className="h-8 w-8 text-primary" />
                    </div>
                  </CardHeader>
                  <CardContent className="pt-6 space-y-4">
                    {/* Team Count */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Users className="h-4 w-4" />
                        <span className="text-sm">Teams</span>
                      </div>
                      <span className="font-semibold text-card-foreground">
                        {teamCount}
                      </span>
                    </div>

                    {/* Total Games */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <TrendingUp className="h-4 w-4" />
                        <span className="text-sm">Total Games</span>
                      </div>
                      <span className="font-semibold text-card-foreground">
                        {totalGames}
                      </span>
                    </div>

                    {/* Top Scorer */}
                    {coverage?.championName ? (
                      <div className="pt-2 border-t">
                        <div className="flex items-center gap-2 text-muted-foreground mb-1">
                          <Trophy className="h-4 w-4 text-yellow-500" />
                          <span className="text-sm">Champion</span>
                        </div>
                        <p className="ml-6 font-semibold text-card-foreground text-sm">
                          {coverage.championName}
                        </p>
                      </div>
                    ) : topScorer && topScorer.points > 0 ? (
                      <div className="pt-2 border-t">
                        <div className="flex items-center gap-2 text-muted-foreground mb-1">
                          <Trophy className="h-4 w-4 text-yellow-500" />
                          <span className="text-sm">Top Scorer</span>
                        </div>
                        <div className="ml-6">
                          <p className="font-semibold text-card-foreground text-sm">
                            {topScorer.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {topScorer.points.toLocaleString()} points
                          </p>
                        </div>
                      </div>
                    ) : null}

                    {coverage && !coverage.matchupsComplete && (
                      <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 p-2 text-xs text-muted-foreground">
                        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
                        Final standings imported. Weekly scores are not
                        available for this season yet.
                      </div>
                    )}

                    {/* Week Info */}
                    <div className="pt-2 border-t">
                      <p className="text-xs text-muted-foreground">
                        Week {league.currentWeek} of {league.totalWeeks}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )
            )}
          </div>

          {/* Summary Stats */}
          <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
            <CardHeader>
              <CardTitle>Archive Summary</CardTitle>
              <CardDescription>
                Complete history of {leagueName}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Total Seasons</p>
                  <p className="text-2xl font-bold text-card-foreground">
                    {seasonSummaries.length}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Years Covered</p>
                  <p className="text-2xl font-bold text-card-foreground">
                    {
                      seasonSummaries[seasonSummaries.length - 1]?.league
                        .seasonYear
                    }{" "}
                    - {seasonSummaries[0]?.league.seasonYear}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    Total Games Played
                  </p>
                  <p className="text-2xl font-bold text-card-foreground">
                    {seasonSummaries
                      .reduce((sum, s) => sum + s.totalGames, 0)
                      .toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
