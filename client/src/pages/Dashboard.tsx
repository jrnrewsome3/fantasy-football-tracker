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
  Trophy,
  Plus,
  Loader2,
  HelpCircle,
  Trash2,
  Pencil,
  RefreshCw,
  UserPlus,
} from "lucide-react";
import { useLocation } from "wouter";
import { getLoginUrl } from "@/const";
import { useRestartTutorial } from "@/components/OnboardingTutorial";
import { toast } from "sonner";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const restartTutorial = useRestartTutorial();
  const utils = trpc.useUtils();

  const { data: leagues, isLoading: leaguesLoading } =
    trpc.league.list.useQuery(undefined, {
      enabled: !!user,
    });

  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [selectedLeague, setSelectedLeague] = useState<{
    id: number;
    name: string;
  } | null>(null);
  const [newName, setNewName] = useState("");
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const [inviteCode, setInviteCode] = useState("");

  const joinMutation = trpc.league.join.useMutation({
    onSuccess: result => {
      toast.success(`Joined ${result.leagueName}`);
      setJoinDialogOpen(false);
      setInviteCode("");
      utils.league.list.invalidate();
    },
    onError: error =>
      toast.error("Could not join league", { description: error.message }),
  });

  const deleteMutation = trpc.league.delete.useMutation({
    onSuccess: () => {
      toast.success("League deleted successfully");
      utils.league.list.invalidate();
    },
    onError: error => {
      toast.error("Failed to delete league", {
        description: error.message,
      });
    },
  });

  const renameMutation = trpc.league.rename.useMutation({
    onSuccess: () => {
      toast.success("League renamed successfully");
      utils.league.list.invalidate();
      setRenameDialogOpen(false);
      setSelectedLeague(null);
      setNewName("");
    },
    onError: error => {
      toast.error("Failed to rename league", {
        description: error.message,
      });
    },
  });

  const handleDelete = (
    e: React.MouseEvent,
    leagueId: number,
    leagueName: string
  ) => {
    e.stopPropagation();
    if (
      confirm(
        `Are you sure you want to delete "${leagueName}"? This will remove all associated data.`
      )
    ) {
      deleteMutation.mutate({ leagueId });
    }
  };

  const handleRenameClick = (
    e: React.MouseEvent,
    league: { id: number; name: string }
  ) => {
    e.stopPropagation();
    setSelectedLeague(league);
    setNewName(league.name);
    setRenameDialogOpen(true);
  };

  const handleRenameSubmit = () => {
    if (selectedLeague && newName.trim()) {
      renameMutation.mutate({
        leagueId: selectedLeague.id,
        newName: newName.trim(),
      });
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
            <CardDescription>
              Please log in to access your leagues
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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Trophy className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-2xl font-bold text-card-foreground">
                  Trouble in Paradise
                </h1>
                <p className="text-sm text-muted-foreground">
                  Welcome back, {user.name}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setLocation("/faq")}
                size="sm"
              >
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
              <Button
                variant="outline"
                onClick={() => setJoinDialogOpen(true)}
                size="sm"
              >
                <UserPlus className="mr-2 h-4 w-4" />
                Join Team League
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container py-8">
        {/* Quick Stats */}
        <div className="mb-8">
          <Card className="max-w-xs">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Leagues
              </CardTitle>
              <Trophy className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-card-foreground">
                {leaguesLoading ? (
                  <Skeleton className="h-8 w-12" />
                ) : (
                  leagues?.length || 0
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Leagues List */}
        <Card>
          <CardHeader>
            <CardTitle>Your Leagues</CardTitle>
            <CardDescription>
              Manage and view your fantasy football leagues
            </CardDescription>
          </CardHeader>
          <CardContent>
            {leaguesLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
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
                {leagues.map(league => (
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
                          {league.name === `League ${league.espnLeagueId}`
                            ? `ESPN League ${league.espnLeagueId}`
                            : league.name}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {league.seasonYear} Season • Week{" "}
                          {league.currentWeek || 1}
                        </p>
                        <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                          <RefreshCw
                            className={`h-3 w-3 ${league.lastSyncStatus === "syncing" ? "animate-spin" : ""}`}
                          />
                          {league.lastSyncStatus === "error"
                            ? "Update needs attention"
                            : league.lastSyncedAt
                              ? `Auto-updated ${new Date(league.lastSyncedAt).toLocaleString()}`
                              : "Automatic updates ready"}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={e => {
                          e.stopPropagation();
                          setLocation(`/leaderboard/${league.espnLeagueId}`);
                        }}
                      >
                        Leaderboard
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={e => {
                          e.stopPropagation();
                          setLocation(`/seasons/${league.espnLeagueId}`);
                        }}
                      >
                        Browse Seasons
                      </Button>
                      {league.userRole === "commissioner" && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={e =>
                              handleRenameClick(e, {
                                id: league.id,
                                name: league.name,
                              })
                            }
                            disabled={renameMutation.isPending}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={e =>
                              handleDelete(e, league.id, league.name)
                            }
                            disabled={deleteMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </>
                      )}
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
                <h3 className="text-lg font-semibold mb-2 text-card-foreground">
                  No leagues yet
                </h3>
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

      {/* Rename Dialog */}
      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename League</DialogTitle>
            <DialogDescription>
              Give your league a custom name to help identify it.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="Enter league name"
              onKeyDown={e => {
                if (e.key === "Enter") {
                  handleRenameSubmit();
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRenameDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleRenameSubmit}
              disabled={!newName.trim() || renameMutation.isPending}
            >
              {renameMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={joinDialogOpen} onOpenChange={setJoinDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Join your team league</DialogTitle>
            <DialogDescription>
              Enter the invitation code shared by your league commissioner.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={inviteCode}
            onChange={event => setInviteCode(event.target.value)}
            placeholder="League invite code"
            onKeyDown={event =>
              event.key === "Enter" &&
              inviteCode.trim() &&
              joinMutation.mutate({ inviteCode: inviteCode.trim() })
            }
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setJoinDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={inviteCode.trim().length < 6 || joinMutation.isPending}
              onClick={() =>
                joinMutation.mutate({ inviteCode: inviteCode.trim() })
              }
            >
              {joinMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Join League
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
