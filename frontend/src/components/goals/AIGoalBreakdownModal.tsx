/**
 * AIGoalBreakdownModal - AI-powered goal breakdown and planning
 * 
 * Shows AI-generated phases, milestones, timeline, risks and suggestions
 */
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { goalsApi } from "@/api/goalsApi";
import { aiApi } from "@/api/aiApi";
import {
  Sparkles, Zap, Calendar, Target, AlertTriangle, CheckCircle2,
  ArrowRight, Clock, Users, BookOpen, ChevronDown, ChevronRight,
  Loader2, Lightbulb, TrendingUp, AlertCircle
} from "lucide-react";

/* ─── Types ─── */
interface Phase {
  title: string;
  purpose?: string;
  timeline?: string;
  milestones?: string[];
  actionSteps?: string[];
}

interface AIGoalPlan {
  goalTitle: string;
  interpretation?: {
    summary: string;
    clarity: string;
    difficulty: string;
    needsClarification: boolean;
    clarifyingQuestion?: string;
  };
  phases?: Phase[];
  milestones?: string[];
  successMeasures?: string[];
  personalReminder?: string;
  source?: string;
}

interface Props {
  goalId: string;
  goalTitle: string;
  goalDescription: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApplyPlan?: (plan: AIGoalPlan) => void;
}

/* ─── Animations ─── */
const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const } }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } }
};

/* ─── Phase Card Component ─── */
const PhaseCard = ({ phase, index }: { phase: Phase; index: number }) => {
  const [expanded, setExpanded] = useState(index === 0);
  const milestones = phase.milestones || [];
  const actions = phase.actionSteps || [];
  const hasContent = milestones.length > 0 || actions.length > 0;

  return (
    <motion.div
      variants={fadeIn}
      className="rounded-xl border border-border/40 bg-card/50 overflow-hidden"
    >
      {/* Phase Header */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
            index === 0 ? "bg-primary text-primary-foreground" :
            index === 1 ? "bg-golden/20 text-golden" :
            "bg-calm/20 text-calm"
          }`}>
            {index + 1}
          </div>
          <div>
            <h4 className="font-semibold text-foreground">{phase.title}</h4>
            {phase.timeline && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" /> {phase.timeline}
              </p>
            )}
          </div>
        </div>
        {hasContent && (
          <motion.div animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </motion.div>
        )}
      </button>

      {/* Phase Content */}
      <AnimatePresence initial={false}>
        {expanded && hasContent && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-4">
              {phase.purpose && (
                <p className="text-sm text-muted-foreground pt-2 border-t border-border/40">
                  {phase.purpose}
                </p>
              )}

              {/* Milestones */}
              {milestones.length > 0 && (
                <div className="space-y-2">
                  <h5 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1">
                    <Target className="h-3 w-3" /> Milestones
                  </h5>
                  <div className="space-y-1">
                    {milestones.map((m, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                        <span className="text-foreground">{m}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Steps */}
              {actions.length > 0 && (
                <div className="space-y-2">
                  <h5 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1">
                    <Zap className="h-3 w-3" /> Action Steps
                  </h5>
                  <div className="space-y-1">
                    {actions.map((a, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm">
                        <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs shrink-0">
                          {i + 1}
                        </span>
                        <span className="text-foreground">{a}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

/* ─── Loading State ─── */
const LoadingState = () => (
  <div className="space-y-4 p-4">
    <div className="flex items-center gap-3">
      <Skeleton className="h-10 w-10 rounded-full" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-3 w-32" />
      </div>
    </div>
    <Skeleton className="h-20 w-full rounded-xl" />
    <Skeleton className="h-20 w-full rounded-xl" />
    <div className="flex gap-2">
      <Skeleton className="h-10 w-24 rounded-xl" />
      <Skeleton className="h-10 w-24 rounded-xl" />
    </div>
  </div>
);

/* ─── Main Modal Component ─── */
export const AIGoalBreakdownModal = ({
  goalId,
  goalTitle,
  goalDescription,
  open,
  onOpenChange,
  onApplyPlan
}: Props) => {
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<AIGoalPlan | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (open && goalId) {
      setLoading(true);
      setError(null);
      setPlan(null);
      
      // Generate AI breakdown
      goalsApi.generateAIBreakdown(goalId, { title: goalTitle, description: goalDescription })
        .then((result) => {
          setPlan(result);
          setLoading(false);
        })
        .catch((err) => {
          console.error("AI breakdown error:", err);
          setError("Failed to generate AI breakdown. Please try again.");
          setLoading(false);
        });
    }
  }, [open, goalId, goalTitle, goalDescription]);

  const handleApplyPlan = () => {
    if (plan && onApplyPlan) {
      onApplyPlan(plan);
      onOpenChange(false);
    }
  };

  // Calculate progress percentages
  const totalPhases = plan?.phases?.length || 0;
  const totalMilestones = plan?.milestones?.length || plan?.phases?.reduce((acc, p) => acc + (p.milestones?.length || 0), 0) || 0;
  const totalActions = plan?.phases?.reduce((acc, p) => acc + (p.actionSteps?.length || 0), 0) || 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] bg-card border border-border/60 shadow-lg p-0 overflow-hidden">
        {/* Header with gradient */}
        <div className="h-1.5 bg-gradient-to-r from-primary via-golden to-calm" />
        
        <DialogHeader className="p-6 pb-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle className="font-display text-xl flex items-center gap-2">
                AI Goal Breakdown
                {plan?.source === "ai" && (
                  <Badge variant="secondary" className="text-[10px] bg-primary/10 text-primary border-0">
                    <Sparkles className="h-2.5 w-2.5 mr-1" /> AI Powered
                  </Badge>
                )}
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                {goalTitle}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Content */}
        <div className="p-6 pt-2 overflow-y-auto max-h-[60vh]">
          {loading ? (
            <LoadingState />
          ) : error ? (
            <div className="text-center py-8">
              <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
              <p className="text-destructive">{error}</p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => {
                  setLoading(true);
                  setError(null);
                  goalsApi.generateAIBreakdown(goalId, { title: goalTitle, description: goalDescription })
                    .then((result) => {
                      setPlan(result);
                      setLoading(false);
                    })
                    .catch(() => {
                      setError("Failed to generate AI breakdown");
                      setLoading(false);
                    });
                }}
              >
                Try Again
              </Button>
            </div>
          ) : plan ? (
            <motion.div 
              variants={staggerContainer} 
              initial="hidden" 
              animate="visible"
              className="space-y-6"
            >
              {/* Progress Overview */}
              <div className="grid grid-cols-3 gap-4">
                <Card className="rounded-xl border-border/40 bg-primary/5">
                  <CardContent className="p-3 text-center">
                    <p className="text-2xl font-bold text-primary">{totalPhases}</p>
                    <p className="text-xs text-muted-foreground">Phases</p>
                  </CardContent>
                </Card>
                <Card className="rounded-xl border-border/40 bg-golden/5">
                  <CardContent className="p-3 text-center">
                    <p className="text-2xl font-bold text-golden">{totalMilestones}</p>
                    <p className="text-xs text-muted-foreground">Milestones</p>
                  </CardContent>
                </Card>
                <Card className="rounded-xl border-border/40 bg-calm/5">
                  <CardContent className="p-3 text-center">
                    <p className="text-2xl font-bold text-calm">{totalActions}</p>
                    <p className="text-xs text-muted-foreground">Actions</p>
                  </CardContent>
                </Card>
              </div>

              {/* Interpretation Summary */}
              {plan.interpretation?.summary && (
                <Card className="rounded-xl border-border/40 bg-gradient-to-br from-primary/5 to-transparent">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Lightbulb className="h-4 w-4 text-golden" /> AI Analysis
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-sm text-foreground">{plan.interpretation.summary}</p>
                    <div className="flex gap-2 mt-3 flex-wrap">
                      {plan.interpretation.clarity && (
                        <Badge variant="secondary" className="text-xs">
                          Clarity: {plan.interpretation.clarity}
                        </Badge>
                      )}
                      {plan.interpretation.difficulty && (
                        <Badge variant="secondary" className="text-xs">
                          Difficulty: {plan.interpretation.difficulty}
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Phases */}
              {plan.phases && plan.phases.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-primary" /> Execution Phases
                  </h4>
                  {plan.phases.map((phase, index) => (
                    <PhaseCard key={index} phase={phase} index={index} />
                  ))}
                </div>
              )}

              {/* Success Measures */}
              {plan.successMeasures && plan.successMeasures.length > 0 && (
                <Card className="rounded-xl border-border/40">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary" /> Success Indicators
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-2">
                    {plan.successMeasures.map((measure, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                        <span className="text-foreground">{measure}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Personal Reminder */}
              {plan.personalReminder && (
                <Card className="rounded-xl border-golden/40 bg-golden/5">
                  <CardContent className="p-4">
                    <p className="text-sm text-foreground flex items-start gap-2">
                      <span className="text-xl">💭</span>
                      {plan.personalReminder}
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Clarification Needed */}
              {plan.interpretation?.needsClarification && (
                <Card className="rounded-xl border-accent/40 bg-accent/5">
                  <CardContent className="p-4">
                    <p className="text-sm text-accent flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                      {plan.interpretation.clarifyingQuestion || "This goal needs more clarification to create a proper plan."}
                    </p>
                  </CardContent>
                </Card>
              )}
            </motion.div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No plan generated yet.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="p-6 pt-4 border-t border-border/40">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          {plan && plan.phases && plan.phases.length > 0 && (
            <Button 
              onClick={handleApplyPlan}
              className="gradient-primary text-primary-foreground shadow-glow-primary"
            >
              <Sparkles className="h-4 w-4 mr-2" /> Apply This Plan
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AIGoalBreakdownModal;
