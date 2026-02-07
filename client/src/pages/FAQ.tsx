import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Trophy, ArrowLeft, Sparkles, BarChart3, Users, TrendingUp, RefreshCw, Shield } from "lucide-react";
import { useLocation } from "wouter";

export default function FAQ() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container py-6">
          <Button variant="ghost" onClick={() => setLocation("/dashboard")} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
          
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-card-foreground">Help Center & FAQ</h1>
              <p className="text-muted-foreground">Everything you need to know about Trouble in Paradise Fantasy Football Tracker</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container py-8 max-w-4xl">
        {/* Features Overview */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-primary" />
              What Makes This App Special
            </CardTitle>
            <CardDescription>
              Trouble in Paradise is the ultimate companion for your ESPN Fantasy Football league
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="flex gap-3">
                <BarChart3 className="h-5 w-5 text-primary flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold">All-Time Stats Tracking</h3>
                  <p className="text-sm text-muted-foreground">Track career records, championships, and historical performance across multiple seasons</p>
                </div>
              </div>
              
              <div className="flex gap-3">
                <Users className="h-5 w-5 text-primary flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold">Head-to-Head Matrix</h3>
                  <p className="text-sm text-muted-foreground">See your complete rivalry records against every team in your league's history</p>
                </div>
              </div>
              
              <div className="flex gap-3">
                <TrendingUp className="h-5 w-5 text-primary flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold">Weekly Matchup Analysis</h3>
                  <p className="text-sm text-muted-foreground">View live scores, projections, and detailed breakdowns for every week</p>
                </div>
              </div>
              
              <div className="flex gap-3">
                <RefreshCw className="h-5 w-5 text-primary flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold">One-Click ESPN Sync</h3>
                  <p className="text-sm text-muted-foreground">Instantly pull the latest data from ESPN with a single button click</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Getting Started */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Getting Started</CardTitle>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="item-1">
                <AccordionTrigger>How do I connect my ESPN Fantasy Football league?</AccordionTrigger>
                <AccordionContent className="text-muted-foreground space-y-2">
                  <p>Connecting your league is easy:</p>
                  <ol className="list-decimal list-inside space-y-1 ml-2">
                    <li>Click the "Add League" button on your dashboard</li>
                    <li>Enter your ESPN League ID (found in your ESPN league URL)</li>
                    <li>Enter the season year (e.g., 2024)</li>
                    <li>For private leagues, add your ESPN_S2 and SWID cookies (see below)</li>
                    <li>Click "Connect League" and wait for the sync to complete</li>
                  </ol>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-2">
                <AccordionTrigger>Where do I find my ESPN League ID?</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  <p>Your League ID is in your ESPN Fantasy Football league URL:</p>
                  <p className="mt-2 p-2 bg-muted rounded font-mono text-xs">
                    https://fantasy.espn.com/football/league?leagueId=<span className="text-primary font-bold">123456</span>
                  </p>
                  <p className="mt-2">The number after "leagueId=" is your League ID (in this example: 123456)</p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-3">
                <AccordionTrigger>How do I get my ESPN_S2 and SWID for private leagues?</AccordionTrigger>
                <AccordionContent className="text-muted-foreground space-y-2">
                  <p>For private ESPN leagues, you need authentication cookies:</p>
                  <ol className="list-decimal list-inside space-y-1 ml-2">
                    <li>Log in to your ESPN Fantasy Football league on a web browser</li>
                    <li>Open Developer Tools (F12 or right-click → Inspect)</li>
                    <li>Go to the "Application" or "Storage" tab</li>
                    <li>Click on "Cookies" → "https://fantasy.espn.com"</li>
                    <li>Find and copy the values for "espn_s2" and "SWID"</li>
                    <li>Paste these values when connecting your league</li>
                  </ol>
                  <p className="mt-2 text-sm">Note: These cookies expire periodically. If sync stops working, you may need to update them.</p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-4">
                <AccordionTrigger>Can I track multiple leagues?</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  Yes! You can connect and track as many ESPN Fantasy Football leagues as you want. Each league will appear on your dashboard with its own stats and data. Simply click "Add League" to connect additional leagues.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>

        {/* Features & Usage */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Features & Usage</CardTitle>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="item-5">
                <AccordionTrigger>What is the Head-to-Head Matrix?</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  The Head-to-Head Matrix shows your complete record against every team in your league across all seasons. It displays win-loss records in a grid format, with color coding to highlight winning (green) and losing (red) records. This helps you track rivalries and see which matchups you dominate or struggle with historically.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-6">
                <AccordionTrigger>How do I view weekly matchups?</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  Click "View League" on any league card, then navigate to the "Current Week" tab. You'll see all matchups for the selected week with scores and projections. Use the week selector to view past or future weeks. The matchup cards show home vs away teams with their current scores and projected totals.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-7">
                <AccordionTrigger>What stats are included in All-Time Stats?</AccordionTrigger>
                <AccordionContent className="text-muted-foreground space-y-2">
                  <p>The All-Time Stats dashboard includes:</p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>Career win-loss records for each team</li>
                    <li>Total points scored across all seasons</li>
                    <li>Win percentages and rankings</li>
                    <li>Highest and lowest scoring games</li>
                    <li>Average points per game</li>
                    <li>Championship history (coming soon)</li>
                  </ul>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-8">
                <AccordionTrigger>How often should I sync my league data?</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  Click the "Sync Data" button in your league header whenever you want to refresh data from ESPN. We recommend syncing after games complete, before making roster decisions, or when you notice data seems outdated. The sync typically takes 10-30 seconds depending on your league size and history.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-9">
                <AccordionTrigger>Can I track multiple seasons for the same league?</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  Yes! When you connect a league, all historical data from ESPN is imported automatically. The All-Time Stats section aggregates data across all available seasons to show career records. You can also view individual season data in the standings table.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>

        {/* Troubleshooting */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Troubleshooting</CardTitle>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="item-10">
                <AccordionTrigger>Why is my league sync failing?</AccordionTrigger>
                <AccordionContent className="text-muted-foreground space-y-2">
                  <p>Common reasons for sync failures:</p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li><strong>Invalid League ID:</strong> Double-check your league ID from the ESPN URL</li>
                    <li><strong>Expired cookies:</strong> For private leagues, your ESPN_S2 and SWID cookies may have expired. Get fresh ones from ESPN</li>
                    <li><strong>Wrong season year:</strong> Make sure you entered the correct year</li>
                    <li><strong>ESPN API issues:</strong> Occasionally ESPN's servers have temporary issues. Try again in a few minutes</li>
                  </ul>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-11">
                <AccordionTrigger>My stats look incorrect or outdated</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  If your stats appear wrong, try clicking the "Sync Data" button to pull fresh data from ESPN. If the issue persists, there may be a delay in ESPN updating their API. Stats typically update within minutes after games complete, but can occasionally take longer during high-traffic periods.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-12">
                <AccordionTrigger>I can't see some teams or matchups</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  If teams or matchups are missing, try syncing your league data again. If you recently added a new team or made major league changes in ESPN, it may take one sync cycle for all data to appear correctly. Make sure you're viewing the correct week in the matchup viewer.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-13">
                <AccordionTrigger>How do I delete or disconnect a league?</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  Currently, league management features are being developed. For now, disconnected leagues will remain in your dashboard. If you need to remove a league, please contact support or simply ignore it in your league list.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>

        {/* Privacy & Security */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Privacy & Security
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="item-14">
                <AccordionTrigger>Is my ESPN data secure?</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  Yes. Your ESPN credentials (espn_s2 and SWID) are stored securely and encrypted in our database. We only use them to fetch your league data from ESPN's official API. We never share your credentials with third parties or use them for any purpose other than syncing your league data.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-15">
                <AccordionTrigger>Who can see my league data?</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  Only you and other authenticated users in your league can see the data. Each league's data is private and only accessible to users who have connected that specific league to their account. We don't make any league data public.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-16">
                <AccordionTrigger>Can I export my data?</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  Data export features are planned for a future update. In the meantime, all your data is safely stored and accessible through the app. Your data comes directly from ESPN, so you always have access to the original source.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>

        {/* Contact */}
        <div className="mt-8 text-center text-muted-foreground">
          <p>Still have questions? Need help with something specific?</p>
          <p className="mt-2">Contact us or check back - we're constantly adding new features and improvements!</p>
        </div>
      </div>
    </div>
  );
}
