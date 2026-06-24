import OpenAI from 'openai';
import { buildUserContext } from './contextBuilder.js';

const apiKey = process.env.OPENAI_API_KEY;
const openai = apiKey ? new OpenAI({ apiKey }) : null;

export const analyzeJournalEntry = async (userId, { content, title = 'Untitled' }) => {
  const context = await buildUserContext(userId);

  const prompt = `Analyze this journal entry for emotional tone, insights, and actions:

**Title**: ${title}
**Content**: ${content}

**User Context**: ${JSON.stringify(context, null, 2)}

Respond with ONLY valid JSON:
{
  "summary": "1-2 sentence summary of the entry's main theme/emotion",
  "emotionalTone": "joyful|grateful|reflective|anxious|hopeful|determined|calm|neutral",
  "keyInsights": ["Insight 1 about patterns/moods", "Insight 2 about progress/challenges"],
  "suggestedActions": ["Specific, actionable step 1", "Specific, actionable step 2"],
  "sentiment": "positive|neutral|negative",
  "moods": ["mood1", "mood2"],
  "themes": ["theme1", "theme2"]
}`;

  if (!openai) {
    console.warn('OpenAI unavailable - returning fallback journal analysis');
    return {
      summary: "AI analysis temporarily unavailable. Configure OPENAI_API_KEY for insights.",
      emotionalTone: "neutral",
      keyInsights: [],
      suggestedActions: [],
      sentiment: "neutral",
      moods: [],
      themes: [],
      wordCount: content.split(/\s+/).length,
      analyzedAt: new Date().toISOString(),
      error: true,
    };
  }

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(completion.choices[0].message.content);
    return {
      ...result,
      wordCount: content.split(/\s+/).length,
      analyzedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Journal analysis error:', error);
    return {
      summary: "AI analysis temporarily unavailable. Your entry has been saved.",
      emotionalTone: "neutral",
      keyInsights: [],
      suggestedActions: [],
      sentiment: "neutral",
      moods: [],
      themes: [],
      wordCount: content.split(/\s+/).length,
      error: true,
    };
  }
};

