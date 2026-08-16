import { useState } from "react";
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  CheckCircle2,
  ArrowLeft,
  AlertCircle,
  ExternalLink,
  Link2,
  Loader2,
  ShieldCheck,
  Trophy,
  UserPlus,
} from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";

function extractLeagueId(value: string) {
  const trimmed = value.trim();
  if (/^\d+$/.test(trimmed)) return trimmed;
  try {
    const url = new URL(trimmed);
    return (
      url.searchParams.get("leagueId") ||
      url.pathname.match(/league\/([0-9]+)/)?.[1] ||
      ""
    );
  } catch {
    return trimmed.match(/leagueId[=/]([0-9]+)/i)?.[1] || "";
  }
}

export default function LeagueSetup() {
  const { user, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [leagueLink, setLeagueLink] = useState("");
  const [existingLeagueError, setExistingLeagueError] = useState(false);

  const connectLeague = trpc.league.sync.useMutation({
    onSuccess: data => {
      setExistingLeagueError(false);
      if (!data.success) {
        toast.error("We could not connect that league", {
          description: data.message,
        });
        return;
      }
      toast.success("League connected and automatic updates are on", {
        description: `${data.teamsSynced || 0} teams and ${data.playersSynced || 0} player records synced.`,
      });
      setLocation("/dashboard");
    },
    onError: error => {
      const alreadyConnected =
        error.message.includes("already connected") ||
        error.message.includes("do not have access");
      setExistingLeagueError(alreadyConnected);
      toast.error(
        alreadyConnected
          ? "This league already has a commissioner"
          : "Connection failed",
        { description: error.message }
      );
    },
  });

  const handleConnect = () => {
    const espnLeagueId = extractLeagueId(leagueLink);
    if (!espnLeagueId) {
      toast.error("Paste your ESPN league link or enter its League ID");
      return;
    }
    connectLeague.mutate({
      espnLeagueId,
      seasonYear: new Date().getFullYear(),
      currentWeek: 1,
    });
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Please sign in to connect a league.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-12">
        <div className="max-w-2xl mx-auto space-y-8">
          <Button variant="ghost" onClick={() => setLocation("/dashboard")}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
          </Button>

          <div className="flex items-center gap-3">
            <Trophy className="h-10 w-10 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">Set up an ESPN league</h1>
              <p className="text-muted-foreground">
                Commissioner setup only. League members join with an invite
                code.
              </p>
            </div>
          </div>

          <Card className="border-primary/30 bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-primary" /> Joining someone
                else's league?
              </CardTitle>
              <CardDescription>
                Do not reconnect the ESPN League ID. Use the invite code from
                your commissioner.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setLocation("/dashboard?join=1")}
              >
                I have an invite code
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Link2 className="h-5 w-5" /> Paste the league link
              </CardTitle>
              <CardDescription>
                We extract the League ID and start the first roster, player,
                matchup, and waiver-wire sync.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="league-link">
                  ESPN league link or League ID
                </Label>
                <Input
                  id="league-link"
                  value={leagueLink}
                  onChange={event => setLeagueLink(event.target.value)}
                  onKeyDown={event => event.key === "Enter" && handleConnect()}
                  placeholder="https://fantasy.espn.com/football/league?leagueId=123456"
                />
              </div>

              <Alert className="border-primary/30 bg-primary/5">
                <ShieldCheck className="h-4 w-4" />
                <AlertTitle>No ESPN passwords or browser cookies</AlertTitle>
                <AlertDescription>
                  The league must be viewable to the public. This does not make
                  it publicly joinable, and ESPN keeps manager lists and
                  messages private.
                </AlertDescription>
              </Alert>

              {existingLeagueError && (
                <Alert className="border-amber-500/40 bg-amber-500/10">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>This league is already connected</AlertTitle>
                  <AlertDescription className="space-y-3">
                    <p>
                      Your sign-in worked. Return to the dashboard and join with
                      the invitation code from the league commissioner.
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setLocation("/dashboard?join=1")}
                    >
                      Join Team League
                    </Button>
                  </AlertDescription>
                </Alert>
              )}

              <Button
                className="w-full"
                size="lg"
                onClick={handleConnect}
                disabled={connectLeague.isPending}
              >
                {connectLeague.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                )}
                {connectLeague.isPending
                  ? "Connecting and syncing…"
                  : "Connect League & Start Auto-Sync"}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>If ESPN says the league is private</CardTitle>
              <CardDescription>
                The League Manager changes one viewability setting—members do
                not repeat these steps.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <ol className="list-decimal pl-5 space-y-2 text-muted-foreground">
                <li>
                  Open the league in ESPN and choose <strong>Settings</strong>.
                </li>
                <li>
                  Open <strong>Basic Settings → Edit Basic Settings</strong>.
                </li>
                <li>
                  Set public viewability to <strong>Yes</strong>, save, then
                  return here.
                </li>
              </ol>
              <Button variant="outline" asChild>
                <a
                  href="https://support.espn.com/hc/en-us/articles/360000088231-Making-a-Private-League-Viewable-to-the-Public"
                  target="_blank"
                  rel="noreferrer"
                >
                  ESPN instructions <ExternalLink className="ml-2 h-4 w-4" />
                </a>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
