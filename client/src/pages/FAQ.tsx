import type { ReactNode } from "react";
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
  ArrowLeft,
  BarChart3,
  Bot,
  CheckCircle2,
  CloudSun,
  History,
  RefreshCw,
  Shield,
  Smartphone,
  Sparkles,
  Trophy,
  Users,
} from "lucide-react";
import { useLocation } from "wouter";
import { HISTORY_ENABLED } from "@shared/const";

type FaqItem = {
  id: string;
  question: string;
  answer: ReactNode;
};

function FaqSection({ title, items }: { title: string; items: FaqItem[] }) {
  return (
    <Card className="mb-6 sm:mb-8">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <Accordion type="single" collapsible className="w-full">
          {items.map(item => (
            <AccordionItem key={item.id} value={item.id}>
              <AccordionTrigger className="text-left">
                {item.question}
              </AccordionTrigger>
              <AccordionContent className="space-y-3 text-muted-foreground">
                {item.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </CardContent>
    </Card>
  );
}

const gettingStarted: FaqItem[] = [
  {
    id: "setup-who",
    question: "Who needs to set up the league?",
    answer: (
      <>
        <p>
          One person connects the ESPN league and becomes its commissioner in
          this app. That person controls syncing, invitations, renaming, and
          removal. League members only create an app account, enter the invite
          code, and choose their current ESPN team.
        </p>
        <p>
          Members never need ESPN developer tools, browser cookies, or anyone
          else's ESPN login.
        </p>
      </>
    ),
  },
  {
    id: "setup-commissioner-vs-lm",
    question:
      "Is the app commissioner the same as the ESPN League Manager?",
    answer: (
      <>
        <p>
          No, and the difference matters. The <strong>app commissioner</strong>{" "}
          is simply whoever connected the league here — that can be any member.
          The <strong>ESPN League Manager</strong> is the person who controls
          settings inside ESPN itself.
        </p>
        <p>
          Anything that changes ESPN — most commonly making a season viewable to
          the public — can only be done by the ESPN League Manager. If that is
          not you, you will need to ask them. Everything inside this app is
          controlled by the app commissioner.
        </p>
      </>
    ),
  },
  {
    id: "setup-connect",
    question: "How does the commissioner connect an ESPN league?",
    answer: (
      <ol className="list-decimal space-y-2 pl-5">
        <li>Sign in to this app and select Add League.</li>
        <li>Paste the ESPN league URL or enter the League ID.</li>
        <li>
          If ESPN blocks the connection, the league is not publicly viewable.
          The ESPN League Manager must open League &rarr; Settings &rarr; Basic
          Settings &rarr; Edit and make the league viewable to the public. If
          you are not the League Manager, ask them to do it.
        </li>
        <li>Select Connect League &amp; Start Auto-Sync.</li>
        <li>Open the league and use Invite Members to copy the invite code.</li>
      </ol>
    ),
  },
  {
    id: "setup-signin",
    question: "How do I sign in?",
    answer: (
      <p>
        Sign in with a Google account or an email address. There is no separate
        password to remember for this app, and your ESPN login is never used or
        requested.
      </p>
    ),
  },
  {
    id: "setup-id",
    question: "Where is the ESPN League ID?",
    answer: (
      <>
        <p>The League ID is the number after leagueId= in the ESPN URL:</p>
        <p className="break-all rounded bg-muted p-3 font-mono text-xs">
          https://fantasy.espn.com/football/league?leagueId=
          <span className="font-bold text-primary">123456</span>
        </p>
      </>
    ),
  },
  {
    id: "setup-public",
    question: "Does public viewability let strangers join my ESPN league?",
    answer: (
      <p>
        No. Public viewability gives the app read-only access to the league data
        ESPN exposes. It does not make the ESPN league publicly joinable and
        does not let this app change lineups, rosters, settings, or
        transactions.
      </p>
    ),
  },
  {
    id: "setup-join",
    question: "How do league members join?",
    answer: (
      <ol className="list-decimal space-y-2 pl-5">
        <li>Create an account or sign in.</li>
        <li>Select Join Team League on the dashboard.</li>
        <li>Enter the invite code provided by the commissioner.</li>
        <li>Open the league and select Choose my team.</li>
      </ol>
    ),
  },
  {
    id: "setup-multiple",
    question: "Can one person belong to multiple leagues?",
    answer: (
      <p>
        Yes. Each connected or joined league appears separately on the
        dashboard. The same account can be a commissioner in one league and a
        member in another.
      </p>
    ),
  },
];

const currentSeason: FaqItem[] = [
  {
    id: "current-sync",
    question: "How often does current-season data update?",
    answer: (
      <>
        <p>
          Connected leagues are checked automatically and become due for a new
          sync every 30 minutes. The commissioner can select Sync Now when an
          immediate refresh is needed.
        </p>
        <p>
          ESPN can take additional time to finalize scores, injuries, waiver
          availability, and stat corrections.
        </p>
      </>
    ),
  },
  {
    id: "current-matchups",
    question: "Where are the weekly matchups?",
    answer: (
      <p>
        Open the league and select Matchups. Use the week selector to move
        through the current season. Scores and projections appear when ESPN
        supplies them.
      </p>
    ),
  },
  {
    id: "current-players",
    question: "What does Available Players show?",
    answer: (
      <p>
        Available Players is a league-specific waiver-wire view. It shows
        players ESPN reports as available, including position, NFL team, status,
        percent owned, and percent started. It is decision support only; waiver
        claims and roster moves still happen in ESPN.
      </p>
    ),
  },
  {
    id: "current-weather",
    question: "How does Game Weather work?",
    answer: (
      <p>
        Game Weather combines the NFL schedule with National Weather Service
        forecasts. Outdoor forecasts normally populate within seven days of
        kickoff. Indoor games are identified without an outdoor forecast.
      </p>
    ),
  },
  {
    id: "current-tools",
    question: HISTORY_ENABLED
      ? "What are Weekly Recap, Compare, Highlights, and AI Assistant?"
      : "What are Weekly Recap and AI Assistant?",
    answer: (
      <ul className="list-disc space-y-2 pl-5">
        <li>
          <strong>Weekly Recap:</strong> summarizes completed matchup results,
          close games, top scores, and notable outcomes.
        </li>
        {HISTORY_ENABLED && (
          <>
            <li>
              <strong>Compare:</strong> places two teams side by side using the
              data currently stored for the league.
            </li>
            <li>
              <strong>Highlights:</strong> surfaces notable performances and
              league records when score data is available.
            </li>
          </>
        )}
        <li>
          <strong>AI Assistant:</strong> answers questions using the league data
          available in the app. Its answer is limited by the completeness of
          that data.
        </li>
        {!HISTORY_ENABLED && (
          <li className="text-muted-foreground">
            Compare and Highlights are paused while past seasons are rebuilt.
            See the Historical Seasons section below.
          </li>
        )}
      </ul>
    ),
  },
  {
    id: "current-read-only",
    question: "Can the app set lineups or make roster moves in ESPN?",
    answer: (
      <p>
        No. The app is intentionally read-only. It helps members review
        standings, matchups, available players, weather, and trends, but each
        manager makes final lineup, waiver, trade, and roster decisions in ESPN.
      </p>
    ),
  },
];

/**
 * Shown while HISTORY_ENABLED is false. Historical screens are hidden because
 * the imported data could not be verified; these answers explain that plainly
 * rather than describing features nobody can currently reach.
 */
const historyPaused: FaqItem[] = [
  {
    id: "history-why-hidden",
    question:
      "Why can't I see all-time stats, past seasons, or the owner leaderboard?",
    answer: (
      <>
        <p>
          Those pages are turned off on purpose. An audit found that the
          imported history could not be trusted: career win totals were wrong,
          championships were missing or incorrect, and some past matchups were
          matched to the wrong teams.
        </p>
        <p>
          Rather than show numbers that look official and are not, the
          historical pages are hidden while past seasons are re-imported from
          ESPN and checked one season at a time. Nothing about the current
          season is affected.
        </p>
      </>
    ),
  },
  {
    id: "history-what-broke",
    question: "What was actually wrong with the old history?",
    answer: (
      <ul className="list-disc space-y-2 pl-5">
        <li>
          Scores were stored as whole numbers, so fractional results — the ones
          that decide most fantasy games — were lost.
        </li>
        <li>
          Playoff rounds that span two weeks were recorded twice, each with a
          partial score.
        </li>
        <li>
          Champions were guessed from a fixed week number instead of read from
          the actual playoff bracket.
        </li>
        <li>
          Owners were identified by display name, so a manager who renamed a
          team could be counted as two different people.
        </li>
      </ul>
    ),
  },
  {
    id: "history-when-back",
    question: "When will history come back?",
    answer: (
      <>
        <p>
          Season by season, as each one is verified. A season is only published
          when every week has the right number of games, no team appears twice
          in a week, the win-loss records calculated from the schedule match the
          records ESPN itself reports, and the champion taken from the playoff
          bracket agrees with the final standings.
        </p>
        <p>
          Any season that fails those checks stays hidden rather than being
          published with a warning label.
        </p>
      </>
    ),
  },
  {
    id: "history-unlock",
    question: "Past seasons are private in ESPN. How do we unlock them?",
    answer: (
      <>
        <p>
          Each ESPN season has its own visibility setting, and only the ESPN
          League Manager can change it. For each season: open the league for
          that year, then League &rarr; Settings &rarr; Basic Settings &rarr;
          Edit, and make the league viewable to the public.
        </p>
        <p>
          This exposes standings and scores for reading. It does not let anyone
          join the league, change rosters, or alter settings.
        </p>
      </>
    ),
  },
  {
    id: "history-owners",
    question: "How will renamed teams, co-managers, and past owners be handled?",
    answer: (
      <>
        <p>
          Seasons from 2018 onward carry a permanent ESPN id for each owner, so
          the same manager is recognized across seasons even if the team name
          changed. Career records follow the person, not the team name.
        </p>
        <p>
          Teams with co-managers are supported, and each co-manager receives
          full credit for that season. Where ESPN cannot identify an owner
          automatically, the commissioner will be asked to assign them once.
        </p>
      </>
    ),
  },
];

const historicalData: FaqItem[] = [
  {
    id: "history-import",
    question: "How does a commissioner add past seasons?",
    answer: (
      <>
        <p>
          Start with Import History. The app asks ESPN for archived seasons tied
          to the same League ID. ESPN does not expose every private archive in
          the same way, so results can vary by season.
        </p>
        <p>
          When ESPN will not return an archive, the commissioner can use Upload
          History File with a sanitized JSON file containing final standings and
          champions. League members do not repeat either step.
        </p>
      </>
    ),
  },
  {
    id: "history-partial",
    question: "What does “final standings imported” mean?",
    answer: (
      <p>
        It means the season includes team names, final wins and losses, finish
        order, and championship results, but not the individual weekly scores.
        The season contributes to career W-L records and championship history.
        Score-based features remain unavailable for that season.
      </p>
    ),
  },
  {
    id: "history-missing-matchups",
    question: "Why are old matchups or rivalry records missing?",
    answer: (
      <p>
        Head-to-head records, total points, highest scores, weekly recaps, and
        old matchup cards require weekly score data. If ESPN only exposes final
        standings, the app cannot reconstruct those scores and will not invent
        them. Browse Seasons clearly labels partial archives.
      </p>
    ),
  },
  {
    id: "history-cleanup",
    question: "How do I handle renamed teams and co-managers?",
    answer: (
      <>
        <p>
          Commissioners select Clean Up History inside the league. For each
          historical team, enter every manager separated by commas. Reuse the
          same franchise key—or select the matching current-team suggestion—when
          one franchise changed names between seasons.
        </p>
        <p>
          Save All Assignments after reviewing the seasons. This changes the
          app's historical grouping only; it never edits ESPN.
        </p>
      </>
    ),
  },
  {
    id: "history-team-count",
    question: "Why are career totals or the owner leaderboard paused?",
    answer: (
      <p>
        Each renamed team can look like a separate franchise until a
        commissioner reviews it. The app pauses career totals instead of showing
        a misleading leaderboard. Connect historical names with the correct
        franchise keys and managers in Clean Up History, then save the
        assignments.
      </p>
    ),
  },
  {
    id: "history-stats",
    question: "Which all-time statistics can I trust?",
    answer: (
      <>
        <p>
          Career wins, losses, finish order, and champions can include imported
          final standings. Points-for, averages, highest scores, matchup
          records, and head-to-head results only include seasons with weekly
          score data.
        </p>
        <p>
          Use the coverage note on each season card to see whether it contains
          complete matchups or final standings only.
        </p>
      </>
    ),
  },
];

const accessAndPrivacy: FaqItem[] = [
  {
    id: "access-roles",
    question: "What can commissioners do that members cannot?",
    answer: (
      <p>
        Commissioners can connect and sync ESPN data, invite members, rename the
        league, and delete it from this app
        {HISTORY_ENABLED
          ? ", plus import history and clean up historical ownership"
          : ""}
        . Members can view the shared league and select their own current team.
        Note that this is separate from being the ESPN League Manager, who
        controls settings inside ESPN itself.
      </p>
    ),
  },
  {
    id: "privacy-cookies",
    question: "Does the app collect ESPN passwords or cookies?",
    answer: (
      <p>
        No. The app does not ask for or store ESPN passwords, espn_s2 cookies,
        or SWID cookies. Current data is synced through the read-only league
        information ESPN exposes when the league is viewable.
      </p>
    ),
  },
  {
    id: "privacy-visibility",
    question: "Who can see data inside the app?",
    answer: (
      <p>
        App access is limited to authenticated accounts that connected the
        league or joined it with its invite code. Do not post invite codes
        publicly. ESPN's separate public-viewability setting controls what ESPN
        itself exposes for read-only syncing.
      </p>
    ),
  },
  {
    id: "privacy-export",
    question: "Can I export league information?",
    answer: (
      <p>
        Yes. Export downloads a Markdown league report with standings, season
        leaders, and available highlights. Markdown can be pasted directly into
        Craft or converted to another format.
      </p>
    ),
  },
  {
    id: "privacy-delete",
    question: "What happens if the commissioner deletes a league?",
    answer: (
      <p>
        Deleting a league removes its imported statistics and member access from
        this app. It does not delete or change the ESPN league. Deletion is not
        an archive or hide action, so export anything important first.
      </p>
    ),
  },
];

const troubleshooting: FaqItem[] = [
  {
    id: "trouble-join",
    question:
      "I signed in, but connecting the League ID says it is already connected. What do I do?",
    answer: (
      <p>
        Your login worked. You are on the commissioner setup path for a league
        that already has a commissioner. Return to the dashboard, select Join
        Team League, and enter the invite code shared by that commissioner.
      </p>
    ),
  },
  {
    id: "trouble-sync",
    question: "Why is the league sync failing?",
    answer: (
      <ul className="list-disc space-y-2 pl-5">
        <li>Confirm the League ID from the ESPN URL.</li>
        <li>Confirm the current ESPN league is viewable to the public.</li>
        <li>
          Make sure the commissioner connected the league for the current year.
        </li>
        <li>
          Wait a few minutes and try Sync Now if ESPN is temporarily
          unavailable.
        </li>
      </ul>
    ),
  },
  {
    id: "trouble-stale",
    question: "What should I do if current stats look outdated?",
    answer: (
      <p>
        Check the last-updated message on the dashboard. The commissioner can
        select Sync Now. If the sync succeeds but ESPN has not finalized the
        source data, wait for ESPN's stat correction or next update cycle.
      </p>
    ),
  },
  {
    id: "trouble-history",
    question:
      "The current season works, but past seasons show a “being rebuilt” message. Is that an error?",
    answer: HISTORY_ENABLED ? (
      <p>
        Not necessarily. ESPN may expose a season's final standings while
        withholding its weekly matchup pages. Check Browse Seasons: a “final
        standings imported” note confirms that the partial archive is working as
        designed.
      </p>
    ) : (
      <p>
        No, that is expected. Historical pages are intentionally turned off
        while past seasons are re-imported and verified. See the Historical
        Seasons section above for what is happening and why.
      </p>
    ),
  },
  {
    id: "trouble-access",
    question: "I get “You do not have access to this league.” What now?",
    answer: (
      <p>
        If you connected the league yourself, this should resolve on its own the
        next time you open it — the app repairs that state automatically. If you
        are a league member, you need an invite code: return to the dashboard,
        select Join Team League, and enter the code from your commissioner.
      </p>
    ),
  },
  {
    id: "trouble-mobile",
    question: "Does the app work on a phone, and how do I change themes?",
    answer: (
      <p>
        Yes. The league pages are designed for mobile browsers; wide tables and
        tab bars can scroll horizontally. Use the sun or moon button near the
        page heading to switch between light and dark mode.
      </p>
    ),
  },
  {
    id: "trouble-support",
    question: "What information is safe to share when asking for help?",
    answer: (
      <p>
        Share the League ID, affected season, the exact on-screen error, and a
        screenshot with personal details removed. Never send an ESPN password,
        browser cookie, authentication code, or full invite code.
      </p>
    ),
  },
];

export default function FAQ() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card">
        <div className="container py-4 sm:py-6">
          <Button
            variant="ghost"
            onClick={() => setLocation("/dashboard")}
            className="mb-3 sm:mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>

          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 sm:h-12 sm:w-12">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-card-foreground sm:text-3xl">
                Help Center &amp; FAQ
              </h1>
              <p className="mt-1 text-sm text-muted-foreground sm:text-base">
                Accurate setup, syncing, history, privacy, and troubleshooting
                guidance for Fantasy Football Tracker
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="container max-w-4xl py-6 sm:py-8">
        <Card className="mb-6 border-primary/30 bg-primary/5 sm:mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              The simple league setup
            </CardTitle>
            <CardDescription>
              One commissioner connects ESPN; every invited member receives the
              same refreshed league view.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="grid gap-3 text-sm sm:grid-cols-3">
              <li className="rounded-lg border bg-background p-4">
                <strong className="block text-card-foreground">
                  1. Connect
                </strong>
                <span className="text-muted-foreground">
                  The commissioner pastes the ESPN League ID once.
                </span>
              </li>
              <li className="rounded-lg border bg-background p-4">
                <strong className="block text-card-foreground">
                  2. Invite
                </strong>
                <span className="text-muted-foreground">
                  Members join this app with the league invite code.
                </span>
              </li>
              <li className="rounded-lg border bg-background p-4">
                <strong className="block text-card-foreground">
                  3. Refresh
                </strong>
                <span className="text-muted-foreground">
                  Automatic ESPN updates keep the shared current season fresh.
                </span>
              </li>
            </ol>
          </CardContent>
        </Card>

        <Card className="mb-6 sm:mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-primary" />
              What the app includes
            </CardTitle>
            <CardDescription>
              {HISTORY_ENABLED
                ? "Current-season decision support plus an honest, coverage-aware historical archive"
                : "Current-season decision support. Historical analytics are paused while past seasons are rebuilt and verified."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="flex gap-3">
                <RefreshCw className="mt-1 h-5 w-5 flex-shrink-0 text-primary" />
                <div>
                  <h3 className="font-semibold">Automatic ESPN updates</h3>
                  <p className="text-sm text-muted-foreground">
                    Shared standings, matchups, rosters, and waiver availability
                    without member cookie setup.
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <History className="mt-1 h-5 w-5 flex-shrink-0 text-primary" />
                <div>
                  <h3 className="font-semibold">
                    Historical seasons
                    {!HISTORY_ENABLED && (
                      <span className="ml-2 rounded bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                        Paused
                      </span>
                    )}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {HISTORY_ENABLED
                      ? "Final standings, champions, and weekly scores when ESPN makes each type of archive data available."
                      : "Being re-imported from ESPN and verified season by season. Returns once each season passes its checks."}
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <Users className="mt-1 h-5 w-5 flex-shrink-0 text-primary" />
                <div>
                  <h3 className="font-semibold">Shared league access</h3>
                  <p className="text-sm text-muted-foreground">
                    Commissioner-managed invites and team selection. Members
                    join with a code — never with ESPN credentials.
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <BarChart3 className="mt-1 h-5 w-5 flex-shrink-0 text-primary" />
                <div>
                  <h3 className="font-semibold">
                    Career analytics
                    {!HISTORY_ENABLED && (
                      <span className="ml-2 rounded bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                        Paused
                      </span>
                    )}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {HISTORY_ENABLED
                      ? "W-L records and championships, with score-based statistics only where weekly matchup data exists."
                      : "Career records and championships return with verified history, credited to owners rather than team names."}
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <CloudSun className="mt-1 h-5 w-5 flex-shrink-0 text-primary" />
                <div>
                  <h3 className="font-semibold">Players and weather</h3>
                  <p className="text-sm text-muted-foreground">
                    League-specific available players plus NFL kickoff and
                    outdoor weather outlooks.
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <Bot className="mt-1 h-5 w-5 flex-shrink-0 text-primary" />
                <div>
                  <h3 className="font-semibold">Recaps and AI questions</h3>
                  <p className="text-sm text-muted-foreground">
                    {HISTORY_ENABLED
                      ? "Weekly summaries, comparisons, highlights, and answers based on the league data actually stored."
                      : "Weekly summaries and answers based on the current-season data actually stored."}
                  </p>
                </div>
              </div>
              <div className="flex gap-3 sm:col-span-2">
                <Smartphone className="mt-1 h-5 w-5 flex-shrink-0 text-primary" />
                <div>
                  <h3 className="font-semibold">Mobile and light/dark modes</h3>
                  <p className="text-sm text-muted-foreground">
                    Responsive league pages with a theme switch for comfortable
                    use on phones, tablets, and desktop browsers.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <FaqSection title="Getting Started" items={gettingStarted} />
        <FaqSection
          title="Current Season & Decision Tools"
          items={currentSeason}
        />
        <FaqSection
          title={
            HISTORY_ENABLED
              ? "Historical Seasons"
              : "Historical Seasons (temporarily unavailable)"
          }
          items={HISTORY_ENABLED ? historicalData : historyPaused}
        />
        <FaqSection title="Access, Privacy & Export" items={accessAndPrivacy} />
        <FaqSection title="Troubleshooting" items={troubleshooting} />

        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />A useful support rule
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            League IDs and screenshots are usually enough to diagnose a problem.
            No support request should require your ESPN password, browser
            cookies, or authentication codes.
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
