import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface WeeklyMatchupsProps {
  leagueId: number;
  currentWeek: number;
  seasonYear: number;
}

export default function WeeklyMatchups({
  leagueId,
  currentWeek,
  seasonYear,
}: WeeklyMatchupsProps) {
  const [selectedWeek, setSelectedWeek] = useState(currentWeek);
  const [selectedSeason, setSelectedSeason] = useState(seasonYear);

  // Get all matchups to determine available seasons
  const { data: allMatchups } = trpc.league.allMatchups.useQuery({ leagueId });
  const availableSeasons = Array.from(
    new Set((allMatchups || []).map(m => m.seasonYear))
  ).sort((a, b) => b - a);

  const { data: matchups, isLoading } = trpc.league.matchups.useQuery({
    leagueId,
    week: selectedWeek,
    seasonYear: selectedSeason,
  });

  const { data: teams } = trpc.league.teams.useQuery({
    leagueId,
    seasonYear: selectedSeason,
  });

  useEffect(() => {
    setSelectedWeek(selectedSeason === seasonYear ? currentWeek : 1);
  }, [selectedSeason, seasonYear, currentWeek]);

  const getTeamName = (teamId: number) => {
    const team = teams?.find(t => t.espnTeamId === teamId);
    return team?.name || `Team ${teamId}`;
  };

  const getTeamAbbr = (teamId: number) => {
    const team = teams?.find(t => t.espnTeamId === teamId);
    return team?.abbreviation || `T${teamId}`;
  };

  const getOwnerName = (teamId: number) => {
    const team = teams?.find(t => t.espnTeamId === teamId);
    return team?.ownerName || "";
  };

  return (
    <div className="space-y-4">
      {/* Season Selector */}
      {availableSeasons.length > 1 && (
        <div className="flex items-center justify-between mb-4">
          <div className="text-sm text-muted-foreground">
            Historical Data Available
          </div>
          <Select
            value={selectedSeason.toString()}
            onValueChange={v => setSelectedSeason(parseInt(v))}
          >
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select season" />
            </SelectTrigger>
            <SelectContent>
              {availableSeasons.map(season => (
                <SelectItem key={season} value={season.toString()}>
                  {season} Season {season === seasonYear && "(Current)"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Week Selector */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setSelectedWeek(Math.max(1, selectedWeek - 1))}
          disabled={selectedWeek <= 1}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="text-center">
          <h3 className="text-lg font-semibold text-foreground">
            Week {selectedWeek}
          </h3>
          {selectedWeek === currentWeek && (
            <p className="text-sm text-muted-foreground">Current Week</p>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setSelectedWeek(Math.min(18, selectedWeek + 1))}
          disabled={selectedWeek >= 18}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Matchups Grid */}
      {isLoading ? (
        <div className="grid gap-4">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      ) : matchups && matchups.length > 0 ? (
        <div className="grid gap-4">
          {matchups.map(matchup => {
            const homeScore = matchup.homeScore || 0;
            const awayScore = matchup.awayScore || 0;
            const homeProjected = matchup.homeProjected || 0;
            const awayProjected = matchup.awayProjected || 0;
            const isComplete = matchup.isComplete === 1;

            return (
              <Card key={matchup.id} className="overflow-hidden">
                <CardContent className="p-0">
                  {/* Mobile-optimized layout */}
                  <div className="flex flex-col sm:grid sm:grid-cols-3 sm:divide-x">
                    {/* Away Team */}
                    <div className="p-3 sm:p-4 flex flex-row sm:flex-col justify-between sm:justify-center items-center sm:items-start">
                      <div className="flex flex-col items-start">
                        <div className="text-xs sm:text-sm text-muted-foreground mb-0.5 sm:mb-1">
                          {getTeamAbbr(matchup.awayTeamId)}
                        </div>
                        <div className="font-semibold text-sm sm:text-base text-card-foreground line-clamp-1 max-w-[140px] sm:max-w-none">
                          {getTeamName(matchup.awayTeamId)}
                        </div>
                        {getOwnerName(matchup.awayTeamId) && (
                          <div className="text-xs text-muted-foreground line-clamp-1 max-w-[140px] sm:max-w-none">
                            {getOwnerName(matchup.awayTeamId)}
                          </div>
                        )}
                        <div className="text-xs text-muted-foreground mt-0.5 sm:mt-1">
                          Proj: {awayProjected.toFixed(1)}
                        </div>
                      </div>
                      {/* Score on mobile */}
                      <div className="sm:hidden flex flex-col items-end">
                        <div
                          className={`text-2xl font-bold ${awayScore > homeScore && isComplete ? "text-primary" : "text-card-foreground"}`}
                        >
                          {awayScore.toFixed(1)}
                        </div>
                        {isComplete && (
                          <div className="text-xs text-primary">W</div>
                        )}
                      </div>
                    </div>

                    {/* Score - Desktop only */}
                    <div className="hidden sm:flex p-4 flex-col items-center justify-center bg-accent/20">
                      <div className="flex items-center gap-3 md:gap-4">
                        <div
                          className={`text-2xl md:text-3xl font-bold ${awayScore > homeScore && isComplete ? "text-primary" : "text-card-foreground"}`}
                        >
                          {awayScore.toFixed(1)}
                        </div>
                        <div className="text-muted-foreground">-</div>
                        <div
                          className={`text-2xl md:text-3xl font-bold ${homeScore > awayScore && isComplete ? "text-primary" : "text-card-foreground"}`}
                        >
                          {homeScore.toFixed(1)}
                        </div>
                      </div>
                      {isComplete ? (
                        <div className="text-xs text-muted-foreground mt-2">
                          Final
                        </div>
                      ) : (
                        <div className="text-xs text-muted-foreground mt-2">
                          In Progress
                        </div>
                      )}
                    </div>

                    {/* Divider on mobile */}
                    <div className="sm:hidden border-t border-border my-2"></div>

                    {/* Home Team */}
                    <div className="p-3 sm:p-4 flex flex-row sm:flex-col justify-between sm:justify-center items-center sm:items-start">
                      <div className="flex flex-col items-start">
                        <div className="text-xs sm:text-sm text-muted-foreground mb-0.5 sm:mb-1">
                          {getTeamAbbr(matchup.homeTeamId)}
                        </div>
                        <div className="font-semibold text-sm sm:text-base text-card-foreground line-clamp-1 max-w-[140px] sm:max-w-none">
                          {getTeamName(matchup.homeTeamId)}
                        </div>
                        {getOwnerName(matchup.homeTeamId) && (
                          <div className="text-xs text-muted-foreground line-clamp-1 max-w-[140px] sm:max-w-none">
                            {getOwnerName(matchup.homeTeamId)}
                          </div>
                        )}
                        <div className="text-xs text-muted-foreground mt-0.5 sm:mt-1">
                          Proj: {homeProjected.toFixed(1)}
                        </div>
                      </div>
                      {/* Score on mobile */}
                      <div className="sm:hidden flex flex-col items-end">
                        <div
                          className={`text-2xl font-bold ${homeScore > awayScore && isComplete ? "text-primary" : "text-card-foreground"}`}
                        >
                          {homeScore.toFixed(1)}
                        </div>
                        {isComplete && (
                          <div className="text-xs text-primary">W</div>
                        )}
                      </div>
                    </div>

                    {/* Status indicator on mobile */}
                    {isComplete && (
                      <div className="sm:hidden px-3 pb-3 text-center">
                        <div className="text-xs text-muted-foreground">
                          Final
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-center text-muted-foreground">
              No matchups found
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center text-sm text-muted-foreground">
            Sync your league data to see matchups for Week {selectedWeek}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
