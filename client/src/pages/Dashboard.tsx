import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Trophy, Users, TrendingUp, Activity, Plus, Loader2, HelpCircle, Trash2 } from "lucide-react";
import { useLocation } from "wouter";
import { getLoginUrl } from "@/const";
import { useRestartTutorial } from "@/components/OnboardingTutorial";
import { toast } from "sonner";

export default function Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const restartTutorial = useRestartTutorial();
  const utils = trpc.useUtils();

  const { data: leagues, isLoading: leaguesLoading } = trpc.league.list.useQuery(undefined, {
    enabled: !!user,
  });

  const deleteMutation = trpc.league.delete.useMutation({
    onSuccess: () => {
      toast.success("League deleted successfully");
      utils.league.list.invalidate();
    },
    onError: (error) => {
      toast.error("Failed to delete league", {
        description: error.message,
      });
    },
  });

  const handleDelete = (e: React.MouseEvent, leagueId: number, leagueName: string) => {
    e.stopPropagation();
    if (confirm(`Are you sure you want to delete "${leagueName}"? This will remove all associated data.`)) {
      deleteMutation.mutate({ leagueId });
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Welcome to Fantasy Football Tracker</CardTitle>
            <CardDescription>Please log in to access your leagues</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => window.location.href = getLoginUrl()} className="w-full">
              Log In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Trophy className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-2xl font-bold text-card-foreground">Trouble in Paradise</h1>
                <p className="text-sm text-muted-foreground">Welcome back, {user.name}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setLocation("/faq")} size="sm">
                <HelpCircle className="mr-2 h-4 w-4" />
                Help & FAQ
              </Button>
              <Button variant="outline" onClick={restartTutorial} size="sm">
                Tutorial
              </Button>
              <Button onClick={() => setLocation("/setup")} size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Add League
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container py-8">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Leagues</CardTitle>
              <Trophy className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-card-foreground">
                {leaguesLoading ? <Skeleton className="h-8 w-12" /> : leagues?.length || 0}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Teams</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-card-foreground">
                {leaguesLoading ? <Skeleton className="h-8 w-12" /> : "--"}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-card-foreground">
                {leaguesLoading ? <Skeleton className="h-8 w-12" /> : "--"}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-card-foreground">
                {leaguesLoading ? <Skeleton className="h-8 w-12" /> : "--"}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Leagues List */}
        <Card>
          <CardHeader>
            <CardTitle>Your Leagues</CardTitle>
            <CardDescription>Manage and view your fantasy football leagues</CardDescription>
          </CardHeader>
          <CardContent>
            {leaguesLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="h-12 w-12 rounded" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                  </div>
                ))}
              </div>
            ) : leagues && leagues.length > 0 ? (
              <div className="space-y-4">
                {leagues.map((league) => (
                  <div
                    key={league.id}
                    className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer"
                    onClick={() => setLocation(`/league/${league.id}`)}
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded bg-primary/10 flex items-center justify-center">
                        <Trophy className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-card-foreground">
                          {league.name === `League ${league.espnLeagueId}` ? `ESPN League ${league.espnLeagueId}` : league.name}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {league.seasonYear} Season • Week {league.currentWeek || 1}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => handleDelete(e, league.id, league.name)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        View League →
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2 text-card-foreground">No leagues yet</h3>
                <p className="text-muted-foreground mb-4">
                  Connect your ESPN Fantasy Football league to get started
                </p>
                <Button onClick={() => setLocation("/setup")}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Your First League
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
