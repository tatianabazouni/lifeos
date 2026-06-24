import OpenAI from "openai";
import { analyzeLifeInput } from "../services/lifeOsCoreService.js";
import { buildUserLifeContext } from "../services/lifeContextService.js";
import { generateProactiveCoaching } from "../services/proactiveCoachService.js";
import { buildUserContext } from "../services/contextBuilder.js";
import { getPersonalizedInsight, transformUserDreamToPlan } from "../services/aiService.js";
import { createGoalFromDreamPlan } from "../services/weeklyReviewService.js";


import { generatePlan } from "../services/aiService.js";
import { analyzeJournalEntry } from "../services/journalAiService.js";
import { safeJsonParse } from "../services/aiService.js";

import { createChatCompletion } from "../services/aiService.js";

const apiKey = process.env.OPENAI_API_KEY;
const openai = apiKey ? new OpenAI({ apiKey }) : null;

const handleAiError = (res, error, fallbackMessage) =>
  res.status(500).json({ message: error?.message || fallbackMessage });

export const analyzeLifeCore = async (req, res) => {
  try {
    const { input = "" } = req.body || {};

    const result = await analyzeLifeInput({
      userId: req.user._id,
      userInput: input,
    });

    return res.json({
      ...result.analysis,
      source: result.source,
      model: result.model,
    });
  } catch (error) {
    return handleAiError(res, error, "Failed to analyze current LifeOS context");
  }
};

export const lifeContextSnapshot = async (req, res) => {
  try {
    const context = await buildUserLifeContext(req.user._id);
    return res.json(context);
  } catch (error) {
    return handleAiError(res, error, "Failed to build LifeOS context");
  }
};

export const proactiveCoach = async (req, res) => {
  try {
    const { persistNotification = true, force = false } = req.body || {};
    const result = await generateProactiveCoaching({
      userId: req.user._id,
      persistNotification,
      force,
      actorId: req.user._id,
    });

    return res.status(result.notification ? 201 : 200).json({
      shouldIntervene: result.shouldIntervene,
      message: result.message,
      notification: result.notification,
      reused: result.reused,
      proactiveSignals: result.signals,
      context: result.context,
    });
  } catch (error) {
    return handleAiError(res, error, "Failed to run proactive coach");
  }
};

// ============================================================
// PERSONALIZED AI ENDPOINTS
// ============================================================

/**
 * Get personalized insight for the authenticated user
 * Uses the buildUserContext + generatePersonalizedInsight pipeline
 */
export const getInsight = async (req, res) => {
  try {
    const result = await getPersonalizedInsight(req.user._id);

    return res.json(result);
  } catch (error) {
    return handleAiError(res, error, "Failed to generate personalized insight");
  }
};

/**
 * Transform a dream/vision into a structured execution plan
 */
export const transformDream = async (req, res) => {
  try {
    const { dream } = req.body;

    if (!dream?.trim()) {
      return res.status(400).json({ message: "dream is required" });
    }

    const result = await transformUserDreamToPlan(req.user._id, dream);

    return res.json(result);
  } catch (error) {
    return handleAiError(res, error, "Failed to transform dream to plan");
  }
};

/**
 * Transform a dream and immediately create the first goal inside the product.
 */
export const applyDreamPlan = async (req, res) => {
  try {
    const { dream, plan } = req.body || {};
    const generatedPlan = plan || (await transformUserDreamToPlan(req.user._id, dream));
    const goal = await createGoalFromDreamPlan({ userId: req.user._id, plan: generatedPlan });

    if (!goal) {
      return res.status(400).json({ message: "Could not create a goal from this plan" });
    }

    return res.status(201).json({
      plan: generatedPlan,
      goal,
    });
  } catch (error) {
    return handleAiError(res, error, "Failed to apply dream plan");
  }
};


/**
 * Get raw user context
 */
export const analyzeJournal = async (req, res) => {
  try {
    const { content, title, entryId } = req.body;
    if (!content?.trim()) {
      return res.status(400).json({ message: "Journal content required" });
    }

    const analysis = await analyzeJournalEntry(req.user._id, { content, title });
    
    return res.json(analysis);
  } catch (error) {
    return handleAiError(res, error, "Failed to analyze journal");
  }
};

export const goalBreakdown = async (req, res) => {
  try {
    const { goalId, title, description } = req.body;
    if (!title?.trim()) return res.status(400).json({ message: "Goal title required" });

    const userContext = await buildUserContext(req.user._id).catch(() => null);

    const prompt = `You are a strategic life coach. Break down this goal into an executable plan.

Goal: ${title}
Description: ${description || ""}
User Context: ${JSON.stringify(userContext?.summary || {}, null, 2)}

Respond ONLY with valid JSON:
{
  "goalTitle": "${title}",
  "interpretation": {
    "summary": "What this goal really means",
    "clarity": "high|medium|low",
    "difficulty": "easy|medium|hard",
    "needsClarification": false,
    "clarifyingQuestion": null
  },
  "phases": [
    {
      "title": "Phase 1: Foundation",
      "purpose": "Why this phase matters",
      "timeline": "Week 1-2",
      "milestones": ["Milestone 1", "Milestone 2"],
      "actionSteps": ["Action 1", "Action 2"]
    }
  ],
  "milestones": ["Major milestone 1", "Major milestone 2"],
  "successMeasures": ["How to know you succeeded"],
  "personalReminder": "A motivational note based on their context"
}`;

    if (!openai) {
      return res.status(503).json({ 
        message: "AI temporarily unavailable. Configure OPENAI_API_KEY.",
        fallback: {
          goalTitle: title,
          interpretation: { summary: `Goal breakdown for "${title}"`, clarity: "medium", difficulty: "medium" },
          phases: [{ title: "Get Started", timeline: "Week 1", milestones: ["Define first action"], actionSteps: ["Write 3 next steps"] }],
          milestones: ["Complete first action"],
          successMeasures: ["Visible progress exists"],
          personalReminder: "Start with one small action."
        }
      });
    }

    const rawResult = await createChatCompletion([{ role: "system", content: prompt }]);
    const result = safeJsonParse(rawResult);
    
    if (!result) {
      return res.status(500).json({ 
        message: "AI response format error - using fallback plan", 
        fallback: {
          goalTitle: title,
          interpretation: { summary: `Goal breakdown for "${title}"`, clarity: "medium", difficulty: "medium" },
          phases: [{ title: "Get Started", timeline: "Week 1", milestones: ["Define first action"], actionSteps: ["Write 3 next steps"] }],
          milestones: ["Complete first action"],
          successMeasures: ["Visible progress exists"],
          personalReminder: "Start with one small action."
        }
      });
    }
    
    return res.json({ ...result, source: "ai", goalId });
  } catch (error) {
    return handleAiError(res, error, "Failed to generate goal breakdown");
  }
};


export const getContext = async (req, res) => {
  try {
    const context = await buildUserContext(req.user._id);
    return res.json(context);
  } catch (error) {
    return handleAiError(res, error, "Failed to build user context");
  }
};

/**
 * STEP 6: Dream to Goal endpoint - complete pipeline
 */
export const dreamToGoal = async (req, res) => {
  try {
    const { dream } = req.body;
    if (!dream?.trim()) {
      return res.status(400).json({ message: 'Dream required' });
    }

    // Get user context
    const userContext = await buildUserContext(req.user._id).catch(() => null);

    // Generate AI plan
    const aiData = await generatePlan(dream, userContext);

    // Create in database
    const result = await createGoalFromDreamPlan({ userId: req.user._id, plan: aiData });

    res.status(201).json(result);
  } catch (error) {
    console.error('Dream to goal error:', error);
    handleAiError(res, error, 'Failed to create goal from dream');
  }
};

