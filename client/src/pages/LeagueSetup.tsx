import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Trophy, AlertCircle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";

export default function LeagueSetup() {
  const { user, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  
  const [espnLeagueId, setEspnLeagueId] = useState("");
  const [seasonYear, setSeasonYear] = useState(new Date().getFullYear().toString());
  const [currentWeek, setCurrentWeek] = useState("1");
  const [espnS2, setEspnS2] = useState("");
  const [swid, setSwid] = useState("");

  const syncMutation = trpc.league.sync.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        toast.success("League synced successfully!", {
          description: `Synced ${data.teamsSynced} teams, ${data.matchupsSynced} matchups`,
        });
        setLocation("/dashboard");
      } else {
        toast.error("Sync failed", {
          description: data.message,
        });
      }
    },
    onError: (error) => {
      toast.error("Sync failed", {
        description: error.message,
      });
    },
  });

  const handleSync = () => {
    if (!espnLeagueId || !seasonYear) {
      toast.error("Please fill in required fields");
      return;
    }

    syncMutation.mutate({
      espnLeagueId,
      seasonYear: parseInt(seasonYear),
      currentWeek: parseInt(currentWeek),
      espnS2: espnS2 || undefined,
      swid: swid || undefined,
    });
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
            <CardTitle>Authentication Required</CardTitle>
            <CardDescription>Please log in to set up your league</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-12">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <Trophy className="h-10 w-10 text-primary" />
            <div>
              <h1 className="text-3xl font-bold text-foreground">Fantasy Football Tracker</h1>
              <p className="text-muted-foreground">Connect your ESPN Fantasy Football league</p>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>League Setup</CardTitle>
              <CardDescription>
                Enter your ESPN league information to sync your fantasy football data
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  For private leagues, you'll need to provide your ESPN S2 and SWID cookies. 
                  Find these in your browser's developer tools when logged into ESPN.
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="leagueId">ESPN League ID *</Label>
                  <Input
                    id="leagueId"
                    placeholder="e.g., 123456"
                    value={espnLeagueId}
                    onChange={(e) => setEspnLeagueId(e.target.value)}
                  />
                  <p className="text-sm text-muted-foreground">
                    Find this in your league URL: fantasy.espn.com/football/league?leagueId=<strong>123456</strong>
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="seasonYear">Season Year *</Label>
                    <Input
                      id="seasonYear"
                      type="number"
                      placeholder="2026"
                      value={seasonYear}
                      onChange={(e) => setSeasonYear(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="currentWeek">Current Week *</Label>
                    <Input
                      id="currentWeek"
                      type="number"
                      placeholder="1"
                      value={currentWeek}
                      onChange={(e) => setCurrentWeek(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="espnS2">ESPN S2 Cookie (for private leagues)</Label>
                  <Input
                    id="espnS2"
                    type="password"
                    placeholder="Optional - only needed for private leagues"
                    value={espnS2}
                    onChange={(e) => setEspnS2(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="swid">SWID Cookie (for private leagues)</Label>
                  <Input
                    id="swid"
                    type="password"
                    placeholder="Optional - only needed for private leagues"
                    value={swid}
                    onChange={(e) => setSwid(e.target.value)}
                  />
                </div>
              </div>

              <Button
                onClick={handleSync}
                disabled={syncMutation.isPending}
                className="w-full"
                size="lg"
              >
                {syncMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Syncing League Data...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Sync League
                  </>
                )}
              </Button>

              {syncMutation.isSuccess && syncMutation.data.success && (
                <Alert className="bg-primary/10 border-primary">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  <AlertDescription className="text-foreground">
                    {syncMutation.data.message}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          <div className="mt-8 p-6 bg-card rounded-lg border">
            <h3 className="font-semibold mb-3 text-card-foreground">How to find your ESPN cookies:</h3>
            <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
              <li>Open ESPN Fantasy Football in your browser and log in</li>
              <li>Open Developer Tools (F12 or right-click → Inspect)</li>
              <li>Go to the "Application" or "Storage" tab</li>
              <li>Click on "Cookies" → "https://fantasy.espn.com"</li>
              <li>Find and copy the values for "espn_s2" and "SWID"</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
