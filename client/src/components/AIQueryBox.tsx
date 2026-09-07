import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2, Sparkles, Send } from "lucide-react";
import { toast } from "sonner";
import { Streamdown } from "streamdown";

interface AIQueryBoxProps {
  leagueId: number;
  initialQuestion?: string;
}

export default function AIQueryBox({
  leagueId,
  initialQuestion = "",
}: AIQueryBoxProps) {
  const [question, setQuestion] = useState(initialQuestion);
  const [answer, setAnswer] = useState<string | null>(null);

  const queryMutation = trpc.league.aiQuery.useMutation({
    onSuccess: data => {
      if (data.success) {
        setAnswer(data.answer);
      } else {
        toast.error("Query failed", {
          description: data.answer,
        });
      }
    },
    onError: error => {
      toast.error("Query failed", {
        description: error.message,
      });
    },
  });

  const handleAsk = () => {
    if (!question.trim()) {
      toast.error("Please enter a question");
      return;
    }

    setAnswer(null);
    queryMutation.mutate({
      leagueId,
      question: question.trim(),
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleAsk();
    }
  };

  const exampleQuestions = [
    "Who should I start this week?",
    "Analyze my team's strengths and weaknesses",
    "What strategy should I use for next game?",
    "Who had the best record in 2023?",
    "Who scored the most points this season?",
    "What was the highest scoring game?",
  ];

  return (
    <Card className="bg-gradient-to-br from-primary/10 via-primary/5 to-background border-2 border-primary/30 shadow-lg">
      <CardHeader className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/20">
            <Sparkles className="h-6 w-6 text-primary animate-pulse" />
          </div>
          <div>
            <CardTitle className="text-xl">AI Strategy Assistant</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Analysis from synced ESPN lineups and league history
            </p>
          </div>
        </div>
        <CardDescription className="text-base">
          <span className="font-semibold text-primary">
            Plan your next move!
          </span>{" "}
          Compare starters, explore bench options, check projected matchups, or
          ask about league history. Player projections are estimates; confirm
          final lineup decisions in ESPN.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            aria-label="Ask about your lineup or league"
            placeholder="How does my lineup compare this week?"
            value={question}
            onChange={e => setQuestion(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={queryMutation.isPending}
            className="flex-1"
          />
          <Button
            aria-label="Ask AI"
            onClick={handleAsk}
            disabled={queryMutation.isPending || !question.trim()}
            size="icon"
          >
            {queryMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>

        {!answer && !queryMutation.isPending && (
          <div className="space-y-3">
            <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
              <p className="text-sm font-semibold text-primary mb-2">
                💡 Strategic Planning Questions:
              </p>
              <div className="flex flex-wrap gap-2">
                {exampleQuestions.slice(0, 3).map(q => (
                  <Button
                    key={q}
                    variant="outline"
                    size="sm"
                    onClick={() => setQuestion(q)}
                    className="h-auto whitespace-normal text-left text-xs hover:bg-primary/10 hover:border-primary"
                  >
                    {q}
                  </Button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-2">
                📊 Stats & History:
              </p>
              <div className="flex flex-wrap gap-2">
                {exampleQuestions.slice(3).map(q => (
                  <Button
                    key={q}
                    variant="outline"
                    size="sm"
                    onClick={() => setQuestion(q)}
                    className="h-auto whitespace-normal text-left text-xs"
                  >
                    {q}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        )}

        {queryMutation.isPending && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Analyzing league data...</span>
          </div>
        )}

        {answer && (
          <div className="p-4 bg-background rounded-lg border">
            <Streamdown>{answer}</Streamdown>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
