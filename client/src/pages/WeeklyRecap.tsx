import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Trophy, TrendingUp, Zap, Target, ChevronLeft, ChevronRight } from "lucide-react";
import { useLocation, useRoute } from "wouter";
import { getLoginUrl } from "@/const";
import { useState } from "react";

export default function WeeklyRecap() {
  const { user, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/league/:id/recap");
  
  const leagueId = params?.id ? parseInt(params.id) : 0;
  const [selectedWeek, setSelectedWeek] = useState<number>(1);

  const { data: leagues } = trpc.league.list.useQuery(undefined, {
    enabled: !!user,
  });

  const league = leagues?.find(l => l.id === leagueId);

  const { data: recap, isLoading: recapLoading } = trpc.league.weeklyRecap.useQuery(
    {
      leagueId,
      week: selectedWeek,
      seasonYear: league?.seasonYear || new Date().getFullYear(),
    },
    { enabled: !!user && leagueId > 0 && !!league }
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
            <CardDescription>Please log in to view weekly recaps</CardDescription>
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

  const totalWeeks = league.totalWeeks || 17;
  const weeks = Array.from({ length: totalWeeks }, (_, i) => i + 1);

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-8">
        <Button variant="ghost" onClick={() => setLocation(`/league/${leagueId}`)} className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to League
        </Button>

        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-card-foreground">Weekly Recap - {league.seasonYear} Season</h1>
              <p className="text-muted-foreground mt-1">
                AI-generated highlights and analysis for {league.name} • Week {selectedWeek} of {league.seasonYear}
              </p>
            </div>
          </div>

          {/* Week Navigation */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setSelectedWeek(Math.max(1, selectedWeek - 1))}
                  disabled={selectedWeek === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                
                <div className="flex-1">
                  <Select
                    value={selectedWeek.toString()}
                    onValueChange={(value) => setSelectedWeek(parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select week" />
                    </SelectTrigger>
                    <SelectContent>
                      {weeks.map((week) => (
                        <SelectItem key={week} value={week.toString()}>
                          Week {week}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setSelectedWeek(Math.min(totalWeeks, selectedWeek + 1))}
                  disabled={selectedWeek === totalWeeks}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Loading State */}
          {recapLoading && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <Skeleton className="h-6 w-32" />
                  <Skeleton className="h-4 w-full mt-2" />
                </CardHeader>
              </Card>
            </div>
          )}

          {/* Recap Content */}
          {!recapLoading && recap && (
            <div className="space-y-6">
              {/* Summary */}
              <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-primary" />
                    Week {recap.week} Highlights ({league.seasonYear} Season)
                  </CardTitle>
                  <CardDescription>
                    Key moments from Week {recap.week} of the {league.seasonYear} season
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-lg text-card-foreground leading-relaxed">
                    {recap.summary}
                  </p>
                </CardContent>
              </Card>

              {/* Top Performers */}
              {recap.topPerformers.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Zap className="h-5 w-5 text-yellow-500" />
                      Top Performers
                    </CardTitle>
                    <CardDescription>Highest scoring teams in Week {recap.week} of {league.seasonYear}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {recap.topPerformers.map((performer, index) => (
                        <div
                          key={index}
                          className="flex items-start gap-4 p-4 rounded-lg bg-muted/50 border border-border"
                        >
                          <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-2xl font-bold text-primary">#{index + 1}</span>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <h3 className="font-semibold text-card-foreground">{performer.teamName}</h3>
                              <span className="text-2xl font-bold text-primary">
                                {performer.score.toFixed(1)}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground">{performer.highlight}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Biggest Upsets */}
              {recap.biggestUpsets.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-orange-500" />
                      Biggest Upsets
                    </CardTitle>
                    <CardDescription>Unexpected victories in Week {recap.week} of {league.seasonYear}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {recap.biggestUpsets.map((upset, index) => (
                        <div
                          key={index}
                          className="p-4 rounded-lg bg-orange-500/5 border border-orange-500/20"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-semibold text-green-500">{upset.winner}</span>
                            <span className="text-xl font-bold text-card-foreground">
                              {upset.winnerScore.toFixed(1)} - {upset.loserScore.toFixed(1)}
                            </span>
                            <span className="font-semibold text-red-500">{upset.loser}</span>
                          </div>
                          <p className="text-sm text-muted-foreground">{upset.description}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Closest Games & Blowouts */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Closest Games */}
                {recap.closestGames.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Target className="h-5 w-5 text-blue-500" />
                        Closest Games
                      </CardTitle>
                      <CardDescription>Nail-biting finishes from Week {recap.week}, {league.seasonYear}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {recap.closestGames.map((game, index) => (
                          <div key={index} className="p-3 rounded-lg bg-blue-500/5 border border-blue-500/20">
                            <div className="flex items-center justify-between text-sm">
                              <span className="font-medium">{game.team1}</span>
                              <span className="font-bold text-card-foreground">
                                {game.score1.toFixed(1)} - {game.score2.toFixed(1)}
                              </span>
                              <span className="font-medium">{game.team2}</span>
                            </div>
                            <p className="text-xs text-muted-foreground text-center mt-1">
                              {game.margin.toFixed(1)} point margin
                            </p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Blowouts */}
                {recap.blowouts.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-purple-500" />
                        Biggest Blowouts
                      </CardTitle>
                      <CardDescription>Dominant performances from Week {recap.week}, {league.seasonYear}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {recap.blowouts.map((blowout, index) => (
                          <div key={index} className="p-3 rounded-lg bg-purple-500/5 border border-purple-500/20">
                            <div className="flex items-center justify-between text-sm">
                              <span className="font-medium text-green-500">{blowout.winner}</span>
                              <span className="font-bold text-card-foreground">
                                {blowout.winnerScore.toFixed(1)} - {blowout.loserScore.toFixed(1)}
                              </span>
                              <span className="font-medium text-red-500">{blowout.loser}</span>
                            </div>
                            <p className="text-xs text-muted-foreground text-center mt-1">
                              {blowout.margin.toFixed(1)} point victory
                            </p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Storylines */}
              {recap.storylines.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Key Storylines</CardTitle>
                    <CardDescription>Notable moments from Week {recap.week} of the {league.seasonYear} season</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3">
                      {recap.storylines.map((storyline, index) => (
                        <li key={index} className="flex gap-3">
                          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                            {index + 1}
                          </span>
                          <p className="text-card-foreground">{storyline}</p>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* No Data State */}
          {!recapLoading && !recap && (
            <Card>
              <CardContent className="py-12 text-center">
                <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  No recap available for Week {selectedWeek}. Make sure matchup data has been synced.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
