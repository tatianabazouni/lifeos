/**
 * AIJournalInsight - AI-powered insights after writing journal entries
 * Shows: summary, emotional tone, key insights, suggested actions
 */
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Brain, 
  Sparkles, 
  Loader2, 
  TrendingUp, 
  TrendingDown, 
  Lightbulb,
  Target,
  Heart,
  Zap,
  ChevronDown,
  ChevronUp,
  Copy,
  Check
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { aiApi } from "@/api/aiApi";

type JournalInsight = {
  id?: string;
  entryId?: string;
  summary?: string;
  emotionalTone?: string;
  keyInsights?: string[];
  suggestedActions?: string[];
  wordCount?: number;
  sentiment?: "positive" | "neutral" | "negative";
  moods?: string[];
  themes?: string[];
  createdAt?: string;
};

interface AIJournalInsightProps {
  entryId?: string;
  content?: string;
  title?: string;
  autoAnalyze?: boolean;
  onExpandClick?: () => void;
}

// Emotional tone colors
const toneColors: Record<string, string> = {
  joyful: "bg-green-500/15 text-green-600 border-green-500/30",
  grateful: "bg-purple-500/15 text-purple-600 border-purple-500/30",
  reflective: "bg-blue-500/15 text-blue-600 border-blue-500/30",
  anxious: "bg-orange-500/15 text-orange-600 border-orange-500/30",
  hopeful: "bg-cyan-500/15 text-cyan-600 border-cyan-500/30",
  determined: "bg-red-500/15 text-red-600 border-red-500/30",
  calm: "bg-primary/15 text-primary border-primary/30",
  neutral: "bg-muted/50 text-muted-foreground border-border/30",
};

const toneEmojis: Record<string, string> = {
  joyful: "😊",
  grateful: "🙏",
  reflective: "🤔",
  anxious: "😰",
  hopeful: "🌟",
  determined: "💪",
  calm: "😌",
  neutral: "😐",
};

export function AIJournalInsight({ 
  entryId, 
  content, 
  title, 
  autoAnalyze = true,
  onExpandClick
}: AIJournalInsightProps) {
  const [insight, setInsight] = useState<JournalInsight | null>(null);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

// Load existing insight when entryId is provided
  useEffect(() => {
    if (!entryId && !content) return;

    const loadInsight = async () => {
      setLoading(true);
      setError("");
      try {
        // For now, we'll analyze immediately when content is provided
        if (content && autoAnalyze) {
          setAnalyzing(true);
          const result = await aiApi.analyzeJournal({
            content,
            title: title || "",
            entryId: entryId || "",
          });
          
          if (result) {
            setInsight({
              entryId,
              summary: result.summary,
              emotionalTone: result.emotionalTone,
              keyInsights: result.keyInsights || [],
              suggestedActions: result.suggestedActions || [],
              sentiment: result.sentiment,
              moods: result.moods || [],
              themes: result.themes || [],
              wordCount: result.wordCount,
            });
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to analyze");
      } finally {
        setLoading(false);
        setAnalyzing(false);
      }
    };

    void loadInsight();
  }, [entryId, content, title, autoAnalyze]);

  // Enhance with general insight context
  useEffect(() => {
    if (!entryId && !content && !loading && !analyzing) {
      const loadGeneralInsight = async () => {
        try {
          const generalInsight = await aiApi.getInsight();
          if (generalInsight) {
            setInsight(prev => ({
              ...prev,
              ...generalInsight,
              entryId: entryId || "general",
            }));
          }
        } catch (e) {
          console.warn("General insight unavailable", e);
        }
      };
      void loadGeneralInsight();
    }
  }, []);

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      // Ignore copy errors
    }
  };

  // Loading skeleton
  if (loading || analyzing) {
    return (
      <Card className="border-border/70 bg-card/50 overflow-hidden">
        <div className={`h-1 ${analyzing ? "bg-primary animate-pulse" : ""}`} />
        <CardContent className="py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
            <div className="space-y-2 flex-1">
              <div className="h-4 w-32 rounded-full bg-muted animate-pulse" />
              <div className="h-3 w-48 rounded-full bg-muted/50 animate-pulse" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // If no insight data yet, show the "ready to analyze" state
  if (!insight && !error && !analyzing) {
    return (
      <Card className="border-border/70 bg-card/50 overflow-hidden">
        <CardContent className="py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
              <Brain className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">AI Insight Ready</p>
              <p className="text-xs text-muted-foreground">Save your entry to unlock personalized insights</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card className="border-destructive/30 bg-destructive/5 overflow-hidden">
        <CardContent className="py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
              <TrendingDown className="h-5 w-5 text-destructive" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-destructive">Analysis unavailable</p>
              <p className="text-xs text-muted-foreground">{error}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Render the insights
  const tone = insight?.emotionalTone?.toLowerCase() || "neutral";

  return (
    <Card className="border-border/70 bg-card/50 overflow-hidden">
      {/* AI-generated header bar */}
      <div className="h-1 bg-gradient-to-r from-primary via-purple-500 to-calm" />
      
      <button
        onClick={() => {
          setExpanded(!expanded);
          onExpandClick?.();
        }}
        className="flex w-full items-center justify-between p-4 text-left hover:bg-muted/20"
      >
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <Brain className="h-5 w-5 text-primary" />
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-background border-2 border-border">
              <Sparkles className="h-2 w-2 text-purple-500" />
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium">AI Insight</p>
              <Badge variant="outline" className={`text-[10px] capitalize border ${toneColors[tone] || toneColors.neutral}`}>
                {toneEmojis[tone] || "😐"} {insight?.emotionalTone || "Analyzed"}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              {insight?.summary ? "Summary + insights generated" : "Powered by AI"}
            </p>
          </div>
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {/* Expanded content */}
      <AnimatePresence>
        {expanded && insight && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-border/50"
          >
            <CardContent className="space-y-4 p-4">
              {/* 📝 Summary Section */}
              {insight.summary && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Lightbulb className="h-4 w-4 text-golden" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Summary
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="ml-auto h-6 w-6"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopy(insight.summary!);
                      }}
                    >
                      {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                    </Button>
                  </div>
                  <p className="text-sm leading-relaxed text-foreground bg-muted/30 rounded-lg p-3">
                    {insight.summary}
                  </p>
                </div>
              )}

              {/* 💡 Key Insights */}
              {insight.keyInsights && insight.keyInsights.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Brain className="h-4 w-4 text-primary" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Key Insights
                    </span>
                  </div>
                  <div className="space-y-2">
                    {insight.keyInsights.slice(0, 4).map((item, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="flex items-start gap-2 rounded-lg bg-muted/30 p-2.5"
                      >
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-medium text-primary">
                          {i + 1}
                        </span>
                        <p className="text-sm leading-relaxed">{item}</p>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {/* 🎯 Actionable Next Steps */}
              {insight.suggestedActions && insight.suggestedActions.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-green-500" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-green-600 dark:text-green-400">
                      Suggested Actions
                    </span>
                  </div>
                  <div className="space-y-2">
                    {insight.suggestedActions.slice(0, 3).map((action, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: (i + 2) * 0.1 }}
                        className="flex items-start gap-2 rounded-lg bg-green-500/5 border border-green-500/20 p-2.5"
                      >
                        <Zap className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                        <p className="text-sm leading-relaxed">{action}</p>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tags: Moods & Themes */}
              {(insight.moods?.length || insight.themes?.length) && (
                <div className="flex flex-wrap gap-2 pt-2 border-t border-border/30">
                  {insight.moods?.slice(0, 3).map((mood) => (
                    <Badge key={mood} variant="secondary" className="text-xs capitalize">
                      <Heart className="mr-1 h-3 w-3" /> {mood}
                    </Badge>
                  ))}
                  {insight.themes?.slice(0, 3).map((theme) => (
                    <Badge key={theme} variant="outline" className="text-xs capitalize">
                      {theme}
                    </Badge>
                  ))}
                </div>
              )}

              {/* Sentiment indicator */}
              {insight.sentiment && (
                <div className="flex justify-end">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span>Sentiment:</span>
                    <span className={`capitalize font-medium ${
                      insight.sentiment === "positive" ? "text-green-500" :
                      insight.sentiment === "negative" ? "text-red-500" :
                      "text-muted-foreground"
                    }`}>
                      {insight.sentiment}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

export default AIJournalInsight;
