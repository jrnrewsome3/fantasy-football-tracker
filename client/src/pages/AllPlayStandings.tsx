import { trpc } from "@/lib/trpc";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dices } from "lucide-react";
import { useState } from "react";

interface Props {
  espnLeagueId: string;
  seasons: number[];
}

/**
 * A fantasy schedule is random: you can score well and lose because you drew
 * the week's high scorer. All-play scores every manager against the entire
 * league each week, so the gap between a real record and an all-play record
 * is the size of the favour the schedule did them.
 */
export default function AllPlayStandings({ espnLeagueId, seasons }: Props) {
  const [season, setSeason] = useState<number | null>(null);

  const { data, isLoading } = trpc.league.allPlay.useQuery(
    { espnLeagueId, seasonYear: season ?? undefined },
    { enabled: !!espnLeagueId }
  );

  const rows = data || [];
  const luckiest = [...rows].sort((a, b) => b.luck - a.luck)[0];
  const unluckiest = [...rows].sort((a, b) => a.luck - b.luck)[0];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Dices className="h-5 w-5 text-primary" />
          Schedule Luck
        </CardTitle>
        <CardDescription>
          What everyone's record would be if they played the whole league every
          week instead of one opponent. Regular season only.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-1 rounded-lg bg-muted p-1">
          <Button
            variant={season === null ? "default" : "ghost"}
            size="sm"
            className="text-xs"
            onClick={() => setSeason(null)}
          >
            All-time
          </Button>
          {seasons.map(year => (
            <Button
              key={year}
              variant={season === year ? "default" : "ghost"}
              size="sm"
              className="text-xs"
              onClick={() => setSeason(year)}
            >
              {year}
            </Button>
          ))}
        </div>

        {isLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : rows.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            All-play needs completed regular-season games. It will fill in once
            the season is under way.
          </p>
        ) : (
          <>
            {luckiest && unluckiest && luckiest.key !== unluckiest.key && (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-green-500/30 bg-green-500/5 p-3">
                  <p className="text-xs text-muted-foreground">
                    Most helped by the schedule
                  </p>
                  <p className="font-semibold text-card-foreground">
                    {luckiest.label}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {luckiest.actualWins} wins, {luckiest.expectedWins} expected
                    {luckiest.luck > 0 ? ` — ${luckiest.luck} more than earned` : ""}
                  </p>
                </div>
                <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-3">
                  <p className="text-xs text-muted-foreground">
                    Most robbed by the schedule
                  </p>
                  <p className="font-semibold text-card-foreground">
                    {unluckiest.label}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {unluckiest.actualWins} wins, {unluckiest.expectedWins}{" "}
                    expected
                    {unluckiest.luck < 0
                      ? ` — ${Math.abs(unluckiest.luck)} fewer than earned`
                      : ""}
                  </p>
                </div>
              </div>
            )}

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Owner</TableHead>
                    <TableHead className="text-right">Actual</TableHead>
                    <TableHead className="text-right">
                      vs whole league
                    </TableHead>
                    <TableHead className="text-right">All-play %</TableHead>
                    <TableHead className="text-right">Luck</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map(row => (
                    <TableRow key={row.key}>
                      <TableCell className="font-medium">
                        {row.label}
                        <span className="ml-2 text-xs text-muted-foreground">
                          {row.seasons}{" "}
                          {row.seasons === 1 ? "season" : "seasons"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {row.actualWins}–{row.actualLosses}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {row.allPlayWins}–{row.allPlayLosses}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {(row.allPlayPct * 100).toFixed(1)}%
                      </TableCell>
                      <TableCell
                        className={`text-right font-semibold tabular-nums ${
                          row.luck > 0.5
                            ? "text-green-500"
                            : row.luck < -0.5
                              ? "text-red-500"
                              : "text-muted-foreground"
                        }`}
                      >
                        {row.luck > 0 ? "+" : ""}
                        {row.luck}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <p className="text-xs text-muted-foreground">
              <strong>Luck</strong> is real wins minus the wins an all-play rate
              would predict over the same number of games. Positive means the
              schedule was kind; negative means you scored well and lost anyway.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
