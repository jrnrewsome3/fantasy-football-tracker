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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Trophy,
  ArrowLeft,
  Users,
  TrendingUp,
  Activity,
  RefreshCw,
  Download,
  Calendar,
  GitCompare,
  FileText,
  CloudSun,
  Copy,
  UserCheck,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState, useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import { getLoginUrl } from "@/const";
import WeeklyMatchups from "./WeeklyMatchups";
import AllTimeStats from "./AllTimeStats";
import AIQueryBox from "@/components/AIQueryBox";
import { toast } from "sonner";

export default function LeagueDetail() {
  const { user, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/league/:id");

  const leagueId = params?.id ? parseInt(params.id) : 0;
  const utils = trpc.useUtils();
  const [selectedSeason, setSelectedSeason] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<"single" | "alltime">("alltime");

  const { data: leagues } = trpc.league.list.useQuery(undefined, {
    enabled: !!user,
  });

  const league = leagues?.find(l => l.id === leagueId);

  const { data: teams, isLoading: teamsLoading } = trpc.league.teams.useQuery(
    {
      leagueId,
      seasonYear:
        viewMode === "single"
          ? selectedSeason || league?.seasonYear
          : undefined,
      espnLeagueId: league?.espnLeagueId,
      allTime: viewMode === "alltime",
    },
    {
      enabled:
        !!user &&
        leagueId > 0 &&
        !!league &&
        (viewMode === "alltime" || !!selectedSeason || !!league?.seasonYear),
    }
  );

  // Get unique seasons from all leagues with same ESPN ID
  const availableSeasons = leagues
    ? Array.from(
        new Set(
          leagues
            .filter(l => l.espnLeagueId === league?.espnLeagueId)
            .map(l => l.seasonYear)
        )
      ).sort((a, b) => b - a)
    : [];

  // Set default season to current league's season
  useEffect(() => {
    if (league && selectedSeason === null) {
      setSelectedSeason(league.seasonYear);
    }
  }, [league, selectedSeason]);

  // Update league ID when season changes
  useEffect(() => {
    if (selectedSeason && leagues && league) {
      const seasonLeague = leagues.find(
        l =>
          l.espnLeagueId === league.espnLeagueId &&
          l.seasonYear === selectedSeason
      );
      if (seasonLeague && seasonLeague.id !== leagueId) {
        setLocation(`/league/${seasonLeague.id}`);
      }
    }
  }, [selectedSeason, leagues, league, leagueId, setLocation]);

  const { data: transactions, isLoading: transactionsLoading } =
    trpc.league.transactions.useQuery(
      { leagueId, limit: 20 },
      { enabled: !!user && leagueId > 0 }
    );

  const { data: availablePlayers, isLoading: availablePlayersLoading } =
    trpc.league.availablePlayers.useQuery(
      { leagueId, limit: 100 },
      { enabled: !!user && leagueId > 0 }
    );

  const { data: weekOutlook, isLoading: weatherLoading } =
    trpc.league.weekOutlook.useQuery(
      { leagueId },
      { enabled: !!user && leagueId > 0, staleTime: 15 * 60 * 1000 }
    );

  const assignTeamMutation = trpc.league.assignMyTeam.useMutation({
    onSuccess: () => {
      toast.success("Your fantasy team is connected");
      utils.league.list.invalidate();
    },
    onError: error =>
      toast.error("Could not connect your team", {
        description: error.message,
      }),
  });

  const syncMutation = trpc.league.sync.useMutation({
    onSuccess: result => {
      if (result.success) {
        toast.success("League data synced successfully!");
        // Invalidate queries to refresh data
        utils.league.teams.invalidate({ leagueId });
        utils.league.matchups.invalidate();
        utils.league.allMatchups.invalidate({ leagueId });
        utils.league.transactions.invalidate({ leagueId });
        utils.league.availablePlayers.invalidate({ leagueId });
        utils.league.list.invalidate();
      } else {
        toast.error("Failed to sync league data");
      }
    },
    onError: error => {
      toast.error("Error syncing league data: " + error.message);
    },
  });

  const handleSync = () => {
    if (!league) return;
    syncMutation.mutate({
      espnLeagueId: league.espnLeagueId,
      seasonYear: league.seasonYear,
      currentWeek: Math.max(1, league.currentWeek || 1),
    });
  };

  const { data: exportData, refetch: refetchExport } =
    trpc.league.exportStats.useQuery({ leagueId }, { enabled: false });

  const handleExportPDF = async () => {
    if (!league) return;
    try {
      toast.info("Generating PDF report...");
      const result = await refetchExport();

      if (!result.data?.success || !result.data?.markdown) {
        toast.error(result.data?.error || "Failed to generate report");
        return;
      }

      // Create markdown file
      const blob = new Blob([result.data.markdown], { type: "text/markdown" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${league.name.replace(/[^a-z0-9]/gi, "_")}_stats_${new Date().toISOString().split("T")[0]}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success(
        "Report downloaded! Convert to PDF using any Markdown to PDF tool."
      );
    } catch (error: any) {
      toast.error("Error generating report: " + error.message);
    }
  };

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
            <CardDescription>
              Please log in to view league details
            </CardDescription>
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

  const sortedTeams = teams
    ? [...teams].sort((a, b) => {
        const aWinPct =
          (a.wins || 0) / ((a.wins || 0) + (a.losses || 0) + (a.ties || 0)) ||
          0;
        const bWinPct =
          (b.wins || 0) / ((b.wins || 0) + (b.losses || 0) + (b.ties || 0)) ||
          0;
        if (aWinPct !== bWinPct) return bWinPct - aWinPct;
        return (b.pointsFor || 0) - (a.pointsFor || 0);
      })
    : [];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container py-6">
          <Button
            variant="ghost"
            onClick={() => setLocation("/dashboard")}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {teams && teams.length > 0 && (
                <Select
                  value={league.myEspnTeamId?.toString() || ""}
                  onValueChange={value =>
                    assignTeamMutation.mutate({
                      leagueId,
                      espnTeamId: Number(value),
                    })
                  }
                >
                  <SelectTrigger className="w-[180px] h-9">
                    <UserCheck className="mr-2 h-4 w-4" />
                    <SelectValue placeholder="Choose my team" />
                  </SelectTrigger>
                  <SelectContent>
                    {teams.map(team => (
                      <SelectItem
                        key={team.espnTeamId}
                        value={team.espnTeamId.toString()}
                      >
                        {team.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {league.userRole === "commissioner" && league.inviteCode && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    await navigator.clipboard.writeText(
                      league.inviteCode || ""
                    );
                    toast.success("Member invite code copied", {
                      description: league.inviteCode,
                    });
                  }}
                >
                  <Copy className="mr-2 h-4 w-4" /> Invite Members
                </Button>
              )}
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Trophy className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-card-foreground">
                  {league.name}
                </h1>
                <p className="text-sm text-muted-foreground">
                  Viewing Data from{" "}
                  <span className="font-semibold text-primary">
                    {availableSeasons[availableSeasons.length - 1] || 2018}
                  </span>{" "}
                  to{" "}
                  <span className="font-semibold text-primary">
                    {availableSeasons[0] || new Date().getFullYear()}
                  </span>{" "}
                  • Week {league.currentWeek} of {league.totalWeeks}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {availableSeasons.length > 1 && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-background">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Season:</span>
                  <Select
                    value={
                      selectedSeason?.toString() || league.seasonYear.toString()
                    }
                    onValueChange={value => setSelectedSeason(parseInt(value))}
                  >
                    <SelectTrigger className="w-[120px] h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {availableSeasons.map(season => (
                        <SelectItem key={season} value={season.toString()}>
                          {season}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setLocation(`/league/${leagueId}/recap`)}
                >
                  <FileText className="mr-2 h-4 w-4" />
                  Weekly Recap
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setLocation(`/league/${leagueId}/compare`)}
                >
                  <GitCompare className="mr-2 h-4 w-4" />
                  Compare Teams
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setLocation(`/league/${leagueId}/highlights`)}
                >
                  <Trophy className="mr-2 h-4 w-4" />
                  Highlights
                </Button>
                <Button variant="outline" size="sm" onClick={handleExportPDF}>
                  <Download className="mr-2 h-4 w-4" />
                  Export PDF
                </Button>
                {league.userRole === "commissioner" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSync}
                    disabled={syncMutation.isPending}
                  >
                    <RefreshCw
                      className={`mr-2 h-4 w-4 ${syncMutation.isPending ? "animate-spin" : ""}`}
                    />
                    {syncMutation.isPending ? "Syncing..." : "Sync Now"}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container py-8">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {viewMode === "alltime"
                  ? "Total Teams (All-Time)"
                  : `Total Teams (${selectedSeason || league.seasonYear})`}
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-card-foreground">
                {teamsLoading ? (
                  <Skeleton className="h-8 w-12" />
                ) : (
                  teams?.length || 0
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {viewMode === "alltime"
                  ? "Unique teams across all seasons"
                  : `Teams in ${selectedSeason || league.seasonYear} season`}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Current Week
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-card-foreground">
                Week {league.currentWeek}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Recent Activity
              </CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-card-foreground">
                {transactionsLoading ? (
                  <Skeleton className="h-8 w-12" />
                ) : (
                  transactions?.length || 0
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="standings" className="space-y-4">
          <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
            <TabsList className="w-full sm:w-auto inline-flex min-w-max">
              <TabsTrigger
                value="standings"
                className="text-xs sm:text-sm px-3 sm:px-4"
              >
                Standings
              </TabsTrigger>
              <TabsTrigger
                value="matchups"
                className="text-xs sm:text-sm px-3 sm:px-4"
              >
                Matchups
              </TabsTrigger>
              <TabsTrigger
                value="alltime"
                className="text-xs sm:text-sm px-3 sm:px-4"
              >
                All-Time Stats
              </TabsTrigger>
              <TabsTrigger
                value="available"
                className="text-xs sm:text-sm px-3 sm:px-4"
              >
                Available Players
              </TabsTrigger>
              <TabsTrigger
                value="weather"
                className="text-xs sm:text-sm px-3 sm:px-4"
              >
                Game Weather
              </TabsTrigger>
              <TabsTrigger
                value="ai"
                className="text-xs sm:text-sm px-3 sm:px-4"
              >
                AI Assistant
              </TabsTrigger>
              <TabsTrigger
                value="activity"
                className="text-xs sm:text-sm px-3 sm:px-4"
              >
                Activity
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="available">
            <Card>
              <CardHeader>
                <CardTitle>Waiver Wire & Available Players</CardTitle>
                <CardDescription>
                  League-specific availability, refreshed automatically and
                  ranked by ESPN ownership.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {availablePlayersLoading ? (
                  <Skeleton className="h-64 w-full" />
                ) : availablePlayers?.length ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Player</TableHead>
                          <TableHead>Pos</TableHead>
                          <TableHead>NFL Team</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Owned</TableHead>
                          <TableHead className="text-right">Started</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {availablePlayers.map(player => (
                          <TableRow key={player.playerId}>
                            <TableCell className="font-medium">
                              {player.name}
                            </TableCell>
                            <TableCell>{player.position || "—"}</TableCell>
                            <TableCell>{player.nflTeam || "FA"}</TableCell>
                            <TableCell>
                              {player.status || player.availabilityStatus}
                            </TableCell>
                            <TableCell className="text-right">
                              {player.percentOwned || 0}%
                            </TableCell>
                            <TableCell className="text-right">
                              {player.percentStarted || 0}%
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <p className="py-10 text-center text-muted-foreground">
                    Available-player data will appear after the next automatic
                    ESPN refresh.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="weather">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CloudSun className="h-5 w-5" /> Week {league.currentWeek}{" "}
                  Game & Weather Outlook
                </CardTitle>
                <CardDescription>
                  Kickoff conditions from the NFL schedule and National Weather
                  Service. Outdoor forecasts populate within seven days.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {weatherLoading ? (
                  <Skeleton className="h-64 w-full" />
                ) : (
                  <div className="grid gap-3 md:grid-cols-2">
                    {weekOutlook?.map(game => (
                      <div key={game.id} className="rounded-lg border p-4">
                        <div className="flex items-center justify-between gap-3">
                          <strong>{game.matchup}</strong>
                          <span className="text-xs text-muted-foreground">
                            {new Date(game.kickoff).toLocaleString()}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {game.venue}
                        </p>
                        <p className="mt-3 text-sm font-medium">
                          {game.forecast}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {game.temperature !== null
                            ? `${game.temperature}°F`
                            : game.indoor
                              ? "Indoor"
                              : "Temperature pending"}
                          {game.wind ? ` • Wind ${game.wind}` : ""}
                          {game.precipitationChance !== null
                            ? ` • ${game.precipitationChance}% precipitation`
                            : ""}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="standings" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="space-y-4">
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div>
                      <CardTitle>
                        {viewMode === "single"
                          ? `League Standings - ${selectedSeason || league?.seasonYear} Season`
                          : `All-Time Career Standings (Since ${availableSeasons[availableSeasons.length - 1] || 2018})`}
                      </CardTitle>
                      <CardDescription>
                        {viewMode === "single"
                          ? `Season standings showing ${sortedTeams.length} teams that competed in ${selectedSeason || league?.seasonYear}`
                          : `Career totals across all seasons showing ${sortedTeams.length} unique teams`}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* View Mode Toggle */}
                      <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
                        <Button
                          variant={viewMode === "single" ? "default" : "ghost"}
                          size="sm"
                          onClick={() => setViewMode("single")}
                          className="text-xs"
                        >
                          Single Season
                        </Button>
                        <Button
                          variant={viewMode === "alltime" ? "default" : "ghost"}
                          size="sm"
                          onClick={() => setViewMode("alltime")}
                          className="text-xs"
                        >
                          All-Time
                        </Button>
                      </div>
                      {/* Season Selector (only for single season mode) */}
                      {viewMode === "single" && availableSeasons.length > 1 && (
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <Select
                            value={selectedSeason?.toString() || ""}
                            onValueChange={value =>
                              setSelectedSeason(parseInt(value))
                            }
                          >
                            <SelectTrigger className="w-[140px]">
                              <SelectValue placeholder="Select season" />
                            </SelectTrigger>
                            <SelectContent>
                              {availableSeasons.map(season => (
                                <SelectItem
                                  key={season}
                                  value={season.toString()}
                                >
                                  {season} Season
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {teamsLoading ? (
                  <div className="space-y-2">
                    {[1, 2, 3, 4].map(i => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : sortedTeams.length > 0 ? (
                  <div className="overflow-x-auto -mx-4 sm:mx-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-8 sm:w-12 text-xs sm:text-sm">
                            #
                          </TableHead>
                          <TableHead className="min-w-[140px] sm:min-w-0 text-xs sm:text-sm">
                            Team
                          </TableHead>
                          <TableHead className="text-xs sm:text-sm hidden lg:table-cell">
                            ESPN ID
                          </TableHead>
                          <TableHead className="text-center text-xs sm:text-sm">
                            W
                          </TableHead>
                          <TableHead className="text-center text-xs sm:text-sm">
                            L
                          </TableHead>
                          <TableHead className="text-center text-xs sm:text-sm hidden sm:table-cell">
                            T
                          </TableHead>
                          <TableHead className="text-right text-xs sm:text-sm">
                            PF
                          </TableHead>
                          <TableHead className="text-right text-xs sm:text-sm hidden md:table-cell">
                            PA
                          </TableHead>
                          <TableHead className="text-right text-xs sm:text-sm hidden md:table-cell">
                            Diff
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sortedTeams.map((team, index) => (
                          <TableRow
                            key={team.id}
                            className="cursor-pointer hover:bg-accent/50"
                            onClick={() =>
                              setLocation(
                                `/team/${team.espnTeamId}/${league.espnLeagueId}/history`
                              )
                            }
                          >
                            <TableCell className="font-medium text-xs sm:text-sm">
                              {index + 1}
                            </TableCell>
                            <TableCell className="min-w-[140px] sm:min-w-0">
                              <div>
                                <div className="font-semibold text-card-foreground text-xs sm:text-sm line-clamp-1">
                                  {team.name}
                                </div>
                                {team.ownerName && (
                                  <div className="text-xs text-muted-foreground line-clamp-1">
                                    {team.ownerName}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-xs sm:text-sm text-muted-foreground hidden lg:table-cell">
                              {team.espnTeamId}
                            </TableCell>
                            <TableCell className="text-center text-xs sm:text-sm font-semibold">
                              {team.wins || 0}
                            </TableCell>
                            <TableCell className="text-center text-xs sm:text-sm font-semibold">
                              {team.losses || 0}
                            </TableCell>
                            <TableCell className="text-center text-xs sm:text-sm hidden sm:table-cell">
                              {team.ties || 0}
                            </TableCell>
                            <TableCell className="text-right text-xs sm:text-sm">
                              {(team.pointsFor || 0).toFixed(1)}
                            </TableCell>
                            <TableCell className="text-right text-xs sm:text-sm hidden md:table-cell">
                              {(team.pointsAgainst || 0).toFixed(1)}
                            </TableCell>
                            <TableCell className="text-right text-xs sm:text-sm hidden md:table-cell">
                              <span
                                className={
                                  (team.pointsFor || 0) -
                                    (team.pointsAgainst || 0) >=
                                  0
                                    ? "text-primary"
                                    : "text-destructive"
                                }
                              >
                                {(
                                  (team.pointsFor || 0) -
                                  (team.pointsAgainst || 0)
                                ).toFixed(1)}
                              </span>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No teams found. Sync your league data to see standings.
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="matchups" className="space-y-4">
            <WeeklyMatchups
              leagueId={leagueId}
              currentWeek={league.currentWeek || 1}
              seasonYear={league.seasonYear}
            />
          </TabsContent>

          <TabsContent value="alltime" className="space-y-4">
            <AllTimeStats leagueId={leagueId} />
          </TabsContent>

          <TabsContent value="ai" className="space-y-4">
            <AIQueryBox leagueId={leagueId} />
          </TabsContent>

          <TabsContent value="activity" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>
                  Latest transactions and league activity
                </CardDescription>
              </CardHeader>
              <CardContent>
                {transactionsLoading ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map(i => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : transactions && transactions.length > 0 ? (
                  <div className="space-y-3">
                    {transactions.map(transaction => (
                      <div
                        key={transaction.id}
                        className="flex items-start gap-3 p-3 rounded-lg border bg-card"
                      >
                        <div className="flex-1">
                          <div className="font-medium text-card-foreground">
                            {transaction.transactionType}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {transaction.playerName || "Unknown Player"}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {new Date(
                              transaction.transactionDate
                            ).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No recent activity
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
