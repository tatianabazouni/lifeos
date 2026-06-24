import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Brain, ChevronDown, ChevronUp, Loader2, TrendingDown, TrendingUp, Zap } from "lucide-react";
import { aiApi } from "@/api/aiApi";
import { Card } from "@/components/ui/card";

type InsightData = {
  emotionalState?: string;
  corePattern?: string;
  mainBlocker?: string;
  strategicInsight?: string;
  actionableShift?: string;
  source?: string;
  reason?: string;
  contextSnapshot?: {
    journalCount: number;
    moodEntryCount: number;
    goalCount: number;
    consistencyScore: number;
  };
};

const moodColors: Record<string, string> = {
  increasing: "text-green-500",
  decreasing: "text-red-500",
  stable: "text-blue-500",
  new_user: "text-purple-500",
};

const moodLabels: Record<string, string> = {
  increasing: "Rising",
  decreasing: "Declining",
  stable: "Stable",
  new_user: "Building",
};

export function InsightCard() {
  const [insight, setInsight] = useState<InsightData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const fetchInsight = async () => {
      setLoading(true);
      setError("");

      try {
        const response = await aiApi.getInsight();
        if (!cancelled) {
          setInsight(response);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load insights");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchInsight();

    return () => {
      cancelled = true;
    };
  }, []);

  // Show loading state
  if (loading) {
    return (
      <Card className="border-border/70 bg-card/50 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium">AI Insight</p>
            <p className="text-xs text-muted-foreground">Analyzing your patterns...</p>
          </div>
        </div>
      </Card>
    );
  }

  // Show error state
  if (error) {
    return (
      <Card className="border-destructive/30 bg-destructive/5 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
            <TrendingDown className="h-5 w-5 text-destructive" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-destructive">Unable to generate insight</p>
            <p className="text-xs text-muted-foreground">{error}</p>
          </div>
        </div>
      </Card>
    );
  }

  // No insight data
  if (!insight) {
    return null;
  }

  // Check if it's a fallback (not enough data)
  const isFallback = insight.source === "fallback";

  return (
    <Card className="overflow-hidden border-border/70 bg-card/50">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between p-4 text-left hover:bg-muted/30"
      >
        <div className="flex items-center gap-3">
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-full ${
              isFallback ? "bg-purple-500/10" : "bg-primary/10"
            }`}
          >
            <Brain className={`h-5 w-5 ${isFallback ? "text-purple-500" : "text-primary"}`} />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium">Strategic Insight</p>
            <p className="text-xs text-muted-foreground">
              {isFallback ? "Getting started" : "Personalized for you"}
            </p>
          </div>
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {/* Expanded Content */}
      {expanded && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="space-y-4 border-t border-border/70 px-4 pb-4"
        >
          {/* Context Snapshot - if available */}
          {insight.contextSnapshot && (insight.contextSnapshot.journalCount > 0 || insight.contextSnapshot.goalCount > 0) && (
            <div className="mt-4 flex flex-wrap gap-2">
              <div className="rounded-full bg-muted/60 px-3 py-1 text-xs text-muted-foreground">
                📝 {insight.contextSnapshot.journalCount} journals
              </div>
              <div className="rounded-full bg-muted/60 px-3 py-1 text-xs text-muted-foreground">
                🎯 {insight.contextSnapshot.goalCount} goals
              </div>
              <div className="rounded-full bg-muted/60 px-3 py-1 text-xs text-muted-foreground">
                📈 {insight.contextSnapshot.consistencyScore}% consistent
              </div>
            </div>
          )}

          {/* Emotional State */}
          {insight.emotionalState && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <TrendingUp className={`h-4 w-4 ${moodColors[insight.emotionalState] || "text-muted-foreground"}`} />
                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Emotional State
                </span>
              </div>
              <p className="text-sm leading-relaxed text-foreground">
                {moodLabels[insight.emotionalState] || insight.emotionalState}
              </p>
            </div>
          )}

          {/* Core Pattern */}
          {insight.corePattern && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-yellow-500" />
                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Core Pattern
                </span>
              </div>
              <p className="text-sm leading-relaxed text-foreground">{insight.corePattern}</p>
            </div>
          )}

          {/* Main Blocker */}
          {insight.mainBlocker && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-red-500" />
                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Main Blocker
                </span>
              </div>
              <p className="text-sm leading-relaxed text-foreground">{insight.mainBlocker}</p>
            </div>
          )}

          {/* Strategic Insight */}
          {insight.strategicInsight && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Brain className="h-4 w-4 text-blue-500" />
                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Strategic Insight
                </span>
              </div>
              <p className="text-sm leading-relaxed text-foreground">{insight.strategicInsight}</p>
            </div>
          )}

          {/* Actionable Shift */}
          {insight.actionableShift && (
            <div className="rounded-xl bg-primary/5 p-3">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-green-500" />
                <span className="text-xs font-medium uppercase tracking-wider text-green-600 dark:text-green-400">
                  Your Next Step
                </span>
              </div>
              <p className="mt-1 text-sm leading-relaxed text-foreground">{insight.actionableShift}</p>
            </div>
          )}

          {/* Source indicator */}
          <div className="flex justify-end border-t border-border/50 pt-2">
            <span className="text-[10px] text-muted-foreground">
              Source: {insight.source || "unknown"} {insight.reason && `• ${insight.reason}`}
            </span>
          </div>
        </motion.div>
      )}
    </Card>
  );
}

export default InsightCard;
