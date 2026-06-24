import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Brain, CheckCircle2, ChevronRight, Loader2 } from "lucide-react";
import { aiApi } from "@/api/aiApi";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type GeneratedTask = {
  _id?: string;
  title: string;
  status?: "suggested" | "created" | "dismissed";
};

type WeeklyReview = {
  id?: string;
  review?: {
    headline?: string;
    nextWeekFocus?: string;
    coachingTone?: string;
  };
  adaptivePlan?: {
    difficulty?: "easy" | "medium" | "hard";
    generatedTasks?: GeneratedTask[];
  };
  metrics?: Array<{
    label: string;
    value: string;
    interpretation?: string;
  }>;
};

const difficultyTone: Record<string, string> = {
  easy: "bg-primary/10 text-primary border-primary/20",
  medium: "bg-golden/15 text-golden border-golden/30",
  hard: "bg-accent/10 text-accent border-accent/20",
};

export function WeeklyReviewMiniCard() {
  const [review, setReview] = useState<WeeklyReview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const data = (await aiApi.getWeeklyReview()) as WeeklyReview;
        if (!cancelled) setReview(data);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Unable to load weekly review");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const difficulty = review?.adaptivePlan?.difficulty || "medium";
  const tasks = (review?.adaptivePlan?.generatedTasks || []).filter((task) => task.status !== "created").slice(0, 2);

  if (loading) {
    return (
      <Card className="border-border/70 bg-card/50">
        <CardContent className="flex items-center gap-3 p-4">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <div>
            <p className="text-sm font-medium">AI Weekly Review</p>
            <p className="text-xs text-muted-foreground">Reading your latest patterns</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !review) {
    return null;
  }

  return (
    <Card className="border-border/70 bg-card/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-lg font-display">
            <Brain className="h-5 w-5 text-primary" />
            AI Weekly Review
          </CardTitle>
          <Badge className={`border capitalize ${difficultyTone[difficulty] || difficultyTone.medium}`}>
            {difficulty}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-sm font-semibold text-foreground">{review.review?.headline || "This week has a focus plan"}</p>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            {review.review?.nextWeekFocus || "Choose one visible action and close the loop."}
          </p>
        </div>

        {review.metrics?.length > 0 && (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {review.metrics.slice(0, 3).map((metric) => (
              <div key={metric.label} className="rounded-lg border border-border/60 bg-background/50 p-3">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{metric.label}</p>
                <p className="mt-1 text-sm font-semibold">{metric.value}</p>
              </div>
            ))}
          </div>
        )}

        {tasks.length > 0 && (
          <div className="space-y-2">
            {tasks.map((task) => (
              <div key={task._id || task.title} className="flex items-start gap-2 rounded-lg bg-muted/30 p-3">
                <CheckCircle2 className="mt-0.5 h-4 w-4 text-primary" />
                <p className="text-sm text-foreground">{task.title}</p>
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-end">
          <Button asChild variant="outline" size="sm" className="gap-2">
            <Link to="/ai-companion">
              Open companion
              <ChevronRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default WeeklyReviewMiniCard;
