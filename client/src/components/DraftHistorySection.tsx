import { Award, Target, TrendingUp, Trophy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const ownerDraftAverages = [
  { name: "Daly", average: 3.11 },
  { name: "Roger", average: 3.56 },
  { name: "William", average: 3.78 },
  { name: "Duncan", average: 4.78 },
  { name: "Bradley", average: 5.0 },
  { name: "Finn", average: 5.78 },
  { name: "Ty", average: 5.83 },
  { name: "Marshall", average: 6.2 },
  { name: "Mark", average: 7.33 },
  { name: "Dino", average: 7.6 },
];

const champions = [
  { year: 2025, owner: "Duncan", position: 5 },
  { year: 2024, owner: "Daly", position: 6 },
  { year: 2023, owner: "Roger", position: 2 },
  { year: 2022, owner: "Bradley", position: 3 },
  { year: 2021, owner: "Mike", position: 5 },
  { year: 2020, owner: "Bennett", position: 8 },
  { year: 2019, owner: "Marshall", position: 7 },
  { year: 2018, owner: "Daly", position: 1 },
];

const draftOrder2026 = [
  "William",
  "Finn",
  "Daly",
  "Mark",
  "Roger",
  "Dino",
  "Ty",
  "Marshall",
  "Duncan",
  "Bradley",
];

const championPositions = champions.map(champion => champion.position);
const averageChampionPosition =
  championPositions.reduce((sum, position) => sum + position, 0) /
  championPositions.length;
const sortedChampionPositions = [...championPositions].sort((a, b) => a - b);
const middle = sortedChampionPositions.length / 2;
const medianChampionPosition =
  (sortedChampionPositions[middle - 1] + sortedChampionPositions[middle]) / 2;
const topFiveChampions = championPositions.filter(
  position => position <= 5
).length;
const bottomHalfChampions = championPositions.length - topFiveChampions;
const winningPositions = new Set(championPositions);
const openChampionshipPositions = Array.from(
  { length: 10 },
  (_, index) => index + 1
).filter(position => !winningPositions.has(position));

export default function DraftHistorySection() {
  return (
    <section className="space-y-6" aria-labelledby="draft-history-title">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Trophy className="h-6 w-6 text-primary" />
          <h2
            id="draft-history-title"
            className="text-2xl font-bold text-card-foreground"
          >
            Trouble in Paradise Draft History
          </h2>
        </div>
        <p className="max-w-3xl text-sm text-muted-foreground sm:text-base">
          Commissioner-supplied draft summaries cover 2018 through 2026.
          Championship results cover the eight completed seasons from 2018
          through 2025. These records describe past results; they do not predict
          who will win in 2026.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-amber-500/10">
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="text-lg">Daly</CardTitle>
              <Badge variant="secondary">Best draft luck</Badge>
            </div>
            <CardDescription>Average draft pick: 3.11</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p>Three #1 picks</p>
            <p>Never drafted lower than #6</p>
            <p className="font-medium text-primary">2026 pick: #3</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Roger</CardTitle>
            <CardDescription>Average draft pick: 3.56</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p>Four #2 picks</p>
            <p className="font-medium text-primary">2026 pick: #5</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">William</CardTitle>
            <CardDescription>Average draft pick: 3.78</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p>Has ranged from #1 to #8</p>
            <p className="font-medium text-primary">2026 pick: #1</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <CardTitle>Historical Average Draft Position</CardTitle>
            </div>
            <CardDescription>
              Commissioner-supplied averages for current owners, ranked from
              earliest average pick
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Rank</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead className="text-right">Average pick</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ownerDraftAverages.map((owner, index) => (
                    <TableRow key={owner.name}>
                      <TableCell className="font-medium">{index + 1}</TableCell>
                      <TableCell>{owner.name}</TableCell>
                      <TableCell className="text-right font-semibold">
                        {owner.average.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <p className="text-xs text-muted-foreground">
              Mark, Dino, Ty, and Marshall have participated in fewer drafts, so
              their averages are based on fewer seasons.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Award className="h-5 w-5 text-amber-500" />
              <CardTitle>Where the Champions Drafted</CardTitle>
            </div>
            <CardDescription>
              Every champion from 2018 through 2025
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {champions.map(champion => (
                <div
                  key={champion.year}
                  className="rounded-lg border bg-muted/30 p-3"
                >
                  <div className="text-xs text-muted-foreground">
                    {champion.year}
                  </div>
                  <div className="font-semibold">{champion.owner}</div>
                  <div className="text-sm text-primary">
                    Pick #{champion.position}
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-lg bg-muted/50 p-3">
                <div className="text-2xl font-bold">
                  {averageChampionPosition.toFixed(2)}
                </div>
                <div className="text-xs text-muted-foreground">
                  Average winning pick
                </div>
              </div>
              <div className="rounded-lg bg-muted/50 p-3">
                <div className="text-2xl font-bold">
                  #{medianChampionPosition}
                </div>
                <div className="text-xs text-muted-foreground">
                  Median winning pick
                </div>
              </div>
              <div className="rounded-lg bg-muted/50 p-3">
                <div className="text-2xl font-bold">
                  {topFiveChampions} of {champions.length}
                </div>
                <div className="text-xs text-muted-foreground">
                  Won from the top five
                </div>
              </div>
              <div className="rounded-lg bg-muted/50 p-3">
                <div className="text-2xl font-bold">
                  {bottomHalfChampions} of {champions.length}
                </div>
                <div className="text-xs text-muted-foreground">
                  Won from the bottom half
                </div>
              </div>
            </div>

            <div className="space-y-2 text-sm text-muted-foreground">
              <p>Only one champion has won from the #1 position.</p>
              <p>The deepest championship run was Bennett from #8 in 2020.</p>
              <p>Nobody has won the league after drafting #9 or #10.</p>
            </div>

            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
              <div className="flex items-center gap-2 font-semibold">
                <Trophy className="h-4 w-4 text-amber-500" />
                Daly's unique record
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                Daly is the only owner with two championships during this
                stretch: from #1 in 2018 and #6 in 2024. He has won from both
                the front and back halves of the draft.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            <CardTitle>2026 Draft Order</CardTitle>
          </div>
          <CardDescription>
            The history book is still being written
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          <ol className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
            {draftOrder2026.map((owner, index) => (
              <li
                key={owner}
                className="flex items-center gap-3 rounded-lg border p-3"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 font-bold text-primary">
                  {index + 1}
                </span>
                <span className="font-medium">{owner}</span>
              </li>
            ))}
          </ol>

          <div className="grid gap-3 md:grid-cols-2">
            <p className="rounded-lg bg-muted/40 p-4 text-sm">
              <strong>William</strong> gets the #1 pick and another chance to
              turn historically great draft luck into a title.
            </p>
            <p className="rounded-lg bg-muted/40 p-4 text-sm">
              <strong>Finn</strong> jumps from #10 in 2025 to #2 in 2026.
            </p>
            <p className="rounded-lg bg-muted/40 p-4 text-sm">
              <strong>Daly</strong>, the only two-time champion in these records
              and historically luckiest drafter, lands another top-three pick.
            </p>
            <p className="rounded-lg bg-muted/40 p-4 text-sm">
              <strong>Roger</strong> drafts #5 after winning his 2023
              championship from #2.
            </p>
            <p className="rounded-lg bg-muted/40 p-4 text-sm">
              <strong>Duncan</strong>, the defending champion, falls from #5 in
              2025 to #9 in 2026.
            </p>
            <p className="rounded-lg bg-muted/40 p-4 text-sm">
              <strong>Bradley</strong>, the 2022 champion, gets #10. A 2026
              title for Duncan or Bradley would be the first in these records
              from #9 or #10.
            </p>
          </div>

          <div className="rounded-lg border border-primary/30 bg-primary/10 p-5">
            <h3 className="font-semibold">What the records show</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              The lottery matters, but Trouble in Paradise history shows that
              you do not have to draft near the top to win. Champions have come
              from #1, #2, #3, #5, #6, #7, and #8. The only spots still waiting
              for a championship are{" "}
              {openChampionshipPositions
                .map(position => `#${position}`)
                .join(", ")}
              .
            </p>
            <p className="mt-3 font-medium">Good luck in 2026.</p>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
