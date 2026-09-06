import { trpc } from "@/lib/trpc";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, CalendarClock, Info, Wind } from "lucide-react";

interface Props {
  leagueId: number;
}

const kickoffLabel = (iso: string) =>
  new Date(iso).toLocaleString(undefined, {
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
  });

/** Everything a manager needs before lineups lock, on one screen. */
export default function MyWeek({ leagueId }: Props) {
  const { data, isLoading } = trpc.league.myWeek.useQuery(
    { leagueId },
    { enabled: leagueId > 0, staleTime: 5 * 60 * 1000 }
  );

  if (isLoading) return <Skeleton className="h-96 w-full" />;
  if (!data) return null;

  if (!data.hasTeam) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pick your team first</CardTitle>
          <CardDescription>
            Choose which team is yours and this becomes your week-by-week
            command centre — your matchup, your starters, kickoff times, and
            anything that needs attention before lineups lock.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const showScore = data.myScore !== null && data.isComplete;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-primary" />
            Week {data.week}
            {data.opponentName ? ` · vs ${data.opponentName}` : ""}
          </CardTitle>
          {data.series && data.series.meetings > 0 && (
            <CardDescription>
              {data.series.leader === "even"
                ? `You are tied ${data.series.homeWins}–${data.series.awayWins} all-time`
                : data.series.leader === "home"
                  ? `You lead this series ${data.series.homeWins}–${data.series.awayWins}`
                  : `You trail this series ${data.series.homeWins}–${data.series.awayWins}`}
              {data.series.streak && data.series.streak.count > 1
                ? data.series.streak.key === "home"
                  ? ` · you have won ${data.series.streak.count} straight`
                  : ` · you have lost ${data.series.streak.count} straight`
                : ""}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>
          {data.opponentName ? (
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <p className="text-xs text-muted-foreground">
                  {data.teamName || "You"}
                </p>
                <p className="text-3xl font-bold text-card-foreground tabular-nums">
                  {showScore
                    ? data.myScore?.toFixed(1)
                    : data.myProjected
                      ? data.myProjected.toFixed(1)
                      : "—"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {showScore ? "final" : "projected"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">
                  {data.opponentName}
                </p>
                <p className="text-3xl font-bold text-card-foreground tabular-nums">
                  {showScore
                    ? data.opponentScore?.toFixed(1)
                    : data.opponentProjected
                      ? data.opponentProjected.toFixed(1)
                      : "—"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {showScore ? "final" : "projected"}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No matchup scheduled for this week yet.
            </p>
          )}
        </CardContent>
      </Card>

      {data.alerts.length > 0 && (
        <Card className="border-amber-500/40 bg-amber-500/5">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Before you lock
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.alerts.map((alert, index) => (
              <div key={index} className="flex items-start gap-2 text-sm">
                {alert.level === "warning" ? (
                  <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-500" />
                ) : (
                  <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground" />
                )}
                <span
                  className={
                    alert.level === "warning"
                      ? "text-card-foreground"
                      : "text-muted-foreground"
                  }
                >
                  {alert.message}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Your starters</CardTitle>
          <CardDescription>
            Kickoff time and conditions for every player you are starting.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!data.hasRoster ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Rosters appear once the season starts and the first games sync.
            </p>
          ) : (
            <div className="space-y-2">
              {data.starters.map(player => (
                <div
                  key={player.name}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-muted px-1.5 py-0.5 text-xs font-medium">
                        {player.slotPosition || player.position || "—"}
                      </span>
                      <span className="font-medium text-card-foreground">
                        {player.name}
                      </span>
                      {player.status && player.status !== "ACTIVE" && (
                        <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-xs text-amber-600 dark:text-amber-400">
                          {player.status.replace(/_/g, " ")}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {player.nflTeam || "FA"}
                      {player.game ? ` · ${player.game.matchup}` : " · bye week"}
                      {player.game
                        ? ` · ${kickoffLabel(player.game.kickoff)}`
                        : ""}
                    </p>
                  </div>
                  {player.game && (
                    <div className="text-right text-xs text-muted-foreground">
                      <div>
                        {player.game.indoor
                          ? "Indoor"
                          : player.game.temperature !== null
                            ? `${player.game.temperature}°F`
                            : player.game.forecast}
                      </div>
                      {player.game.wind && !player.game.indoor && (
                        <div className="flex items-center justify-end gap-1">
                          <Wind className="h-3 w-3" />
                          {player.game.wind}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
