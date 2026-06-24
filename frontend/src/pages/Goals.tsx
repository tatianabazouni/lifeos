import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { GoalProgressRing } from "@/components/GoalProgressRing";
import { FloatingParticles } from "@/components/FloatingParticles";
import { AnimatedCounter } from "@/components/AnimatedCounter";
import { SkeletonCard } from "@/components/SkeletonCard";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";


import {

  Plus, Calendar, CheckCircle2, Circle, Zap,
  Rocket, Clock, Flag, ChevronDown, Pencil, Trash2, ArrowUpRight, Save, X, Sparkles
} from "lucide-react";
import { goalsApi } from "@/api/goalsApi";
import { dashboardApi } from "@/api/dashboardApi";

/* ─── Types ─── */
interface Subtask {
  id: string;
  title: string;
  done: boolean;
  phaseTitle?: string;
  kind?: "milestone" | "action";
}
interface Goal {
  id: string; title: string; description: string; deadline: string;
  progress: number; xpReward: number; subtasks: Subtask[];
  priority: "high" | "medium" | "low";
  completed: boolean;
  completedAt?: string;
}

const priorityColors = {
  high: "bg-accent/15 text-accent border-accent/30",
  medium: "bg-golden/15 text-golden border-golden/30",
  low: "bg-primary/15 text-primary border-primary/30",
};

/* ─── Animations ─── */
const containerVariants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } };
const itemVariants = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const } } };

/* ─── Empty State ─── */
const EmptyGoalsState = ({ onAdd }: { onAdd: () => void }) => (
  <motion.div
    initial={{ opacity: 0, y: 30 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] as const }}
    className="rounded-2xl border border-border/60 bg-card shadow-sm p-12 text-center relative overflow-hidden"
  >
    <FloatingParticles count={10} colors={["primary", "golden", "calm"]} />
    <div className="relative z-10 space-y-6">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 15 }}
      >
        <div className="w-24 h-24 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
          <motion.div animate={{ y: [-5, 5, -5] }} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}>
            <Rocket className="h-12 w-12 text-primary/40" strokeWidth={1.5} />
          </motion.div>
        </div>
      </motion.div>
      <h2 className="font-display text-3xl font-bold text-foreground">Launch your first mission</h2>
      <p className="text-muted-foreground max-w-md mx-auto leading-relaxed">
        Goals are dreams with deadlines. Create your first life mission and break it into actionable steps.
      </p>
      <p className="font-handwritten text-xl text-muted-foreground/50 italic">"A goal without a plan is just a wish."</p>
      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
        <Button onClick={onAdd} className="gradient-primary text-primary-foreground shadow-glow-primary rounded-xl px-8 py-5 text-base">
          <Rocket className="mr-2 h-5 w-5" /> Launch your first mission
        </Button>
      </motion.div>
    </div>
  </motion.div>
);

/* ─── Goal Card ─── */
const GoalCard = ({ goal, index, onToggleSubtask, onExpand }: {
  goal: Goal; index: number;
  onToggleSubtask: (goalId: string, subtaskId: string) => void;
  onExpand: (goal: Goal) => void;
}) => {
  const daysLeft = Math.max(0, Math.ceil((new Date(goal.deadline).getTime() - Date.now()) / 86400000));
  const doneCount = goal.subtasks.filter((s) => s.done).length;
  const isDone = goal.completed || goal.progress >= 100;

  return (
    <motion.div
      variants={itemVariants}
      whileHover={{ y: -1 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="cursor-pointer"
      onClick={() => onExpand(goal)}
    >
      <Card className="rounded-xl border border-border/60 bg-card shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="pt-0.5">
              {isDone ? (
                <CheckCircle2 className="h-5 w-5 text-primary" />
              ) : (
                <Circle className="h-5 w-5 text-muted-foreground/60" />
              )}
            </div>
            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <h3 className={`text-base font-semibold leading-tight ${isDone ? "line-through text-muted-foreground" : "text-foreground"}`}>
                  {goal.title}
                </h3>
                <Badge className={`shrink-0 text-[10px] border ${priorityColors[goal.priority]}`}>
                  <Flag className="h-2.5 w-2.5 mr-1" /> {goal.priority}
                </Badge>
              </div>

              {!!goal.description && (
                <p className="text-sm text-muted-foreground line-clamp-1">{goal.description}</p>
              )}

              <Progress value={goal.progress} className="h-1.5" />

              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" /> {daysLeft}d left
                </span>
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3 text-primary" />
                  {doneCount}/{goal.subtasks.length}
                </span>
                <span className="flex items-center gap-1 text-golden">
                  <Zap className="h-3 w-3" /> +{goal.xpReward} XP
                </span>
              </div>

              <div className="flex justify-end">
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-2 border-primary/30 hover:bg-primary/10"
                  onClick={(event) => {
                    event.stopPropagation();
                    onExpand(goal);

                  }}
                >
                  <Rocket className="h-3.5 w-3.5 text-primary" />
                  View
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

/* ─── Goal Detail Panel ─── */
const GoalDetailPanel = ({
  goal,
  open,
  onClose,
  onToggleSubtask,
  onAddSubtask,
  onEditSubtask,
  onDeleteSubtask,
  onPromoteSubtask,
  onDeleteGoal,
  onEditDeadline,
}: {
  goal: Goal | null; open: boolean; onClose: () => void;
  onToggleSubtask: (goalId: string, subtaskId: string) => void;
  onAddSubtask: (goalId: string, title: string) => void;
  onEditSubtask: (goalId: string, subtaskId: string, title: string) => void;
  onDeleteSubtask: (goalId: string, subtaskId: string) => void;
  onPromoteSubtask: (goalId: string, subtaskId: string) => void;
  onDeleteGoal: (goalId: string) => void;
  onEditDeadline: (goalId: string, deadline: string) => void;
}) => {
  const [newSubtask, setNewSubtask] = useState("");
  const [editingSubtaskId, setEditingSubtaskId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [isEditingDeadline, setIsEditingDeadline] = useState(false);
  const [editingDeadlineValue, setEditingDeadlineValue] = useState("");

  useEffect(() => {
    setEditingSubtaskId(null);
    setEditingTitle("");
    setIsEditingDeadline(false);
  }, [goal?.id, open]);

  if (!goal) return null;

  const groupedSubtasks = goal.subtasks.reduce<Array<{ title: string; items: Subtask[] }>>((groups, subtask) => {
    const title = subtask.phaseTitle || "Milestones";
    const existing = groups.find((group) => group.title === title);
    if (existing) {
      existing.items.push(subtask);
    } else {
      groups.push({ title, items: [subtask] });
    }
    return groups;
  }, []);

  const startEditingSubtask = (subtask: Subtask) => {
    setEditingSubtaskId(subtask.id);
    setEditingTitle(subtask.title);
  };

const saveEditingSubtask = () => {
    if (!editingSubtaskId || !editingTitle.trim()) return;
    onEditSubtask(goal.id, editingSubtaskId, editingTitle.trim());
    setEditingSubtaskId(null);
    setEditingTitle("");
  };

  const startEditingDeadline = () => {
    setEditingDeadlineValue(goal.deadline.slice(0, 10));
    setIsEditingDeadline(true);
  };

  const saveEditingDeadline = () => {
    if (!editingDeadlineValue.trim()) return;
    onEditDeadline(goal.id, editingDeadlineValue.trim());
    setIsEditingDeadline(false);
  };

  const cancelEditingDeadline = () => {
    setIsEditingDeadline(false);
    setEditingDeadlineValue("");
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg bg-card border border-border/60 shadow-lg p-0 overflow-hidden max-h-[85vh] overflow-y-auto">
        {/* Header with gradient */}
        <div className={`h-2 ${goal.priority === "high" ? "bg-accent" : goal.priority === "medium" ? "bg-golden" : "bg-primary"}`} />
        <div className="p-6 space-y-5">
          <div className="flex items-start gap-4">
            <GoalProgressRing progress={goal.progress} size={72} strokeWidth={4}>
              <AnimatedCounter value={goal.progress} suffix="%" className="text-sm font-bold" />
            </GoalProgressRing>
            <div className="flex-1">
              <h2 className="font-display text-xl font-bold">{goal.title}</h2>
              <p className="text-sm text-muted-foreground mt-1">{goal.description}</p>
              <div className="flex items-center gap-2 mt-2">
                {isEditingDeadline ? (
                  <div className="flex items-center gap-1">
                    <Input
                      type="date"
                      value={editingDeadlineValue}
                      onChange={(e) => setEditingDeadlineValue(e.target.value)}
                      className="h-6 text-xs py-1"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveEditingDeadline();
                        if (e.key === "Escape") cancelEditingDeadline();
                      }}
                    />
                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={saveEditingDeadline}>
                      <Save className="h-3 w-3" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={cancelEditingDeadline}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <Badge variant="secondary" className="text-xs cursor-pointer hover:bg-secondary/80" onClick={startEditingDeadline}>
                    <Calendar className="h-3 w-3 mr-1" /> {new Date(goal.deadline).toLocaleDateString()}
                  </Badge>
                )}
                <Badge className="bg-golden/15 text-golden border-0 text-xs"><Zap className="h-3 w-3 mr-1" /> +{goal.xpReward} XP</Badge>
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div>
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>Progress</span>
              <span>{goal.progress}%</span>
            </div>
            <Progress value={goal.progress} className="h-2" />
          </div>

          {/* Subtasks */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary" /> Milestones
            </h4>
            <TooltipProvider delayDuration={150}>
              <div className="space-y-3">
                {groupedSubtasks.map((group) => (
                  <div key={group.title} className="rounded-xl border border-border/60 bg-background/50 p-3 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{group.title}</p>
                      <Badge variant="secondary" className="text-[10px] rounded-full">
                        {group.items.filter((item) => item.done).length}/{group.items.length}
                      </Badge>
                    </div>
                    {group.items.map((st) => {
                      const isEditing = editingSubtaskId === st.id;

                      return (
                        <motion.div
                          key={st.id}
                          whileHover={{ x: 2 }}
                          className="flex items-center gap-2 rounded-lg p-2 hover:bg-muted/60 transition-colors"
                        >
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 shrink-0"
                                onClick={() => onToggleSubtask(goal.id, st.id)}
                              >
                                {st.done ? (
                                  <CheckCircle2 className="h-4 w-4 text-primary" />
                                ) : (
                                  <Circle className="h-4 w-4 text-muted-foreground/50" />
                                )}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>{st.done ? "Mark incomplete" : "Mark complete"}</TooltipContent>
                          </Tooltip>

                          {isEditing ? (
                            <Input
                              value={editingTitle}
                              onChange={(e) => setEditingTitle(e.target.value)}
                              className="h-8 text-sm"
                              onKeyDown={(e) => {
                                if (e.key === "Enter") saveEditingSubtask();
                                if (e.key === "Escape") {
                                  setEditingSubtaskId(null);
                                  setEditingTitle("");
                                }
                              }}
                              autoFocus
                            />
                          ) : (
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm leading-snug ${st.done ? "line-through text-muted-foreground" : "text-foreground"}`}>
                                {st.title}
                              </p>
                              {st.kind === "action" && <p className="text-[11px] text-muted-foreground">Action step</p>}
                            </div>
                          )}

                          {isEditing ? (
                            <div className="flex items-center gap-1 shrink-0">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={saveEditingSubtask}>
                                    <Save className="h-4 w-4 text-primary" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Save edit</TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => {
                                      setEditingSubtaskId(null);
                                      setEditingTitle("");
                                    }}
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Cancel edit</TooltipContent>
                              </Tooltip>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 shrink-0">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => startEditingSubtask(st)}>
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Edit milestone</TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => onPromoteSubtask(goal.id, st.id)}>
                                    <ArrowUpRight className="h-4 w-4 text-primary" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Promote to goal</TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => onDeleteSubtask(goal.id, st.id)}>
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Delete milestone</TooltipContent>
                              </Tooltip>
                            </div>
                          )}
                        </motion.div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </TooltipProvider>
            <div className="flex gap-2 mt-2">
              <Input
                placeholder="Add a milestone..."
                value={newSubtask}
                onChange={(e) => setNewSubtask(e.target.value)}
                className="rounded-xl bg-background border-border/60 text-sm"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newSubtask.trim()) {
                    onAddSubtask(goal.id, newSubtask.trim());
                    setNewSubtask("");
                  }
                }}
              />
              <Button
                size="sm"
                variant="outline"
                className="rounded-xl shrink-0"
                onClick={() => {
                  if (newSubtask.trim()) {
                    onAddSubtask(goal.id, newSubtask.trim());
                    setNewSubtask("");
                  }
                }}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="flex justify-end">
            <Button variant="destructive" onClick={() => onDeleteGoal(goal.id)}>
              Delete Goal
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

/* ─── Main Goals Page ─── */
const mapGoal = (goal: any): Goal => ({
  id: goal.id || goal._id,
  title: goal.title,
  description: goal.description || "",
  deadline: goal.deadline ? String(goal.deadline).slice(0, 10) : new Date(Date.now() + 90 * 86400000).toISOString().split("T")[0],
  progress: Number(goal.progress || 0),
  xpReward: Number(goal.xpReward || 25),
  subtasks: (Array.isArray(goal.subtasks) ? goal.subtasks : []).map((subtask: any) => ({
    id: String(subtask.id || subtask._id || subtask.title),
    title: subtask.title,
    done: Boolean(subtask.done),
    phaseTitle: subtask.phaseTitle || "",
    kind: subtask.kind === "action" ? "action" : "milestone",
  })),
  priority: goal.priority || "medium",
  completed: Boolean(goal.completed) || Number(goal.progress || 0) >= 100,
  completedAt: goal.completedAt ? String(goal.completedAt) : undefined,
});

const Goals = () => {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [expandedGoal, setExpandedGoal] = useState<Goal | null>(null);

  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newDeadline, setNewDeadline] = useState("");
  const [newPriority, setNewPriority] = useState<"high" | "medium" | "low">("medium");
  const [xpEarned, setXpEarned] = useState(0);
  const [achievedExpanded, setAchievedExpanded] = useState(false);


  const isGoalCompleted = (goal: Goal) => goal.completed || goal.progress >= 100;

  const activeGoals = goals.filter((goal) => !isGoalCompleted(goal));
  const achievedGoals = goals.filter((goal) => isGoalCompleted(goal));

  useEffect(() => {
    const load = async () => {
      const [goalsData, dashboard] = await Promise.all([
        goalsApi.getAll() as Promise<any[]>,
        dashboardApi.getSummary() as Promise<any>,
      ]);
      setGoals(goalsData.map(mapGoal));
      setXpEarned(Number(dashboard?.user?.xp || 0));
    };
    void load();
  }, []);

  const completedGoals = achievedGoals.length;
  const calculateSubtaskProgress = (subtasks: Subtask[]) =>
    subtasks.length > 0 ? Math.round((subtasks.filter((s) => s.done).length / subtasks.length) * 100) : 0;

  const updateGoalSubtasks = async (goalId: string, subtasks: Subtask[], extraGoal?: Goal) => {
    const progress = calculateSubtaskProgress(subtasks);
    const updated = await goalsApi.update(goalId, { subtasks, progress, completed: progress === 100 });
    const next = mapGoal(updated);
    setGoals((prev) => {
      const updatedGoals = prev.map((g) => (g.id === goalId ? next : g));
      return extraGoal ? [extraGoal, ...updatedGoals.filter((g) => g.id !== extraGoal.id)] : updatedGoals;
    });
    if (expandedGoal?.id === goalId) setExpandedGoal(next);
    return next;
  };

  const handleAddGoal = async () => {
    if (!newTitle.trim()) return;
    const created = await goalsApi.create({
      title: newTitle,
      description: newDesc,
      deadline: newDeadline || new Date(Date.now() + 90 * 86400000).toISOString().split("T")[0],
      priority: newPriority,
      xpReward: newPriority === "high" ? 50 : newPriority === "medium" ? 30 : 15,
    });
    setGoals((prev) => [mapGoal(created), ...prev]);
    setNewTitle(""); setNewDesc(""); setNewDeadline(""); setNewPriority("medium");
    setShowAddDialog(false);
  };

  const toggleSubtask = async (goalId: string, subtaskId: string) => {
    const goal = goals.find((g) => g.id === goalId);
    if (!goal) return;
    const subtasks = goal.subtasks.map((s) => (s.id === subtaskId ? { ...s, done: !s.done } : s));
    await updateGoalSubtasks(goalId, subtasks);
  };

  const addSubtask = async (goalId: string, title: string) => {
    const goal = goals.find((g) => g.id === goalId);
    if (!goal) return;
    const subtasks = [...goal.subtasks, { id: crypto.randomUUID(), title, done: false, phaseTitle: "Milestones", kind: "milestone" as const }];
    await updateGoalSubtasks(goalId, subtasks);
  };

  const editSubtask = async (goalId: string, subtaskId: string, title: string) => {
    const goal = goals.find((g) => g.id === goalId);
    if (!goal) return;
    const subtasks = goal.subtasks.map((s) => (s.id === subtaskId ? { ...s, title } : s));
    await updateGoalSubtasks(goalId, subtasks);
  };

  const deleteSubtask = async (goalId: string, subtaskId: string) => {
    const goal = goals.find((g) => g.id === goalId);
    if (!goal) return;
    const subtasks = goal.subtasks.filter((s) => s.id !== subtaskId);
    await updateGoalSubtasks(goalId, subtasks);
  };

  const promoteSubtaskToGoal = async (goalId: string, subtaskId: string) => {
    const goal = goals.find((g) => g.id === goalId);
    const milestone = goal?.subtasks.find((s) => s.id === subtaskId);
    if (!goal || !milestone) return;

    const created = await goalsApi.create({
      title: milestone.title,
      description: `Promoted from milestone in "${goal.title}".`,
      deadline: goal.deadline || new Date(Date.now() + 60 * 86400000).toISOString().split("T")[0],
      priority: goal.priority,
      xpReward: Math.max(15, Math.round(goal.xpReward / 2)),
    });
    const subtasks = goal.subtasks.filter((s) => s.id !== subtaskId);
    await updateGoalSubtasks(goalId, subtasks, mapGoal(created));
  };

const handleDeleteGoal = async (goalId: string) => {
    await goalsApi.remove(goalId);
    setGoals((prev) => prev.filter((goal) => goal.id !== goalId));
    if (expandedGoal?.id === goalId) setExpandedGoal(null);
  };

  const handleEditGoalDeadline = async (goalId: string, deadline: string) => {
    const updated = await goalsApi.update(goalId, { deadline });
    const next = mapGoal(updated);
    setGoals((prev) => prev.map((g) => (g.id === goalId ? next : g)));
    if (expandedGoal?.id === goalId) setExpandedGoal(next);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 relative">
      {/* Background particles */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <FloatingParticles count={8} colors={["primary", "golden"]} />
      </div>

      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
      >
        <div>
          <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground">
            Your Life <span className="text-gradient-hero">Missions</span>
          </h1>
          <p className="text-muted-foreground mt-1 font-handwritten text-lg">Turn dreams into action</p>
        </div>
        <div className="flex items-center gap-3">
          {goals.length > 0 && (
            <div className="flex items-center gap-4 mr-2">
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Completed</p>
                <p className="font-display font-bold text-primary"><AnimatedCounter value={completedGoals} /></p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground">XP Earned</p>
                <p className="font-display font-bold text-golden"><AnimatedCounter value={xpEarned} /></p>
              </div>
            </div>
          )}
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button onClick={() => setShowAddDialog(true)} className="gradient-primary text-primary-foreground shadow-glow-primary rounded-xl">
              <Plus className="mr-2 h-4 w-4" /> New Mission
            </Button>
          </motion.div>
        </div>
      </motion.div>

      {goals.length > 0 ? (
        <div className="grid grid-cols-1 gap-6">
          <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-lg font-semibold text-foreground">Active Missions</h2>
                <Badge variant="secondary" className="rounded-full">{activeGoals.length}</Badge>
              </div>
      {activeGoals.length > 0 ? (
                activeGoals.map((goal, i) => (
                  <GoalCard
                    key={goal.id}
                    goal={goal}
                    index={i}
                    onToggleSubtask={toggleSubtask}
                    onExpand={setExpandedGoal}
                  />
                ))
              ) : (
                <Card className="rounded-2xl border border-border/60 bg-card shadow-sm">
                  <CardContent className="p-5 text-sm text-muted-foreground">No active missions. Your completed goals are shown below.</CardContent>
                </Card>
              )}
            </div>

            {achievedGoals.length > 0 && (
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setAchievedExpanded((prev) => !prev)}
                    className="flex items-center gap-2 text-left"
                  >
                    <h2 className="font-display text-lg font-semibold text-foreground">Achieved</h2>
                    <motion.span animate={{ rotate: achievedExpanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    </motion.span>
                  </button>
                  <Badge variant="secondary" className="rounded-full">{achievedGoals.length}</Badge>
                </div>
                <AnimatePresence initial={false}>
                  {achievedExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-3 overflow-hidden"
                    >
                      {achievedGoals.map((goal, i) => (
                  <GoalCard
                    key={goal.id}
                    goal={goal}
                    index={i}
                    onToggleSubtask={toggleSubtask}
                    onExpand={setExpandedGoal}
                  />
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </motion.div>

        </div>
      ) : (
        <EmptyGoalsState onAdd={() => setShowAddDialog(true)} />
      )}

      {/* Add Goal Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-md bg-card border border-border/60 shadow-lg">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Launch a new mission</DialogTitle>
            <DialogDescription>Set a meaningful goal and break it into steps.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <Input placeholder="Mission name..." value={newTitle} onChange={(e) => setNewTitle(e.target.value)} className="rounded-xl bg-background border-border/60" />
            <Textarea placeholder="Why does this mission matter to you?" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} className="rounded-xl min-h-[80px] bg-background border-border/60" />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Deadline</label>
                <Input type="date" value={newDeadline} onChange={(e) => setNewDeadline(e.target.value)} className="rounded-xl bg-background border-border/60" />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Priority</label>
                <div className="flex gap-1">
                  {(["low", "medium", "high"] as const).map((p) => (
                    <Button
                      key={p}
                      size="sm"
                      variant={newPriority === p ? "default" : "outline"}
                      onClick={() => setNewPriority(p)}
                      className={`flex-1 capitalize text-xs rounded-lg ${newPriority === p ? "gradient-primary text-primary-foreground" : "border-border/40"}`}
                    >
                      {p}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)} className="border-border/40">Cancel</Button>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button onClick={handleAddGoal} className="gradient-primary text-primary-foreground shadow-glow-primary" disabled={!newTitle.trim()}>
                <Rocket className="mr-2 h-4 w-4" /> Launch Mission
              </Button>
            </motion.div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Goal Detail Panel */}
      <GoalDetailPanel
        goal={expandedGoal}
        open={!!expandedGoal}
        onClose={() => setExpandedGoal(null)}
        onToggleSubtask={toggleSubtask}
        onAddSubtask={addSubtask}
        onEditSubtask={editSubtask}
        onDeleteSubtask={deleteSubtask}
        onPromoteSubtask={promoteSubtaskToGoal}
        onDeleteGoal={handleDeleteGoal}
        onEditDeadline={handleEditGoalDeadline}
      />


    </div>
  );
};

export default Goals;
