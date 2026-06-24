import User from "../models/User.js";
import Goal from "../models/Goal.js";
import Task from "../models/Task.js";
import Habit from "../models/Habit.js";
import MoodEntry from "../models/MoodEntry.js";
import JournalEntry from "../models/JournalEntry.js";
import VisionBoard from "../models/VisionBoard.js";
import VisionItem from "../models/VisionItem.js";
import AIInsight from "../models/AIInsight.js";
import { getLifeMemoryProfile, MEMORY_TOPICS } from "./lifeMemoryService.js";

const moodScoreMap = {
  low: 2,
  sadness: 2,
  burnout: 2,
  overwhelm: 3,
  anxiety: 3,
  meh: 4,
  confusion: 4,
  okay: 5,
  neutral: 5,
  reflective: 6,
  calm: 7,
  good: 7,
  hope: 8,
  grateful: 8,
  gratitude: 8,
  happy: 8,
  excitement: 9,
  excited: 9,
  great: 9,
};

const severityRank = {
  high: 3,
  medium: 2,
  low: 1,
};

const compact = (items) => items.filter(Boolean).map((item) => String(item).trim()).filter(Boolean);
const unique = (items) => Array.from(new Set(compact(items)));

const clip = (value, max = 180) => {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (!text) return "";
  return text.length > max ? `${text.slice(0, max - 1).trim()}...` : text;
};

const formatDate = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
};

const dateDaysAgo = (days) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
};

const daysBetween = (later, earlier) => {
  const left = new Date(later);
  const right = new Date(earlier);
  if (Number.isNaN(left.getTime()) || Number.isNaN(right.getTime())) return 999;
  return Math.max(0, Math.floor((left.getTime() - right.getTime()) / (1000 * 60 * 60 * 24)));
};

const average = (values) => (values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0);

const describeMoodScore = (score) => {
  if (score >= 7.5) return "hopeful and energized";
  if (score >= 6) return "steady with some emotional weight";
  if (score >= 4.5) return "mixed and somewhat strained";
  return "heavy, stressed, or emotionally depleted";
};

const habitExpectedGapDays = (habit) => {
  const frequency = String(habit?.frequency || "daily").toLowerCase();
  if (frequency === "weekly") return 8;
  if (frequency === "monthly") return 35;
  return 2;
};

export const buildMemorySummaryLines = (memoryProfile) =>
  unique([
    memoryProfile.personalityTraits[0]
      ? `Personality signal: ${clip(memoryProfile.personalityTraits[0], 120)}`
      : "",
    memoryProfile.values[0] ? `Core value: ${clip(memoryProfile.values[0], 120)}` : "",
    memoryProfile.fears[0] ? `Recurring fear: ${clip(memoryProfile.fears[0], 120)}` : "",
    memoryProfile.emotionPatterns[0] ? `Stress pattern: ${clip(memoryProfile.emotionPatterns[0], 140)}` : "",
    memoryProfile.goalPatterns[0] ? `Goal pattern: ${clip(memoryProfile.goalPatterns[0], 140)}` : "",
    memoryProfile.habitPatterns[0] ? `Habit pattern: ${clip(memoryProfile.habitPatterns[0], 140)}` : "",
    memoryProfile.motivationTriggers[0] ? `Motivation trigger: ${clip(memoryProfile.motivationTriggers[0], 140)}` : "",
  ]).slice(0, 7);

const deriveGoalIntelligence = (goals) => {
  const now = new Date();
  const activeGoals = goals.filter((goal) => !(goal.completed || goal.progress >= 100));
  const completedGoals = goals.filter((goal) => goal.completed || goal.progress >= 100);
  const overdueGoals = activeGoals.filter((goal) => goal.deadline && new Date(goal.deadline) < now);
  const stalledGoals = activeGoals.filter((goal) => daysBetween(now, goal.updatedAt || goal.createdAt) >= 10);
  const inactiveGoals = activeGoals.filter((goal) => Number(goal.progress || 0) <= 10 && daysBetween(now, goal.createdAt) >= 14);

  const decompositionHints = unique([
    overdueGoals.length > 0 ? "Shrink overdue goals into one visible next action for this week." : "",
    stalledGoals.length > 0 ? "Restart stalled goals with the smallest milestone that can be finished quickly." : "",
    inactiveGoals.length > 0 ? "Convert inactive goals into time-bound tasks with a deadline and one owner." : "",
  ]).slice(0, 4);

  return {
    activeGoals,
    completedGoals,
    overdueGoals,
    stalledGoals,
    inactiveGoals,
    recommendedFocus: overdueGoals[0] || stalledGoals[0] || activeGoals[0] || null,
    decompositionHints,
  };
};

const deriveHabitIntelligence = (habits) => {
  const now = new Date();
  const activeHabits = habits.filter((habit) => habit.isActive !== false);
  const inconsistentHabits = activeHabits.filter((habit) => {
    if (!habit.lastCompletedAt) return true;
    return daysBetween(now, habit.lastCompletedAt) > habitExpectedGapDays(habit);
  });
  const consistentHabits = activeHabits.filter((habit) => !inconsistentHabits.some((item) => String(item._id) === String(habit._id)));

  const suggestedMicroHabits = unique(
    inconsistentHabits.slice(0, 3).map((habit) => `Reduce "${clip(habit.title, 80)}" to one minimum rep until consistency returns.`)
  ).slice(0, 3);

  return {
    activeHabits,
    consistentHabits,
    inconsistentHabits,
    suggestedMicroHabits,
  };
};

const deriveEmotionalSignals = ({ recentJournals, moodEntries, memoryProfile }) => {
  const journalMoodPoints = recentJournals.map((entry) => ({
    label: String(entry.mood || "").toLowerCase(),
    date: formatDate(entry.createdAt),
  }));
  const explicitMoodPoints = moodEntries.map((entry) => ({
    label: String(entry.mood || "").toLowerCase(),
    date: entry.date || formatDate(entry.createdAt),
  }));
  const moodByDate = new Map();
  [...journalMoodPoints, ...explicitMoodPoints].forEach((point) => {
    if (point.date) moodByDate.set(point.date, point.label);
  });
  const points = [...moodByDate.entries()]
    .map(([date, label]) => ({
      date,
      label,
      score: moodScoreMap[label] || 5,
    }))
    .sort((left, right) => String(left.date).localeCompare(String(right.date)));

  const scores = points.map((point) => point.score);
  const recentScores = scores.slice(-7);
  const previousScores = scores.slice(-14, -7);
  const averageScore = average(recentScores.length ? recentScores : scores);
  const delta = average(recentScores) - average(previousScores);
  const trend = delta > 0.7 ? "improving" : delta < -0.7 ? "declining" : scores.length > 0 ? "stable" : "unknown";

  let lowMoodStreak = 0;
  for (const point of [...points].reverse()) {
    if (point.score <= 4) {
      lowMoodStreak += 1;
      continue;
    }
    break;
  }

  return {
    currentLabel: recentJournals[0]?.mood || moodEntries[0]?.mood || memoryProfile.recurringEmotions[0] || "unknown",
    averageScore: Number(averageScore.toFixed(2)),
    trend,
    description: describeMoodScore(averageScore),
    dominantEmotion: memoryProfile.recurringEmotions[0] || recentJournals[0]?.mood || moodEntries[0]?.mood || "unknown",
    lowMoodStreak,
    history: points.slice(-14),
  };
};

const deriveBehaviorSignals = ({ daysSinceJournal, goalIntel, taskIntel, habitIntel, memoryProfile }) =>
  unique([
    daysSinceJournal >= 3 && daysSinceJournal < 999 ? `${daysSinceJournal} days since the last journal entry` : "",
    goalIntel.overdueGoals.length > 0 ? `${goalIntel.overdueGoals.length} goals are overdue and creating pressure` : "",
    goalIntel.stalledGoals.length > 0 ? `${goalIntel.stalledGoals.length} goals look stalled` : "",
    taskIntel.overdue.length > 0 ? `${taskIntel.overdue.length} overdue tasks are increasing friction` : "",
    habitIntel.inconsistentHabits.length > 0 ? `${habitIntel.inconsistentHabits.length} habits need a gentler reset` : "",
    memoryProfile.recurringStruggles[0] ? `Recurring struggle: ${clip(memoryProfile.recurringStruggles[0], 120)}` : "",
  ]).slice(0, 8);

export const deriveProactiveSignals = ({ daysSinceJournal, emotional, goalIntel, taskIntel, habitIntel }) => {
  const signals = [];

  if (daysSinceJournal >= 3 && daysSinceJournal < 999) {
    signals.push({
      code: "journal_gap",
      severity: daysSinceJournal >= 7 ? "high" : "medium",
      title: "Reflection gap detected",
      reason: `There has been a ${daysSinceJournal}-day gap since the last journal entry.`,
      suggestedAction: "Send a short reflection prompt that lowers the pressure to restart.",
    });
  }

  if (emotional.lowMoodStreak >= 2 || (emotional.trend === "declining" && ["sadness", "anxiety", "burnout", "overwhelm"].includes(String(emotional.dominantEmotion).toLowerCase()))) {
    signals.push({
      code: "repeated_low_mood",
      severity: emotional.lowMoodStreak >= 3 ? "high" : "medium",
      title: "Repeated emotional heaviness",
      reason: `Recent mood signals suggest ${emotional.dominantEmotion || "a low season"} with a ${emotional.trend} trend.`,
      suggestedAction: "Offer a small uplifting challenge and a gentler tone before pushing productivity.",
    });
  }

  if (goalIntel.overdueGoals.length > 0 || goalIntel.stalledGoals.length > 0) {
    signals.push({
      code: "goal_stall",
      severity: goalIntel.overdueGoals.length > 0 ? "high" : "medium",
      title: "Goal momentum is slipping",
      reason: `${goalIntel.overdueGoals.length} goals are overdue and ${goalIntel.stalledGoals.length} are stalled.`,
      suggestedAction: "Break one important goal into one concrete task for the next 24 hours.",
    });
  }

  if (habitIntel.inconsistentHabits.length > 0) {
    signals.push({
      code: "habit_inconsistency",
      severity: habitIntel.inconsistentHabits.length >= 2 ? "medium" : "low",
      title: "Habit inconsistency detected",
      reason: `${habitIntel.inconsistentHabits.length} active habits have lost their expected rhythm.`,
      suggestedAction: "Reset the habit floor to a micro-version instead of pushing full intensity.",
    });
  }

  if (taskIntel.overdue.length >= 3) {
    signals.push({
      code: "overload_risk",
      severity: "high",
      title: "Open-loop overload risk",
      reason: `${taskIntel.overdue.length} overdue tasks suggest the system is carrying too much at once.`,
      suggestedAction: "Reduce the user's visible focus to one recovery task today.",
    });
  }

  return signals.sort((left, right) => severityRank[right.severity] - severityRank[left.severity]);
};

export const buildUserLifeContext = async (userId) => {
  const thirtyDaysAgo = dateDaysAgo(30);
  const now = new Date();

  const [
    user,
    recentJournals,
    moodEntries,
    goals,
    tasks,
    habits,
    visions,
    boards,
    recentInsights,
    memoryProfile,
  ] = await Promise.all([
    User.findById(userId).select("name").lean(),
    JournalEntry.find({ user: userId }).sort({ createdAt: -1 }).limit(6).select("title content mood createdAt date").lean(),
    MoodEntry.find({ user: userId }).sort({ date: -1, createdAt: -1 }).limit(30).select("mood date source createdAt").lean(),
    Goal.find({ user: userId }).sort({ deadline: 1, updatedAt: -1, createdAt: -1 }).limit(20).select("title description progress completed deadline createdAt updatedAt category").lean(),
    Task.find({ user: userId }).sort({ dueDate: 1, updatedAt: -1, createdAt: -1 }).limit(30).select("title description completed dueDate createdAt updatedAt priority").lean(),
    Habit.find({ user: userId, isActive: true }).sort({ updatedAt: -1, streak: -1 }).limit(12).select("title description frequency targetCount streak lastCompletedAt isActive updatedAt").lean(),
    VisionItem.find({ user: userId, achieved: false }).sort({ createdAt: -1 }).limit(8).select("title description category targetYear motivation").lean(),
    VisionBoard.find({ $or: [{ user: userId }, { sharedWith: userId }] }).sort({ createdAt: -1 }).limit(4).select("title").lean(),
    AIInsight.find({ user: userId, topic: { $nin: [MEMORY_TOPICS.LIFE_MEMORY] }, createdAt: { $gte: thirtyDaysAgo } })
      .sort({ createdAt: -1 })
      .limit(8)
      .select("topic response metadata createdAt")
      .lean(),
    getLifeMemoryProfile(userId),
  ]);

  const latestJournalDate = recentJournals[0]?.createdAt || null;
  const daysSinceJournal = latestJournalDate ? daysBetween(now, latestJournalDate) : 999;
  const emotional = deriveEmotionalSignals({ recentJournals, moodEntries, memoryProfile });
  const goalIntel = deriveGoalIntelligence(goals);
  const habitIntel = deriveHabitIntelligence(habits);

  const openTasks = tasks.filter((task) => !task.completed);
  const overdueTasks = openTasks.filter((task) => task.dueDate && new Date(task.dueDate) < now);
  const taskIntel = {
    open: openTasks,
    overdue: overdueTasks,
    nextActions: openTasks.slice(0, 5),
  };

  const behavioralSignals = deriveBehaviorSignals({
    daysSinceJournal,
    goalIntel,
    taskIntel,
    habitIntel,
    memoryProfile,
  });

  const proactiveSignals = deriveProactiveSignals({
    daysSinceJournal,
    emotional,
    goalIntel,
    taskIntel,
    habitIntel,
  });

  const recentJournalSummary = recentJournals[0]
    ? `Latest journal "${clip(recentJournals[0].title || "Untitled", 80)}" feels ${recentJournals[0].mood || "neutral"} and says: ${clip(recentJournals[0].content, 180)}`
    : "No recent journal entry is available.";

  const reflectionSummaries = recentInsights
    .map((insight) => insight?.metadata?.summary || insight?.response || "")
    .filter(Boolean)
    .map((value) => clip(value, 180))
    .slice(0, 6);

  return {
    userId,
    userName: user?.name || "Explorer",
    generatedAt: now.toISOString(),
    recentJournals,
    reflectionSummaries,
    recentJournalSummary,
    emotional: {
      ...emotional,
      daysSinceJournal,
    },
    goals: {
      active: goalIntel.activeGoals,
      overdue: goalIntel.overdueGoals,
      stalled: goalIntel.stalledGoals,
      inactive: goalIntel.inactiveGoals,
      completed: goalIntel.completedGoals,
      recommendedFocus: goalIntel.recommendedFocus,
      decompositionHints: goalIntel.decompositionHints,
    },
    tasks: taskIntel,
    habits: {
      active: habitIntel.activeHabits,
      consistent: habitIntel.consistentHabits,
      inconsistent: habitIntel.inconsistentHabits,
      suggestedMicroHabits: habitIntel.suggestedMicroHabits,
    },
    future: {
      visions,
      boards,
    },
    memory: {
      profile: memoryProfile,
      summaryLines: buildMemorySummaryLines(memoryProfile),
    },
    behavioral: {
      signals: behavioralSignals,
      executionFriction: unique([
        goalIntel.stalledGoals.length > 0 ? "important goals need a smaller restart step" : "",
        overdueTasks.length > 0 ? "too many overdue tasks are competing for attention" : "",
        habitIntel.inconsistentHabits.length > 0 ? "habits need a lighter reset instead of more pressure" : "",
      ]).slice(0, 5),
      goalDecompositionHints: goalIntel.decompositionHints,
      habitIntelligence: habitIntel.suggestedMicroHabits,
    },
    proactive: {
      signals: proactiveSignals,
      highestPriority: proactiveSignals[0] || null,
    },
  };
};
