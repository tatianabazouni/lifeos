import React, { useState, useEffect, useCallback, useRef } from "react";
import { AnimatePresence, motion, useInView } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { GoalProgressRing } from "@/components/GoalProgressRing";
import { FloatingParticles } from "@/components/FloatingParticles";
import { AnimatedCounter } from "@/components/AnimatedCounter";
import { SkeletonCard } from "@/components/SkeletonCard";
import { dashboardApi } from "@/api/dashboardApi";
import { journalApi } from "@/api/journalApi";
import { gamificationApi } from "@/api/gamificationApi";
import { authStore } from "@/lib/auth";
import {
  Star,
  BookOpen,
  Target,
  Trophy,
  Flame,
  Sparkles,
  Brain,
  Zap,
  Plus,
  PenLine,
  TrendingUp,
  ChevronRight,
  Calendar,
  Camera,
  Upload,
  Lightbulb,
  ChevronDown,
  Check,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";


// Note: Dashboard keeps all existing functionality. This file only focuses on UI/UX polish.



interface AIInsight {
  summary?: string;
  keyInsights?: string[];
  suggestedActions?: string[];
  emotionalTone?: string;
  sentiment?: "positive" | "neutral" | "negative";
}

interface Memory { id: string; title: string; date: string; }
interface Goal { id: string; title: string; deadline: string; progress: number; xpReward: number; }
interface BadgeType { id: string; name: string; icon: string; earned: boolean; }
interface TimelineEvent { id: string; label: string; emoji: string; color: string; }


/* ─── Animations ─── */
const stagger = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};
const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const } },
};

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
};

const getMotivationalSubtitle = () => {
  const subtitles = [
    "Ready to write today's chapter?",
    "Every moment is a new beginning.",
    "Your story unfolds one day at a time.",
    "What will today's page hold?",
    "Dream it. Plan it. Live it.",
  ];
  return subtitles[new Date().getDate() % subtitles.length];
};

/* ─── Life Progress Sphere ─── */
const LifeProgressSphere = ({ xp, streakDays, level, progressPercent }: { xp: number; streakDays: number; level: number; progressPercent: number }) => {
  return (
    <motion.div variants={fadeIn}>
      <Card className="rounded-2xl border-border/30 overflow-hidden relative glass-card">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-calm/5" />
        <CardContent className="p-6 relative">
          <div className="flex items-center gap-6">
            <div className="relative">
              <motion.div
                className="absolute inset-0 rounded-full"
                animate={{ boxShadow: ["0 0 20px hsl(155 45% 43% / 0.2)", "0 0 40px hsl(155 45% 43% / 0.35)", "0 0 20px hsl(155 45% 43% / 0.2)"] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                style={{ width: 100, height: 100 }}
              />
              <GoalProgressRing progress={progressPercent} size={100} strokeWidth={5}>
                <div className="text-center">
                  <Trophy className="h-5 w-5 text-golden mx-auto" />
                  <p className="text-xs font-bold mt-0.5">Lv<AnimatedCounter value={level} className="font-bold" /></p>
                </div>
              </GoalProgressRing>
            </div>
            <div className="flex-1">
              <h3 className="font-display text-xl font-bold text-foreground">Level {level}</h3>
              <p className="text-sm text-muted-foreground mt-0.5">
                <AnimatedCounter value={xp} className="font-semibold text-primary" /> XP earned
              </p>
              <div className="flex items-center gap-2 mt-3 flex-wrap">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  className="flex items-center gap-1 bg-amber/15 rounded-full px-3 py-1"
                >
                  <Flame className="h-3.5 w-3.5 text-amber" />
                  <span className="text-xs font-semibold">{streakDays} day streak</span>
                </motion.div>
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  className="flex items-center gap-1 bg-primary/10 rounded-full px-3 py-1"
                >
                  <TrendingUp className="h-3.5 w-3.5 text-primary" />
                  <span className="text-xs font-semibold">{Math.round(progressPercent)}%</span>
                </motion.div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

/* ─── Mood Widget ─── */


/* ─── Today's Moment ─── */
const TodayMomentCard = ({ photo, onPhotoUpload }: { photo: string | null; onPhotoUpload: (photo: string) => void }) => {
  return (
    <motion.div variants={fadeIn}>
      <Card className="rounded-2xl border-border/30 glass-card overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="font-display text-lg flex items-center gap-2 text-foreground">
            <Camera className="h-5 w-5 text-accent" /> Today's Moment
          </CardTitle>
        </CardHeader>
        <CardContent>
          {photo ? (
            <div className="relative rounded-xl overflow-hidden aspect-video">
              <img src={photo} alt="Today" className="w-full h-full object-cover" />
            </div>
          ) : (
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="aspect-video rounded-xl border-2 border-dashed border-border/50 hover:border-primary/40 flex flex-col items-center justify-center cursor-pointer bg-muted/20 transition-colors"
              onClick={() => {
                const input = document.createElement("input");
                input.type = "file"; input.accept = "image/*";
                input.onchange = (e) => {
                  const file = (e.target as HTMLInputElement).files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = () => {
                    if (typeof reader.result === "string") onPhotoUpload(reader.result);
                  };
                  reader.readAsDataURL(file);
                };
                input.click();
              }}
            >
              <Upload className="h-8 w-8 text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground">Capture today's moment</p>
            </motion.div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

/* ─── Timeline Preview ─── */
const LifeTimelinePreview = ({ timelineEvents }: { timelineEvents: TimelineEvent[] }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  return (
    <motion.div
      ref={ref}
      variants={fadeIn}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
    >
      <Card className="rounded-2xl border-border/30 glass-card">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="font-display text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5 text-calm" /> Life Timeline
            </CardTitle>
            <Link to="/life-capsule" className="text-xs text-primary hover:underline flex items-center gap-1">
              View all <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {timelineEvents.length > 0 ? (
            <div className="overflow-x-auto pb-2">
              <div className="flex gap-4 min-w-max">
                {timelineEvents.map((event, i) => (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={isInView ? { opacity: 1, scale: 1 } : {}}
                    transition={{ delay: i * 0.15 }}
                    whileHover={{ y: -4, scale: 1.05 }}
                    className="flex flex-col items-center gap-2 px-6 py-4 rounded-xl bg-muted/20 hover:bg-muted/30 transition-colors cursor-pointer min-w-[120px]"
                  >
                    <span className="text-2xl">{event.emoji}</span>
                    <span className="text-xs text-muted-foreground text-center">{event.label}</span>
                  </motion.div>
                ))}
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  className="flex flex-col items-center justify-center gap-2 px-6 py-4 rounded-xl border-2 border-dashed border-border/40 cursor-pointer hover:border-primary/40 transition-colors min-w-[120px]"
                >
                  <Plus className="h-5 w-5 text-muted-foreground/40" />
                  <span className="text-xs text-muted-foreground">Add event</span>
                </motion.div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">Your timeline will grow as you add memories</p>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

/* ─── Empty State ─── */
const EmptyDashboardHero = () => (
  <motion.div
    initial={{ opacity: 0, y: 30 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] as const }}
    className="glass-card p-10 text-center relative overflow-hidden"
  >
    <FloatingParticles count={8} colors={["primary", "golden", "calm"]} />
    <div className="relative z-10 space-y-5">
      <motion.div animate={{ scale: [1, 1.05, 1] }} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}>
        <Sparkles className="h-16 w-16 mx-auto text-primary/40" strokeWidth={1} />
      </motion.div>
      <h2 className="font-display text-3xl font-bold text-foreground">Welcome to your life journey</h2>
      <p className="text-muted-foreground mt-2 max-w-md mx-auto leading-relaxed">
        Your dashboard will come alive as you journal, set goals, and capture memories.
      </p>
      <p className="font-handwritten text-xl text-muted-foreground/60 italic">
        "The beginning is always today." — Mary Shelley
      </p>
      <div className="flex flex-wrap justify-center gap-3 mt-4">
        <Link to="/journal"><Button variant="outline" className="rounded-xl gap-2 border-border/40 hover:shadow-depth"><BookOpen className="h-4 w-4" /> Journal</Button></Link>
        <Link to="/goals"><Button variant="outline" className="rounded-xl gap-2 border-border/40 hover:shadow-depth"><Target className="h-4 w-4" /> Goals</Button></Link>
        <Link to="/vision-board"><Button variant="outline" className="rounded-xl gap-2 border-border/40 hover:shadow-depth"><Star className="h-4 w-4" /> Dreams</Button></Link>
      </div>
    </div>
  </motion.div>
);

/* ─── Main Dashboard ─── */
const AIInsightCard = ({ insight, isLoading }: { insight: AIInsight | undefined; isLoading: boolean }) => {
  const [expanded, setExpanded] = React.useState(true);
  const [copiedIndex, setCopiedIndex] = React.useState<number | null>(null);

  const { toast } = useToast();

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };



  if (isLoading) {
    return (
      <Card className="rounded-2xl border-border/30 glass-card col-span-full">
        <div className="h-1 bg-gradient-to-r from-primary via-purple-500 to-calm animate-pulse" />
        <CardContent className="py-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center animate-pulse">
              <Brain className="h-5 w-5 text-primary" />
            </div>
            <div className="space-y-2 flex-1">
              <div className="h-4 w-48 bg-muted animate-pulse rounded" />
              <div className="h-3 w-32 bg-muted/70 animate-pulse rounded" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!insight || Object.keys(insight).length === 0) {
    return (
      <Card className="rounded-2xl border-border/30 glass-card col-span-full text-center py-12">
        <Brain className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-semibold mb-2">AI Coach</h3>
        <p className="text-sm text-muted-foreground mb-4">Personal insights appear here as you build your life story</p>
        <div className="flex gap-2 justify-center">
          <Button variant="outline" size="sm" asChild>
            <Link to="/journal">Start Journaling</Link>
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="rounded-2xl border-border/30 glass-card col-span-full overflow-hidden">
      <div className="h-1 bg-gradient-to-r from-primary via-purple-500 to-calm" />
      <div className="p-6 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary/10 to-purple-500/10 p-3 flex items-center justify-center shadow-glow-primary">
            <Brain className="h-6 w-6 text-primary drop-shadow-sm" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-display text-xl font-bold">AI Life Coach</h3>
              <Badge variant="secondary" className="text-xs">
                Today&apos;s Insight
              </Badge>
            </div>
            {insight.summary && (
              <p className="text-muted-foreground font-handwritten text-lg leading-relaxed mb-3">
                {insight.summary}
              </p>
            )}
          </div>
          <ChevronDown className={`h-5 w-5 transition-transform ${expanded ? "rotate-180" : ""}`} />
        </div>
      </div>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="border-t border-border/50 p-6 space-y-6">
              {insight.keyInsights && insight.keyInsights.length > 0 && (
                <div>
                  <h4 className="flex items-center gap-2 font-semibold mb-3 text-sm uppercase tracking-wide text-muted-foreground">
                    <Lightbulb className="h-4 w-4" />
                    Key Insights
                  </h4>
                  <div className="space-y-2">
                    {insight.keyInsights.slice(0, 3).map((insight, i) => (
                      <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-muted/20">
                        <span className="font-mono text-sm w-6 flex-shrink-0 text-primary font-bold">{i + 1}.</span>
                        <p className="text-sm">{insight}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {insight.suggestedActions && insight.suggestedActions.length > 0 && (
                <div>
                  <h4 className="flex items-center gap-2 font-semibold mb-3 text-sm uppercase tracking-wide text-green-600">
                    <Zap className="h-4 w-4" />
                    Next Actions
                  </h4>

                  <div className="grid gap-2">
                    {insight.suggestedActions.slice(0, 3).map((action, i) => (
                      <Button
                        key={i}
                        variant="ghost"
                        className="justify-start h-auto py-3 px-4 rounded-xl bg-green-500/5 hover:bg-green-500/10 text-left"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopy(action, i);
                        }}
                      >
                        <span className="flex-shrink-0 w-6">{i + 1}</span>
                        <span>{action}</span>
                        {copiedIndex === i ? <Check className="ml-auto h-4 w-4 text-green-500" /> : null}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
};

const Dashboard = () => {
  const [userName, setUserName] = useState("Explorer");
  const [userXp, setUserXp] = useState(0);
  const [streakDays, setStreakDays] = useState(0);
  const [level, setLevel] = useState(1);
  const [levelProgress, setLevelProgress] = useState(0);
  const [recentMemories, setRecentMemories] = useState<Memory[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [badges, setBadges] = useState<BadgeType[]>([]);
  const [quickEntry, setQuickEntry] = useState("");
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);


  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [summary, gamification] = await Promise.all([
          dashboardApi.getSummary() as Promise<any>,
          gamificationApi.getSnapshot() as Promise<any>,
        ]);

        const user = authStore.getUser();
        if (user?.name) setUserName(user.name);

        const summaryUser = summary?.user || {};
        setUserXp(Number(summaryUser?.xp ?? gamification?.xp ?? 0));
        setStreakDays(Number(summaryUser?.streak ?? gamification?.streak ?? 0));
        setLevel(Number(summaryUser?.level ?? gamification?.level ?? 1));
        setLevelProgress(Number(summary?.levelProgress?.progressPercent ?? gamification?.levelProgress?.progressPercent ?? 0));

        const safeGoals = Array.isArray(summary?.recentGoals) ? summary.recentGoals : [];
        setGoals(safeGoals.map((g: any) => ({
          id: String(g.id || g._id),
          title: g.title,
          deadline: g.deadline || new Date().toISOString(),
          progress: Number(g.progress || 0),
          xpReward: Number(g.xpReward || 25),
        })));

        const safeJournalEntries = Array.isArray(summary?.recentJournalEntries) ? summary.recentJournalEntries : [];
        setRecentMemories(safeJournalEntries.map((j: any) => ({
          id: String(j._id || j.id),
          title: j.title || "Journal entry",
          date: j.createdAt || j.date,
        })));

        const safeBadges = Array.isArray(summaryUser?.badges) ? summaryUser.badges : Array.isArray(gamification?.badges) ? gamification.badges : [];
        setBadges(safeBadges.map((b: string, index: number) => ({
          id: `${index}-${b}`,
          name: b,
          icon: "🏅",
          earned: true,
        })));


        const safeMemories = Array.isArray(summary?.timelineEvents) ? summary.timelineEvents : [];
        setTimelineEvents(safeMemories.map((memory: any) => ({
          id: String(memory.id || memory._id),
          label: memory.label || "Memory",
          emoji: memory.emoji || "📝",
          color: memory.color || "primary",
        })));

      } finally {
        setIsLoading(false);
      }
    };
    void load();
  }, []);

  const handleSaveQuickEntry = useCallback(async () => {
    if (!quickEntry.trim()) return;
    const created = await journalApi.create({
      title: "Quick Reflection",
      content: quickEntry.trim(),
      mood: "reflective",
      tags: ["quick"],
      date: new Date().toISOString().slice(0, 10),
    }) as any;
    setRecentMemories((prev) => [
      { id: String(created._id || created.id), title: created.title || "Quick Reflection", date: created.createdAt || created.date || new Date().toISOString() },
      ...prev,
    ].slice(0, 5));
    setQuickEntry("");
  }, [quickEntry]);





  const hasActivity = recentMemories.length > 0 || goals.length > 0 || badges.length > 0;

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-6xl mx-auto">
        <div className="h-12 w-64 shimmer rounded-lg" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <SkeletonCard lines={3} />
          <SkeletonCard lines={2} />
          <SkeletonCard lines={2} />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <SkeletonCard hasImage lines={4} />
          <SkeletonCard lines={5} />
          <SkeletonCard hasImage lines={3} />
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Background gradient */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-64 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
      </div>

      <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-6 max-w-6xl mx-auto">
        {/* Welcome Header */}
        <motion.div variants={fadeIn} className="relative">
          <FloatingParticles count={6} colors={["primary", "golden"]} className="h-20" />
          <div className="relative z-10">
            <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground">
              {getGreeting()}, <span className="text-gradient-hero">{userName}</span> ✨
            </h1>
            <p className="text-muted-foreground mt-1 font-handwritten text-lg">{getMotivationalSubtitle()}</p>
          </div>
        </motion.div>

        {/* Top Summary Block (cohesive grid) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-fr">
          <motion.div variants={fadeIn} className="h-full">
            <LifeProgressSphere xp={userXp} streakDays={streakDays} level={level} progressPercent={levelProgress} />
          </motion.div>

          <motion.div variants={fadeIn} className="h-full">
            <TodayMomentCard photo={null} onPhotoUpload={() => {}} />
          </motion.div>
        </div>



        {/* AI Insight Card - Personalized strategic insight */}
        {!hasActivity ? (
          <EmptyDashboardHero />
        ) : (
          <>
            {/* Active Goals Panel */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <motion.div variants={fadeIn} className="lg:col-span-2">
                <Card className="rounded-2xl border-border/30 glass-card">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="font-display text-lg flex items-center gap-2">
                        <Target className="h-5 w-5 text-primary" /> Active Goals
                      </CardTitle>
                      <Link to="/goals" className="text-xs text-primary hover:underline flex items-center gap-1">
                        View all <ChevronRight className="h-3 w-3" />
                      </Link>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {goals.length > 0 ? goals.slice(0, 5).map((g, i) => (
                      <motion.div
                        key={g.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.1 }}
                        whileHover={{ x: 4, backgroundColor: "hsl(var(--muted) / 0.3)" }}
                        className="p-3 rounded-xl bg-muted/10 cursor-pointer transition-colors"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <GoalProgressRing progress={g.progress} size={36} strokeWidth={3}>
                              <span className="text-[10px] font-bold">{g.progress}%</span>
                            </GoalProgressRing>
                            <div>
                              <p className="text-sm font-medium">{g.title}</p>
                              <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {new Date(g.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                              </p>
                            </div>
                          </div>
                          <Badge className="bg-golden/15 text-golden border-0 text-xs">
                            <Zap className="h-3 w-3 mr-1" /> +{g.xpReward} XP
                          </Badge>
                        </div>
                        <Progress value={g.progress} className="h-1.5" />
                      </motion.div>
                    )) : (
                      <div className="text-center py-6">
                        <Target className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
                        <p className="text-sm text-muted-foreground">No goals set yet</p>
                        <Link to="/goals"><Button variant="ghost" size="sm" className="mt-2 text-primary"><Plus className="mr-1 h-3 w-3" /> Create a goal</Button></Link>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>


            </div>

            {/* Quick Journal + Memories */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <motion.div variants={fadeIn}>
                <Card className="rounded-2xl border-border/30 glass-card">
                  <CardHeader className="pb-3">
                    <CardTitle className="font-display text-lg flex items-center gap-2">
                      <BookOpen className="h-5 w-5 text-calm" /> Quick Journal
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-muted-foreground font-handwritten text-lg">What's on your mind today?</p>
                    <Textarea
                      placeholder="Write a quick thought..."
                      className="min-h-[100px] rounded-xl bg-muted/20 border-border/40"
                      value={quickEntry}
                      onChange={(event) => setQuickEntry(event.target.value)}
                    />
                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                      <Button size="sm" className="gradient-primary text-primary-foreground w-full shadow-glow-primary" onClick={() => void handleSaveQuickEntry()}>
                        <PenLine className="mr-2 h-4 w-4" /> Save Entry (+10 XP)
                      </Button>
                    </motion.div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Gamification Panel */}
              <motion.div variants={fadeIn}>
                <Card className="rounded-2xl border-border/30 glass-card">
                  <CardHeader className="pb-3">
                    <CardTitle className="font-display text-lg flex items-center gap-2">
                      <Star className="h-5 w-5 text-golden" /> Achievements
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {badges.length > 0 ? (
                      <div className="grid grid-cols-3 gap-3">
                        {badges.map((b) => (
                          <motion.div
                            key={b.id}
                            whileHover={{ scale: 1.1, y: -2 }}
                            className={`text-center p-3 rounded-xl ${b.earned ? "bg-golden/10 shadow-glow-golden" : "bg-muted/20 opacity-40"}`}
                          >
                            <span className="text-2xl">{b.icon}</span>
                            <p className="text-xs font-medium mt-1">{b.name}</p>
                          </motion.div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-4">
                        <Star className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
                        <p className="text-sm text-muted-foreground">Badges appear as you grow</p>
                        <p className="font-handwritten text-base text-muted-foreground/50 mt-1">Every step earns recognition ✦</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </>
        )}

        {recentMemories.length > 0 && (
          <motion.div variants={fadeIn}>
            <Card className="rounded-2xl border-border/30 glass-card">
              <CardHeader className="pb-3">
                <CardTitle className="font-display text-lg flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-calm" /> Recent Journal Entries
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {recentMemories.map((entry) => (
                  <div key={entry.id} className="p-2 rounded-lg bg-muted/20">
                    <p className="text-sm font-medium">{entry.title}</p>
                    <p className="text-xs text-muted-foreground">{new Date(entry.date).toLocaleDateString()}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Timeline Preview */}
        <LifeTimelinePreview timelineEvents={timelineEvents} />
      </motion.div>
    </div>
  );
};

export default Dashboard;
