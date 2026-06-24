



import Goal from "../models/Goal.js";
import XPLog from "../models/XPLog.js";
import { awardXP } from "../services/gamificationService.js";

const CATEGORY_MAP = {
  personal: "Personal",
  health: "Health",
  career: "Career",
  finance: "Finance",
  relationships: "Relationships",
  spiritual: "Spiritual",
  learning: "Learning",
  other: "Other",
};

const normalizeCategory = (category) => {
  if (!category) return "Personal";
  const key = String(category).trim().toLowerCase();
  return CATEGORY_MAP[key] || "Personal";
};
const getSubtaskTitle = (subtask) => {
  if (typeof subtask === "string") return subtask;
  return subtask?.title || subtask?.text || "";
};

const normalizeSubtask = (subtask, index) => ({
  id: String(subtask?._id || subtask?.id || index),
  title: getSubtaskTitle(subtask),
  done: Boolean(subtask?.done ?? subtask?.completed),
  phaseTitle: subtask?.phaseTitle || "",
  kind: subtask?.kind === "action" ? "action" : "milestone",
});

const normalizeSubtasks = (input = []) =>
  Array.isArray(input)
    ? input
        .filter((item) => getSubtaskTitle(item).trim())
        .map((item) => ({
          title: String(getSubtaskTitle(item)).trim(),
          done: Boolean(item?.done ?? item?.completed),
          text: String(getSubtaskTitle(item)).trim(),
          completed: Boolean(item?.done ?? item?.completed),
          phaseTitle: item?.phaseTitle || "",
          kind: item?.kind === "action" ? "action" : "milestone",
        }))
    : [];

const calculateProgressFromSubtasks = (subtasks = []) => {
  if (!Array.isArray(subtasks) || subtasks.length === 0) return 0;
  const doneCount = subtasks.filter((item) => Boolean(item.done ?? item.completed)).length;
  return Math.round((doneCount / subtasks.length) * 100);
};

const mapGoal = (goal) => {
  const raw = goal.toObject();
  const subtasks = (raw.subtasks?.length ? raw.subtasks : raw.steps || []).map(normalizeSubtask);
  return {
    ...raw,
    id: raw._id,
    _id: raw._id,
    completed: raw.completed || raw.progress === 100,
    subtasks,
    steps: subtasks.map((st) => ({ text: st.title, completed: st.done, phaseTitle: st.phaseTitle, kind: st.kind })),
  };
};

export const createGoal = async (req, res) => {
  try {
    if (!req.body.title?.trim()) return res.status(400).json({ message: "title is required" });
    const normalizedSubtasks = normalizeSubtasks(req.body.subtasks || req.body.steps);
    const computedProgress = req.body.progress !== undefined
      ? Number(req.body.progress || 0)
      : calculateProgressFromSubtasks(normalizedSubtasks);
    const isCompleted = computedProgress >= 100 || Boolean(req.body.completed);

    const goal = await Goal.create({
      user: req.user._id,
      userId: req.user._id,
      title: req.body.title.trim(),
      description: req.body.description,
      category: normalizeCategory(req.body.category),
      steps: normalizedSubtasks,
      subtasks: normalizedSubtasks,
      progress: computedProgress,
      priority: req.body.priority || "medium",
      xpReward: Number(req.body.xpReward || 50),
      deadline: req.body.deadline,
      fromVision: !!req.body.fromVision,
      roadmap: req.body.roadmap,
      completed: isCompleted,
      completedAt: isCompleted ? new Date() : undefined,
    });

    await awardXP(req.user._id, "goal_created", "Goal", goal._id);
    res.status(201).json(mapGoal(goal));
  } catch (error) {
    res.status(500).json({ message: error.message || "Failed to create goal" });
  }
};

export const getGoals = async (req, res) => {
  try {
    const goals = await Goal.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json(goals.map(mapGoal));
  } catch (error) {
    res.status(500).json({ message: error.message || "Failed to load goals" });
  }
};

export const getGoalById = async (req, res) => {
  try {
    const goal = await Goal.findOne({ _id: req.params.id, user: req.user._id });
    if (!goal) return res.status(404).json({ message: "Goal not found" });
    res.json(mapGoal(goal));
  } catch (error) {
    res.status(500).json({ message: error.message || "Failed to load goal" });
  }
};

export const updateGoal = async (req, res) => {
  try {
    const goal = await Goal.findOne({ _id: req.params.id, user: req.user._id });
    if (!goal) return res.status(404).json({ message: "Goal not found" });

    Object.assign(goal, req.body);
    if (req.body.category) goal.category = normalizeCategory(req.body.category);
    if (req.body.subtasks || req.body.steps) {
      const normalizedSubtasks = normalizeSubtasks(req.body.subtasks || req.body.steps);
      goal.subtasks = normalizedSubtasks;
      goal.steps = normalizedSubtasks;
      if (req.body.progress === undefined) {
        goal.progress = calculateProgressFromSubtasks(normalizedSubtasks);
      }
    }
    if (typeof req.body.completed === "boolean") {
      goal.completed = req.body.completed;
      goal.progress = req.body.completed ? 100 : goal.progress;
    }
    if (goal.progress >= 100 && !goal.completed) goal.completed = true;
    if (goal.progress < 100 && req.body.completed !== true) goal.completed = false;
    if (goal.completed && !goal.completedAt) goal.completedAt = new Date();
    if (!goal.completed) goal.completedAt = undefined;

    await goal.save();

    if (goal.completed) {
      await awardXP(req.user._id, "goal_completed", "Goal", goal._id);
    }

    res.json(mapGoal(goal));
  } catch (error) {
    res.status(500).json({ message: error.message || "Failed to update goal" });
  }
};

export const deleteGoal = async (req, res) => {
  try {
    const goal = await Goal.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!goal) return res.status(404).json({ message: "Goal not found" });

    // Remove any associated XP logs if needed
    await XPLog.deleteMany({ referenceType: "Goal", referenceId: req.params.id });

    res.json({ message: "Goal deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message || "Failed to delete goal" });
  }
};

