import mongoose from "mongoose";
import AIInsight from "../models/AIInsight.js";
import Goal from "../models/Goal.js";
import Notification from "../models/Notification.js";
import Task from "../models/Task.js";
import WeeklyReview from "../models/WeeklyReview.js";
import { createChatCompletion, isAiAvailable, safeJsonParse } from "./aiService.js";
import { awardXP } from "./gamificationService.js";
import { buildUserLifeContext } from "./lifeContextService.js";

const DEFAULT_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

const compact = (items = []) =>
  (Array.isArray(items) ? items : [])
    .map((item) => String(item || "").replace(/\s+/g, " ").trim())
    .filter(Boolean);

const unique = (items = [], max = 10) => Array.from(new Set(compact(items))).slice(0, max);

const clip = (value, max = 240) => {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (!text) return "";
  return text.length > max ? `${text.slice(0, max - 1).trim()}...` : text;
};

const objectIdOrNull = (value) => {
  const raw = value?._id || value?.id || value;
  if (!raw || !mongoose.Types.ObjectId.isValid(String(raw))) return null;
  return raw;
};

const toDateLabel = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
};

const getWeekBounds = (date = new Date()) => {
  const weekStart = new Date(date);
  weekStart.setHours(0, 0, 0, 0);
  const dayOffset = (weekStart.getDay() + 6) % 7;
  weekStart.setDate(weekStart.getDate() - dayOffset);

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  return { weekStart, weekEnd };
};

const normalizeDifficulty = (value, fallback = "medium") =>
  ["easy", "medium", "hard"].includes(String(value || "").toLowerCase())
    ? String(value).toLowerCase()
    : fallback;

const normalizeEffort = (value, fallback = "low") =>
  ["low", "medium", "high"].includes(String(value || "").toLowerCase())
    ? String(value).toLowerCase()
    : fallback;

const normalizeFrequency = (value, fallback = "once") =>
  ["daily", "weekly", "once"].includes(String(value || "").toLowerCase())
    ? String(value).toLowerCase()
    : fallback;

const normalizePriority = (value, fallback = "medium") =>
  ["low", "medium", "high"].includes(String(value || "").toLowerCase())
    ? String(value).toLowerCase()
    : fallback;

const buildContextDigest = (context) => ({
  userName: context.userName || "Explorer",
  generatedAt: context.generatedAt,
  mood: {
    label: context.emotional?.currentLabel || "unknown",
    trend: context.emotional?.trend || "unknown",
    averageScore: context.emotional?.averageScore || 0,
    daysSinceJournal: context.emotional?.daysSinceJournal ?? 999,
    lowMoodStreak: context.emotional?.lowMoodStreak || 0,
  },
  counts: {
    activeGoals: context.goals?.active?.length || 0,
    overdueGoals: context.goals?.overdue?.length || 0,
    stalledGoals: context.goals?.stalled?.length || 0,
    openTasks: context.tasks?.open?.length || 0,
    overdueTasks: context.tasks?.overdue?.length || 0,
    inconsistentHabits: context.habits?.inconsistent?.length || 0,
    proactiveSignals: context.proactive?.signals?.length || 0,
  },
  behaviorSignals: context.behavioral?.signals || [],
  executionFriction: context.behavioral?.executionFriction || [],
  memoryLines: context.memory?.summaryLines || [],
});

const deriveAdaptiveDifficulty = (context) => {
  const overdueTasks = context.tasks?.overdue?.length || 0;
  const stalledGoals = context.goals?.stalled?.length || 0;
  const moodDeclining = context.emotional?.trend === "declining" || Number(context.emotional?.lowMoodStreak || 0) >= 2;
  const stableExecution =
    overdueTasks === 0 &&
    stalledGoals === 0 &&
    ["improving", "stable"].includes(context.emotional?.trend) &&
    (context.habits?.inconsistent?.length || 0) === 0;

  if (moodDeclining || overdueTasks >= 3 || stalledGoals >= 2) return "easy";
  if (stableExecution && (context.goals?.active?.length || 0) > 0) return "hard";
  return "medium";
};

const suggestedTask = ({
  title,
  detail = "",
  effort = "low",
  frequency = "once",
  dueInDays = 2,
  priority = "medium",
  goalId = null,
  reason = "",
}) => ({
  title: clip(title, 140),
  detail: clip(detail, 600),
  effort: normalizeEffort(effort),
  frequency: normalizeFrequency(frequency),
  dueInDays: Math.max(0, Math.min(30, Number(dueInDays) || 2)),
  priority: normalizePriority(priority),
  goalId: objectIdOrNull(goalId),
  reason: clip(reason, 500),
  status: "suggested",
});

const buildSuggestedTasks = (context, difficulty) => {
  const tasks = [];
  const focusGoal = context.goals?.recommendedFocus;
  const journalGap = Number(context.emotional?.daysSinceJournal ?? 999);
  const overdueTask = context.tasks?.overdue?.[0];
  const inconsistentHabit = context.habits?.inconsistent?.[0];
  const moodDeclining = context.emotional?.trend === "declining" || Number(context.emotional?.lowMoodStreak || 0) >= 2;

  if (journalGap >= 3 && journalGap < 999) {
    tasks.push(
      suggestedTask({
        title: "Write a 7-minute reset journal",
        detail: "Capture what changed, what feels heavy, and one next action that would lower pressure.",
        effort: "low",
        frequency: "once",
        dueInDays: 1,
        priority: moodDeclining ? "high" : "medium",
        reason: `${journalGap} days passed since the last journal entry.`,
      })
    );
  }

  if (overdueTask) {
    tasks.push(
      suggestedTask({
        title: `Close or reschedule "${clip(overdueTask.title, 80)}"`,
        detail: "Either complete the smallest finishable version or give it a new realistic due date.",
        effort: difficulty === "easy" ? "low" : "medium",
        frequency: "once",
        dueInDays: 1,
        priority: "high",
        reason: "An overdue task is creating an open loop.",
      })
    );
  }

  if (focusGoal) {
    tasks.push(
      suggestedTask({
        title: `Complete one visible step for "${clip(focusGoal.title, 70)}"`,
        detail: "Pick a small deliverable someone could see or verify, not another planning note.",
        effort: difficulty === "hard" ? "medium" : "low",
        frequency: "once",
        dueInDays: 3,
        priority: "high",
        goalId: focusGoal._id,
        reason: context.goals?.overdue?.some((goal) => String(goal._id) === String(focusGoal._id))
          ? "This goal is overdue and needs a smaller restart."
          : "This is the best current focus goal.",
      })
    );
  }

  if (inconsistentHabit) {
    tasks.push(
      suggestedTask({
        title: `Do the minimum version of "${clip(inconsistentHabit.title, 70)}"`,
        detail: "Make the habit small enough to complete even on a crowded day.",
        effort: "low",
        frequency: "daily",
        dueInDays: 1,
        priority: "medium",
        reason: "Habit rhythm dropped and needs a lighter reset.",
      })
    );
  }

  if (moodDeclining) {
    tasks.push(
      suggestedTask({
        title: "Schedule one recovery block",
        detail: "Protect 20 minutes for rest, movement, prayer, breathing, or a quiet reset before adding more pressure.",
        effort: "low",
        frequency: "once",
        dueInDays: 1,
        priority: "medium",
        reason: "Mood signals suggest the coaching tone should become gentler this week.",
      })
    );
  }

  if (tasks.length === 0) {
    tasks.push(
      suggestedTask({
        title: "Choose the next proof of progress",
        detail: "Select one goal and define a concrete output you can finish this week.",
        effort: difficulty === "hard" ? "medium" : "low",
        frequency: "weekly",
        dueInDays: 4,
        priority: "medium",
        reason: "No major risk signal is active, so the next move is controlled progression.",
      })
    );
  }

  return tasks.slice(0, 5);
};

const buildPriorityOrder = (context) => {
  const goals = [...(context.goals?.overdue || []), ...(context.goals?.stalled || []), ...(context.goals?.active || [])];
  const seen = new Set();

  return goals
    .filter((goal) => {
      const key = String(goal?._id || goal?.id || goal?.title || "");
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 5)
    .map((goal) => ({
      goalId: objectIdOrNull(goal),
      title: clip(goal.title, 140),
      reason:
        (context.goals?.overdue || []).some((item) => String(item._id) === String(goal._id))
          ? "Deadline risk is highest."
          : (context.goals?.stalled || []).some((item) => String(item._id) === String(goal._id))
          ? "Momentum has stalled."
          : "This goal is active and ready for the next step.",
      recommendedAction: `Define the next visible action for "${clip(goal.title, 80)}".`,
    }));
};

const buildGoalAdjustments = (context, difficulty) => {
  const seen = new Set();
  const riskyGoals = [...(context.goals?.overdue || []), ...(context.goals?.stalled || []), ...(context.goals?.inactive || [])]
    .filter((goal) => {
      const key = String(goal?._id || goal?.id || goal?.title || "");
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 5);

  return riskyGoals.map((goal) => ({
    goalId: objectIdOrNull(goal),
    goalTitle: clip(goal.title, 140),
    adjustment:
      difficulty === "easy"
        ? "Reduce scope to one low-effort task with a short deadline."
        : difficulty === "hard"
        ? "Increase challenge by adding one measurable deliverable."
        : "Keep the goal active with one concrete weekly deliverable.",
    reason: goal.deadline && new Date(goal.deadline) < new Date()
      ? "The deadline has passed without completion."
      : Number(goal.progress || 0) <= 10
      ? "Progress is still near the starting line."
      : "The goal has not moved recently.",
    difficultyChange: difficulty === "easy" ? "reduce" : difficulty === "hard" ? "increase" : "maintain",
  }));
};

const buildFallbackWeeklyReview = (context, previousReview = null) => {
  const difficulty = deriveAdaptiveDifficulty(context);
  const digest = buildContextDigest(context);
  const focusGoal = context.goals?.recommendedFocus;
  const moodDeclining = context.emotional?.trend === "declining" || Number(context.emotional?.lowMoodStreak || 0) >= 2;
  const hasOverload = (context.tasks?.overdue?.length || 0) >= 3 || (context.goals?.stalled?.length || 0) >= 2;
  const completedGoalCount = context.goals?.completed?.length || 0;
  const consistentHabitCount = context.habits?.consistent?.length || 0;
  const memoryWins = context.memory?.profile?.recentWins || [];

  const whatImproved = unique(
    [
      completedGoalCount > 0 ? `${completedGoalCount} completed goal signal is now part of the record.` : "",
      consistentHabitCount > 0 ? `${consistentHabitCount} habits are still holding rhythm.` : "",
      context.emotional?.trend === "improving" ? "Mood trend is improving compared with recent entries." : "",
      memoryWins[0] ? `Recent win: ${memoryWins[0]}` : "",
    ],
    4
  );

  const whatFailed = unique(
    [
      digest.counts.overdueTasks > 0 ? `${digest.counts.overdueTasks} overdue tasks are still open.` : "",
      digest.counts.stalledGoals > 0 ? `${digest.counts.stalledGoals} goals have not moved recently.` : "",
      digest.mood.daysSinceJournal >= 3 && digest.mood.daysSinceJournal < 999
        ? `Journaling dropped for ${digest.mood.daysSinceJournal} days.`
        : "",
      digest.counts.inconsistentHabits > 0 ? `${digest.counts.inconsistentHabits} habits lost rhythm.` : "",
      moodDeclining ? "Mood signals are declining, so pressure should be lowered." : "",
    ],
    5
  );

  const whyItHappened = unique(
    [
      hasOverload ? "The system is carrying too many open loops at once." : "",
      moodDeclining ? "Emotional load is likely reducing available execution energy." : "",
      context.behavioral?.executionFriction?.[0] || "",
      context.memory?.profile?.recurringStruggles?.[0]
        ? `Recurring struggle: ${context.memory.profile.recurringStruggles[0]}.`
        : "",
      previousReview?.adaptivePlan?.difficulty === "easy" && difficulty === "easy"
        ? "The previous review already reduced difficulty, so the next plan should stay small."
        : "",
    ],
    5
  );

  const nextWeekFocus = focusGoal
    ? `Move "${clip(focusGoal.title, 100)}" with one visible deliverable.`
    : "Rebuild rhythm with one journal entry, one task close, and one small win.";

  return {
    contextDigest: digest,
    review: {
      headline: hasOverload
        ? "This week needs simplification"
        : difficulty === "hard"
        ? "This week is ready for a stronger challenge"
        : "This week needs focused momentum",
      transformationSummary: `The user is moving from scattered intention toward an adaptive execution rhythm with ${digest.counts.activeGoals} active goals, ${digest.counts.openTasks} open tasks, and a ${digest.mood.trend} mood trend.`,
      whatImproved: whatImproved.length ? whatImproved : ["Enough context exists to choose a clearer next move."],
      whatFailed: whatFailed.length ? whatFailed : ["No major failure signal is visible this week."],
      whyItHappened: whyItHappened.length ? whyItHappened : ["Progress depends on turning broad goals into visible next actions."],
      patternExplanation:
        context.behavioral?.signals?.[0] ||
        "The main pattern is the gap between intention and the next small visible action.",
      nextWeekFocus,
      coachingTone: moodDeclining ? "gentle" : hasOverload ? "simplifying" : difficulty === "hard" ? "challenging" : "steady",
    },
    adaptivePlan: {
      difficulty,
      strategy:
        difficulty === "easy"
          ? "Lower cognitive load, reduce scope, and rebuild trust through fast completions."
          : difficulty === "hard"
          ? "Add measurable challenge while keeping the user focused on one priority lane."
          : "Keep difficulty stable and convert active goals into weekly deliverables.",
      priorityOrder: buildPriorityOrder(context),
      generatedTasks: buildSuggestedTasks(context, difficulty),
      goalAdjustments: buildGoalAdjustments(context, difficulty),
    },
    metrics: [
      {
        label: "Open tasks",
        value: String(digest.counts.openTasks),
        interpretation:
          digest.counts.overdueTasks > 0
            ? `${digest.counts.overdueTasks} need closing or rescheduling.`
            : "No overdue task pressure detected.",
      },
      {
        label: "Journal gap",
        value: digest.mood.daysSinceJournal >= 999 ? "none yet" : `${digest.mood.daysSinceJournal} days`,
        interpretation:
          digest.mood.daysSinceJournal >= 3 && digest.mood.daysSinceJournal < 999
            ? "Reflection rhythm needs a restart."
            : "Reflection rhythm is not a major risk signal.",
      },
      {
        label: "Mood trend",
        value: digest.mood.trend,
        interpretation: moodDeclining ? "Use a gentler coaching tone." : "Tone can stay execution-focused.",
      },
    ],
    proactiveSignals: context.proactive?.signals || [],
    personalizationEvidence: unique(
      [
        ...digest.behaviorSignals,
        ...digest.executionFriction,
        ...digest.memoryLines,
        focusGoal?.title ? `Recommended focus: ${focusGoal.title}` : "",
      ],
      8
    ),
    failureAdjustments: [
      "If fewer than half of suggested tasks are completed, reduce next week's plan to two low-effort actions.",
      "If mood continues declining, prioritize recovery and reflection before productivity tasks.",
      "If overdue tasks increase, close, delete, or reschedule open loops before adding new goals.",
    ],
    progressionTriggers: [
      "Increase difficulty after 5 completed tasks in 7 days.",
      "Add a harder deliverable when there are no overdue tasks and mood is stable or improving.",
      "Move from planning to challenge mode when the focus goal gains visible progress.",
    ],
  };
};

const schemaExample = {
  review: {
    headline: "",
    transformationSummary: "",
    whatImproved: [""],
    whatFailed: [""],
    whyItHappened: [""],
    patternExplanation: "",
    nextWeekFocus: "",
    coachingTone: "gentle|steady|challenging|simplifying",
  },
  adaptivePlan: {
    difficulty: "easy|medium|hard",
    strategy: "",
    priorityOrder: [{ goalId: "", title: "", reason: "", recommendedAction: "" }],
    generatedTasks: [
      {
        title: "",
        detail: "",
        effort: "low|medium|high",
        frequency: "daily|weekly|once",
        dueInDays: 2,
        priority: "low|medium|high",
        goalId: "",
        reason: "",
      },
    ],
    goalAdjustments: [{ goalId: "", goalTitle: "", adjustment: "", reason: "", difficultyChange: "reduce|maintain|increase" }],
  },
  metrics: [{ label: "", value: "", interpretation: "" }],
  personalizationEvidence: [""],
  failureAdjustments: [""],
  progressionTriggers: [""],
};

const buildAiPrompt = ({ context, fallback, previousReview }) => [
  "You are the AI Life System Engine inside a LifeOS product.",
  "Your job is not motivational text. Your job is adaptive execution management.",
  "Use only the provided context. Be specific and product-level.",
  "If completion is weak, simplify. If consistency is strong, increase challenge. If mood drops, change coaching tone.",
  "Return only valid JSON with this exact shape:",
  JSON.stringify(schemaExample),
  "",
  "Current life context digest:",
  JSON.stringify(fallback.contextDigest, null, 2),
  "",
  "Active goals:",
  JSON.stringify(
    (context.goals?.active || []).slice(0, 8).map((goal) => ({
      goalId: String(goal._id || goal.id || ""),
      title: goal.title,
      progress: goal.progress,
      deadline: toDateLabel(goal.deadline),
      updatedAt: toDateLabel(goal.updatedAt),
    })),
    null,
    2
  ),
  "",
  "Open and overdue tasks:",
  JSON.stringify(
    {
      open: (context.tasks?.open || []).slice(0, 8).map((task) => ({
        title: task.title,
        dueDate: toDateLabel(task.dueDate),
        priority: task.priority,
      })),
      overdue: (context.tasks?.overdue || []).slice(0, 8).map((task) => ({
        title: task.title,
        dueDate: toDateLabel(task.dueDate),
        priority: task.priority,
      })),
    },
    null,
    2
  ),
  "",
  "Recent journal and memory signals:",
  JSON.stringify(
    {
      latestJournal: context.recentJournalSummary,
      memoryLines: context.memory?.summaryLines || [],
      recurringStruggles: context.memory?.profile?.recurringStruggles || [],
      motivationTriggers: context.memory?.profile?.motivationTriggers || [],
    },
    null,
    2
  ),
  "",
  "Previous weekly review:",
  JSON.stringify(previousReview?.review || null, null, 2),
  "",
  "Fallback deterministic review to improve, not ignore:",
  JSON.stringify(fallback, null, 2),
].join("\n");

const normalizeGeneratedTask = (task, fallbackTask = {}) =>
  suggestedTask({
    title: task?.title || task?.task || fallbackTask.title || "Complete one visible next action",
    detail: task?.detail || task?.description || fallbackTask.detail || "",
    effort: task?.effort || fallbackTask.effort || "low",
    frequency: task?.frequency || fallbackTask.frequency || "once",
    dueInDays: task?.dueInDays ?? fallbackTask.dueInDays ?? 2,
    priority: task?.priority || fallbackTask.priority || "medium",
    goalId: task?.goalId || fallbackTask.goalId || null,
    reason: task?.reason || fallbackTask.reason || "",
  });

const normalizeReviewPayload = (payload = {}, fallback) => {
  const review = payload.review || {};
  const adaptivePlan = payload.adaptivePlan || {};
  const fallbackTasks = fallback.adaptivePlan.generatedTasks || [];
  const generatedTasks = (Array.isArray(adaptivePlan.generatedTasks) ? adaptivePlan.generatedTasks : fallbackTasks)
    .map((task, index) => normalizeGeneratedTask(task, fallbackTasks[index]))
    .filter((task) => task.title)
    .slice(0, 6);

  return {
    contextDigest: fallback.contextDigest,
    review: {
      headline: clip(review.headline || fallback.review.headline, 160),
      transformationSummary: clip(review.transformationSummary || fallback.review.transformationSummary, 600),
      whatImproved: unique(review.whatImproved || fallback.review.whatImproved, 6),
      whatFailed: unique(review.whatFailed || fallback.review.whatFailed, 6),
      whyItHappened: unique(review.whyItHappened || fallback.review.whyItHappened, 6),
      patternExplanation: clip(review.patternExplanation || fallback.review.patternExplanation, 700),
      nextWeekFocus: clip(review.nextWeekFocus || fallback.review.nextWeekFocus, 300),
      coachingTone: clip(review.coachingTone || fallback.review.coachingTone, 60),
    },
    adaptivePlan: {
      difficulty: normalizeDifficulty(adaptivePlan.difficulty, fallback.adaptivePlan.difficulty),
      strategy: clip(adaptivePlan.strategy || fallback.adaptivePlan.strategy, 700),
      priorityOrder: (Array.isArray(adaptivePlan.priorityOrder) ? adaptivePlan.priorityOrder : fallback.adaptivePlan.priorityOrder)
        .map((item) => ({
          goalId: objectIdOrNull(item?.goalId),
          title: clip(item?.title, 140),
          reason: clip(item?.reason, 400),
          recommendedAction: clip(item?.recommendedAction, 400),
        }))
        .filter((item) => item.title)
        .slice(0, 5),
      generatedTasks,
      goalAdjustments: (Array.isArray(adaptivePlan.goalAdjustments) ? adaptivePlan.goalAdjustments : fallback.adaptivePlan.goalAdjustments)
        .map((item) => ({
          goalId: objectIdOrNull(item?.goalId),
          goalTitle: clip(item?.goalTitle, 140),
          adjustment: clip(item?.adjustment, 400),
          reason: clip(item?.reason, 400),
          difficultyChange: ["reduce", "maintain", "increase"].includes(item?.difficultyChange)
            ? item.difficultyChange
            : fallback.adaptivePlan.difficulty === "easy"
            ? "reduce"
            : fallback.adaptivePlan.difficulty === "hard"
            ? "increase"
            : "maintain",
        }))
        .filter((item) => item.goalTitle || item.adjustment)
        .slice(0, 5),
    },
    metrics: (Array.isArray(payload.metrics) ? payload.metrics : fallback.metrics)
      .map((metric) => ({
        label: clip(metric?.label, 80),
        value: clip(metric?.value, 80),
        interpretation: clip(metric?.interpretation, 240),
      }))
      .filter((metric) => metric.label)
      .slice(0, 8),
    proactiveSignals: fallback.proactiveSignals,
    personalizationEvidence: unique(payload.personalizationEvidence || fallback.personalizationEvidence, 10),
    failureAdjustments: unique(payload.failureAdjustments || fallback.failureAdjustments, 6),
    progressionTriggers: unique(payload.progressionTriggers || fallback.progressionTriggers, 6),
  };
};

const mapWeeklyReview = (review, reused = false) => {
  if (!review) return null;
  const raw = typeof review.toObject === "function" ? review.toObject() : review;
  return {
    ...raw,
    id: raw._id,
    reused,
  };
};

const persistReviewInsight = async ({ userId, review }) => {
  if (!review?._id) return null;
  const weekStartKey = new Date(review.weekStart).toISOString().slice(0, 10);

  return AIInsight.findOneAndUpdate(
    {
      user: userId,
      topic: "weekly_life_review",
      type: "weekly_review",
      "metadata.weekStart": weekStartKey,
    },
    {
      $set: {
        value: review.review?.headline || "Weekly review",
        confidence: review.source === "ai" ? 0.82 : 0.64,
        active: true,
        sourceType: "weekly_review",
        sourceRef: review._id,
        lastObservedAt: new Date(),
        prompt: "Weekly life review generated from LifeOS context.",
        response: JSON.stringify({
          review: review.review,
          adaptivePlan: review.adaptivePlan,
          metrics: review.metrics,
        }),
        model: review.model || review.source || "weekly_review_engine",
        metadata: {
          weekStart: weekStartKey,
          reviewId: review._id,
          source: review.source,
          difficulty: review.adaptivePlan?.difficulty,
          contextDigest: review.contextDigest,
        },
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
};

export const generateWeeklyLifeReview = async ({ userId, force = false } = {}) => {
  const { weekStart, weekEnd } = getWeekBounds();

  if (!force) {
    const existing = await WeeklyReview.findOne({ user: userId, weekStart }).sort({ updatedAt: -1 });
    if (existing) return mapWeeklyReview(existing, true);
  }

  const [context, previousReview] = await Promise.all([
    buildUserLifeContext(userId),
    WeeklyReview.findOne({ user: userId, weekStart: { $lt: weekStart } }).sort({ weekStart: -1 }).lean(),
  ]);
  const fallback = buildFallbackWeeklyReview(context, previousReview);
  let normalized = fallback;
  let source = "fallback";
  let model = "weekly_review_engine";

  if (isAiAvailable()) {
    try {
      const raw = await createChatCompletion(
        [
          {
            role: "system",
            content:
              "You are a product-level AI life companion. Think strategically, but output only valid JSON.",
          },
          { role: "user", content: buildAiPrompt({ context, fallback, previousReview }) },
        ],
        { temperature: 0.35, response_format: { type: "json_object" } }
      );
      const parsed = safeJsonParse(raw);
      normalized = normalizeReviewPayload(parsed, fallback);
      source = "ai";
      model = DEFAULT_MODEL;
    } catch (error) {
      console.error("Weekly review AI generation failed:", error);
      normalized = fallback;
      source = "hybrid";
      model = "weekly_review_engine";
    }
  }

  const review = await WeeklyReview.findOneAndUpdate(
    { user: userId, weekStart },
    {
      $set: {
        user: userId,
        weekStart,
        weekEnd,
        status: "active",
        source,
        model,
        reused: false,
        contextDigest: normalized.contextDigest,
        review: normalized.review,
        adaptivePlan: normalized.adaptivePlan,
        metrics: normalized.metrics,
        proactiveSignals: normalized.proactiveSignals,
        personalizationEvidence: normalized.personalizationEvidence,
        failureAdjustments: normalized.failureAdjustments,
        progressionTriggers: normalized.progressionTriggers,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  await persistReviewInsight({ userId, review });
  return mapWeeklyReview(review, false);
};

export const getLatestWeeklyLifeReview = async ({ userId, ensure = true } = {}) => {
  const latest = await WeeklyReview.findOne({ user: userId }).sort({ weekStart: -1, createdAt: -1 });
  if (latest) return mapWeeklyReview(latest, false);
  if (!ensure) return null;
  return generateWeeklyLifeReview({ userId, force: false });
};

const buildTaskDescription = (task) =>
  compact([
    task.detail,
    task.reason ? `Why this matters: ${task.reason}` : "",
    task.frequency ? `Cadence: ${task.frequency}` : "",
  ]).join("\n");

export const applyWeeklyLifeReview = async ({ userId, reviewId = null, maxTasks = 5 } = {}) => {
  let review = reviewId
    ? await WeeklyReview.findOne({ _id: reviewId, user: userId })
    : await WeeklyReview.findOne({ user: userId }).sort({ weekStart: -1, createdAt: -1 });

  if (!review) {
    review = await WeeklyReview.findById((await generateWeeklyLifeReview({ userId })).id);
  }

  if (!review) {
    return { review: null, createdTasks: [] };
  }

  const suggestedTasks = (review.adaptivePlan?.generatedTasks || [])
    .filter((task) => task.status !== "created" && task.status !== "dismissed")
    .slice(0, Math.max(1, Math.min(10, Number(maxTasks) || 5)));

  const createdTasks = [];

  for (const taskSpec of suggestedTasks) {
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + Math.max(0, Math.min(30, Number(taskSpec.dueInDays) || 2)));

    const goalId = objectIdOrNull(taskSpec.goalId);
    const task = await Task.create({
      user: userId,
      title: taskSpec.title,
      description: buildTaskDescription(taskSpec),
      dueDate,
      priority: normalizePriority(taskSpec.priority),
      goal: goalId,
    });

    taskSpec.status = "created";
    taskSpec.createdTaskId = task._id;
    createdTasks.push(task);
    review.createdTaskIds.addToSet(task._id);
  }

  if (createdTasks.length > 0) {
    review.status = "applied";
    review.appliedAt = new Date();
    review.markModified("adaptivePlan.generatedTasks");
    await review.save();
  }

  const notificationExists = await Notification.findOne({
    recipient: userId,
    type: "ai_reminder",
    "data.weeklyReviewId": review._id,
  });

  if (!notificationExists) {
    await Notification.create({
      user: userId,
      recipient: userId,
      actor: userId,
      type: "ai_reminder",
      title: "AI weekly focus",
      message: review.review?.nextWeekFocus || "Your AI companion prepared a weekly focus plan.",
      data: {
        weeklyReviewId: review._id,
        source: "weekly_review",
        createdTaskCount: createdTasks.length,
        difficulty: review.adaptivePlan?.difficulty,
      },
    });
  }

  return {
    review: mapWeeklyReview(review, false),
    createdTasks,
  };
};

export const createGoalFromDreamPlan = async ({ userId, plan }) => {
  const candidate = plan?.storageReadyGoals?.[0];
  if (!candidate?.title) return null;

  const subtasks = (Array.isArray(candidate.subtasks) ? candidate.subtasks : [])
    .map((subtask) => ({
      title: clip(subtask?.title || subtask?.task || subtask, 140),
      done: Boolean(subtask?.done),
      phaseTitle: clip(subtask?.phaseTitle || "", 140),
      kind: subtask?.kind === "action" ? "action" : "milestone",
    }))
    .filter((subtask) => subtask.title)
    .slice(0, 30);

  const goal = await Goal.create({
    user: userId,
    userId,
    title: clip(candidate.title, 160),
    description: clip(candidate.description || plan?.interpretation?.summary || "", 1000),
    category: candidate.category || "Personal",
    priority: normalizePriority(candidate.priority, "medium"),
    subtasks,
    steps: subtasks.map((subtask) => ({
      text: subtask.title,
      completed: subtask.done,
      phaseTitle: subtask.phaseTitle,
      kind: subtask.kind,
    })),
    roadmap: candidate.roadmap,
    progress: 0,
    completed: false,
  });

  await awardXP(userId, "goal_created", "Goal", goal._id).catch(() => null);
  return goal;
};
