import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Trophy, BarChart3, Users, Activity, ArrowRight, Loader2 } from "lucide-react";
import { getLoginUrl } from "@/const";
import { useLocation } from "wouter";
import { useEffect } from "react";

export default function Home() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();

  // Redirect to dashboard if already logged in
  useEffect(() => {
    if (user && !loading) {
      setLocation("/dashboard");
    }
  }, [user, loading, setLocation]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-background" />
        <div className="container relative py-24 md:py-32">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-8">
              <Trophy className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-foreground">ESPN Fantasy Football Analytics</span>
            </div>
            
            <h1 className="text-4xl md:text-6xl font-bold mb-6 text-foreground">
              Trouble in Paradise
              <span className="text-primary block mt-2">Fantasy Football Tracker</span>
            </h1>
            
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Comprehensive analytics, all-time stats, power rankings, and insights for your ESPN Fantasy Football league. Make smarter decisions and dominate your competition.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                onClick={() => window.location.href = getLoginUrl()}
                className="text-lg px-8"
              >
                Get Started
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => window.location.href = getLoginUrl()}
                className="text-lg px-8"
              >
                Sign In
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="container py-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-foreground">Everything You Need to Win</h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Powerful features designed to give you the competitive edge
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="p-6 rounded-lg border bg-card">
            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
              <BarChart3 className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2 text-card-foreground">All-Time Stats</h3>
            <p className="text-muted-foreground">
              Track career records, championships, and historical performance across multiple seasons.
            </p>
          </div>

          <div className="p-6 rounded-lg border bg-card">
            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
              <Trophy className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2 text-card-foreground">Power Rankings</h3>
            <p className="text-muted-foreground">
              Dynamic weekly rankings based on performance metrics and advanced analytics.
            </p>
          </div>

          <div className="p-6 rounded-lg border bg-card">
            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2 text-card-foreground">Team Analytics</h3>
            <p className="text-muted-foreground">
              Detailed team profiles with roster management, trends, and head-to-head records.
            </p>
          </div>

          <div className="p-6 rounded-lg border bg-card">
            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
              <Activity className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2 text-card-foreground">Live Activity Feed</h3>
            <p className="text-muted-foreground">
              Real-time tracking of trades, waiver pickups, and all league transactions.
            </p>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="container py-24">
        <div className="max-w-4xl mx-auto text-center p-12 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-foreground">
            Ready to Elevate Your Fantasy Game?
          </h2>
          <p className="text-xl text-muted-foreground mb-8">
            Connect your ESPN league in minutes and start making data-driven decisions.
          </p>
          <Button
            size="lg"
            onClick={() => window.location.href = getLoginUrl()}
            className="text-lg px-8"
          >
            Get Started Now
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t bg-card">
        <div className="container py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-primary" />
              <span className="font-semibold text-card-foreground">Trouble in Paradise</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2026 All rights reserved
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
