import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface HeadToHeadMatrixProps {
  leagueId: number;
}

interface H2HRecord {
  wins: number;
  losses: number;
  ties: number;
}

export default function HeadToHeadMatrix({ leagueId }: HeadToHeadMatrixProps) {
  const { data: teams, isLoading: teamsLoading } = trpc.league.teams.useQuery({ leagueId });
  const { data: allMatchups, isLoading: matchupsLoading } = trpc.league.allMatchups.useQuery({ leagueId });

  const isLoading = teamsLoading || matchupsLoading;

  // Head-to-head follows the person, not the team. Team names change between
  // (and during) seasons, and historical seasons use different team ids than
  // the current one, so both sides are resolved to a franchise key first.
  const h2hMatrix = new Map<string, H2HRecord>();

  const personOf = (seasonYear: number, espnTeamId: number) => {
    const team = teams?.find(
      t => t.seasonYear === seasonYear && t.espnTeamId === espnTeamId
    );
    return team?.franchiseKey || team?.ownerName || null;
  };

  /** One row per person, labelled by their most recent name. */
  const people = new Map<string, { key: string; label: string; season: number }>();
  for (const team of teams || []) {
    const key = team.franchiseKey || team.ownerName;
    if (!key) continue;
    const existing = people.get(key);
    if (!existing || team.seasonYear > existing.season) {
      people.set(key, {
        key,
        label: team.ownerName || team.name,
        season: team.seasonYear,
      });
    }
  }
  const roster = Array.from(people.values()).sort((a, b) =>
    a.label.localeCompare(b.label)
  );

  if (teams && allMatchups) {
    for (const a of roster)
      for (const b of roster)
        if (a.key !== b.key)
          h2hMatrix.set(`${a.key}-${b.key}`, { wins: 0, losses: 0, ties: 0 });

    for (const matchup of allMatchups) {
      if (!matchup.isComplete) continue;

      const home = personOf(matchup.seasonYear, matchup.homeTeamId);
      const away = personOf(matchup.seasonYear, matchup.awayTeamId);
      if (!home || !away || home === away) continue;

      const homeRecord = h2hMatrix.get(`${home}-${away}`);
      const awayRecord = h2hMatrix.get(`${away}-${home}`);
      const homeScore = matchup.homeScore || 0;
      const awayScore = matchup.awayScore || 0;

      if (homeScore > awayScore) {
        if (homeRecord) homeRecord.wins++;
        if (awayRecord) awayRecord.losses++;
      } else if (awayScore > homeScore) {
        if (homeRecord) homeRecord.losses++;
        if (awayRecord) awayRecord.wins++;
      } else {
        if (homeRecord) homeRecord.ties++;
        if (awayRecord) awayRecord.ties++;
      }
    }
  }

  const getH2HRecord = (key1: string, key2: string): H2HRecord =>
    h2hMatrix.get(`${key1}-${key2}`) || { wins: 0, losses: 0, ties: 0 };

  const formatRecord = (record: H2HRecord): string => {
    if (record.ties > 0) {
      return `${record.wins}-${record.losses}-${record.ties}`;
    }
    return `${record.wins}-${record.losses}`;
  };

  const getRecordColor = (record: H2HRecord): string => {
    if (record.wins > record.losses) return "text-green-500";
    if (record.losses > record.wins) return "text-red-500";
    return "text-muted-foreground";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Head-to-Head Records</CardTitle>
        <CardDescription>
          All-time records between owners, across every season they have played.
          Row owner vs column owner.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : roster.length > 0 ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky left-0 bg-card z-10 min-w-[130px]">Owner</TableHead>
                  {roster.map(person => (
                    <TableHead key={person.key} className="text-center min-w-[74px]">
                      <div className="text-xs font-medium">{person.label}</div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {roster.map(rowPerson => (
                  <TableRow key={rowPerson.key}>
                    <TableCell className="sticky left-0 bg-card z-10 font-medium">
                      <span className="text-sm">{rowPerson.label}</span>
                    </TableCell>
                    {roster.map(colPerson => {
                      if (rowPerson.key === colPerson.key) {
                        return (
                          <TableCell key={colPerson.key} className="text-center bg-accent/20">
                            <span className="text-muted-foreground">—</span>
                          </TableCell>
                        );
                      }

                      const record = getH2HRecord(rowPerson.key, colPerson.key);
                      const totalGames = record.wins + record.losses + record.ties;

                      return (
                        <TableCell key={colPerson.key} className="text-center">
                          {totalGames > 0 ? (
                            <span className={`text-sm font-semibold ${getRecordColor(record)}`}>
                              {formatRecord(record)}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            No matchup data available. Sync your league to see head-to-head records.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
