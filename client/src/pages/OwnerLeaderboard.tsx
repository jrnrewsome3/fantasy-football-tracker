import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Trophy,
  TrendingUp,
  Target,
  Award,
  ArrowLeft,
  UsersRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation, useRoute } from "wouter";
import { getLoginUrl } from "@/const";

export default function OwnerLeaderboard() {
  const { user, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/leaderboard/:espnLeagueId");

  const espnLeagueId = params?.espnLeagueId || "";
  const [sortBy, setSortBy] = useState<"wins" | "winPct" | "points">("wins");

  const { data: leagues } = trpc.league.list.useQuery(undefined, {
    enabled: !!user,
  });

  const league = leagues?.find(l => l.espnLeagueId === espnLeagueId);

  const { data: leaderboard, isLoading } =
    trpc.league.ownerLeaderboard.useQuery(
      { espnLeagueId },
      { enabled: !!user && !!espnLeagueId }
    );
  const { data: seasonSummaries, isLoading: historyLoading } =
    trpc.league.seasonSummaries.useQuery(
      { espnLeagueId },
      { enabled: !!user && !!espnLeagueId }
    );

  const historyNeedsCleanup = Boolean(
    league &&
      seasonSummaries?.some(
        summary =>
          summary.league.seasonYear < league.seasonYear &&
          summary.coverage &&
          !summary.coverage.ownershipComplete
      )
  );

  if (authLoading) {
    return (
      <div className="container mx-auto py-8">
        <Skeleton className="h-12 w-64 mb-8" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto py-8 text-center">
        <h2 className="text-2xl font-bold mb-4">Please Log In</h2>
        <p className="text-muted-foreground mb-4">
          You need to be logged in to view the owner leaderboard.
        </p>
        <Button onClick={() => (window.location.href = getLoginUrl())}>
          Log In
        </Button>
      </div>
    );
  }

  if (isLoading || historyLoading) {
    return (
      <div className="container mx-auto py-8">
        <Skeleton className="h-12 w-64 mb-8" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (historyNeedsCleanup) {
    return (
      <div className="container mx-auto max-w-3xl space-y-6 py-4 sm:py-8">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setLocation("/dashboard")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
        </Button>
        <Card className="border-amber-500/40 bg-amber-500/10">
          <CardHeader>
            <CardTitle>Owner leaderboard is waiting for cleanup</CardTitle>
            <CardDescription>
              Historical standings are imported, but the app does not yet know
              which renamed teams and co-managed teams belong to each owner.
              Showing a lifetime ranking now would be misleading.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Season-by-season standings and champions are still available in
              Browse Seasons.
            </p>
            {league?.userRole === "commissioner" && (
              <Button
                onClick={() =>
                  setLocation(`/league/${league.id}/history-ownership`)
                }
              >
                <UsersRound className="mr-2 h-4 w-4" /> Clean Up History
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Sort leaderboard based on selected criteria
  const sortedLeaderboard = leaderboard
    ? [...leaderboard].sort((a, b) => {
        if (sortBy === "wins") return b.totalWins - a.totalWins;
        if (sortBy === "winPct") return b.winPercentage - a.winPercentage;
        if (sortBy === "points") return b.totalPointsFor - a.totalPointsFor;
        return 0;
      })
    : [];

  return (
    <div className="container mx-auto py-4 sm:py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setLocation("/dashboard")}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Back</span>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-2">
            <Trophy className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
            Owner Leaderboard
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            {league?.name || "League"} - Lifetime Stats Across All Seasons
          </p>
        </div>
      </div>

      {/* Stats Summary Cards */}
      {leaderboard && leaderboard.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
                Total Owners
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold text-card-foreground">
                {leaderboard.length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
                Most Wins
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold text-primary">
                {sortedLeaderboard[0]?.totalWins || 0}
              </div>
              <p className="text-xs text-muted-foreground line-clamp-1">
                {sortedLeaderboard[0]?.ownerName}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
                Best Win %
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold text-primary">
                {Math.max(...leaderboard.map(o => o.winPercentage)).toFixed(1)}%
              </div>
              <p className="text-xs text-muted-foreground line-clamp-1">
                {
                  leaderboard.find(
                    o =>
                      o.winPercentage ===
                      Math.max(...leaderboard.map(x => x.winPercentage))
                  )?.ownerName
                }
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
                Most Points
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold text-primary">
                {Math.max(...leaderboard.map(o => o.totalPointsFor)).toFixed(0)}
              </div>
              <p className="text-xs text-muted-foreground line-clamp-1">
                {
                  leaderboard.find(
                    o =>
                      o.totalPointsFor ===
                      Math.max(...leaderboard.map(x => x.totalPointsFor))
                  )?.ownerName
                }
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Leaderboard Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle>Rankings</CardTitle>
              <CardDescription>
                Lifetime performance across all seasons
              </CardDescription>
            </div>
            <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="wins">Total Wins</SelectItem>
                <SelectItem value="winPct">Win Percentage</SelectItem>
                <SelectItem value="points">Total Points</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {sortedLeaderboard.length > 0 ? (
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12 text-xs sm:text-sm">#</TableHead>
                    <TableHead className="min-w-[120px] text-xs sm:text-sm">
                      Owner
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
                    <TableHead className="text-center text-xs sm:text-sm">
                      Win %
                    </TableHead>
                    <TableHead className="text-right text-xs sm:text-sm hidden md:table-cell">
                      Total PF
                    </TableHead>
                    <TableHead className="text-center text-xs sm:text-sm hidden lg:table-cell">
                      Seasons
                    </TableHead>
                    <TableHead className="text-center text-xs sm:text-sm hidden lg:table-cell">
                      Best
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedLeaderboard.map((owner, index) => (
                    <TableRow key={owner.ownerName}>
                      <TableCell className="font-medium text-xs sm:text-sm">
                        {index + 1 === 1 && (
                          <Trophy className="h-4 w-4 text-yellow-500 inline mr-1" />
                        )}
                        {index + 1 === 2 && (
                          <Trophy className="h-4 w-4 text-gray-400 inline mr-1" />
                        )}
                        {index + 1 === 3 && (
                          <Trophy className="h-4 w-4 text-amber-600 inline mr-1" />
                        )}
                        {index + 1}
                      </TableCell>
                      <TableCell>
                        <div className="font-semibold text-card-foreground text-xs sm:text-sm line-clamp-1">
                          {owner.ownerName}
                        </div>
                      </TableCell>
                      <TableCell className="text-center font-semibold text-xs sm:text-sm">
                        {owner.totalWins}
                      </TableCell>
                      <TableCell className="text-center font-semibold text-xs sm:text-sm">
                        {owner.totalLosses}
                      </TableCell>
                      <TableCell className="text-center text-xs sm:text-sm hidden sm:table-cell">
                        {owner.totalTies}
                      </TableCell>
                      <TableCell className="text-center font-semibold text-primary text-xs sm:text-sm">
                        {owner.winPercentage.toFixed(1)}%
                      </TableCell>
                      <TableCell className="text-right text-xs sm:text-sm hidden md:table-cell">
                        {owner.totalPointsFor.toFixed(1)}
                      </TableCell>
                      <TableCell className="text-center text-xs sm:text-sm hidden lg:table-cell">
                        {owner.seasonsPlayed}
                      </TableCell>
                      <TableCell className="text-center text-xs sm:text-sm hidden lg:table-cell">
                        <div className="flex flex-col">
                          <span className="font-semibold">
                            {owner.bestSeasonWins}W
                          </span>
                          <span className="text-xs text-muted-foreground">
                            ({owner.bestSeasonYear})
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No owner data available. Sync your league to see the leaderboard.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
