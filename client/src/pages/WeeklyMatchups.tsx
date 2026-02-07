import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface WeeklyMatchupsProps {
  leagueId: number;
  currentWeek: number;
  seasonYear: number;
}

export default function WeeklyMatchups({ leagueId, currentWeek, seasonYear }: WeeklyMatchupsProps) {
  const [selectedWeek, setSelectedWeek] = useState(currentWeek);

  const { data: matchups, isLoading } = trpc.league.matchups.useQuery({
    leagueId,
    week: selectedWeek,
    seasonYear,
  });

  const { data: teams } = trpc.league.teams.useQuery({ leagueId });

  const getTeamName = (teamId: number) => {
    const team = teams?.find(t => t.espnTeamId === teamId);
    return team?.name || `Team ${teamId}`;
  };

  const getTeamAbbr = (teamId: number) => {
    const team = teams?.find(t => t.espnTeamId === teamId);
    return team?.abbreviation || `T${teamId}`;
  };

  return (
    <div className="space-y-4">
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
          <h3 className="text-lg font-semibold text-foreground">Week {selectedWeek}</h3>
          {selectedWeek === currentWeek && (
            <p className="text-sm text-muted-foreground">Current Week</p>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setSelectedWeek(Math.min(17, selectedWeek + 1))}
          disabled={selectedWeek >= 17}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Matchups Grid */}
      {isLoading ? (
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      ) : matchups && matchups.length > 0 ? (
        <div className="grid gap-4">
          {matchups.map((matchup) => {
            const homeScore = matchup.homeScore || 0;
            const awayScore = matchup.awayScore || 0;
            const homeProjected = matchup.homeProjected || 0;
            const awayProjected = matchup.awayProjected || 0;
            const isComplete = matchup.isComplete === 1;

            return (
              <Card key={matchup.id} className="overflow-hidden">
                <CardContent className="p-0">
                  <div className="grid grid-cols-3 divide-x">
                    {/* Away Team */}
                    <div className="p-4 flex flex-col justify-center">
                      <div className="text-sm text-muted-foreground mb-1">{getTeamAbbr(matchup.awayTeamId)}</div>
                      <div className="font-semibold text-card-foreground">{getTeamName(matchup.awayTeamId)}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Proj: {awayProjected.toFixed(1)}
                      </div>
                    </div>

                    {/* Score */}
                    <div className="p-4 flex flex-col items-center justify-center bg-accent/20">
                      <div className="flex items-center gap-4">
                        <div className={`text-3xl font-bold ${awayScore > homeScore && isComplete ? "text-primary" : "text-card-foreground"}`}>
                          {awayScore.toFixed(1)}
                        </div>
                        <div className="text-muted-foreground">-</div>
                        <div className={`text-3xl font-bold ${homeScore > awayScore && isComplete ? "text-primary" : "text-card-foreground"}`}>
                          {homeScore.toFixed(1)}
                        </div>
                      </div>
                      {isComplete ? (
                        <div className="text-xs text-muted-foreground mt-2">Final</div>
                      ) : (
                        <div className="text-xs text-muted-foreground mt-2">In Progress</div>
                      )}
                    </div>

                    {/* Home Team */}
                    <div className="p-4 flex flex-col justify-center">
                      <div className="text-sm text-muted-foreground mb-1">{getTeamAbbr(matchup.homeTeamId)}</div>
                      <div className="font-semibold text-card-foreground">{getTeamName(matchup.homeTeamId)}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Proj: {homeProjected.toFixed(1)}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-center text-muted-foreground">No matchups found</CardTitle>
          </CardHeader>
          <CardContent className="text-center text-sm text-muted-foreground">
            Sync your league data to see matchups for Week {selectedWeek}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
