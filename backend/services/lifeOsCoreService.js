import User from "../models/User.js";
import Goal from "../models/Goal.js";
import Task from "../models/Task.js";
import Habit from "../models/Habit.js";
import MoodEntry from "../models/MoodEntry.js";
import JournalEntry from "../models/JournalEntry.js";
import Memory from "../models/Memory.js";
import LifeStoryEntry from "../models/LifeStoryEntry.js";
import VisionBoard from "../models/VisionBoard.js";
import VisionItem from "../models/VisionItem.js";
import AIInsight from "../models/AIInsight.js";
import { createChatCompletion, isAiAvailable, safeJsonParse } from "./aiService.js";
import { buildUserLifeContext } from "./lifeContextService.js";

const DEFAULT_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

export const LIFEOS_CORE_SYSTEM_IDENTITY = `You are the AI core of LifeOS, an advanced personal growth and life analysis system.

Your role is NOT to give generic advice.
Your role is to deeply understand the user, detect patterns over time, and guide them as if you have been observing their life journey.

You operate as a hybrid of:
- a reflective therapist
- a strategic life coach
- a behavioral analyst
- a narrative storyteller

CONTEXT AWARENESS
You are always given structured user context including recent journal entries, past summarized reflections, emotional trends, goal history, and behavioral signals.

You MUST:
- identify patterns across time, not just current input
- detect emotional shifts and recurring struggles
- connect past behavior with current state

ANALYSIS OBJECTIVES
When analyzing user input, always:
1. detect emotional tone
2. identify recurring patterns
3. highlight contradictions between goals and actions
4. infer underlying causes
5. detect growth signals

PERSONALIZATION
You remember previous behaviors, recognize repeated struggles, and adjust tone based on emotional state.

OUTPUT
Always return valid JSON only using this exact shape:
{
  "emotional_state": "...",
  "key_patterns": ["...", "..."],
  "insight": "...",
  "contradictions": "...",
  "growth_signal": "...",
  "recommendation": "...",
  "next_action": "...",
  "motivational_message": "...",
  "archetype_update": {
    "current_archetype": "...",
    "suggested_evolution": "..."
  }
}

Avoid generic advice, empty positivity, shallow repetition, and one-time analysis.
Prioritize depth, clarity, and personal relevance over length.`;

const moodScoreMap = {
  low: 2,
  sad: 2,
  meh: 4,
  okay: 5,
  neutral: 5,
  reflective: 6,
  good: 7,
  happy: 8,
  great: 9,
  grateful: 8,
  calm: 7,
};

const emptyAnalysis = () => ({
  emotional_state: "",
  key_patterns: [],
  insight: "",
  contradictions: "",
  growth_signal: "",
  recommendation: "",
  next_action: "",
  motivational_message: "",
  archetype_update: {
    current_archetype: "",
    suggested_evolution: "",
  },
});

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

const daysBetween = (later, earlier) =>
  Math.floor((new Date(later).getTime() - new Date(earlier).getTime()) / (1000 * 60 * 60 * 24));

const dateDaysAgo = (days) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
};

const average = (values) => (values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0);

const describeMoodScore = (score) => {
  if (score >= 7.5) return "mostly hopeful and energized";
  if (score >= 6) return "steady with some emotional weight";
  if (score >= 4.5) return "mixed and somewhat strained";
  return "heavy, stressed, or emotionally depleted";
};

const normalizeAnalysis = (candidate, fallback) => {
  const base = emptyAnalysis();
  const source = candidate && typeof candidate === "object" ? candidate : {};
  return {
    emotional_state: clip(source.emotional_state || fallback.emotional_state || base.emotional_state, 120),
    key_patterns: unique([
      ...(Array.isArray(source.key_patterns) ? source.key_patterns : []),
      ...(Array.isArray(fallback.key_patterns) ? fallback.key_patterns : []),
    ]).slice(0, 4),
    insight: clip(source.insight || fallback.insight || base.insight, 240),
    contradictions: clip(source.contradictions || fallback.contradictions || base.contradictions, 220),
    growth_signal: clip(source.growth_signal || fallback.growth_signal || base.growth_signal, 220),
    recommendation: clip(source.recommendation || fallback.recommendation || base.recommendation, 240),
    next_action: clip(source.next_action || fallback.next_action || base.next_action, 180),
    motivational_message: clip(source.motivational_message || fallback.motivational_message || base.motivational_message, 240),
    archetype_update: {
      current_archetype: clip(
        source?.archetype_update?.current_archetype || fallback?.archetype_update?.current_archetype || base.archetype_update.current_archetype,
        100
      ),
      suggested_evolution: clip(
        source?.archetype_update?.suggested_evolution || fallback?.archetype_update?.suggested_evolution || base.archetype_update.suggested_evolution,
        120
      ),
    },
  };
};

const inferCurrentArchetype = ({ emotionalAverage, journalCount7d, overdueGoals, overdueTasks, completedGoals }) => {
  if (emotionalAverage <= 4.5 && overdueGoals > 0) return "Overloaded Dreamer";
  if (journalCount7d >= 3 && emotionalAverage <= 6) return "Reflective Rebuilder";
  if (completedGoals >= 2) return "Steady Builder";
  if (overdueTasks >= 3) return "Visionary with Friction";
  return "Emerging Architect";
};

const inferSuggestedEvolution = ({ currentArchetype, overdueGoals, inactivityDays, journalCount7d }) => {
  if (currentArchetype === "Overloaded Dreamer") return "Grounded Executor";
  if (currentArchetype === "Reflective Rebuilder") return "Consistent Integrator";
  if (currentArchetype === "Steady Builder") return "Confident Leader";
  if (overdueGoals > 0 || inactivityDays >= 7) return "Disciplined Finisher";
  if (journalCount7d >= 3) return "Intentional Strategist";
  return "Aligned Main Character";
};

const buildContextBundle = async (userId) => {
  const thirtyDaysAgo = dateDaysAgo(30);
  const sevenDaysAgo = dateDaysAgo(7);
  const now = new Date();

  const [
    user,
    recentJournals,
    journals30d,
    recentLifeEntries,
    recentMemories,
    moodEntries,
    goals,
    tasks,
    habits,
    visions,
    boards,
    insights,
  ] = await Promise.all([
    User.findById(userId).select("name").lean(),
    JournalEntry.find({ user: userId }).sort({ createdAt: -1 }).limit(4).select("title content mood createdAt").lean(),
    JournalEntry.find({ user: userId, createdAt: { $gte: thirtyDaysAgo } })
      .sort({ createdAt: -1 })
      .select("title content mood createdAt")
      .lean(),
    LifeStoryEntry.find({ user: userId }).sort({ createdAt: -1 }).limit(5).select("title content section mood createdAt").lean(),
    Memory.find({ user: userId }).sort({ date: -1, createdAt: -1 }).limit(5).select("title description emotion date").lean(),
    MoodEntry.find({ user: userId }).sort({ date: -1, createdAt: -1 }).limit(30).select("mood date createdAt").lean(),
    Goal.find({ user: userId }).sort({ deadline: 1, createdAt: -1 }).limit(20).select("title progress completed deadline createdAt").lean(),
    Task.find({ user: userId }).sort({ updatedAt: -1, createdAt: -1 }).limit(30).select("title completed dueDate completedAt createdAt priority").lean(),
    Habit.find({ user: userId, isActive: true }).sort({ streak: -1, updatedAt: -1 }).limit(10).select("title streak lastCompletedAt").lean(),
    VisionItem.find({ user: userId, achieved: false }).sort({ createdAt: -1 }).limit(6).select("title category targetYear").lean(),
    VisionBoard.find({ $or: [{ user: userId }, { sharedWith: userId }] }).sort({ createdAt: -1 }).limit(4).select("title").lean(),
    AIInsight.find({ user: userId }).sort({ createdAt: -1 }).limit(10).select("topic metadata response createdAt").lean(),
  ]);

  const latestJournalDate = recentJournals[0]?.createdAt || null;
  const journalCount7d = journals30d.filter((entry) => new Date(entry.createdAt) >= sevenDaysAgo).length;
  const moodPoints = [
    ...moodEntries.map((entry) => ({ date: entry.date || formatDate(entry.createdAt), score: moodScoreMap[entry.mood] || 5 })),
    ...journals30d.map((entry) => ({ date: formatDate(entry.createdAt), score: moodScoreMap[String(entry.mood || "").toLowerCase()] || 5 })),
  ];

  const moodByDate = new Map();
  moodPoints.forEach((point) => moodByDate.set(point.date, point.score));
  const orderedMoodScores = [...moodByDate.entries()]
    .sort(([left], [right]) => String(left).localeCompare(String(right)))
    .map(([, score]) => score);
  const lastSevenMood = orderedMoodScores.slice(-7);
  const prevSevenMood = orderedMoodScores.slice(-14, -7);
  const emotionalAverage = average(lastSevenMood.length ? lastSevenMood : orderedMoodScores);
  const emotionalDelta = average(lastSevenMood) - average(prevSevenMood);
  const emotionalTrend =
    emotionalDelta > 0.7 ? "improving" : emotionalDelta < -0.7 ? "declining" : orderedMoodScores.length > 0 ? "stable" : "unknown";

  const completedGoals = goals.filter((goal) => goal.completed || goal.progress >= 100);
  const overdueGoals = goals.filter(
    (goal) => !(goal.completed || goal.progress >= 100) && goal.deadline && new Date(goal.deadline) < now
  );
  const ongoingGoals = goals.filter((goal) => !goal.completed && goal.progress < 100 && (!goal.deadline || new Date(goal.deadline) >= now));

  const overdueTasks = tasks.filter((task) => !task.completed && task.dueDate && new Date(task.dueDate) < now);
  const completedTasks30d = tasks.filter((task) => task.completed && task.completedAt && new Date(task.completedAt) >= thirtyDaysAgo).length;
  const inactivityDays = latestJournalDate ? daysBetween(now, latestJournalDate) : 999;
  const strongestHabitStreak = habits.reduce((max, habit) => Math.max(max, Number(habit.streak || 0)), 0);

  const reflectionSummaries = insights
    .map((insight) => insight?.metadata?.summary || insight?.response || "")
    .filter(Boolean)
    .map((text) => clip(text, 150))
    .slice(0, 4);

  const recurringStruggles = unique(
    insights.flatMap((insight) => {
      const value = insight?.metadata?.recurringStruggles;
      if (Array.isArray(value)) return value;
      if (typeof value === "string") return [value];
      return [];
    })
  ).slice(0, 4);

  const behaviorSignals = unique([
    journalCount7d >= 3 ? `journal consistency improved with ${journalCount7d} entries in the last 7 days` : "",
    inactivityDays >= 7 && inactivityDays < 999 ? `a recent inactivity pocket of ${inactivityDays} days without journaling` : "",
    overdueGoals.length > 0 ? `${overdueGoals.length} overdue goals are creating pressure` : "",
    overdueTasks.length > 0 ? `${overdueTasks.length} overdue tasks suggest execution friction` : "",
    strongestHabitStreak >= 5 ? `habit streak strength exists with a top streak of ${strongestHabitStreak}` : "",
    completedTasks30d >= 4 ? `${completedTasks30d} tasks were completed in the last 30 days` : "",
  ]).slice(0, 6);

  const currentArchetype = inferCurrentArchetype({
    emotionalAverage,
    journalCount7d,
    overdueGoals: overdueGoals.length,
    overdueTasks: overdueTasks.length,
    completedGoals: completedGoals.length,
  });

  const suggestedEvolution = inferSuggestedEvolution({
    currentArchetype,
    overdueGoals: overdueGoals.length,
    inactivityDays,
    journalCount7d,
  });

  return {
    userName: user?.name || "Explorer",
    recentJournals,
    reflectionSummaries,
    recentLifeEntries,
    recentMemories,
    emotional: {
      average: emotionalAverage,
      trend: emotionalTrend,
      description: describeMoodScore(emotionalAverage),
      recurringMood: recentJournals[0]?.mood || moodEntries[0]?.mood || "unknown",
    },
    goals: {
      completed: completedGoals,
      overdue: overdueGoals,
      ongoing: ongoingGoals,
    },
    tasks: {
      overdue: overdueTasks,
      completed30d: completedTasks30d,
    },
    habits,
    visions,
    boards,
    behaviorSignals,
    recurringStruggles,
    inactivityDays,
    journalCount7d,
    strongestHabitStreak,
    archetype: {
      current: currentArchetype,
      suggested: suggestedEvolution,
    },
  };
};

const mapLifeContextToAnalysisContext = (lifeContext) => {
  const journalCount7d = lifeContext.recentJournals.filter((entry) => new Date(entry.createdAt) >= dateDaysAgo(7)).length;
  const strongestHabitStreak = lifeContext.habits.active.reduce((max, habit) => Math.max(max, Number(habit.streak || 0)), 0);

  const currentArchetype = inferCurrentArchetype({
    emotionalAverage: lifeContext.emotional.averageScore,
    journalCount7d,
    overdueGoals: lifeContext.goals.overdue.length,
    overdueTasks: lifeContext.tasks.overdue.length,
    completedGoals: lifeContext.goals.completed.length,
  });

  const suggestedEvolution = inferSuggestedEvolution({
    currentArchetype,
    overdueGoals: lifeContext.goals.overdue.length,
    inactivityDays: lifeContext.emotional.daysSinceJournal,
    journalCount7d,
  });

  return {
    userName: lifeContext.userName,
    recentJournals: lifeContext.recentJournals,
    reflectionSummaries: lifeContext.reflectionSummaries,
    recentLifeEntries: [],
    recentMemories: [],
    emotional: {
      average: lifeContext.emotional.averageScore,
      trend: lifeContext.emotional.trend,
      description: lifeContext.emotional.description,
      recurringMood: lifeContext.emotional.dominantEmotion || lifeContext.emotional.currentLabel,
    },
    goals: {
      completed: lifeContext.goals.completed,
      overdue: lifeContext.goals.overdue,
      ongoing: lifeContext.goals.active,
    },
    tasks: {
      overdue: lifeContext.tasks.overdue,
      completed30d: 0,
    },
    habits: lifeContext.habits.active,
    visions: lifeContext.future.visions,
    boards: lifeContext.future.boards,
    behaviorSignals: unique([
      ...lifeContext.behavioral.signals,
      ...lifeContext.memory.summaryLines,
      ...lifeContext.behavioral.goalDecompositionHints,
    ]).slice(0, 8),
    recurringStruggles: unique([
      ...lifeContext.memory.profile.recurringStruggles,
      ...lifeContext.memory.profile.emotionPatterns,
      ...lifeContext.memory.profile.fears,
    ]).slice(0, 6),
    inactivityDays: lifeContext.emotional.daysSinceJournal,
    journalCount7d,
    strongestHabitStreak,
    archetype: {
      current: currentArchetype,
      suggested: suggestedEvolution,
    },
  };
};

const buildAnalysisPrompt = ({ context, userInput }) => {
  const recentJournalsBlock = recentJournalsToLines(context.recentJournals);
  const reflectionsBlock = listToLines(context.reflectionSummaries, "No prior summarized reflections available.");
  const emotionalTrendBlock = [
    `Current emotional climate: ${context.emotional.description}`,
    `Emotional trend over time: ${context.emotional.trend}`,
    `Most recent mood signal: ${context.emotional.recurringMood}`,
  ].join("\n");
  const goalHistoryBlock = [
    `Completed goals: ${context.goals.completed.length}`,
    ...context.goals.completed.slice(0, 3).map((goal) => `- Completed: ${clip(goal.title, 90)}`),
    `Ongoing goals: ${context.goals.ongoing.length}`,
    ...context.goals.ongoing.slice(0, 4).map((goal) => `- Ongoing: ${clip(goal.title, 90)}${goal.deadline ? ` (deadline ${formatDate(goal.deadline)})` : ""}`),
    `Stalled or overdue goals: ${context.goals.overdue.length}`,
    ...context.goals.overdue.slice(0, 3).map((goal) => `- Overdue: ${clip(goal.title, 90)}${goal.deadline ? ` (deadline ${formatDate(goal.deadline)})` : ""}`),
  ].join("\n");
  const behaviorSignalsBlock = listToLines(context.behaviorSignals, "No strong behavioral signals detected yet.");
  const futureVisionBlock = listToLines(
    unique([
      ...context.boards.map((board) => `Board: ${clip(board.title, 80)}`),
      ...context.visions.map((vision) => `Vision: ${clip(vision.title, 90)}${vision.targetYear ? ` (target ${vision.targetYear})` : ""}`),
    ]),
    "No explicit future dreams saved yet."
  );

  return [
    "CONTEXT:",
    `User: ${context.userName}`,
    "",
    "Recent journal entries:",
    recentJournalsBlock,
    "",
    "Past summarized reflections:",
    reflectionsBlock,
    "",
    "Emotional trends:",
    emotionalTrendBlock,
    "",
    "Goal history:",
    goalHistoryBlock,
    "",
    "Behavioral signals:",
    behaviorSignalsBlock,
    "",
    "Recurring struggles:",
    listToLines(context.recurringStruggles, "No recurring struggle is clear yet."),
    "",
    "Future direction:",
    futureVisionBlock,
    "",
    "Current archetype hypothesis:",
    `- Current archetype: ${context.archetype.current}`,
    `- Suggested evolution: ${context.archetype.suggested}`,
    "",
    "USER INPUT:",
    String(userInput || "").trim() || "Analyze my current season using the context above.",
    "",
    "INSTRUCTION:",
    "Return only valid JSON. Reference past behavior when relevant, avoid generic advice, and make every field feel personalized and pattern-aware.",
  ].join("\n");
};

const recentJournalsToLines = (journals) =>
  journals.length > 0
    ? journals
        .map(
          (entry) =>
            `- ${formatDate(entry.createdAt)} | ${entry.mood || "neutral"} | ${clip(entry.title || "Untitled", 80)} | ${clip(entry.content, 140)}`
        )
        .join("\n")
    : "- No recent journal entries available.";

const listToLines = (items, fallback) => (items.length ? items.map((item) => `- ${item}`).join("\n") : `- ${fallback}`);

const buildFallbackAnalysis = ({ context, userInput }) => {
  const emotionalState = `${context.emotional.description}; trend is ${context.emotional.trend}`;

  const keyPatterns = unique([
    context.journalCount7d >= 3 ? "increased self-awareness through more consistent reflection" : "reflection is still inconsistent",
    context.goals.overdue.length > 0 ? "important goals are slipping under accumulated pressure" : "major goals are still active and in motion",
    context.tasks.overdue.length > 0 ? "execution friction is showing up in overdue tasks" : "",
    context.strongestHabitStreak >= 5 ? "there is real discipline available when the structure is clear" : "",
  ]).slice(0, 4);

  const contradictions =
    context.goals.overdue.length > 0
      ? `There is a tension between what matters to you and what your recent follow-through has been able to carry. ${context.goals.overdue.length} important goals are overdue, which suggests the vision is bigger than the current structure supporting it.`
      : context.tasks.overdue.length > 0
        ? `You still care about progress, but the daily system is not fully protecting what you say matters. Overdue tasks are creating drag between intention and action.`
        : "The current season shows more alignment than contradiction, but consistency still needs protection.";

  const insight =
    context.emotional.trend === "declining"
      ? "This does not look like laziness. It looks more like load accumulation: emotional strain, open loops, and pressure are eating the energy needed for disciplined action."
      : context.journalCount7d >= 3
        ? "The strongest signal here is awareness. You are noticing your patterns faster, which is often the turning point before behavior starts to stabilize."
        : "The core pattern is not lack of desire. It is a gap between the size of the life you want and the consistency of the system holding that life together.";

  const growthSignal =
    context.goals.completed.length > 0
      ? `You already have proof of movement: ${context.goals.completed.length} goals have been completed, which means this is not a story of incapability.`
      : context.journalCount7d >= 3
        ? `You have increased reflection recently with ${context.journalCount7d} journal entries in the last week, and that kind of awareness is a real growth signal.`
        : context.strongestHabitStreak >= 5
          ? `Your strongest habit streak of ${context.strongestHabitStreak} shows you can be disciplined when the structure fits your real life.`
          : "The growth signal is subtle but real: you are still showing up to examine the pattern instead of avoiding it completely.";

  const recommendation =
    context.goals.overdue.length > 0 || context.tasks.overdue.length > 0
      ? "Reduce the story to one protected priority. Do not try to recover your whole life at once. Clear one overdue commitment, simplify the next week, and rebuild trust through visible follow-through."
      : "Build more intentional rhythm around the part of life that matters most right now. Keep the plan small enough that your nervous system can believe it.";

  const nextAction = context.tasks.overdue[0]?.title
    ? `Choose "${clip(context.tasks.overdue[0].title, 90)}" as the single recovery task for today and give it one uninterrupted 25-minute block.`
    : context.goals.ongoing[0]?.title
      ? `Define the next concrete step for "${clip(context.goals.ongoing[0].title, 90)}" and schedule it today before doing anything else.`
      : "Write down one concrete action for the next 24 hours and complete it before expanding the plan.";

  const motivationalMessage = context.goals.completed.length > 0
    ? `This chapter is not proof that you are failing. It is proof that your system needs recalibration. You have already moved important parts of your story forward before, and you can do it again with less chaos and more intention.`
    : `The fact that you are looking honestly at this pattern means the story is still alive. Main characters do not grow by never struggling. They grow by learning what this season is trying to teach them.`;

  return normalizeAnalysis(
    {
      emotional_state: emotionalState,
      key_patterns: keyPatterns,
      insight,
      contradictions,
      growth_signal: growthSignal,
      recommendation,
      next_action: nextAction,
      motivational_message: motivationalMessage,
      archetype_update: {
        current_archetype: context.archetype.current,
        suggested_evolution: context.archetype.suggested,
      },
    },
    emptyAnalysis()
  );
};

const persistAnalysisInsight = async ({ userId, userInput, analysis, context, source }) => {
  try {
    await AIInsight.create({
      user: userId,
      topic: "lifeos_core_analysis",
      prompt: userInput,
      response: JSON.stringify(analysis),
      model: source === "ai" ? DEFAULT_MODEL : "fallback",
      metadata: {
        source,
        summary: analysis.insight,
        recurringEmotion: analysis.emotional_state,
        recurringStruggles: analysis.key_patterns,
        growthSignal: analysis.growth_signal,
        recommendation: analysis.recommendation,
        nextAction: analysis.next_action,
        currentArchetype: analysis.archetype_update.current_archetype,
        suggestedEvolution: analysis.archetype_update.suggested_evolution,
        contextSnapshot: {
          emotionalTrend: context.emotional,
          behaviorSignals: context.behaviorSignals,
          goalCounts: {
            completed: context.goals.completed.length,
            ongoing: context.goals.ongoing.length,
            overdue: context.goals.overdue.length,
          },
        },
        analysis,
      },
    });
  } catch {
    // Analysis should still return even if persistence fails.
  }
};

export const analyzeLifeInput = async ({ userId, userInput = "" }) => {
  const lifeContext = await buildUserLifeContext(userId);
  const context = mapLifeContextToAnalysisContext(lifeContext);
  const analysisPrompt = buildAnalysisPrompt({ context, userInput });
  const fallback = buildFallbackAnalysis({ context, userInput });

  let analysis = fallback;
  let source = "fallback";

  if (isAiAvailable()) {
    try {
      const raw = await createChatCompletion(
        [
          { role: "system", content: LIFEOS_CORE_SYSTEM_IDENTITY },
          { role: "user", content: analysisPrompt },
        ],
        { temperature: 0.45 }
      );

      const parsed = safeJsonParse(raw);
      analysis = normalizeAnalysis(parsed, fallback);
      source = "ai";
    } catch {
      analysis = fallback;
    }
  }

  await persistAnalysisInsight({
    userId,
    userInput: String(userInput || "").trim() || "Analyze my current season using the available LifeOS context.",
    analysis,
    context,
    source,
  });

  return {
    analysis,
    source,
    model: source === "ai" ? DEFAULT_MODEL : "fallback",
  };
};
