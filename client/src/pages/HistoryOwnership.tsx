import { useEffect, useMemo, useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Save, UsersRound } from "lucide-react";
import { toast } from "sonner";
import { useLocation, useRoute } from "wouter";

type AssignmentDraft = { ownerText: string; franchiseKey: string };

export default function HistoryOwnership() {
  const { user, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/league/:id/history-ownership");
  const leagueId = Number(params?.id || 0);
  const utils = trpc.useUtils();
  const [drafts, setDrafts] = useState<Record<number, AssignmentDraft>>({});

  const { data: leagues } = trpc.league.list.useQuery(undefined, {
    enabled: Boolean(user),
  });
  const league = leagues?.find(item => item.id === leagueId);
  const { data: currentTeams } = trpc.league.teams.useQuery(
    {
      leagueId,
      seasonYear: league?.seasonYear,
      espnLeagueId: league?.espnLeagueId,
      allTime: false,
    },
    { enabled: Boolean(user && league) }
  );
  const { data: rows, isLoading } = trpc.league.historicalOwnership.useQuery(
    { leagueId },
    {
      enabled: Boolean(user && leagueId && league?.userRole === "commissioner"),
    }
  );

  useEffect(() => {
    if (!rows) return;
    setDrafts(
      Object.fromEntries(
        rows.map(row => [
          row.id,
          {
            ownerText: row.ownerName?.replace(/ & /g, ", ") || "",
            franchiseKey: row.franchiseKey || row.name.trim().toLowerCase(),
          },
        ])
      )
    );
  }, [rows]);

  const rowsBySeason = useMemo(() => {
    const grouped = new Map<number, typeof rows>();
    for (const row of rows || []) {
      grouped.set(row.seasonYear, [
        ...(grouped.get(row.seasonYear) || []),
        row,
      ]);
    }
    return Array.from(grouped.entries()).sort(([a], [b]) => b - a);
  }, [rows]);

  const identifiedManagers = (rows || []).filter(row =>
    Boolean(drafts[row.id]?.ownerText.trim())
  ).length;

  const saveMutation = trpc.league.updateHistoricalOwnership.useMutation({
    onSuccess: result => {
      toast.success(result.message, {
        description: result.incompleteSeasons
          ? `${result.completedSeasons} seasons are ready. ${result.incompleteSeasons} still need manager names before career totals unlock.`
          : "All historical seasons are ready for career totals.",
      });
      utils.league.historicalOwnership.invalidate({ leagueId });
      utils.league.teams.invalidate();
      utils.league.seasonSummaries.invalidate();
      if (league?.espnLeagueId) {
        utils.league.ownerLeaderboard.invalidate({
          espnLeagueId: league.espnLeagueId,
        });
      }
    },
    onError: error =>
      toast.error("Could not save historical ownership", {
        description: error.message,
      }),
  });

  const saveAll = () => {
    if (!rows) return;
    saveMutation.mutate({
      leagueId,
      assignments: rows.map(row => {
        const draft = drafts[row.id] || {
          ownerText: "",
          franchiseKey: row.name.toLowerCase(),
        };
        return {
          teamId: row.id,
          ownerNames: draft.ownerText
            .split(",")
            .map(name => name.trim())
            .filter(Boolean),
          franchiseKey: draft.franchiseKey.trim() || row.name.toLowerCase(),
        };
      }),
    });
  };

  if (authLoading || isLoading) {
    return (
      <div className="container py-8">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="mt-6 h-96 w-full" />
      </div>
    );
  }

  if (!user || !league || league.userRole !== "commissioner") {
    return (
      <div className="container py-12 text-center">
        <p className="text-muted-foreground">
          Only the connected League Manager can clean up historical ownership.
        </p>
        <Button className="mt-4" onClick={() => setLocation("/dashboard")}>
          Back to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-5xl py-6 sm:py-8">
        <Button
          variant="ghost"
          className="mb-4"
          onClick={() => setLocation(`/league/${leagueId}`)}
        >
          <ArrowLeft className="h-4 w-4" /> Back to League
        </Button>

        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold sm:text-3xl">
              <UsersRound className="h-7 w-7 text-primary" /> Historical
              Ownership
            </h1>
            <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
              Add every manager who shared a team, separated by commas. Use the
              same franchise key when a real franchise changed names between
              seasons. This cleanup never changes ESPN.
            </p>
            <p className="mt-1 max-w-3xl text-xs text-muted-foreground">
              Select an <code>espn:</code> suggestion to connect an old team to
              a current franchise, or reuse your own key for a former franchise.
            </p>
          </div>
          <Button
            onClick={saveAll}
            disabled={!rows?.length || saveMutation.isPending}
          >
            <Save className="h-4 w-4" />
            {saveMutation.isPending ? "Saving…" : "Save All Assignments"}
          </Button>
        </div>

        {rows?.length ? (
          <Card className="mb-6 border-primary/30 bg-primary/5">
            <CardContent className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold">
                  {identifiedManagers} of {rows.length} manager records
                  identified
                </p>
                <p className="text-sm text-muted-foreground">
                  You can save progress at any time. Career totals unlock after
                  every historical team has at least one manager and the
                  franchise links have been reviewed.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {!rows?.length ? (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              Upload a historical standings file from the league page first.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            <datalist id="current-franchise-keys">
              {currentTeams?.map(team => (
                <option key={team.id} value={`espn:${team.espnTeamId}`}>
                  {team.name}
                </option>
              ))}
            </datalist>
            {rowsBySeason.map(([year, seasonRows]) => (
              <Card key={year}>
                <CardHeader>
                  <CardTitle>{year} Season</CardTitle>
                  <CardDescription>
                    {
                      (seasonRows || []).filter(row =>
                        Boolean(drafts[row.id]?.ownerText.trim())
                      ).length
                    }
                    /{seasonRows?.length || 0} managers identified
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {seasonRows?.map(row => {
                    const draft = drafts[row.id] || {
                      ownerText: "",
                      franchiseKey: row.name.toLowerCase(),
                    };
                    return (
                      <div
                        key={row.id}
                        className="grid gap-3 rounded-lg border p-3 md:grid-cols-[1.2fr_1fr_1fr] md:items-end"
                      >
                        <div>
                          <p className="font-semibold">{row.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {row.wins}-{row.losses}-{row.ties || 0} • Finish{" "}
                            {row.abbreviation}
                          </p>
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor={`owners-${row.id}`}>Manager(s)</Label>
                          <Input
                            id={`owners-${row.id}`}
                            value={draft.ownerText}
                            placeholder="Alex, Jordan"
                            onChange={event =>
                              setDrafts(current => ({
                                ...current,
                                [row.id]: {
                                  ...draft,
                                  ownerText: event.target.value,
                                },
                              }))
                            }
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor={`franchise-${row.id}`}>
                            Franchise key
                          </Label>
                          <Input
                            id={`franchise-${row.id}`}
                            list="current-franchise-keys"
                            value={draft.franchiseKey}
                            placeholder="john-newsome-franchise"
                            onChange={event =>
                              setDrafts(current => ({
                                ...current,
                                [row.id]: {
                                  ...draft,
                                  franchiseKey: event.target.value,
                                },
                              }))
                            }
                          />
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
