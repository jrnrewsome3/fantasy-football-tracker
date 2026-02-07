import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Sparkles, Send } from "lucide-react";
import { toast } from "sonner";
import { Streamdown } from "streamdown";

interface AIQueryBoxProps {
  leagueId: number;
}

export default function AIQueryBox({ leagueId }: AIQueryBoxProps) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);

  const queryMutation = trpc.league.aiQuery.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        setAnswer(data.answer);
      } else {
        toast.error("Query failed", {
          description: data.answer,
        });
      }
    },
    onError: (error) => {
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
    "Who had the best record in 2023?",
    "Who scored the most points this season?",
    "What was the highest scoring game?",
    "Who has the most wins all-time?",
  ];

  return (
    <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <CardTitle>AI-Generated Stat Analysis</CardTitle>
        </div>
        <CardDescription>
          Ask natural language questions about your league data and get AI-powered insights based on historical stats, matchups, and team performance
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder="e.g., Who had the best record in 2023?"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={queryMutation.isPending}
            className="flex-1"
          />
          <Button
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
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Try asking:</p>
            <div className="flex flex-wrap gap-2">
              {exampleQuestions.map((q) => (
                <Button
                  key={q}
                  variant="outline"
                  size="sm"
                  onClick={() => setQuestion(q)}
                  className="text-xs"
                >
                  {q}
                </Button>
              ))}
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
