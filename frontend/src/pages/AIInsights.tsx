import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { aiApi } from "@/api/aiApi";
import { Brain, ChevronRight, Lightbulb, Loader2, Sparkles, Star, TrendingUp, Zap } from "lucide-react";

interface AIInsight {
  id?: string;
  summary: string;
  keyInsights?: string[];
  suggestedActions?: string[];
}

interface WeeklyReview {
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
    priorityOrder?: Array<{ title: string; reason?: string; recommendedAction?: string }>;
    generatedTasks?: Array<{
      title: string;
      detail?: string;
      effort?: "low" | "medium" | "high";
      priority?: "low" | "medium" | "high";
      status?: "suggested" | "created" | "dismissed";
    }>;
  };
  metrics?: Array<{ label: string; value: string; interpretation?: string }>;
  summary?: string;
}

const AIInsights = () => {
  const [activeTab, setActiveTab] = useState("insight");
  const [dreamInput, setDreamInput] = useState("");
  const [dreamResult, setDreamResult] = useState<any>(null);
  const [dreamLoading, setDreamLoading] = useState(false);
  const [coachResult, setCoachResult] = useState<any>(null);
  const [coachLoading, setCoachLoading] = useState(false);
  const { toast } = useToast();

  const { data: insight, isLoading: insightLoading, refetch: refetchInsight } = useQuery<AIInsight>({
    queryKey: ["aiInsight"],
    queryFn: aiApi.getInsight,
    staleTime: 5 * 60 * 1000,
  });

  const { data: weeklyReview, isLoading: weeklyLoading, refetch: refetchWeekly } = useQuery<WeeklyReview>({
    queryKey: ["weeklyReview"],
    queryFn: aiApi.getWeeklyReview,
    staleTime: 30 * 60 * 1000,
  });

  const { data: context, isLoading: contextLoading } = useQuery({
    queryKey: ["lifeContext"],
    queryFn: () => aiApi.getContextDebug(),
  });

  const handleTransformDream = async () => {
    if (!dreamInput.trim()) return;
    setDreamLoading(true);
    setDreamResult(null);
    try {
      const result = await aiApi.transformDream({ dream: dreamInput });
      setDreamResult(result);
      toast({ title: "Dream transformed!", description: "Your execution plan is ready" });
    } catch {
      toast({ title: "Error", description: "Failed to transform dream", variant: "destructive" });
    } finally {
      setDreamLoading(false);
    }
  };

  const handleApplyWeekly = async () => {
    try {
      await aiApi.applyWeeklyReview({ reviewId: weeklyReview?.id });
      toast({ title: "Weekly review applied!", description: "Tasks and notifications created" });
      void refetchInsight();
    } catch {
      toast({ title: "Error", description: "Failed to apply review", variant: "destructive" });
    }
  };

  const handleProactiveCheck = async () => {
    setCoachLoading(true);
    try {
      const result = await aiApi.proactiveCheck({ persistNotification: true });
      setCoachResult(result);
      toast({
        title: result.shouldIntervene ? "Coach Alert" : "All Clear",
        description: result.message,
      });
    } catch {
      toast({ title: "Error", description: "Coach check failed", variant: "destructive" });
    } finally {
      setCoachLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-6">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
        <div className="flex items-center gap-3 mb-2">
          <Brain className="h-8 w-8 text-primary gradient-bg" />
          <h1 className="font-display text-3xl font-bold tracking-tight">AI Life Coach</h1>
        </div>
        <p className="text-muted-foreground font-handwritten text-xl max-w-md leading-relaxed">
          Your intelligent companion analyzes your life data to deliver personalized insights and actionable guidance
        </p>
      </motion.div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="insight" className="data-[state=active]:gradient-primary">
            <Lightbulb className="mr-1 h-4 w-4" /> Daily Insight
          </TabsTrigger>
          <TabsTrigger value="weekly" className="data-[state=active]:gradient-primary">
            <TrendingUp className="mr-1 h-4 w-4" /> Weekly Review
          </TabsTrigger>
          <TabsTrigger value="proactive" className="data-[state=active]:gradient-primary">
            <Zap className="mr-1 h-4 w-4" /> Proactive Coach
          </TabsTrigger>
          <TabsTrigger value="dream" className="data-[state=active]:gradient-primary">
            <Sparkles className="mr-1 h-4 w-4" /> Dream Transformer
          </TabsTrigger>
        </TabsList>

        <TabsContent value="insight" className="space-y-6 mt-6">
          <Card className="gradient-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-6 w-6 opacity-75" />
                Today's AI Insight
              </CardTitle>
              <p className="text-sm text-muted-foreground">Personalized analysis of your recent activity patterns</p>
            </CardHeader>
            <CardContent className="space-y-6">
              {insightLoading ? (
                <div className="flex items-center justify-center gap-3 p-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <div>
                    <div className="font-medium">AI analyzing your life data...</div>
                    <div className="text-sm text-muted-foreground">This takes about 10 seconds</div>
                  </div>
                </div>
              ) : insight ? (
                <div className="space-y-6">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="font-handwritten text-xl leading-relaxed bg-gradient-to-r from-primary/20 to-secondary/20 p-6 rounded-2xl"
                  >
                    {insight.summary}
                  </motion.div>

                  {insight.keyInsights && insight.keyInsights.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-6 flex items-center gap-3 text-xl border-b pb-3">
                        <Lightbulb className="h-6 w-6 text-yellow-500" />
                        Key Insights
                      </h4>
                      <div className="grid gap-4">
                        {insight.keyInsights.slice(0, 5).map((item, i) => (
                          <div key={i} className="flex items-start gap-4 p-4 bg-muted/50 hover:bg-muted rounded-xl border transition-all group">
                            <div className="flex flex-col items-center gap-1 flex-shrink-0 w-10 pt-1">
                              <div className="w-3 h-3 bg-gradient-to-r from-primary to-secondary rounded-full" />
                              <div className="h-20 w-0.5 bg-muted group-hover:bg-primary/50 transition-colors mx-auto" />
                            </div>
                            <div>
                              <Badge variant="secondary" className="mb-2 font-mono text-xs">Insight #{i + 1}</Badge>
                              <p className="leading-relaxed">{item}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {insight.suggestedActions && insight.suggestedActions.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-6 flex items-center gap-3 text-xl border-b pb-3">
                        <Zap className="h-6 w-6 text-emerald-500" />
                        Recommended Actions
                      </h4>
                      <div className="space-y-3">
                        {insight.suggestedActions.slice(0, 5).map((action, i) => (
                          <Button
                            key={i}
                            variant="ghost"
                            className="justify-start h-14 px-4 w-full text-left hover:bg-gradient-to-r hover:from-primary/10 hover:to-secondary/10 border hover:border-primary/30 transition-all group"
                          >
                            <div className="w-8 h-8 bg-gradient-to-br from-emerald-500/20 to-blue-500/20 rounded-lg flex items-center justify-center mr-4 group-hover:scale-110 transition-transform flex-shrink-0">
                              <Star className="h-4 w-4 opacity-75" />
                            </div>
                            <div className="flex-1 text-left">
                              <div className="font-medium">{action}</div>
                              <div className="text-xs text-muted-foreground">AI recommended priority action</div>
                            </div>
                            <ChevronRight className="h-5 w-5 ml-2 opacity-50 group-hover:translate-x-1 transition-all" />
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center p-16 text-center space-y-6">
                  <Brain className="h-20 w-20 text-muted-foreground mx-auto" />
                  <div>
                    <h3 className="text-3xl font-bold mb-3 bg-gradient-to-r from-primary via-secondary to-primary bg-clip-text text-transparent">
                      AI Life Coach Activated
                    </h3>
                    <p className="text-muted-foreground text-lg max-w-md mx-auto leading-relaxed">
                      Your intelligent coach is ready to unlock insights from your journals, goals, habits, and life patterns.
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
                    <Button variant="outline" size="lg" onClick={() => refetchInsight()} className="w-full">
                      <Sparkles className="mr-2 h-4 w-4" />
                      Generate My Insight
                    </Button>
                    <Button asChild size="lg" className="w-full gradient-primary">
                      <Link to="/journal">Log First Entry</Link>
                    </Button>
                  </div>
                </div>
              )}

              {!insightLoading && (
                <Button onClick={() => refetchInsight()} variant="outline" size="lg" className="w-full">
                  <Sparkles className="mr-2 h-4 w-4" />
                  Refresh AI Analysis
                </Button>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="weekly" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Weekly Life Review</CardTitle>
                  <p className="text-sm text-muted-foreground">AI-powered weekly reflection and adaptive plan</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => refetchWeekly()}>
                  <Zap className="mr-2 h-3.5 w-3.5" /> Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {weeklyLoading ? (
                <div className="flex items-center justify-center p-12">
                  <Loader2 className="h-8 w-8 animate-spin mr-3" />
                  Preparing your weekly review...
                </div>
              ) : weeklyReview ? (
                <div className="space-y-6">
                  {(weeklyReview.review?.headline || weeklyReview.summary) && (
                    <div className="font-handwritten text-xl p-6 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-2xl leading-relaxed">
                      {weeklyReview.review?.headline || weeklyReview.summary}
                    </div>
                  )}

                  {weeklyReview.review?.transformationSummary && (
                    <p className="text-muted-foreground leading-relaxed">{weeklyReview.review.transformationSummary}</p>
                  )}

                  {weeklyReview.metrics && weeklyReview.metrics.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {weeklyReview.metrics.map((metric, i) => (
                        <div key={i} className="rounded-xl border border-border/40 p-3 text-center bg-card">
                          <div className="font-bold text-2xl text-primary">{metric.value}</div>
                          <div className="text-xs text-muted-foreground mt-1">{metric.label}</div>
                          {metric.interpretation && <div className="text-xs text-muted-foreground mt-0.5 italic">{metric.interpretation}</div>}
                        </div>
                      ))}
                    </div>
                  )}

                  {weeklyReview.review?.whatImproved && weeklyReview.review.whatImproved.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-sm uppercase tracking-wide text-emerald-600 mb-3 flex items-center gap-2">
                        <TrendingUp className="h-4 w-4" /> What Improved
                      </h4>
                      <div className="space-y-2">
                        {weeklyReview.review.whatImproved.map((item, i) => (
                          <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
                            <span className="text-emerald-500 mt-0.5">✓</span>
                            <p className="text-sm">{item}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {weeklyReview.review?.whatFailed && weeklyReview.review.whatFailed.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-sm uppercase tracking-wide text-amber-600 mb-3 flex items-center gap-2">
                        <Zap className="h-4 w-4" /> Areas to Improve
                      </h4>
                      <div className="space-y-2">
                        {weeklyReview.review.whatFailed.map((item, i) => (
                          <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
                            <span className="text-amber-500 mt-0.5">→</span>
                            <p className="text-sm">{item}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {weeklyReview.adaptivePlan?.generatedTasks &&
                    weeklyReview.adaptivePlan.generatedTasks.filter((task) => task.status !== "created").length > 0 && (
                      <div>
                        <h4 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-3 flex items-center gap-2">
                          <Sparkles className="h-4 w-4" /> AI Suggested Tasks for Next Week
                        </h4>
                        <div className="space-y-2">
                          {weeklyReview.adaptivePlan.generatedTasks
                            .filter((task) => task.status !== "created")
                            .map((task, i) => (
                              <div key={i} className="flex items-start justify-between gap-3 p-3 rounded-lg border border-border/40 bg-card">
                                <div>
                                  <p className="text-sm font-medium">{task.title}</p>
                                  {task.detail && <p className="text-xs text-muted-foreground mt-0.5">{task.detail}</p>}
                                </div>
                                <div className="flex gap-2 shrink-0">
                                  {task.priority && <Badge variant="outline" className="text-xs">{task.priority}</Badge>}
                                  {task.effort && <Badge variant="secondary" className="text-xs">{task.effort} effort</Badge>}
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}

                  {weeklyReview.review?.nextWeekFocus && (
                    <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
                      <p className="text-sm font-semibold text-primary mb-1">Next Week Focus</p>
                      <p className="text-sm">{weeklyReview.review.nextWeekFocus}</p>
                    </div>
                  )}

                  <Button onClick={handleApplyWeekly} className="w-full gradient-primary">
                    Apply Review - Create Tasks
                  </Button>
                </div>
              ) : (
                <div className="text-center p-12 text-muted-foreground">
                  <Brain className="h-12 w-12 mx-auto mb-4 opacity-30" />
                  <p>Your weekly review will appear here automatically</p>
                  <Button variant="outline" className="mt-4" onClick={() => refetchWeekly()}>
                    Generate Review
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="proactive">
          <Card>
            <CardHeader>
              <CardTitle>Proactive Coaching</CardTitle>
              <p className="text-sm text-muted-foreground">AI monitors your patterns and intervenes when needed</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button className="w-full h-14 gradient-primary" onClick={handleProactiveCheck} disabled={coachLoading}>
                {coachLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Zap className="mr-2 h-4 w-4" />}
                Run Proactive Check Now
              </Button>

              {coachLoading && <div className="flex justify-center py-6"><Loader2 className="animate-spin h-6 w-6" /></div>}

              {coachResult && (
                <div className={`rounded-xl p-5 border ${coachResult.shouldIntervene ? "bg-amber-500/10 border-amber-500/30" : "bg-emerald-500/10 border-emerald-500/30"}`}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="text-2xl">{coachResult.shouldIntervene ? "!" : "OK"}</div>
                    <div>
                      <p className="font-semibold">{coachResult.shouldIntervene ? "Intervention Needed" : "You're on Track"}</p>
                      <p className="text-sm text-muted-foreground">{coachResult.message}</p>
                    </div>
                  </div>
                  {coachResult.proactiveSignals?.length > 0 && (
                    <div className="space-y-2 mt-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Signals Detected</p>
                      {coachResult.proactiveSignals.map((signal: any, i: number) => (
                        <div key={i} className="text-sm p-2 rounded-lg bg-background/50 border border-border/30">
                          <span className="font-medium">{signal.title || signal.code}</span>
                          {signal.suggestedAction && <p className="text-xs text-muted-foreground mt-0.5">{signal.suggestedAction}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {contextLoading ? (
                <Loader2 className="animate-spin mx-auto h-8 w-8 block" />
              ) : (
                <div className="text-xs p-4 bg-muted rounded-lg max-h-96 overflow-auto">
                  <strong>AI Context Preview:</strong>
                  <pre className="mt-2">{JSON.stringify(context, null, 2)?.slice(0, 800)}...</pre>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="dream" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Dream Transformer</CardTitle>
              <p className="text-sm text-muted-foreground">Turn your dreams into executable plans</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="Describe your dream or vision... (e.g., 'Travel to Japan next year', 'Build my dream home', 'Start a YouTube channel')"
                value={dreamInput}
                onChange={(event) => setDreamInput(event.target.value)}
                className="min-h-[120px] resize-none font-handwritten"
              />
              <div className="flex gap-3">
                <Button onClick={handleTransformDream} className="flex-1 gradient-primary h-12" disabled={!dreamInput.trim() || dreamLoading}>
                  {dreamLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Transform Dream
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setDreamInput("");
                    setDreamResult(null);
                  }}
                  className="h-12 px-6"
                  disabled={!dreamInput.trim() && !dreamResult}
                >
                  Clear
                </Button>
              </div>

              {dreamLoading && (
                <div className="flex items-center justify-center gap-3 p-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  <span className="text-muted-foreground">AI is crafting your plan...</span>
                </div>
              )}

              {dreamResult && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4 mt-4 border rounded-2xl p-6 bg-gradient-to-br from-primary/5 to-secondary/5"
                >
                  <h3 className="font-display text-xl font-bold flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    {dreamResult.goalTitle || dreamInput}
                  </h3>

                  {dreamResult.interpretation?.summary && (
                    <p className="text-muted-foreground leading-relaxed font-handwritten text-lg">
                      {dreamResult.interpretation.summary}
                    </p>
                  )}

                  {dreamResult.phases?.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Execution Phases</h4>
                      {dreamResult.phases.map((phase: any, i: number) => (
                        <div key={i} className="rounded-xl border border-border/40 bg-card p-4 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold">{phase.title}</span>
                            {phase.timeline && <Badge variant="secondary">{phase.timeline}</Badge>}
                          </div>
                          {phase.purpose && <p className="text-sm text-muted-foreground">{phase.purpose}</p>}
                          {phase.milestones?.length > 0 && (
                            <ul className="text-sm space-y-1 mt-2">
                              {phase.milestones.map((milestone: string, j: number) => (
                                <li key={j} className="flex items-start gap-2">
                                  <span className="text-primary mt-0.5">▸</span> {milestone}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {dreamResult.personalReminder && (
                    <p className="text-sm italic text-muted-foreground border-l-2 border-primary/40 pl-4">
                      {dreamResult.personalReminder}
                    </p>
                  )}

                  <Button
                    className="w-full gradient-primary"
                    onClick={async () => {
                      try {
                        await aiApi.applyDreamPlan({ dream: dreamInput, plan: dreamResult });
                        toast({ title: "Goal created!", description: "Your dream has been added to Goals" });
                        setDreamResult(null);
                        setDreamInput("");
                      } catch {
                        toast({ title: "Error", description: "Failed to create goal", variant: "destructive" });
                      }
                    }}
                  >
                    Turn This Into a Goal
                  </Button>
                </motion.div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AIInsights;
