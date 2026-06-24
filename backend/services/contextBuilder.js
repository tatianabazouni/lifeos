import JournalEntry from "../models/JournalEntry.js";
import MoodEntry from "../models/MoodEntry.js";
import Goal from "../models/Goal.js";
import Task from "../models/Task.js";
import Memory from "../models/Memory.js";
import User from "../models/User.js";
import AIInsight from "../models/AIInsight.js";
import WeeklyReview from "../models/WeeklyReview.js";

/**
 * Build User Context Engine
 * Aggregates ALL user data into a structured object for personalized AI insights.
 */

// Mood score mapping for calculations
const MOOD_SCORES = {
  great: 5,
  good: 4,
  okay: 3,
  meh: 2,
  low: 1,
};

const LIFE_MEMORY_TOPIC = "life_memory";
const JOURNAL_ANALYSIS_TOPIC = "journal_memory_analysis";
const userOwnedQuery = (userId) => ({ $or: [{ user: userId }, { userId }] });

/**
 * Calculate average mood from mood entries
 */
const calculateAverageMood = async (userId) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const moods = await MoodEntry.find({
      userId,
      createdAt: { $gte: thirtyDaysAgo },
    }).sort({ createdAt: -1 });

    if (moods.length === 0) return null;

    const totalScore = moods.reduce((sum, entry) => {
      return sum + (MOOD_SCORES[entry.mood] || 3);
    }, 0);

    return totalScore / moods.length;
  } catch (error) {
    console.error("Error calculating average mood:", error);
    return null;
  }
};

/**
 * Determine mood trend (increasing, decreasing, stable)
 */
const calculateMoodTrend = async (userId) => {
  try {
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    const moods = await MoodEntry.find({
      userId,
      createdAt: { $gte: sixtyDaysAgo },
    }).sort({ createdAt: 1 });

    if (moods.length < 4) return "stable";

    // Compare first half to second half
    const midpoint = Math.floor(moods.length / 2);
    const firstHalf = moods.slice(0, midpoint);
    const secondHalf = moods.slice(midpoint);

    const firstAvg =
      firstHalf.reduce((sum, e) => sum + (MOOD_SCORES[e.mood] || 3), 0) /
      firstHalf.length;
    const secondAvg =
      secondHalf.reduce((sum, e) => sum + (MOOD_SCORES[e.mood] || 3), 0) /
      secondHalf.length;

    const diff = secondAvg - firstAvg;

    if (diff > 0.3) return "increasing";
    if (diff < -0.3) return "decreasing";
    return "stable";
  } catch (error) {
    console.error("Error calculating mood trend:", error);
    return "stable";
  }
};

/**
 * Get recent mood entries
 */
const getRecentMoods = async (userId, limit = 10) => {
  try {
    const moods = await MoodEntry.find({ userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .select("mood createdAt");

    return moods.map((m) => ({
      mood: m.mood,
      date: m.createdAt.toISOString().split("T")[0],
    }));
  } catch (error) {
    console.error("Error fetching recent moods:", error);
    return [];
  }
};

/**
 * Calculate journal consistency score (0-100)
 * Based on how regularly user writes journals
 */
const calculateConsistencyScore = async (userId) => {
  try {
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    const journals = await JournalEntry.find({
      ...userOwnedQuery(userId),
      createdAt: { $gte: sixtyDaysAgo },
    }).sort({ createdAt: 1 });

    if (journals.length === 0) return 0;

    // Calculate expected entries (one per week = ~8 in 60 days)
    const expectedEntries = 8;
    const actualEntries = journals.length;

    // Score capped at 100
    const score = Math.min(100, Math.round((actualEntries / expectedEntries) * 100));

    return score;
  } catch (error) {
    console.error("Error calculating consistency score:", error);
    return 0;
  }
};

/**
 * Calculate journal frequency (entries per week)
 */
const calculateJournalFrequency = async (userId) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const count = await JournalEntry.countDocuments({
      userId,
      createdAt: { $gte: thirtyDaysAgo },
    });

    return Math.round((count / 30) * 7 * 10) / 10; // Per week, rounded to 1 decimal
  } catch (error) {
    console.error("Error calculating journal frequency:", error);
    return 0;
  }
};

/**
 * Calculate task completion rate (0-100)
 */
const calculateTaskCompletionRate = async (userId) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const tasks = await Task.find({
      user: userId,
      createdAt: { $gte: thirtyDaysAgo },
    });

    if (tasks.length === 0) return 0;

    const completed = tasks.filter((t) => t.completed).length;
    return Math.round((completed / tasks.length) * 100);
  } catch (error) {
    console.error("Error calculating task completion rate:", error);
    return 0;
  }
};

/**
 * Get last journal entries
 */
const getLastJournalEntries = async (userId, limit = 5) => {
  try {
    const entries = await JournalEntry.find(userOwnedQuery(userId))
      .sort({ createdAt: -1 })
      .limit(limit)
      .select("title content mood tags createdAt");

    return entries.map((e) => ({
      title: e.title,
      preview: e.content?.substring(0, 100),
      mood: e.mood,
      tags: e.tags,
      date: e.createdAt.toISOString().split("T")[0],
    }));
  } catch (error) {
    console.error("Error fetching last journal entries:", error);
    return [];
  }
};

/**
 * Get active goals
 */
const getActiveGoals = async (userId, limit = 5) => {
  try {
    const goals = await Goal.find({
      ...userOwnedQuery(userId),
      completed: false,
    })
      .sort({ priority: 1, deadline: 1, createdAt: -1 })
      .limit(limit)
      .select("title description progress category deadline priority subtasks updatedAt createdAt");

    return goals.map((g) => ({
      id: g._id,
      title: g.title,
      description: g.description,
      progress: g.progress,
      category: g.category,
      priority: g.priority,
      subtaskCount: Array.isArray(g.subtasks) ? g.subtasks.length : 0,
      completedSubtaskCount: Array.isArray(g.subtasks)
        ? g.subtasks.filter((subtask) => subtask.done).length
        : 0,
      deadline: g.deadline
        ? g.deadline.toISOString().split("T")[0]
        : null,
      updatedAt: g.updatedAt?.toISOString?.().split("T")[0] || null,
    }));
  } catch (error) {
    console.error("Error fetching active goals:", error);
    return [];
  }
};

/**
 * Get pending tasks
 */
const getPendingTasks = async (userId, limit = 10) => {
  try {
    const tasks = await Task.find({
      user: userId,
      completed: false,
    })
      .sort({ dueDate: 1, createdAt: -1 })
      .limit(limit)
      .select("title dueDate priority");

    return tasks.map((t) => ({
      title: t.title,
      dueDate: t.dueDate
        ? t.dueDate.toISOString().split("T")[0]
        : null,
      priority: t.priority,
    }));
  } catch (error) {
    console.error("Error fetching pending tasks:", error);
    return [];
  }
};

/**
 * Get overdue, incomplete tasks as execution failure signals.
 */
const getFailedTasks = async (userId, limit = 8) => {
  try {
    const now = new Date();
    const tasks = await Task.find({
      user: userId,
      completed: false,
      dueDate: { $ne: null, $lt: now },
    })
      .sort({ dueDate: 1, priority: -1 })
      .limit(limit)
      .select("title dueDate priority goal createdAt");

    return tasks.map((task) => ({
      id: task._id,
      title: task.title,
      dueDate: task.dueDate ? task.dueDate.toISOString().split("T")[0] : null,
      priority: task.priority,
      goal: task.goal || null,
    }));
  } catch (error) {
    console.error("Error fetching failed tasks:", error);
    return [];
  }
};

const mapInsightValues = (insights, type, limit = 5) =>
  insights
    .filter((insight) => insight.type === type && insight.value)
    .map((insight) => insight.value)
    .filter((value, index, list) => list.indexOf(value) === index)
    .slice(0, limit);

/**
 * Pull durable memory and journal-analysis themes extracted by the AI memory engine.
 */
const getJournalThemes = async (userId) => {
  try {
    const insights = await AIInsight.find({
      user: userId,
      active: true,
      topic: { $in: [LIFE_MEMORY_TOPIC, JOURNAL_ANALYSIS_TOPIC] },
    })
      .sort({ confidence: -1, lastObservedAt: -1, createdAt: -1 })
      .limit(80)
      .select("topic type value response confidence metadata lastObservedAt")
      .lean();

    const latestJournalAnalyses = insights
      .filter((insight) => insight.topic === JOURNAL_ANALYSIS_TOPIC)
      .slice(0, 5)
      .map((insight) => insight.metadata?.extraction?.summary || insight.response || insight.value)
      .filter(Boolean);

    return {
      recurringEmotions: mapInsightValues(insights, "recurring_emotion"),
      emotionalPatterns: mapInsightValues(insights, "emotion_pattern"),
      recurringStruggles: mapInsightValues(insights, "recurring_struggle"),
      values: mapInsightValues(insights, "value"),
      motivationTriggers: mapInsightValues(insights, "motivation_trigger"),
      supportNeeds: mapInsightValues(insights, "support_need"),
      goalPatterns: mapInsightValues(insights, "goal_pattern"),
      recentSummaries: latestJournalAnalyses,
    };
  } catch (error) {
    console.error("Error fetching journal themes:", error);
    return {
      recurringEmotions: [],
      emotionalPatterns: [],
      recurringStruggles: [],
      values: [],
      motivationTriggers: [],
      supportNeeds: [],
      goalPatterns: [],
      recentSummaries: [],
    };
  }
};

const getRecentWeeklyReview = async (userId) => {
  try {
    const review = await WeeklyReview.findOne({ user: userId })
      .sort({ weekStart: -1, createdAt: -1 })
      .select("weekStart status source review adaptivePlan metrics appliedAt createdAt")
      .lean();

    if (!review) return null;
    return {
      id: review._id,
      weekStart: review.weekStart,
      status: review.status,
      source: review.source,
      headline: review.review?.headline || "",
      nextWeekFocus: review.review?.nextWeekFocus || "",
      difficulty: review.adaptivePlan?.difficulty || "medium",
      appliedAt: review.appliedAt,
    };
  } catch (error) {
    console.error("Error fetching recent weekly review:", error);
    return null;
  }
};

/**
 * Get memory highlights (last 5-10 memories)
 */
const getMemoryHighlights = async (userId, limit = 10) => {
  try {
    const memories = await Memory.find(userOwnedQuery(userId))
      .sort({ createdAt: -1 })
      .limit(limit)
      .select("title description emotion tags createdAt");

    return memories.map((m) => ({
      title: m.title,
      emotion: m.emotion,
      tags: m.tags,
      date: m.createdAt.toISOString().split("T")[0],
    }));
  } catch (error) {
    console.error("Error fetching memory highlights:", error);
    return [];
  }
};

/**
 * Identify behavioral patterns based on data
 */
const identifyPatterns = (context) => {
  const patterns = [];

  if (context.behavior.consistencyScore < 40) {
    patterns.push("inconsistent journaling");
  }

  if (
    context.recentActivity.activeGoals.length >= 3 &&
    context.behavior.taskCompletionRate < 40
  ) {
    patterns.push("strong ambition but low execution");
  }

  if (
    context.recentActivity.pendingTasks.length >= 5 &&
    context.behavior.taskCompletionRate < 50
  ) {
    patterns.push("many pending tasks but low completion");
  }

  if (context.recentActivity.failedTasks.length >= 3) {
    patterns.push("overdue task accumulation");
  }

  if (context.emotionalState.moodTrend === "decreasing") {
    patterns.push("declining mood trend");
  }

  if (Number(context.emotionalState.averageMood || 0) > 0 && Number(context.emotionalState.averageMood || 0) <= 2.4) {
    patterns.push("repeated low mood");
  }

  if (
    context.journalThemes.recurringStruggles.some((value) => /procrastinat|avoid|delay/i.test(value)) ||
    context.journalThemes.emotionalPatterns.some((value) => /too many|open loops|overwhelmed/i.test(value))
  ) {
    patterns.push("procrastination or overload under pressure");
  }

  if (context.journalThemes.supportNeeds.some((value) => /smaller|clarity|simpler/i.test(value))) {
    patterns.push("needs smaller next actions");
  }

  if (context.emotionalState.averageMood === null) {
    patterns.push("low mood tracking");
  }

  if (context.identity.topGoals.length === 0) {
    patterns.push("no clear goals set");
  }

  if (context.adaptiveHistory.lastWeeklyReview?.difficulty === "easy" && context.recentActivity.failedTasks.length > 0) {
    patterns.push("difficulty should stay reduced");
  }

  return patterns;
};

/**
 * Get user's identity info from onboarding and goals
 */
const getIdentityInfo = async (userId) => {
  try {
    const user = await User.findById(userId).select("onboarding xp level streak");
    const goals = await Goal.find({
      ...userOwnedQuery(userId),
      completed: false,
    })
      .sort({ createdAt: -1 })
      .limit(5)
      .select("title category");

    // Extract main dream from onboarding
    const mainDream = user?.onboarding?.dream?.title || "";

    // Get top goals
    const topGoals = goals.map((g) => g.title);

    // Infer priorities from goal categories
    const categoryCounts = {};
    goals.forEach((g) => {
      if (g.category) {
        categoryCounts[g.category] = (categoryCounts[g.category] || 0) + 1;
      }
    });

    const priorities = Object.entries(categoryCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([cat]) => cat);

    return {
      mainDream,
      topGoals,
      priorities,
      xp: user?.xp || 0,
      level: user?.level || 1,
      streak: user?.streak || 0,
    };
  } catch (error) {
    console.error("Error getting identity info:", error);
    return {
      mainDream: "",
      topGoals: [],
      priorities: [],
      xp: 0,
      level: 1,
      streak: 0,
    };
  }
};

/**
 * MAIN FUNCTION: Build complete user context
 * @param {string} userId - User ID
 * @returns {object} Structured user context
 */
export const buildUserContext = async (userId) => {
  try {
    const [
      identity,
      averageMood,
      moodTrend,
      recentMoods,
      consistencyScore,
      journalFrequency,
      taskCompletionRate,
      lastJournalEntries,
      activeGoals,
      pendingTasks,
      failedTasks,
      memoryHighlights,
      journalThemes,
      lastWeeklyReview,
    ] = await Promise.all([
      getIdentityInfo(userId),
      calculateAverageMood(userId),
      calculateMoodTrend(userId),
      getRecentMoods(userId),
      calculateConsistencyScore(userId),
      calculateJournalFrequency(userId),
      calculateTaskCompletionRate(userId),
      getLastJournalEntries(userId),
      getActiveGoals(userId),
      getPendingTasks(userId),
      getFailedTasks(userId),
      getMemoryHighlights(userId),
      getJournalThemes(userId),
      getRecentWeeklyReview(userId),
    ]);

    // Build context object
    const context = {
      userId,
      identity,
      emotionalState: {
        averageMood: averageMood
          ? Math.round(averageMood * 10) / 10
          : null,
        moodTrend,
        recentMoods,
      },
      behavior: {
        consistencyScore,
        journalFrequency,
        taskCompletionRate,
        failedTaskCount: failedTasks.length,
        pendingTaskCount: pendingTasks.length,
        activeGoalCount: activeGoals.length,
        streak: identity.streak || 0,
      },
      patterns: [],
      recentActivity: {
        lastJournalEntries,
        activeGoals,
        pendingTasks,
        failedTasks,
      },
      memoryHighlights,
      journalThemes,
      adaptiveHistory: {
        lastWeeklyReview,
      },
      // Metadata for validation
      meta: {
        journalCount: lastJournalEntries.length,
        moodEntryCount: recentMoods.length,
        goalCount: activeGoals.length,
        taskCount: pendingTasks.length,
        failedTaskCount: failedTasks.length,
        memoryCount: memoryHighlights.length,
        hasJournalThemes: Object.values(journalThemes).some((value) => Array.isArray(value) && value.length > 0),
        hasWeeklyReview: Boolean(lastWeeklyReview),
        generatedAt: new Date().toISOString(),
      },
    };

    // Identify patterns based on compiled data
    context.patterns = identifyPatterns(context);

    return context;
  } catch (error) {
    console.error("Error building user context:", error);
    // Return minimal fallback structure
    return {
      userId,
      identity: {
        mainDream: "",
        topGoals: [],
        priorities: [],
        xp: 0,
        level: 1,
        streak: 0,
      },
      emotionalState: {
        averageMood: null,
        moodTrend: "stable",
        recentMoods: [],
      },
      behavior: {
        consistencyScore: 0,
        journalFrequency: 0,
        taskCompletionRate: 0,
      },
      patterns: [],
      recentActivity: {
        lastJournalEntries: [],
        activeGoals: [],
        pendingTasks: [],
        failedTasks: [],
      },
      journalThemes: {
        recurringEmotions: [],
        emotionalPatterns: [],
        recurringStruggles: [],
        values: [],
        motivationTriggers: [],
        supportNeeds: [],
        goalPatterns: [],
        recentSummaries: [],
      },
      adaptiveHistory: {
        lastWeeklyReview: null,
      },
      memoryHighlights: [],
      meta: {
        journalCount: 0,
        moodEntryCount: 0,
        goalCount: 0,
        taskCount: 0,
        failedTaskCount: 0,
        memoryCount: 0,
        generatedAt: new Date().toISOString(),
        error: error.message,
      },
    };
  }
};

/**
 * Check if user has sufficient data for AI insights
 * @param {object} context - User context
 * @returns {object} { sufficient: boolean, reason: string }
 */
export const checkSufficientContext = (context) => {
  const { journalCount, moodEntryCount, goalCount } = context.meta || {};

  if (journalCount < 2) {
    return {
      sufficient: false,
      reason: "onboarding",
      message:
        "Not enough journal entries yet. Start journaling to get personalized insights!",
    };
  }

  if (goalCount === 0) {
    return {
      sufficient: false,
      reason: "no_goals",
      message: "Set some goals to get personalized strategic insights.",
    };
  }

  return {
    sufficient: true,
    reason: null,
    message: null,
  };
};

/**
 * Get onboarding guidance when context is insufficient
 * @returns {object} Guidance response
 */
export const getOnboardingGuidance = () => {
  return {
    emotionalState: "new_user",
    corePattern: "Just starting the journey",
    mainBlocker: "Getting started",
    strategicInsight:
      "Welcome! To unlock personalized insights, begin by journaling your thoughts, setting goals, and tracking your mood. This builds the foundation for AI-powered personal coaching.",
    actionableShift:
      "Start with one journal entry about how you're feeling today, then add one goal you'd like to achieve.",
  };
};

// Export for notification service (alias)
export const calculateJournalConsistency = calculateConsistencyScore;

export default buildUserContext;

