import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import {
  Trophy,
  ArrowLeft,
  Sparkles,
  BarChart3,
  Users,
  TrendingUp,
  RefreshCw,
  Shield,
} from "lucide-react";
import { useLocation } from "wouter";

export default function FAQ() {
  const [, setLocation] = useLocation();

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

          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-card-foreground">
                Help Center & FAQ
              </h1>
              <p className="text-muted-foreground">
                Everything you need to know about Trouble in Paradise Fantasy
                Football Tracker
              </p>
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
              Trouble in Paradise is the ultimate companion for your ESPN
              Fantasy Football league
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="flex gap-3">
                <BarChart3 className="h-5 w-5 text-primary flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold">All-Time Stats Tracking</h3>
                  <p className="text-sm text-muted-foreground">
                    Track career records, championships, and historical
                    performance across multiple seasons
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <Users className="h-5 w-5 text-primary flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold">Head-to-Head Matrix</h3>
                  <p className="text-sm text-muted-foreground">
                    See your complete rivalry records against every team in your
                    league's history
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <TrendingUp className="h-5 w-5 text-primary flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold">Weekly Matchup Analysis</h3>
                  <p className="text-sm text-muted-foreground">
                    View live scores, projections, and detailed breakdowns for
                    every week
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <RefreshCw className="h-5 w-5 text-primary flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold">One-Click ESPN Sync</h3>
                  <p className="text-sm text-muted-foreground">
                    Instantly pull the latest data from ESPN with a single
                    button click
                  </p>
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
                <AccordionTrigger>
                  How do I connect my ESPN Fantasy Football league?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground space-y-2">
                  <p>Connecting your league is easy:</p>
                  <ol className="list-decimal list-inside space-y-1 ml-2">
                    <li>Click the "Add League" button on your dashboard</li>
                    <li>Paste your ESPN league URL or League ID</li>
                    <li>
                      Ask the league manager to enable public viewability in
                      ESPN if needed
                    </li>
                    <li>Click "Connect League & Start Auto-Sync"</li>
                  </ol>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-2">
                <AccordionTrigger>
                  Where do I find my ESPN League ID?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  <p>
                    Your League ID is in your ESPN Fantasy Football league URL:
                  </p>
                  <p className="mt-2 p-2 bg-muted rounded font-mono text-xs">
                    https://fantasy.espn.com/football/league?leagueId=
                    <span className="text-primary font-bold">123456</span>
                  </p>
                  <p className="mt-2">
                    The number after "leagueId=" is your League ID (in this
                    example: 123456)
                  </p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-3">
                <AccordionTrigger>
                  Does a private league require ESPN cookies?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground space-y-2">
                  <p>
                    No. This app never asks for or stores ESPN browser cookies.
                  </p>
                  <p>
                    The ESPN league manager can enable public viewability in
                    League Settings. That allows read-only syncing without
                    allowing strangers to join or change the ESPN league.
                  </p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-4">
                <AccordionTrigger>
                  Can I track multiple leagues?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  Yes! You can connect and track as many ESPN Fantasy Football
                  leagues as you want. Each league will appear on your dashboard
                  with its own stats and data. Simply click "Add League" to
                  connect additional leagues.
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
                <AccordionTrigger>
                  What is the Head-to-Head Matrix?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  The Head-to-Head Matrix shows your complete record against
                  every team in your league across all seasons. It displays
                  win-loss records in a grid format, with color coding to
                  highlight winning (green) and losing (red) records. This helps
                  you track rivalries and see which matchups you dominate or
                  struggle with historically.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-6">
                <AccordionTrigger>
                  How do I view weekly matchups?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  Click "View League" on any league card, then navigate to the
                  "Current Week" tab. You'll see all matchups for the selected
                  week with scores and projections. Use the week selector to
                  view past or future weeks. The matchup cards show home vs away
                  teams with their current scores and projected totals.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-7">
                <AccordionTrigger>
                  What stats are included in All-Time Stats?
                </AccordionTrigger>
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
                <AccordionTrigger>
                  How often should I sync my league data?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  Current league data refreshes automatically every 30 minutes.
                  The commissioner can also use "Sync Now" whenever an immediate
                  refresh is useful.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-9">
                <AccordionTrigger>
                  Can I track multiple seasons for the same league?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  Yes. The commissioner taps "Import History" once after
                  connecting the current league. The app finds public archived
                  seasons tied to that ESPN League ID and imports their final
                  standings and weekly matchups. If ESPN keeps an archive
                  private, the commissioner can upload a sanitized history file
                  instead. The app clearly labels seasons that contain final
                  standings but not weekly scores.
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
                <AccordionTrigger>
                  Why is my league sync failing?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground space-y-2">
                  <p>Common reasons for sync failures:</p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>
                      <strong>Invalid League ID:</strong> Double-check your
                      league ID from the ESPN URL
                    </li>
                    <li>
                      <strong>League not publicly viewable:</strong> Ask the
                      ESPN league manager to enable public viewability
                    </li>
                    <li>
                      <strong>ESPN API issues:</strong> Occasionally ESPN's
                      servers have temporary issues. Try again in a few minutes
                    </li>
                  </ul>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-11">
                <AccordionTrigger>
                  My stats look incorrect or outdated
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  If your stats appear wrong, try clicking the "Sync Data"
                  button to pull fresh data from ESPN. If the issue persists,
                  there may be a delay in ESPN updating their API. Stats
                  typically update within minutes after games complete, but can
                  occasionally take longer during high-traffic periods.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-12">
                <AccordionTrigger>
                  I can't see some teams or matchups
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  If teams or matchups are missing, try syncing your league data
                  again. If you recently added a new team or made major league
                  changes in ESPN, it may take one sync cycle for all data to
                  appear correctly. Make sure you're viewing the correct week in
                  the matchup viewer.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-13">
                <AccordionTrigger>
                  How do I delete or disconnect a league?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  The commissioner can rename or delete a connected league from
                  the dashboard. Deleting removes its imported data and member
                  access from this app; it does not change the ESPN league.
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
                  The app does not collect ESPN passwords, espn_s2 cookies, or
                  SWID cookies. It stores read-only league statistics from
                  publicly viewable ESPN league pages and restricts app access
                  to invited, authenticated members.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-15">
                <AccordionTrigger>Who can see my league data?</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  Only you and other authenticated users in your league can see
                  the data. Each league's data is private and only accessible to
                  users who have connected that specific league to their
                  account. We don't make any league data public.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-16">
                <AccordionTrigger>Can I export my data?</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  Yes. The Export button downloads a Markdown league report with
                  standings, season leaders, and selected highlights. Markdown
                  can be pasted into Craft or converted to PDF.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>

        {/* Contact */}
        <div className="mt-8 text-center text-muted-foreground">
          <p>Still have questions? Need help with something specific?</p>
          <p className="mt-2">
            Contact us or check back - we're constantly adding new features and
            improvements!
          </p>
        </div>
      </div>
    </div>
  );
}
