import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Check, Copy, Newspaper, Sparkles } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface Props {
  leagueId: number;
  currentWeek: number;
  seasons: number[];
  currentSeason: number;
}

/**
 * Generates the league newsletter and hands it over as text to paste into the
 * group chat. Delivery is deliberately manual — the commissioner reads it
 * before the league does.
 */
export default function NewsletterPage({
  leagueId,
  currentWeek,
  seasons,
  currentSeason,
}: Props) {
  const [kind, setKind] = useState<"preview" | "recap">("preview");
  const [week, setWeek] = useState(currentWeek);
  const [season, setSeason] = useState(currentSeason);
  const [copied, setCopied] = useState(false);
  const [showBrief, setShowBrief] = useState(false);

  const generate = trpc.league.newsletter.useMutation({
    onError: error =>
      toast.error("Could not write the newsletter", {
        description: error.message,
      }),
  });

  const copy = async () => {
    if (!generate.data?.markdown) return;
    await navigator.clipboard.writeText(generate.data.markdown);
    setCopied(true);
    toast.success("Copied — paste it into the league chat");
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Newspaper className="h-5 w-5 text-primary" />
            League Newsletter
          </CardTitle>
          <CardDescription>
            Written from the league's actual records — every score, streak and
            series is checked before a word is written. Copy it into the chat.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1 rounded-lg bg-muted p-1">
              <Button
                variant={kind === "preview" ? "default" : "ghost"}
                size="sm"
                className="text-xs"
                onClick={() => setKind("preview")}
              >
                Pre-week preview
              </Button>
              <Button
                variant={kind === "recap" ? "default" : "ghost"}
                size="sm"
                className="text-xs"
                onClick={() => setKind("recap")}
              >
                Post-week recap
              </Button>
            </div>

            <Select
              value={String(season)}
              onValueChange={value => setSeason(Number(value))}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {seasons.map(year => (
                  <SelectItem key={year} value={String(year)}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={String(week)}
              onValueChange={value => setWeek(Number(value))}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 18 }, (_, i) => i + 1).map(w => (
                  <SelectItem key={w} value={String(w)}>
                    Week {w}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              onClick={() =>
                generate.mutate({ leagueId, kind, week, seasonYear: season })
              }
              disabled={generate.isPending}
            >
              <Sparkles
                className={`h-4 w-4 ${generate.isPending ? "animate-pulse" : ""}`}
              />
              {generate.isPending ? "Writing…" : "Write it"}
            </Button>
          </div>

          {generate.isPending && <Skeleton className="h-72 w-full" />}

          {generate.data && !generate.isPending && (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-card-foreground">
                  {generate.data.leagueName} · Week {generate.data.week}{" "}
                  {generate.data.kind === "preview" ? "preview" : "recap"} ·{" "}
                  {generate.data.seasonYear}
                </p>
                <Button variant="outline" size="sm" onClick={copy}>
                  {copied ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                  {copied ? "Copied" : "Copy"}
                </Button>
              </div>

              <div className="whitespace-pre-wrap rounded-lg border bg-muted/30 p-4 text-sm leading-relaxed text-card-foreground">
                {generate.data.markdown}
              </div>

              <div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-muted-foreground"
                  onClick={() => setShowBrief(!showBrief)}
                >
                  {showBrief ? "Hide" : "Show"} the facts it was written from
                </Button>
                {showBrief && (
                  <pre className="mt-2 overflow-x-auto rounded-lg border bg-muted/50 p-3 text-xs text-muted-foreground">
                    {generate.data.brief}
                  </pre>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
