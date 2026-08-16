import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Trophy, TrendingUp, TrendingDown, Zap, Target, Award, ArrowLeft, Share2 } from "lucide-react";
import { toast } from "sonner";
import { useLocation, useRoute } from "wouter";

export default function HistoricalHighlights() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/league/:id/highlights");
  
  const leagueId = params?.id ? parseInt(params.id) : 0;
  const [selectedSeason, setSelectedSeason] = useState<string>("all");

  const shareHighlight = (title: string, description: string) => {
    const text = `${title}\n\n${description}\n\nFrom Trouble in Paradise Fantasy Football Tracker`;
    
    if (navigator.share) {
      // Use native share API if available (mobile)
      navigator.share({
        title: title,
        text: text,
      }).catch(() => {
        // Fallback to clipboard
        copyToClipboard(text);
      });
    } else {
      // Fallback to clipboard
      copyToClipboard(text);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast.success("Copied to clipboard! Paste to share on social media.");
    }).catch(() => {
      toast.error("Failed to copy to clipboard");
    });
  };

  const { data: leagues } = trpc.league.list.useQuery(undefined, {
    enabled: !!user,
  });

  const { data: teams, isLoading: teamsLoading } = trpc.league.teams.useQuery(
    { leagueId },
    { enabled: !!user && leagueId > 0 }
  );

  const { data: allMatchups, isLoading: matchupsLoading } = trpc.league.allMatchups.useQuery(
    { leagueId },
    { enabled: !!user && leagueId > 0 }
  );

  const league = leagues?.find(l => l.id === leagueId);

  if (!league) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">League not found</p>
      </div>
    );
  }

  // Filter matchups by season
  const seasonMatchups = selectedSeason === "all"
    ? allMatchups || []
    : (allMatchups || []).filter(m => m.seasonYear.toString() === selectedSeason);

  // Single-game records must only compare like with like. Early seasons scored
  // a playoff round over two weeks and recorded one combined total, so those
  // matchups would win every "highest score" list by default without having
  // been a bigger week. They get their own section below.
  const filteredMatchups = seasonMatchups.filter(m => (m.scoringWeeks ?? 1) === 1);
  const multiWeekMatchups = seasonMatchups.filter(m => (m.scoringWeeks ?? 1) > 1);

  // Get unique seasons
  const seasons = Array.from(new Set((allMatchups || []).map(m => m.seasonYear))).sort((a, b) => b - a);

  // Calculate highlights
  const highlights = {
    highestScoringGame: filteredMatchups.length > 0
      ? filteredMatchups.reduce((max, m) => {
          const total = (m.homeScore || 0) + (m.awayScore || 0);
          const maxTotal = (max.homeScore || 0) + (max.awayScore || 0);
          return total > maxTotal ? m : max;
        })
      : null,

    lowestScoringGame: filteredMatchups.length > 0
      ? filteredMatchups.reduce((min, m) => {
          const total = (m.homeScore || 0) + (m.awayScore || 0);
          const minTotal = (min.homeScore || 0) + (min.awayScore || 0);
          return total < minTotal ? m : min;
        })
      : null,

    biggestBlowout: filteredMatchups.length > 0
      ? filteredMatchups.reduce((max, m) => {
          const diff = Math.abs((m.homeScore || 0) - (m.awayScore || 0));
          const maxDiff = Math.abs((max.homeScore || 0) - (max.awayScore || 0));
          return diff > maxDiff ? m : max;
        })
      : null,

    closestGame: filteredMatchups.length > 0
      ? filteredMatchups.reduce((min, m) => {
          const diff = Math.abs((m.homeScore || 0) - (m.awayScore || 0));
          const minDiff = Math.abs((min.homeScore || 0) - (min.awayScore || 0));
          return diff < minDiff ? m : min;
        })
      : null,
  };

  // Calculate team-based highlights. Matchup rows store ESPN team ids, so
  // teams (one row per season) match on espnTeamId within their own season.
  const teamStats = teams?.map(team => {
    const teamMatchups = filteredMatchups.filter(m =>
      m.seasonYear === team.seasonYear &&
      (m.homeTeamId === team.espnTeamId || m.awayTeamId === team.espnTeamId)
    );

    let wins = 0, losses = 0, totalPoints = 0, highestScore = 0;
    let currentStreak = 0, longestWinStreak = 0;
    let lastResult: 'W' | 'L' | null = null;

    teamMatchups.forEach(m => {
      const isHome = m.homeTeamId === team.espnTeamId;
      const teamScore = isHome ? (m.homeScore || 0) : (m.awayScore || 0);
      const oppScore = isHome ? (m.awayScore || 0) : (m.homeScore || 0);
      
      totalPoints += teamScore;
      if (teamScore > highestScore) highestScore = teamScore;

      const won = teamScore > oppScore;
      if (won) {
        wins++;
        if (lastResult === 'W') {
          currentStreak++;
        } else {
          currentStreak = 1;
          lastResult = 'W';
        }
        if (currentStreak > longestWinStreak) longestWinStreak = currentStreak;
      } else {
        losses++;
        if (lastResult === 'L') {
          currentStreak++;
        } else {
          currentStreak = 1;
          lastResult = 'L';
        }
      }
    });

    return {
      ...team,
      wins,
      losses,
      totalPoints,
      avgPoints: teamMatchups.length > 0 ? totalPoints / teamMatchups.length : 0,
      highestScore,
      longestWinStreak,
      gamesPlayed: teamMatchups.length,
    };
  }) || [];

  const topScorer = teamStats.reduce((max, t) => t.totalPoints > max.totalPoints ? t : max, teamStats[0] || { totalPoints: 0 });
  const bestAverage = teamStats.reduce((max, t) => t.avgPoints > max.avgPoints ? t : max, teamStats[0] || { avgPoints: 0 });
  const longestStreak = teamStats.reduce((max, t) => t.longestWinStreak > max.longestWinStreak ? t : max, teamStats[0] || { longestWinStreak: 0 });
  const highestSingleGame = teamStats.reduce((max, t) => t.highestScore > max.highestScore ? t : max, teamStats[0] || { highestScore: 0 });

  // Matchup team ids are ESPN ids; resolve within the matchup's season.
  const getTeamName = (espnTeamId: number, seasonYear: number) =>
    teams?.find(t => t.espnTeamId === espnTeamId && t.seasonYear === seasonYear)?.name || "Unknown";

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container py-6">
          <Button variant="ghost" onClick={() => setLocation(`/league/${leagueId}`)} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to League
          </Button>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Award className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-card-foreground">Historical Highlights</h1>
                <p className="text-sm text-muted-foreground">
                  {league.name} - Epic moments and records
                </p>
              </div>
            </div>

            <Select value={selectedSeason} onValueChange={setSelectedSeason}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select season" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Seasons</SelectItem>
                {seasons.map(season => (
                  <SelectItem key={season} value={season.toString()}>
                    {season} Season
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="container py-8 space-y-8">
        {/* Game Highlights */}
        <div>
          <h2 className="text-xl font-bold mb-4 text-card-foreground">Epic Matchups</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Highest Scoring Game */}
            <Card className="border-green-500/20 bg-gradient-to-br from-green-500/5 to-green-500/10">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Zap className="h-5 w-5 text-green-500" />
                    <CardTitle className="text-lg">Highest Scoring Game</CardTitle>
                  </div>
                  {highlights.highestScoringGame && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => shareHighlight(
                        "🔥 Highest Scoring Game!",
                        `${getTeamName(highlights.highestScoringGame!.homeTeamId, highlights.highestScoringGame!.seasonYear)} ${highlights.highestScoringGame!.homeScore} vs ${getTeamName(highlights.highestScoringGame!.awayTeamId, highlights.highestScoringGame!.seasonYear)} ${highlights.highestScoringGame!.awayScore}\n${((highlights.highestScoringGame!.homeScore || 0) + (highlights.highestScoringGame!.awayScore || 0)).toFixed(1)} total points!\nWeek ${highlights.highestScoringGame!.week}, ${highlights.highestScoringGame!.seasonYear}`
                      )}
                    >
                      <Share2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {matchupsLoading ? (
                  <Skeleton className="h-20 w-full" />
                ) : highlights.highestScoringGame ? (
                  <div className="space-y-2">
                    <div className="text-2xl font-bold text-green-500">
                      {((highlights.highestScoringGame.homeScore || 0) + (highlights.highestScoringGame.awayScore || 0)).toFixed(1)} points
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Week {highlights.highestScoringGame.week}, {highlights.highestScoringGame.seasonYear}
                    </div>
                    <div className="text-sm">
                      {getTeamName(highlights.highestScoringGame.homeTeamId, highlights.highestScoringGame.seasonYear)} {highlights.highestScoringGame.homeScore} vs{" "}
                      {getTeamName(highlights.highestScoringGame.awayTeamId, highlights.highestScoringGame.seasonYear)} {highlights.highestScoringGame.awayScore}
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground">No data available</p>
                )}
              </CardContent>
            </Card>

            {/* Biggest Blowout */}
            <Card className="border-red-500/20 bg-gradient-to-br from-red-500/5 to-red-500/10">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TrendingDown className="h-5 w-5 text-red-500" />
                    <CardTitle className="text-lg">Biggest Blowout</CardTitle>
                  </div>
                  {highlights.biggestBlowout && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => shareHighlight(
                        "💥 Biggest Blowout!",
                        `${getTeamName(highlights.biggestBlowout!.homeTeamId, highlights.biggestBlowout!.seasonYear)} ${highlights.biggestBlowout!.homeScore} vs ${getTeamName(highlights.biggestBlowout!.awayTeamId, highlights.biggestBlowout!.seasonYear)} ${highlights.biggestBlowout!.awayScore}\n${Math.abs((highlights.biggestBlowout!.homeScore || 0) - (highlights.biggestBlowout!.awayScore || 0)).toFixed(1)} point margin!\nWeek ${highlights.biggestBlowout!.week}, ${highlights.biggestBlowout!.seasonYear}`
                      )}
                    >
                      <Share2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {matchupsLoading ? (
                  <Skeleton className="h-20 w-full" />
                ) : highlights.biggestBlowout ? (
                  <div className="space-y-2">
                    <div className="text-2xl font-bold text-red-500">
                      {Math.abs((highlights.biggestBlowout.homeScore || 0) - (highlights.biggestBlowout.awayScore || 0)).toFixed(1)} point margin
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Week {highlights.biggestBlowout.week}, {highlights.biggestBlowout.seasonYear}
                    </div>
                    <div className="text-sm">
                      {getTeamName(highlights.biggestBlowout.homeTeamId, highlights.biggestBlowout.seasonYear)} {highlights.biggestBlowout.homeScore} vs{" "}
                      {getTeamName(highlights.biggestBlowout.awayTeamId, highlights.biggestBlowout.seasonYear)} {highlights.biggestBlowout.awayScore}
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground">No data available</p>
                )}
              </CardContent>
            </Card>

            {/* Closest Game */}
            <Card className="border-yellow-500/20 bg-gradient-to-br from-yellow-500/5 to-yellow-500/10">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-yellow-500" />
                  <CardTitle className="text-lg">Closest Game</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                {matchupsLoading ? (
                  <Skeleton className="h-20 w-full" />
                ) : highlights.closestGame ? (
                  <div className="space-y-2">
                    <div className="text-2xl font-bold text-yellow-500">
                      {Math.abs((highlights.closestGame.homeScore || 0) - (highlights.closestGame.awayScore || 0)).toFixed(1)} point margin
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Week {highlights.closestGame.week}, {highlights.closestGame.seasonYear}
                    </div>
                    <div className="text-sm">
                      {getTeamName(highlights.closestGame.homeTeamId, highlights.closestGame.seasonYear)} {highlights.closestGame.homeScore} vs{" "}
                      {getTeamName(highlights.closestGame.awayTeamId, highlights.closestGame.seasonYear)} {highlights.closestGame.awayScore}
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground">No data available</p>
                )}
              </CardContent>
            </Card>

            {/* Lowest Scoring Game */}
            <Card className="border-blue-500/20 bg-gradient-to-br from-blue-500/5 to-blue-500/10">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <TrendingDown className="h-5 w-5 text-blue-500" />
                  <CardTitle className="text-lg">Lowest Scoring Game</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                {matchupsLoading ? (
                  <Skeleton className="h-20 w-full" />
                ) : highlights.lowestScoringGame ? (
                  <div className="space-y-2">
                    <div className="text-2xl font-bold text-blue-500">
                      {((highlights.lowestScoringGame.homeScore || 0) + (highlights.lowestScoringGame.awayScore || 0)).toFixed(1)} points
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Week {highlights.lowestScoringGame.week}, {highlights.lowestScoringGame.seasonYear}
                    </div>
                    <div className="text-sm">
                      {getTeamName(highlights.lowestScoringGame.homeTeamId, highlights.lowestScoringGame.seasonYear)} {highlights.lowestScoringGame.homeScore} vs{" "}
                      {getTeamName(highlights.lowestScoringGame.awayTeamId, highlights.lowestScoringGame.seasonYear)} {highlights.lowestScoringGame.awayScore}
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground">No data available</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Team Records */}
        <div>
          <h2 className="text-xl font-bold mb-4 text-card-foreground">Team Records</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Most Total Points */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-primary" />
                  <CardTitle className="text-sm">Most Total Points</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                {teamsLoading ? (
                  <Skeleton className="h-16 w-full" />
                ) : topScorer ? (
                  <div>
                    <div className="text-xl font-bold text-card-foreground">{topScorer.name}</div>
                    <div className="text-2xl font-bold text-primary">{topScorer.totalPoints.toFixed(1)}</div>
                    <div className="text-xs text-muted-foreground">{topScorer.gamesPlayed} games</div>
                  </div>
                ) : null}
              </CardContent>
            </Card>

            {/* Best Average */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-500" />
                  <CardTitle className="text-sm">Best Average</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                {teamsLoading ? (
                  <Skeleton className="h-16 w-full" />
                ) : bestAverage ? (
                  <div>
                    <div className="text-xl font-bold text-card-foreground">{bestAverage.name}</div>
                    <div className="text-2xl font-bold text-green-500">{bestAverage.avgPoints.toFixed(1)} PPG</div>
                    <div className="text-xs text-muted-foreground">{bestAverage.gamesPlayed} games</div>
                  </div>
                ) : null}
              </CardContent>
            </Card>

            {/* Longest Win Streak */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Award className="h-5 w-5 text-yellow-500" />
                  <CardTitle className="text-sm">Longest Win Streak</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                {teamsLoading ? (
                  <Skeleton className="h-16 w-full" />
                ) : longestStreak ? (
                  <div>
                    <div className="text-xl font-bold text-card-foreground">{longestStreak.name}</div>
                    <div className="text-2xl font-bold text-yellow-500">{longestStreak.longestWinStreak} wins</div>
                    <div className="text-xs text-muted-foreground">in a row</div>
                  </div>
                ) : null}
              </CardContent>
            </Card>

            {/* Highest Single Game */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-orange-500" />
                  <CardTitle className="text-sm">Highest Single Game</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                {teamsLoading ? (
                  <Skeleton className="h-16 w-full" />
                ) : highestSingleGame ? (
                  <div>
                    <div className="text-xl font-bold text-card-foreground">{highestSingleGame.name}</div>
                    <div className="text-2xl font-bold text-orange-500">{highestSingleGame.highestScore.toFixed(1)}</div>
                    <div className="text-xs text-muted-foreground">single game</div>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
