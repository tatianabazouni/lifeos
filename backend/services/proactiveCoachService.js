import mongoose from "mongoose";
import Notification from "../models/Notification.js";
import User from "../models/User.js";
import { buildUserLifeContext } from "./lifeContextService.js";

const COOLDOWN_HOURS = 12;

const proactiveStyleForSignal = (signal) => {
  const code = String(signal?.code || "");
  if (code === "repeated_low_mood") return "companion + coach";
  if (code === "journal_gap") return "companion";
  if (code === "goal_stall" || code === "overload_risk") return "coach";
  return "companion + coach";
};

const buildProactivePrompt = ({ context, signal }) =>
  [
    "Create a proactive LifeOS check-in for the user based on the trigger below.",
    `Trigger: ${signal.title}`,
    `Why it fired: ${signal.reason}`,
    `Suggested intervention: ${signal.suggestedAction}`,
    `Emotional climate: ${context.emotional.description} (${context.emotional.trend})`,
    `Dominant emotion: ${context.emotional.dominantEmotion}`,
    `Recent journal status: ${context.emotional.daysSinceJournal >= 999 ? "no journal history" : `${context.emotional.daysSinceJournal} days since last journal`}`,
    `Priority goal: ${context.goals.recommendedFocus?.title || "none"}`,
    `Overdue tasks: ${context.tasks.overdue.length}`,
    "Write a supportive check-in message.",
  ].join("\n");

export const generateProactiveCoaching = async ({
  userId,
  persistNotification = true,
  force = false,
  actorId = null,
}) => {
  if (!mongoose.Types.ObjectId.isValid(String(userId))) {
    console.warn(`Invalid userId for proactive coaching: ${userId}`);
    return {
      shouldIntervene: false,
      context: null,
      signals: [],
      notification: null,
      message: "",
      reused: false,
    };
  }

  const context = await buildUserLifeContext(userId);
  const signal = context.proactive.highestPriority;

  if (!signal) {
    return {
      shouldIntervene: false,
      context,
      signals: [],
      notification: null,
      message: "",
      reused: false,
    };
  }

  // Check for recent notification to avoid spam
  if (persistNotification && !force) {
    const since = new Date(Date.now() - COOLDOWN_HOURS * 60 * 60 * 1000);
    const recent = await Notification.findOne({
      recipient: userId,
      type: "ai_reminder",
      createdAt: { $gte: since },
      "data.triggerCode": signal.code,
    }).sort({ createdAt: -1 });

    if (recent) {
      return {
        shouldIntervene: true,
        context,
        signals: context.proactive.signals,
        notification: recent,
        message: recent.message,
        reused: true,
      };
    }
  }

  // Create a simple check-in message without VIE
  const message = buildProactiveMessage({
    context,
    signal,
    styleMode: proactiveStyleForSignal(signal),
  });

  let notification = null;
  if (persistNotification) {
    try {
      notification = await Notification.create({
        user: userId,
        recipient: userId,
        actor: actorId || userId,
        type: "ai_reminder",
        title: signal.title,
        message,
        data: {
          triggerCode: signal.code,
          severity: signal.severity,
          reason: signal.reason,
        },
      });
    } catch (error) {
      console.error(`Failed to create proactive notification for ${userId}:`, error.message);
      notification = null;
    }
  }

  return {
    shouldIntervene: true,
    context,
    signals: context.proactive.signals,
    notification,
    message,
    reused: false,
    styleMode: proactiveStyleForSignal(signal),
    source: "system",
  };
};

const buildProactiveMessage = ({ context, signal, styleMode }) => {
  const name = context.userName || "there";
  const goal = context.goals.recommendedFocus?.title;
  const mood = context.emotional.currentLabel;
  const journalGap = context.emotional.daysSinceJournal;
  const overdueTasks = context.tasks.overdue.length;
  const stalledGoals = context.goals.stalled.length;
  const habitGaps = context.habits.inconsistent.length;
  const evidence = [
    overdueTasks > 0 ? `${overdueTasks} overdue task${overdueTasks === 1 ? "" : "s"}` : "",
    stalledGoals > 0 ? `${stalledGoals} stalled goal${stalledGoals === 1 ? "" : "s"}` : "",
    journalGap >= 3 && journalGap < 999 ? `${journalGap} days without journaling` : "",
    habitGaps > 0 ? `${habitGaps} habit rhythm gap${habitGaps === 1 ? "" : "s"}` : "",
  ].filter(Boolean);
  const evidenceLine = evidence.length ? `I am seeing ${evidence.join(", ")}. ` : "";
  
  const messages = {
    "companion + coach": `Hey ${name}, ${evidenceLine}things look ${mood || "a little loaded"} right now. ${goal ? `Let's make "${goal}" smaller today: one visible step only.` : "Choose one small reset action today."}`,
    companion: `Hey ${name}, ${evidenceLine}this looks like a good moment for a low-pressure check-in. Write one honest line about what feels heaviest.`,
    coach: `Hey ${name}, ${evidenceLine}${goal ? `focus on "${goal}" and close one concrete action today.` : "pick one priority and close the smallest useful task today."}`,
  };
  
  return messages[styleMode] || messages.companion;
};

export const runProactiveSweep = async ({ limit = 25 } = {}) => {
  const users = await User.find({}).sort({ updatedAt: -1 }).limit(limit).select("_id").lean();
  const validUsers = users.filter(u => u && u._id && mongoose.Types.ObjectId.isValid(String(u._id)));
  const results = [];

  for (const user of validUsers) {
    try {
      const result = await generateProactiveCoaching({
        userId: user._id,
        persistNotification: true,
        force: false,
        actorId: user._id,
      });
      if (result.shouldIntervene && !result.reused) {
        results.push({ userId: String(user._id), trigger: result.signals[0]?.code || "" });
      }
    } catch (error) {
      console.error(`Proactive sweep failed for user ${user._id}:`, error.message);
      // Continue with other users
    }
  }

  console.log(`Proactive sweep completed: ${results.length} interventions for ${validUsers.length} valid users`);
  return results;
};

export const startProactiveEngine = () => {
  if (String(process.env.LIFEOS_ENABLE_PROACTIVE_SWEEP || "").toLowerCase() !== "true") {
    return null;
  }

  const intervalMinutes = Math.max(15, Number(process.env.LIFEOS_PROACTIVE_SWEEP_MINUTES || 180));
  const limit = Math.max(1, Number(process.env.LIFEOS_PROACTIVE_SWEEP_LIMIT || 25));
  let running = false;

  const run = async () => {
    if (running || mongoose.connection.readyState !== 1) return;
    running = true;
    try {
      await runProactiveSweep({ limit });
    } finally {
      running = false;
    }
  };

  const timer = setInterval(run, intervalMinutes * 60 * 1000);
  timer.unref?.();
  if (mongoose.connection.readyState !== 1) {
    mongoose.connection.once("connected", () => {
      run().catch(() => {});
    });
  }
  run().catch(() => {});
  return timer;
};
