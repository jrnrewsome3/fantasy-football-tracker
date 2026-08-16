import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ArrowLeft, History } from "lucide-react";
import { useLocation } from "wouter";

/**
 * Shown in place of every historical-analytics screen while past-season data
 * is re-imported and verified (HISTORY_ENABLED in shared/const.ts).
 */
export default function HistoryUnavailable() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-muted-foreground" />
            <CardTitle>League history is being rebuilt</CardTitle>
          </div>
          <CardDescription>
            Past-season records are offline while every result is verified
            against ESPN. Current-season standings, matchups, and rosters are
            not affected.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => setLocation("/dashboard")}>
            <ArrowLeft className="h-4 w-4" /> Back to Dashboard
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
