import AIInsight from "../models/AIInsight.js";
import MoodEntry from "../models/MoodEntry.js";
import { createChatCompletion, isAiAvailable, safeJsonParse } from "./aiService.js";

const DEFAULT_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

export const MEMORY_TOPICS = {
  LIFE_MEMORY: "life_memory",
  JOURNAL_ANALYSIS: "journal_memory_analysis",
};

export const MEMORY_TYPES = {
  RECURRING_EMOTION: "recurring_emotion",
  EMOTION_PATTERN: "emotion_pattern",
  PERSONALITY_TRAIT: "personality_trait",
  IDENTITY_SIGNAL: "identity_signal",
  FEAR: "fear",
  VALUE: "value",
  GOAL_PATTERN: "goal_pattern",
  HABIT_PATTERN: "habit_pattern",
  MOTIVATION_TRIGGER: "motivation_trigger",
  GROWTH_SIGNAL: "growth_signal",
  SUPPORT_NEED: "support_need",
  PAST_CHAPTER: "past_chapter",
  RECENT_WIN: "recent_win",
  DREAM_SIGNAL: "dream_signal",
  OPEN_LOOP: "open_loop",
  RECURRING_STRUGGLE: "recurring_struggle",
};

const EMOTION_RULES = [
  { label: "overwhelm", regex: /(overwhelmed|too much|drowning|swamped|can't keep up)/i },
  { label: "anxiety", regex: /(anxious|anxiety|worried|panic|afraid|fear)/i },
  { label: "burnout", regex: /(burned out|burnt out|drained|exhausted|depleted|worn out)/i },
  { label: "sadness", regex: /(sad|hurt|lonely|cry|grief|heavy)/i },
  { label: "confusion", regex: /(lost|confused|uncertain|stuck|don't know what to do|not sure where to start)/i },
  { label: "hope", regex: /(hopeful|optimistic|believe|faith|brighter)/i },
  { label: "gratitude", regex: /(grateful|thankful|blessed|appreciate)/i },
  { label: "excitement", regex: /(excited|energized|inspired|can't wait|looking forward)/i },
  { label: "calm", regex: /(calm|peaceful|grounded|steady)/i },
];

const FEAR_RULES = [
  { label: "fear of failure", regex: /(fail|failure|mess up|not enough|fall short)/i },
  { label: "fear of disappointing others", regex: /(disappoint|let .* down|people pleas)/i },
  { label: "fear of uncertainty", regex: /(unknown|uncertain|out of control|no idea)/i },
  { label: "fear of judgment", regex: /(judg|reject|embarrass|what people think)/i },
  { label: "fear of wasted potential", regex: /(wasting time|waste my life|falling behind|behind in life)/i },
];

const VALUE_RULES = [
  { label: "relationships", regex: /(family|friend|partner|relationship|love)/i },
  { label: "faith", regex: /(god|faith|church|pray|prayer|spiritual)/i },
  { label: "growth", regex: /(grow|growth|learn|learning|improve|better version)/i },
  { label: "health", regex: /(health|heal|rest|body|sleep|exercise)/i },
  { label: "stability", regex: /(stable|security|safe|financial|consistency)/i },
  { label: "achievement", regex: /(achieve|success|career|build|accomplish|excel)/i },
  { label: "service", regex: /(help others|serve|impact|make a difference|support people)/i },
  { label: "authenticity", regex: /(true to myself|authentic|real self|who i am)/i },
  { label: "creativity", regex: /(create|creative|art|write|design|music)/i },
];

const TRAIT_RULES = [
  { label: "reflective", regex: /(i realize|i noticed|i notice|pattern|reflect|journal)/i },
  { label: "self-aware", regex: /(i realize|i tend to|i've been|this pattern)/i },
  { label: "ambitious", regex: /(dream|vision|future|build|become|goal)/i },
  { label: "caring", regex: /(family|friend|love|care about|support)/i },
  { label: "resilient", regex: /(still trying|kept going|showed up|didn't quit|again today)/i },
  { label: "meaning-driven", regex: /(purpose|meaning|calling|why this matters)/i },
];

const compact = (items) => items.filter(Boolean).map((item) => String(item).trim()).filter(Boolean);
const unique = (items) => Array.from(new Set(compact(items)));
const arrayify = (value) => (Array.isArray(value) ? value : typeof value === "string" ? [value] : []);

const clip = (value, max = 180) => {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (!text) return "";
  return text.length > max ? `${text.slice(0, max - 1).trim()}...` : text;
};

const normalizeConfidence = (value, fallback = 0.62) => {
  const num = Number(value);
  if (Number.isFinite(num)) {
    if (num < 0) return 0;
    if (num > 1) return 1;
    return Number(num.toFixed(2));
  }
  return fallback;
};

const normalizeList = (items, max = 5, clipMax = 140) =>
  unique((Array.isArray(items) ? items : []).map((item) => clip(item, clipMax))).slice(0, max);

const findLabels = (text, rules) => rules.filter((rule) => rule.regex.test(text)).map((rule) => rule.label);

const formatDateKey = (value) => {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return new Date().toISOString().slice(0, 10);
  return date.toISOString().slice(0, 10);
};

const mapEmotionToMood = (emotion) => {
  const normalized = String(emotion || "").toLowerCase();
  if (["gratitude", "excitement"].includes(normalized)) return "great";
  if (["hope", "calm"].includes(normalized)) return "good";
  if (["confusion"].includes(normalized)) return "meh";
  if (["overwhelm", "anxiety", "burnout", "sadness"].includes(normalized)) return "low";
  return "okay";
};

const normalizeMoodForEntry = (mood, primaryEmotion) => {
  const normalized = String(mood || "").trim().toLowerCase();
  if (["great", "good", "okay", "meh", "low"].includes(normalized)) return normalized;
  return mapEmotionToMood(primaryEmotion);
};

const buildHeuristicJournalExtraction = ({ title = "", content = "", mood = "" }) => {
  const text = `${title} ${content}`.replace(/\s+/g, " ").trim();
  const lower = text.toLowerCase();
  const emotions = unique([
    ...findLabels(text, EMOTION_RULES),
    mood ? String(mood).toLowerCase().trim() : "",
  ]).slice(0, 4);

  const primaryEmotion = emotions[0] || String(mood || "").toLowerCase().trim() || "neutral";
  const fears = findLabels(text, FEAR_RULES);
  const values = findLabels(text, VALUE_RULES);
  const traits = findLabels(text, TRAIT_RULES);

  const goalPatterns = unique([
    /(dream|vision|future|purpose|calling|become)/i.test(text) ? "thinks in long-term identity-driven goals" : "",
    /(overwhelmed|too much|stuck|don't know where to start|not sure where to start)/i.test(text)
      ? "needs goals reduced into smaller immediate steps"
      : "",
    /(plan|schedule|deadline|calendar|time block|structure)/i.test(text) ? "follows through better when structure is visible" : "",
  ]).slice(0, 4);

  const habitPatterns = unique([
    /(overwhelmed|burned out|burnt out|drained|anxious)/i.test(text) ? "consistency drops when emotional load is high" : "",
    /(routine|daily|every day|habit|streak)/i.test(text) ? "responds well to small repeatable routines" : "",
    /(journal|write|reflect|reflection)/i.test(text) ? "reflection creates clarity before action" : "",
  ]).slice(0, 4);

  const motivationTriggers = unique([
    /(future self|become|dream|vision|purpose|calling)/i.test(text) ? "future-self reminders restore motivation" : "",
    /(family|friend|partner|people i love|parents)/i.test(text) ? "relational responsibility creates momentum" : "",
    /(god|faith|pray|prayer|spiritual)/i.test(text) ? "spiritual meaning brings steadiness" : "",
    /(small win|tiny step|one step|progress)/i.test(text) ? "visible small wins build momentum" : "",
  ]).slice(0, 4);

  const emotionPatterns = unique([
    /(overwhelmed|too much|drowning)/i.test(text) && /(task|deadline|project|exam|goal|work)/i.test(text)
      ? "feels lost when overwhelmed by too many open loops"
      : "",
    /(sad|lonely|hurt|heavy)/i.test(text) ? "withdraws inward when life feels emotionally heavy" : "",
    /(anxious|afraid|worry|panic)/i.test(text) && /(future|goal|project|exam|career)/i.test(text)
      ? "fear rises when the stakes feel personally meaningful"
      : "",
    /(burned out|burnt out|drained|exhausted)/i.test(text) ? "pushes until exhaustion before slowing down" : "",
    /(lost|confused|uncertain|stuck)/i.test(text) ? "clarity drops when too many priorities compete at once" : "",
  ]).slice(0, 4);

  const growthSignals = unique([
    /(i realize|i noticed|i notice|this pattern|i've been)/i.test(text) ? "naming patterns honestly instead of avoiding them" : "",
    /(still trying|kept going|showed up|again today|did it anyway)/i.test(text) ? "still showing up despite difficulty" : "",
    /(hopeful|grateful|thankful|excited)/i.test(text) ? "positive emotion is still available in this chapter" : "",
  ]).slice(0, 4);

  const supportNeeds = unique([
    ["overwhelm", "burnout"].some((item) => emotions.includes(item)) ? "smaller next steps and less cognitive load" : "",
    emotions.includes("anxiety") ? "reassurance plus one concrete first action" : "",
    emotions.includes("sadness") ? "gentle emotional support and reconnection" : "",
    emotions.includes("confusion") ? "clarity, sequencing, and a simpler plan" : "",
  ]).slice(0, 4);

  const recurringStruggles = unique([
    ...emotionPatterns,
    /(procrastinat|avoid|delay)/i.test(text) ? "avoidance under pressure" : "",
    /(perfect|perfection)/i.test(text) ? "perfectionism slows execution" : "",
  ]).slice(0, 4);

  const summary = clip(
    [
      primaryEmotion && primaryEmotion !== "neutral" ? `Primary emotion: ${primaryEmotion}.` : "",
      emotionPatterns[0] ? `Pattern: ${emotionPatterns[0]}.` : "",
      supportNeeds[0] ? `Best support: ${supportNeeds[0]}.` : "",
    ]
      .filter(Boolean)
      .join(" "),
    220
  );

  const signalCount =
    emotions.length +
    fears.length +
    values.length +
    traits.length +
    goalPatterns.length +
    habitPatterns.length +
    motivationTriggers.length +
    growthSignals.length;

  const confidence = normalizeConfidence(0.55 + Math.min(signalCount, 6) * 0.05, 0.62);

  return {
    primaryEmotion,
    emotions: normalizeList(emotions, 4, 60),
    fears: normalizeList(fears, 4),
    values: normalizeList(values, 4),
    traits: normalizeList(traits, 4),
    goalPatterns: normalizeList(goalPatterns, 4),
    habitPatterns: normalizeList(habitPatterns, 4),
    motivationTriggers: normalizeList(motivationTriggers, 4),
    growthSignals: normalizeList(growthSignals, 4),
    supportNeeds: normalizeList(supportNeeds, 4),
    emotionPatterns: normalizeList(emotionPatterns, 4),
    recurringStruggles: normalizeList(recurringStruggles, 4),
    confidence,
    summary,
  };
};

const normalizeJournalExtraction = (candidate, fallback) => {
  const source = candidate && typeof candidate === "object" ? candidate : {};
  return {
    primaryEmotion: clip(source.primaryEmotion || fallback.primaryEmotion || "neutral", 60),
    emotions: normalizeList([...arrayify(source.emotions), ...arrayify(fallback.emotions)], 4, 60),
    fears: normalizeList([...arrayify(source.fears), ...arrayify(fallback.fears)]),
    values: normalizeList([...arrayify(source.values), ...arrayify(fallback.values)]),
    traits: normalizeList([...arrayify(source.traits), ...arrayify(fallback.traits)]),
    goalPatterns: normalizeList([...arrayify(source.goalPatterns), ...arrayify(fallback.goalPatterns)]),
    habitPatterns: normalizeList([...arrayify(source.habitPatterns), ...arrayify(fallback.habitPatterns)]),
    motivationTriggers: normalizeList([...arrayify(source.motivationTriggers), ...arrayify(fallback.motivationTriggers)]),
    growthSignals: normalizeList([...arrayify(source.growthSignals), ...arrayify(fallback.growthSignals)]),
    supportNeeds: normalizeList([...arrayify(source.supportNeeds), ...arrayify(fallback.supportNeeds)]),
    emotionPatterns: normalizeList([...arrayify(source.emotionPatterns), ...arrayify(fallback.emotionPatterns)]),
    recurringStruggles: normalizeList([...arrayify(source.recurringStruggles), ...arrayify(fallback.recurringStruggles)]),
    confidence: normalizeConfidence(source.confidence, fallback.confidence),
    summary: clip(source.summary || fallback.summary || "", 220),
  };
};

const extractJournalMemoryWithAi = async ({ title = "", content = "", mood = "" }, fallback) => {
  if (!isAiAvailable()) {
    return fallback;
  }

  const system = [
    "You extract durable life-memory signals from journal entries.",
    "Return only valid JSON.",
    'Use this exact shape: {"primaryEmotion":"","emotions":[""],"fears":[""],"values":[""],"traits":[""],"goalPatterns":[""],"habitPatterns":[""],"motivationTriggers":[""],"growthSignals":[""],"supportNeeds":[""],"emotionPatterns":[""],"recurringStruggles":[""],"confidence":0.72,"summary":""}.',
    "Keep every item short, specific, and reusable as long-term memory.",
    "Do not invent facts.",
  ].join(" ");

  const prompt = [
    `Journal title: ${clip(title, 120) || "Untitled"}`,
    `Journal mood: ${mood || "unknown"}`,
    `Journal content: ${clip(content, 2000)}`,
  ].join("\n");

  try {
    const raw = await createChatCompletion(
      [
        { role: "system", content: system },
        { role: "user", content: prompt },
      ],
      { temperature: 0.2 }
    );
    return normalizeJournalExtraction(safeJsonParse(raw), fallback);
  } catch {
    return fallback;
  }
};

const buildSignalDescriptors = ({ extraction, evidence = "", sourceType = "", sourceRef = null, observedAt = new Date() }) => {
  const baseMetadata = {
    evidence: clip(evidence, 240),
    extractedAt: observedAt,
  };

  return [
    {
      type: MEMORY_TYPES.RECURRING_EMOTION,
      values: unique([extraction.primaryEmotion, ...extraction.emotions]).filter((value) => !["neutral", "unknown"].includes(String(value).toLowerCase())),
      metadata: baseMetadata,
    },
    { type: MEMORY_TYPES.EMOTION_PATTERN, values: extraction.emotionPatterns, metadata: baseMetadata },
    { type: MEMORY_TYPES.PERSONALITY_TRAIT, values: extraction.traits, metadata: baseMetadata },
    { type: MEMORY_TYPES.FEAR, values: extraction.fears, metadata: baseMetadata },
    { type: MEMORY_TYPES.VALUE, values: extraction.values, metadata: baseMetadata },
    { type: MEMORY_TYPES.GOAL_PATTERN, values: extraction.goalPatterns, metadata: baseMetadata },
    { type: MEMORY_TYPES.HABIT_PATTERN, values: extraction.habitPatterns, metadata: baseMetadata },
    { type: MEMORY_TYPES.MOTIVATION_TRIGGER, values: extraction.motivationTriggers, metadata: baseMetadata },
    { type: MEMORY_TYPES.GROWTH_SIGNAL, values: extraction.growthSignals, metadata: baseMetadata },
    { type: MEMORY_TYPES.SUPPORT_NEED, values: extraction.supportNeeds, metadata: baseMetadata },
    { type: MEMORY_TYPES.RECURRING_STRUGGLE, values: extraction.recurringStruggles, metadata: baseMetadata },
  ].flatMap((group) =>
    normalizeList(group.values, 6).map((value) => ({
      type: group.type,
      value,
      confidence: extraction.confidence,
      sourceType,
      sourceRef,
      observedAt,
      metadata: group.metadata,
    }))
  );
};

export const upsertStructuredInsight = async ({
  userId,
  type,
  value,
  confidence = 0.62,
  sourceType = "",
  sourceRef = null,
  observedAt = new Date(),
  metadata = {},
}) => {
  if (!userId || !type || !value) return null;

  const normalizedValue = clip(value, 160);
  const existing = await AIInsight.findOne({
    user: userId,
    topic: MEMORY_TOPICS.LIFE_MEMORY,
    type,
    value: normalizedValue,
    active: true,
  });

  if (existing) {
    existing.confidence = Math.max(normalizeConfidence(confidence), Number(existing.confidence || 0));
    existing.lastObservedAt = observedAt;
    if (sourceType) existing.sourceType = sourceType;
    if (sourceRef) existing.sourceRef = sourceRef;
    existing.metadata = {
      ...(existing.metadata || {}),
      ...metadata,
      occurrences: Number(existing?.metadata?.occurrences || 1) + 1,
      firstObservedAt: existing?.metadata?.firstObservedAt || observedAt,
      lastEvidence: clip(metadata?.evidence || existing?.metadata?.lastEvidence || "", 240),
      lastSourceType: sourceType || existing?.metadata?.lastSourceType || "",
      lastSourceRef: sourceRef || existing?.metadata?.lastSourceRef || null,
    };
    await existing.save();
    return existing;
  }

  return AIInsight.create({
    user: userId,
    topic: MEMORY_TOPICS.LIFE_MEMORY,
    type,
    value: normalizedValue,
    confidence: normalizeConfidence(confidence),
    active: true,
    sourceType,
    sourceRef,
    lastObservedAt: observedAt,
    prompt: "",
    response: "",
    model: "memory_engine",
    metadata: {
      ...metadata,
      occurrences: 1,
      firstObservedAt: observedAt,
      lastEvidence: clip(metadata?.evidence || "", 240),
      lastSourceType: sourceType || "",
      lastSourceRef: sourceRef || null,
    },
  });
};

const persistJournalAnalysisRecord = async ({ userId, entry, extraction, source }) =>
  AIInsight.findOneAndUpdate(
    {
      user: userId,
      topic: MEMORY_TOPICS.JOURNAL_ANALYSIS,
      sourceType: "journal",
      sourceRef: entry?._id,
    },
    {
      $set: {
        type: "journal_analysis",
        value: extraction.primaryEmotion || "",
        confidence: extraction.confidence,
        active: true,
        sourceType: "journal",
        sourceRef: entry?._id || null,
        lastObservedAt: entry?.date || entry?.createdAt || new Date(),
        prompt: clip(entry?.content || "", 3000),
        response: extraction.summary,
        model: String(source || "").includes("ai") ? DEFAULT_MODEL : "memory_engine",
        metadata: {
          title: clip(entry?.title || "", 140),
          mood: entry?.mood || "",
          extraction,
          source,
        },
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

const syncJournalMoodEntry = async ({ userId, journalDate, mood, primaryEmotion }) => {
  const dateKey = formatDateKey(journalDate);
  const normalizedMood = normalizeMoodForEntry(mood, primaryEmotion);

  return MoodEntry.findOneAndUpdate(
    { user: userId, date: dateKey },
    {
      $set: {
        mood: normalizedMood,
        source: "journal",
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
};

export const ingestJournalEntryMemory = async ({ userId, entry }) => {
  if (!userId || !entry?.content) {
    return null;
  }

  const heuristic = buildHeuristicJournalExtraction(entry);
  const extraction = await extractJournalMemoryWithAi(entry, heuristic);
  const observedAt = entry.date || entry.createdAt || new Date();
  const evidence = `${entry.title || "Untitled"} ${entry.content || ""}`.trim();
  const source = isAiAvailable() ? "ai+heuristic" : "heuristic";

  await Promise.all([
    syncJournalMoodEntry({
      userId,
      journalDate: observedAt,
      mood: entry.mood,
      primaryEmotion: extraction.primaryEmotion,
    }),
    persistJournalAnalysisRecord({
      userId,
      entry,
      extraction,
      source,
    }),
  ]);

  const signals = buildSignalDescriptors({
    extraction,
    evidence,
    sourceType: "journal",
    sourceRef: entry._id || null,
    observedAt,
  });

  await Promise.all(signals.map((signal) => upsertStructuredInsight({ userId, ...signal })));

  return {
    extraction,
    signalCount: signals.length,
  };
};

export const persistConversationMemory = async ({ userId, insightSummary, sourceRef = null }) => {
  if (!userId || !insightSummary) {
    return null;
  }

  const observedAt = new Date();
  const signalGroups = [
    { type: MEMORY_TYPES.IDENTITY_SIGNAL, values: insightSummary.coreIdentitySignals || [] },
    { type: MEMORY_TYPES.PAST_CHAPTER, values: insightSummary.importantPastChapters || [] },
    { type: MEMORY_TYPES.RECURRING_STRUGGLE, values: insightSummary.recurringStruggles || [] },
    { type: MEMORY_TYPES.MOTIVATION_TRIGGER, values: insightSummary.motivationTriggers || [] },
    { type: MEMORY_TYPES.RECURRING_EMOTION, values: insightSummary.recurringEmotion ? [insightSummary.recurringEmotion] : [] },
    { type: MEMORY_TYPES.RECENT_WIN, values: insightSummary.recentWin ? [insightSummary.recentWin] : [] },
    { type: MEMORY_TYPES.DREAM_SIGNAL, values: insightSummary.newDream ? [insightSummary.newDream] : [] },
    { type: MEMORY_TYPES.OPEN_LOOP, values: insightSummary.openLoop ? [insightSummary.openLoop] : [] },
  ];

  const signals = signalGroups.flatMap((group) =>
    normalizeList(group.values, 4).map((value) => ({
      type: group.type,
      value,
      confidence: 0.68,
      sourceType: "conversation",
      sourceRef,
      observedAt,
      metadata: {
        evidence: clip(insightSummary.summary || "", 220),
        extractedAt: observedAt,
      },
    }))
  );

  await Promise.all(signals.map((signal) => upsertStructuredInsight({ userId, ...signal })));
  return { signalCount: signals.length };
};

const mapGroupedValues = (insights, type, limit = 6) =>
  insights
    .filter((insight) => insight.type === type && insight.value)
    .sort((left, right) => {
      const confidenceDelta = Number(right.confidence || 0) - Number(left.confidence || 0);
      if (confidenceDelta !== 0) return confidenceDelta;
      return new Date(right.lastObservedAt || right.updatedAt || 0) - new Date(left.lastObservedAt || left.updatedAt || 0);
    })
    .map((insight) => insight.value)
    .filter(Boolean)
    .filter((value, index, list) => list.indexOf(value) === index)
    .slice(0, limit);

export const getLifeMemoryProfile = async (userId) => {
  const insights = await AIInsight.find({
    user: userId,
    topic: MEMORY_TOPICS.LIFE_MEMORY,
    active: true,
  })
    .sort({ confidence: -1, lastObservedAt: -1, createdAt: -1 })
    .select("type value confidence lastObservedAt metadata sourceType")
    .lean();

  return {
    personalityTraits: mapGroupedValues(insights, MEMORY_TYPES.PERSONALITY_TRAIT),
    identitySignals: mapGroupedValues(insights, MEMORY_TYPES.IDENTITY_SIGNAL),
    recurringEmotions: mapGroupedValues(insights, MEMORY_TYPES.RECURRING_EMOTION),
    emotionPatterns: mapGroupedValues(insights, MEMORY_TYPES.EMOTION_PATTERN),
    fears: mapGroupedValues(insights, MEMORY_TYPES.FEAR),
    values: mapGroupedValues(insights, MEMORY_TYPES.VALUE),
    goalPatterns: mapGroupedValues(insights, MEMORY_TYPES.GOAL_PATTERN),
    habitPatterns: mapGroupedValues(insights, MEMORY_TYPES.HABIT_PATTERN),
    motivationTriggers: mapGroupedValues(insights, MEMORY_TYPES.MOTIVATION_TRIGGER),
    growthSignals: mapGroupedValues(insights, MEMORY_TYPES.GROWTH_SIGNAL),
    supportNeeds: mapGroupedValues(insights, MEMORY_TYPES.SUPPORT_NEED),
    pastChapters: mapGroupedValues(insights, MEMORY_TYPES.PAST_CHAPTER),
    recentWins: mapGroupedValues(insights, MEMORY_TYPES.RECENT_WIN),
    dreamSignals: mapGroupedValues(insights, MEMORY_TYPES.DREAM_SIGNAL),
    openLoops: mapGroupedValues(insights, MEMORY_TYPES.OPEN_LOOP),
    recurringStruggles: mapGroupedValues(insights, MEMORY_TYPES.RECURRING_STRUGGLE),
    rawInsights: insights,
  };
};
