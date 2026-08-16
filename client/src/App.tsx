import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import LeagueDetail from "./pages/LeagueDetail";
import LeagueSetup from "./pages/LeagueSetup";
import HistoricalHighlights from "./pages/HistoricalHighlights";
import FAQ from "./pages/FAQ";
import TeamComparison from "./pages/TeamComparison";
import WeeklyRecap from "./pages/WeeklyRecap";
import TeamHistory from "./pages/TeamHistory";
import BrowseSeasons from "./pages/BrowseSeasons";
import OwnerLeaderboard from "./pages/OwnerLeaderboard";
import SignInPage from "./pages/SignIn";
import SignUpPage from "./pages/SignUp";
import HistoryOwnership from "./pages/HistoryOwnership";
import HistoryUnavailable from "./pages/HistoryUnavailable";
import OnboardingTutorial from "./components/OnboardingTutorial";
import { HISTORY_ENABLED } from "@shared/const";
import type { ComponentType } from "react";

function Router() {
  // Historical screens are swapped for a notice while past-season data is
  // rebuilt and verified (HISTORY_ENABLED in shared/const.ts).
  const history = (component: ComponentType<any>) =>
    HISTORY_ENABLED ? component : HistoryUnavailable;

  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path="/sign-in" component={SignInPage} />
      <Route path="/sign-in/*" component={SignInPage} />
      <Route path="/sign-up" component={SignUpPage} />
      <Route path="/sign-up/*" component={SignUpPage} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/setup" component={LeagueSetup} />
      <Route path="/faq" component={FAQ} />
      <Route path={"/league/:id"} component={LeagueDetail} />
      <Route
        path={"/league/:id/highlights"}
        component={history(HistoricalHighlights)}
      />
      <Route
        path={"/league/:id/compare"}
        component={history(TeamComparison)}
      />
      <Route path={"/league/:id/recap"} component={WeeklyRecap} />
      <Route
        path={"/league/:id/history-ownership"}
        component={history(HistoryOwnership)}
      />
      <Route
        path={"/team/:espnTeamId/:espnLeagueId/history"}
        component={history(TeamHistory)}
      />
      <Route
        path={"/seasons/:espnLeagueId"}
        component={history(BrowseSeasons)}
      />
      <Route
        path={"/leaderboard/:espnLeagueId"}
        component={history(OwnerLeaderboard)}
      />
      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark" switchable>
        <TooltipProvider>
          <Toaster />
          <OnboardingTutorial />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
