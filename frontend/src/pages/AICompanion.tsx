import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  AlertTriangle,
  Bell,
  Brain,
  CheckCircle2,
  GitBranch,
  Loader2,
  RefreshCw,
  Sparkles,
  Target,
  Wand2,
  Zap,
} from "lucide-react";
import { aiApi } from "@/api/aiApi";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type GeneratedTask = {
  _id?: string;
  title: string;
  detail?: string;
  effort?: "low" | "medium" | "high";
  frequency?: "daily" | "weekly" | "once";
  priority?: "low" | "medium" | "high";
  reason?: string;
  status?: "suggested" | "created" | "dismissed";
};

type WeeklyReview = {
  id?: string;
  weekStart?: string;
  source?: string;
  review?: {
    headline?: string;
    transformationSummary?: string;
    whatImproved?: string[];
    whatFailed?: string[];
    whyItHappened?: string[];
    patternExplanation?: string;
    nextWeekFocus?: string;
    coachingTone?: string;
  };
  adaptivePlan?: {
    difficulty?: "easy" | "medium" | "hard";
    strategy?: string;
    priorityOrder?: Array<{
      goalId?: string;
      title: string;
      reason?: string;
      recommendedAction?: string;
    }>;
    generatedTasks?: GeneratedTask[];
    goalAdjustments?: Array<{
      goalTitle?: string;
      adjustment?: string;
      reason?: string;
      difficultyChange?: "reduce" | "maintain" | "increase";
    }>;
  };
  metrics?: Array<{
    label: string;
    value: string;
    interpretation?: string;
  }>;
  proactiveSignals?: Array<{
    code?: string;
    severity?: "low" | "medium" | "high";
    title?: string;
    reason?: string;
    suggestedAction?: string;
  }>;
  personalizationEvidence?: string[];
  failureAdjustments?: string[];
  progressionTriggers?: string[];
};

const fadeIn = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] as const } },
};

const difficultyClass: Record<string, string> = {
  easy: "bg-primary/10 text-primary border-primary/20",
  medium: "bg-golden/15 text-golden border-golden/30",
  hard: "bg-accent/10 text-accent border-accent/20",
};

const severityClass: Record<string, string> = {
  low: "bg-primary/10 text-primary border-primary/20",
  medium: "bg-golden/15 text-golden border-golden/30",
  high: "bg-destructive/10 text-destructive border-destructive/30",
};

const SectionList = ({
  title,
  icon: Icon,
  items,
}: {
  title: string;
  icon: typeof CheckCircle2;
  items?: string[];
}) => {
  if (!items?.length) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
      </div>
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item} className="rounded-lg border border-border/60 bg-background/50 p-3 text-sm leading-relaxed">
            {item}
          </div>
        ))}
      </div>
    </div>
  );
};

export default function AICompanion() {
  const [review, setReview] = useState<WeeklyReview | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [applying, setApplying] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadReview = async (refresh = false) => {
    setError("");
    if (refresh) setRefreshing(true);
    else setLoading(true);

    try {
      const data = refresh
        ? ((await aiApi.generateWeeklyReview({ force: true })) as WeeklyReview)
        : ((await aiApi.getWeeklyReview()) as WeeklyReview);
      setReview(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load AI review");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void loadReview(false);
  }, []);

  const suggestedTasks = useMemo(
    () => (review?.adaptivePlan?.generatedTasks || []).filter((task) => task.status !== "created"),
    [review]
  );

  const createdTasks = useMemo(
    () => (review?.adaptivePlan?.generatedTasks || []).filter((task) => task.status === "created"),
    [review]
  );

  const handleApply = async () => {
    if (!review?.id) return;
    setApplying(true);
    setMessage("");
    setError("");

    try {
      const result = (await aiApi.applyWeeklyReview({ reviewId: review.id, maxTasks: 5 })) as {
        review: WeeklyReview;
        createdTasks: unknown[];
      };
      setReview(result.review);
      setMessage(`${result.createdTasks?.length || 0} task${result.createdTasks?.length === 1 ? "" : "s"} created from this review.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to apply review");
    } finally {
      setApplying(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto flex min-h-[420px] max-w-5xl items-center justify-center">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <span>Building weekly review</span>
        </div>
      </div>
    );
  }

  const difficulty = review?.adaptivePlan?.difficulty || "medium";

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <motion.div variants={fadeIn} initial="hidden" animate="visible" className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">AI Companion</h1>
          <p className="mt-1 text-muted-foreground">Adaptive weekly review</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge className={`border capitalize ${difficultyClass[difficulty] || difficultyClass.medium}`}>
            {difficulty}
          </Badge>
          {review?.source && <Badge variant="secondary">Source: {review.source}</Badge>}
          <Button variant="outline" className="gap-2" onClick={() => void loadReview(true)} disabled={refreshing}>
            {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Refresh
          </Button>
          <Button className="gap-2 gradient-primary text-primary-foreground" onClick={handleApply} disabled={applying || suggestedTasks.length === 0}>
            {applying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
            Apply tasks
          </Button>
        </div>
      </motion.div>

      {(error || message) && (
        <div className={`rounded-lg border p-3 text-sm ${error ? "border-destructive/30 bg-destructive/5 text-destructive" : "border-primary/20 bg-primary/5 text-primary"}`}>
          {error || message}
        </div>
      )}

      <motion.div variants={fadeIn} initial="hidden" animate="visible">
        <Card className="border-border/70 bg-card/60">
          <CardContent className="grid gap-6 p-5 lg:grid-cols-[1.4fr_0.8fr]">
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <Brain className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="font-display text-2xl font-bold">{review?.review?.headline || "Weekly execution review"}</h2>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {review?.review?.transformationSummary || "Your LifeOS context is being turned into a weekly execution plan."}
                  </p>
                </div>
              </div>
              <div className="rounded-xl border border-border/60 bg-background/50 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Target className="h-4 w-4 text-primary" />
                  Next focus
                </div>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {review?.review?.nextWeekFocus || "Choose one visible action and close the loop."}
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              {(review?.metrics || []).slice(0, 3).map((metric) => (
                <div key={metric.label} className="rounded-xl border border-border/60 bg-background/50 p-4">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{metric.label}</p>
                  <p className="mt-1 text-lg font-semibold">{metric.value}</p>
                  {metric.interpretation && <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{metric.interpretation}</p>}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
        <motion.div variants={fadeIn} initial="hidden" animate="visible" className="space-y-6">
          <Card className="border-border/70 bg-card/60">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-display text-lg">
                <Activity className="h-5 w-5 text-primary" />
                Pattern Read
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <p className="rounded-xl border border-border/60 bg-background/50 p-4 text-sm leading-relaxed">
                {review?.review?.patternExplanation || "No dominant pattern has been detected yet."}
              </p>
              <SectionList title="Improved" icon={CheckCircle2} items={review?.review?.whatImproved} />
              <SectionList title="Needs attention" icon={AlertTriangle} items={review?.review?.whatFailed} />
              <SectionList title="Likely cause" icon={GitBranch} items={review?.review?.whyItHappened} />
            </CardContent>
          </Card>

          <Card className="border-border/70 bg-card/60">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-display text-lg">
                <Zap className="h-5 w-5 text-golden" />
                Adaptive Strategy
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="rounded-xl border border-border/60 bg-background/50 p-4 text-sm leading-relaxed">
                {review?.adaptivePlan?.strategy || "Keep the plan focused on one visible deliverable."}
              </p>

              {review?.adaptivePlan?.goalAdjustments?.length > 0 && (
                <div className="space-y-3">
                  {review.adaptivePlan.goalAdjustments.map((adjustment) => (
                    <div key={`${adjustment.goalTitle}-${adjustment.adjustment}`} className="rounded-xl border border-border/60 bg-background/50 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold">{adjustment.goalTitle || "Goal adjustment"}</p>
                        <Badge variant="outline" className="capitalize">
                          {adjustment.difficultyChange || "maintain"}
                        </Badge>
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">{adjustment.adjustment}</p>
                      {adjustment.reason && <p className="mt-1 text-xs text-muted-foreground">{adjustment.reason}</p>}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={fadeIn} initial="hidden" animate="visible" className="space-y-6">
          <Card className="border-border/70 bg-card/60">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-display text-lg">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                Suggested Tasks
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[...suggestedTasks, ...createdTasks].map((task) => (
                <div key={task._id || task.title} className="rounded-xl border border-border/60 bg-background/50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-semibold leading-relaxed">{task.title}</p>
                    <Badge variant={task.status === "created" ? "default" : "secondary"} className="capitalize">
                      {task.status || "suggested"}
                    </Badge>
                  </div>
                  {task.detail && <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{task.detail}</p>}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {task.effort && <Badge variant="outline" className="capitalize">{task.effort}</Badge>}
                    {task.frequency && <Badge variant="outline" className="capitalize">{task.frequency}</Badge>}
                    {task.priority && <Badge variant="outline" className="capitalize">{task.priority}</Badge>}
                  </div>
                  {task.reason && <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{task.reason}</p>}
                </div>
              ))}
              {suggestedTasks.length === 0 && createdTasks.length === 0 && (
                <p className="rounded-xl border border-border/60 bg-background/50 p-4 text-sm text-muted-foreground">
                  No suggested tasks are pending.
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/70 bg-card/60">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-display text-lg">
                <Target className="h-5 w-5 text-primary" />
                Priority Order
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(review?.adaptivePlan?.priorityOrder || []).map((goal, index) => (
                <div key={`${goal.title}-${index}`} className="rounded-xl border border-border/60 bg-background/50 p-4">
                  <div className="flex items-start gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                      {index + 1}
                    </span>
                    <div>
                      <p className="text-sm font-semibold">{goal.title}</p>
                      {goal.reason && <p className="mt-1 text-xs text-muted-foreground">{goal.reason}</p>}
                      {goal.recommendedAction && <p className="mt-2 text-sm text-muted-foreground">{goal.recommendedAction}</p>}
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {review?.proactiveSignals?.length > 0 && (
            <Card className="border-border/70 bg-card/60">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-display text-lg">
                  <Bell className="h-5 w-5 text-accent" />
                  Proactive Signals
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {review.proactiveSignals.slice(0, 4).map((signal) => (
                  <div key={signal.code || signal.title} className="rounded-xl border border-border/60 bg-background/50 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold">{signal.title || signal.code}</p>
                      <Badge className={`border capitalize ${severityClass[signal.severity || "low"]}`}>
                        {signal.severity || "low"}
                      </Badge>
                    </div>
                    {signal.reason && <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{signal.reason}</p>}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </motion.div>
      </div>

      <motion.div variants={fadeIn} initial="hidden" animate="visible" className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border/70 bg-card/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-display text-lg">
              <Sparkles className="h-5 w-5 text-primary" />
              Evidence Used
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(review?.personalizationEvidence || []).slice(0, 8).map((item) => (
              <div key={item} className="rounded-lg bg-muted/30 p-3 text-sm leading-relaxed">
                {item}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-display text-lg">
              <GitBranch className="h-5 w-5 text-primary" />
              Adaptation Rules
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <SectionList title="If execution drops" icon={AlertTriangle} items={review?.failureAdjustments} />
            <SectionList title="When to progress" icon={CheckCircle2} items={review?.progressionTriggers} />
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
