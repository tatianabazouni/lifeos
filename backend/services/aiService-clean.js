import OpenAI from "openai";
import AIInsight from "../models/AIInsight.js";
import { buildUserContext, checkSufficientContext, getOnboardingGuidance } from "./contextBuilder.js";
import { DREAM_TO_PLAN_PROMPT } from './DREAM_TO_PLAN_PROMPT.js';
import Goal from "../models/Goal.js";
import Task from "../models/Task.js";

const apiKey = process.env.OPENAI_API_KEY;
const openai = apiKey ? new OpenAI({ apiKey }) : null;

export const isAiAvailable = () => Boolean(openai);

// ... rest of functions from the clean version ...
