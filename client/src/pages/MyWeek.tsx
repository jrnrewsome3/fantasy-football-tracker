import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import AIQueryBox from "@/components/AIQueryBox";
import { compareLineups, projectedTotal } from "@shared/lineupComparison";

interface Props {
  leagueId: number;
  teamId?: number;
}
const points = (n: number | null) =>
  n === null ? "Unavailable" : n.toFixed(1);
const timestamp = (s: Date | string | null) =>
  s ? new Date(s).toLocaleString() : "Not synced";

export default function MyWeek({ leagueId, teamId }: Props) {
  const { data, isLoading, error, refetch } = trpc.league.myWeek.useQuery(
    { leagueId, teamId },
    { enabled: leagueId > 0, staleTime: 60_000, refetchInterval: 60_000 }
  );
  const [showAI, setShowAI] = useState(false);
  if (isLoading) return <Skeleton className="h-96 w-full" />;
  if (error || !data)
    return (
      <Card>
        <CardContent className="p-4">
          <p>Unable to load this matchup.</p>
          <Button onClick={() => refetch()}>Try again</Button>
        </CardContent>
      </Card>
    );
  if (!data.hasTeam)
    return (
      <Card>
        <CardHeader className="px-4 sm:px-6">
          <CardTitle>Pick your team first</CardTitle>
        </CardHeader>
        <CardContent>
          Choose your team in the league dashboard to see your lineup and
          opponent.
        </CardContent>
      </Card>
    );
  const mine = projectedTotal(data.starters);
  const theirs = projectedTotal(data.opponentStarters);
  const rows = compareLineups(data.starters, data.opponentStarters);
  const stale = [data.rosterSyncedAt, data.opponentRosterSyncedAt].some(
    d => d && Date.now() - new Date(d).getTime() > 2 * 60 * 60 * 1000
  );
  const renderPlayers = (players: typeof data.starters) =>
    players.length ? (
      <div className="space-y-2">
        {players.map((p, i) => (
          <div key={`${p.name}-${i}`} className="rounded-lg border p-3 text-sm">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="font-medium">
                {p.slotPosition} · {p.name}
              </span>
              <span className="text-sm">
                {points(p.projectedPoints)} projected
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {p.nflTeam || "NFL team unavailable"} · {p.position} ·{" "}
              {!p.status
                ? "Status unavailable"
                : ["ACTIVE", "NORMAL"].includes(p.status)
                  ? "Active"
                  : p.status.toLowerCase()}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {p.game
                ? `${p.game.matchup} · ${new Date(p.game.kickoff).toLocaleString(undefined, { weekday: "short", hour: "numeric", minute: "2-digit" })}`
                : "NFL game information unavailable"}
            </p>
            {p.game && (
              <p className="text-xs text-muted-foreground">
                {p.game.indoor
                  ? "Indoor"
                  : [p.game.forecast, p.game.wind].filter(Boolean).join(" · ")}
              </p>
            )}
            {p.points !== null && (
              <p className="text-xs text-muted-foreground">
                {points(p.points)} points scored
              </p>
            )}
          </div>
        ))}
      </div>
    ) : (
      <p className="text-sm text-muted-foreground">
        No players synced for this group in Week {data.week}. Check the lineup
        and league sync in ESPN.
      </p>
    );
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="px-4 sm:px-6">
          <CardTitle>
            Week {data.week} · {data.teamName} vs{" "}
            {data.opponentName || "Opponent pending"}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 sm:px-6 space-y-3">
          <div className="grid grid-cols-2 gap-4 text-center">
            {[
              {
                name: data.teamName,
                score: data.myScore,
                projection: data.myProjected,
              },
              {
                name: data.opponentName,
                score: data.opponentScore,
                projection: data.opponentProjected,
              },
            ].map((t, i) => (
              <div key={i}>
                <p className="text-sm">{t.name || "Pending"}</p>
                <p className="text-3xl font-bold">
                  {points(data.isComplete ? t.score : t.projection)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {data.isComplete ? "Final" : "ESPN team projection"}
                </p>
              </div>
            ))}
          </div>
          {data.series && (
            <p className="text-sm text-muted-foreground">
              All-time series: {data.series.homeWins}–{data.series.awayWins}{" "}
              from {data.teamName}'s side.
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            Lineups from ESPN · {data.teamName}:{" "}
            {timestamp(data.rosterSyncedAt)} · {data.opponentName || "Opponent"}
            : {timestamp(data.opponentRosterSyncedAt)}
          </p>
          {stale && (
            <p className="text-sm text-amber-700 dark:text-amber-400">
              A lineup snapshot is over two hours old. Check ESPN before making
              a lineup decision.
            </p>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="px-4 sm:px-6">
          <CardTitle className="text-base">
            Starting lineup comparison
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 sm:px-6 space-y-3">
          <p className="text-sm">
            {mine !== null && theirs !== null
              ? `${data.teamName}'s ${data.starters.length} selected starters project for ${mine.toFixed(1)} points; ${data.opponentName}'s ${data.opponentStarters.length} project for ${theirs.toFixed(1)}. The projected difference is ${Math.abs(mine - theirs).toFixed(1)} points${mine === theirs ? " (even)" : ` in favor of ${mine > theirs ? data.teamName : data.opponentName}`}.`
              : "Both starting lineups and their player projections are needed for a full comparison."}
          </p>
          <p className="text-xs text-muted-foreground">
            Totals include synced selected starters only. An empty lineup slot
            may be absent. Player totals can differ from ESPN's live team
            projection. Projections are estimates, not win probabilities.
          </p>
          {rows.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <caption className="sr-only">
                  Projected points by starting lineup slot
                </caption>
                <thead>
                  <tr>
                    <th className="p-2 text-left">Slot</th>
                    <th className="p-2 text-right">{data.teamName}</th>
                    <th className="p-2 text-right">{data.opponentName}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(row => (
                    <tr key={row.slot} className="border-t">
                      <th className="p-2 text-left">{row.slot}</th>
                      <td className="p-2 text-right">{points(row.mine)}</td>
                      <td className="p-2 text-right">{points(row.opponent)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <Button
            variant="outline"
            onClick={() => setShowAI(!showAI)}
            aria-expanded={showAI}
          >
            {showAI ? "Hide questions" : "Ask AI about this matchup"}
          </Button>
          {showAI && (
            <AIQueryBox
              key={`${data.teamName}-${data.week}`}
              leagueId={leagueId}
              initialQuestion={`Compare ${data.teamName} vs ${data.opponentName} in Week ${data.week}. Explain the selected starters, projected strengths by slot, injury concerns, and bench options using the synced data.`}
            />
          )}
        </CardContent>
      </Card>
      {data.alerts.length > 0 && (
        <Card>
          <CardHeader className="px-4 sm:px-6">
            <CardTitle className="text-base">
              Lineup checks · {data.teamName}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 sm:px-6 space-y-2">
            {data.alerts.map((a, i) => (
              <p key={i} className="text-sm">
                {a.message}
              </p>
            ))}
          </CardContent>
        </Card>
      )}
      <div className="grid gap-4 lg:grid-cols-2">
        {[
          { name: data.teamName, starters: data.starters, bench: data.bench },
          {
            name: data.opponentName || "Opponent",
            starters: data.opponentStarters,
            bench: data.opponentBench,
          },
        ].map((t, i) => (
          <Card key={i}>
            <CardHeader className="px-4 sm:px-6">
              <CardTitle className="text-base">{t.name} · starters</CardTitle>
            </CardHeader>
            <CardContent className="px-4 sm:px-6 space-y-4">
              {renderPlayers(t.starters)}
              <details>
                <summary className="cursor-pointer text-sm font-medium">
                  Bench / reserve ({t.bench.length})
                </summary>
                <div className="mt-3">{renderPlayers(t.bench)}</div>
              </details>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
