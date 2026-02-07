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
import OnboardingTutorial from "./components/OnboardingTutorial";

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/setup" component={LeagueSetup} />
      <Route path="/faq" component={FAQ} />
      <Route path={"/league/:id"} component={LeagueDetail} />
      <Route path={"/league/:id/highlights"} component={HistoricalHighlights} />
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
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
