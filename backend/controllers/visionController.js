import VisionBoard from "../models/VisionBoard.js";
import VisionItem from "../models/VisionItem.js";
import Goal from "../models/Goal.js";
import Connection from "../models/Connection.js";
import User from "../models/User.js";
import Notification from "../models/Notification.js";
import { awardXP } from "../services/gamificationService.js";
import { generateGoalMilestonesFromDream, flattenRoadmapItems } from "../services/aiService.js";
import crypto from "crypto";

const normalizeVisionCategory = (category) => {
  const normalized = String(category || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

  return normalized || "personal";
};

const VISION_TO_GOAL_CATEGORY = {
  career: "Career",
  health: "Health",
  relationships: "Relationships",
  finance: "Finance",
  spiritual: "Spiritual",
  learning: "Learning",
  personal: "Personal",
};

const mapVisionCategoryToGoalCategory = (category) =>
  VISION_TO_GOAL_CATEGORY[normalizeVisionCategory(category)] || "Personal";

const getSubtaskTitle = (task) => {
  if (typeof task === "string") return task;
  return task?.title || task?.text || "";
};

const normalizeGoalSubtasks = (input = []) =>
  (Array.isArray(input) ? input : [])
    .map((task) => ({
      title: String(getSubtaskTitle(task)).trim(),
      done: Boolean(task?.done ?? task?.completed),
      phaseTitle: String(task?.phaseTitle || "").trim(),
      kind: task?.kind === "action" ? "action" : "milestone",
    }))
    .filter((task) => task.title)
    .slice(0, 30);

const canAccessBoard = (board, userId) =>
  String(board.user) === String(userId) ||
  board.sharedWith.some((memberId) => String(memberId) === String(userId));

export const getBoards = async (req, res) => {
  const boards = await VisionBoard.find({
    $or: [{ user: req.user._id }, { sharedWith: req.user._id }],
  })
    .populate("user", "name email")
    .populate("sharedWith", "name email")
    .sort({ createdAt: -1 });

  res.json(
    boards.map((board) => ({
      ...board.toObject(),
      id: board._id,
      isOwner: String(board.user?._id || board.user) === String(req.user._id),
      owner: board.user
        ? {
            id: board.user._id,
            name: board.user.name || "Unknown",
            email: board.user.email || "",
          }
        : null,
      sharedWithUsers: Array.isArray(board.sharedWith)
        ? board.sharedWith.map((member) => ({
            id: member?._id || member,
            name: member?.name || "Unknown",
            email: member?.email || "",
          }))
        : [],
    }))
  );
};

export const createBoard = async (req, res) => {
  const board = await VisionBoard.create({
    title: req.body.title,
    isPublic: !!req.body.isPublic,
    user: req.user._id,
  });
  res.status(201).json({ ...board.toObject(), id: board._id });
};

export const getBoardById = async (req, res) => {
  const board = await VisionBoard.findOne({
    _id: req.params.id,
    $or: [{ user: req.user._id }, { sharedWith: req.user._id }],
  })
    .populate("user", "name email")
    .populate("sharedWith", "name email");

  if (!board) {
    return res.status(404).json({ message: "Board not found" });
  }

  return res.json({
    ...board.toObject(),
    id: board._id,
    isOwner: String(board.user?._id || board.user) === String(req.user._id),
    owner: board.user
      ? {
          id: board.user._id,
          name: board.user.name || "Unknown",
          email: board.user.email || "",
        }
      : null,
    sharedWithUsers: Array.isArray(board.sharedWith)
      ? board.sharedWith.map((member) => ({
          id: member?._id || member,
          name: member?.name || "Unknown",
          email: member?.email || "",
        }))
      : [],
  });
};

export const updateBoard = async (req, res) => {
  const board = await VisionBoard.findOne({ _id: req.params.id, user: req.user._id });
  if (!board) {
    return res.status(404).json({ message: "Board not found" });
  }

  if (req.body.title !== undefined) {
    board.title = req.body.title;
  }
  if (req.body.isPublic !== undefined) {
    board.isPublic = Boolean(req.body.isPublic);
  }

  await board.save();
  return res.json({ ...board.toObject(), id: board._id });
};

export const deleteBoard = async (req, res) => {
  const board = await VisionBoard.findOneAndDelete({ _id: req.params.id, user: req.user._id });
  if (!board) {
    return res.status(404).json({ message: "Board not found" });
  }

  await VisionItem.deleteMany({ board: board._id, user: req.user._id });
  return res.json({ message: "Board deleted" });
};

export const getVisionItems = async (req, res) => {
  let query = { user: req.user._id };

  if (req.query.boardId) {
    const board = await VisionBoard.findById(req.query.boardId);
    if (!board) {
      return res.status(404).json({ message: "Board not found" });
    }

    if (!canAccessBoard(board, req.user._id)) {
      return res.status(403).json({ message: "You do not have access to this board" });
    }

    query = { board: board._id };
  } else {
    const accessibleBoards = await VisionBoard.find({
      $or: [{ user: req.user._id }, { sharedWith: req.user._id }],
    }).select("_id");

    query = { board: { $in: accessibleBoards.map((board) => board._id) } };
  }

  const items = await VisionItem.find(query).sort({ order: 1, createdAt: -1 });
  res.json(items.map((item) => ({ ...item.toObject(), id: item._id, boardId: item.board, imageUrl: item.imageUrl || item.image })));
};

export const createVisionItem = async (req, res) => {
  const board = await VisionBoard.findById(req.body.boardId);
  if (!board) {
    return res.status(404).json({ message: "Board not found" });
  }

  if (!canAccessBoard(board, req.user._id)) {
    return res.status(403).json({ message: "You do not have access to this board" });
  }

  const existingCount = await VisionItem.countDocuments({ board: req.body.boardId });
  const item = await VisionItem.create({
    user: req.user._id,
    board: req.body.boardId,
    title: req.body.title,
    description: req.body.description,
    motivation: req.body.motivation,
    emoji: req.body.emoji,
    category: normalizeVisionCategory(req.body.category),
    targetYear: req.body.targetYear,
    tags: Array.isArray(req.body.tags) ? req.body.tags : [],
    imageUrl: req.body.imageUrl || req.body.image,
    image: req.body.image || req.body.imageUrl,
    imageScale: req.body.imageScale || 1,
    imagePosition: req.body.imagePosition || "center",
    imageAspect: req.body.imageAspect || "4:3",
    convertedToGoal: !!req.body.convertedToGoal,
    achieved: !!req.body.achieved,
    order: Number(req.body.order ?? existingCount),
    status: req.body.status || "dream",
    progress: req.body.progress || 0,
  });

  res.status(201).json({ ...item.toObject(), id: item._id, boardId: item.board, imageUrl: item.imageUrl || item.image });
};

export const updateVisionItem = async (req, res) => {
  const item = await VisionItem.findOne({ _id: req.params.id });
  if (!item) {
    return res.status(404).json({ message: "Item not found" });
  }

  const board = await VisionBoard.findById(item.board);
  if (!board) {
    return res.status(404).json({ message: "Board not found" });
  }

  if (!canAccessBoard(board, req.user._id)) {
    return res.status(403).json({ message: "You do not have access to this board" });
  }

  Object.assign(item, req.body);
  if (Object.prototype.hasOwnProperty.call(req.body, "category")) {
    item.category = normalizeVisionCategory(req.body.category);
  }
  if (req.body.image || req.body.imageUrl) {
    item.imageUrl = req.body.imageUrl || req.body.image;
    item.image = req.body.image || req.body.imageUrl;
  }
  await item.save();

  res.json({ ...item.toObject(), id: item._id, boardId: item.board, imageUrl: item.imageUrl || item.image });
};

export const getVisionItemById = async (req, res) => {
  const item = await VisionItem.findById(req.params.id);
  if (!item) {
    return res.status(404).json({ message: "Item not found" });
  }

  const board = await VisionBoard.findById(item.board);
  if (!board) {
    return res.status(404).json({ message: "Board not found" });
  }

  if (!canAccessBoard(board, req.user._id)) {
    return res.status(403).json({ message: "You do not have access to this board" });
  }

  return res.json({ ...item.toObject(), id: item._id, boardId: item.board, imageUrl: item.imageUrl || item.image });
};

export const deleteVisionItem = async (req, res) => {
  const item = await VisionItem.findById(req.params.id);
  if (!item) {
    return res.status(404).json({ message: "Item not found" });
  }

  const board = await VisionBoard.findById(item.board);
  if (!board) {
    return res.status(404).json({ message: "Board not found" });
  }

  if (!canAccessBoard(board, req.user._id)) {
    return res.status(403).json({ message: "You do not have access to this board" });
  }

  await item.deleteOne();
  res.json({ message: "Item deleted" });
};

export const convertToGoal = async (req, res) => {
  const item = await VisionItem.findById(req.params.id);
  if (!item) {
    return res.status(404).json({ message: "Item not found" });
  }

  const board = await VisionBoard.findById(item.board);
  if (!board) {
    return res.status(404).json({ message: "Board not found" });
  }

  if (!canAccessBoard(board, req.user._id)) {
    return res.status(403).json({ message: "You do not have access to this board" });
  }

  const hasProvidedSubtasks = Array.isArray(req.body?.subtasks);
  const requestedSubtasks = hasProvidedSubtasks
    ? normalizeGoalSubtasks(req.body.subtasks)
    : [];

  const dreamPayload = {
    title: item.title,
    description: item.description,
    motivation: item.motivation,
    category: item.category,
    targetYear: item.targetYear,
    tags: item.tags,
  };
  const generatedPlan = hasProvidedSubtasks
    ? null
    : await generateGoalMilestonesFromDream(dreamPayload).catch(() => null);

  const roadmap = req.body?.roadmap || generatedPlan || null;
  const aiSubtasks = hasProvidedSubtasks
    ? requestedSubtasks
    : normalizeGoalSubtasks(flattenRoadmapItems(generatedPlan || {}));

  const goal = await Goal.create({
    user: req.user._id,
    title: item.title,
    description: item.description,
    fromVision: true,
    category: mapVisionCategoryToGoalCategory(item.category),
    deadline: item.targetYear ? new Date(`${item.targetYear}-12-31`) : undefined,
    roadmap,
  });

  if (aiSubtasks.length > 0) {
    goal.subtasks = aiSubtasks.map((task) => ({
      title: task.title,
      done: task.done,
      phaseTitle: task.phaseTitle,
      kind: task.kind,
    }));
    goal.steps = aiSubtasks.map((task) => ({
      text: task.title,
      completed: task.done,
      phaseTitle: task.phaseTitle,
      kind: task.kind,
    }));
    item.subtasks = aiSubtasks.map((task) => ({
      id: crypto.randomUUID(),
      title: task.title,
      done: task.done,
    }));
    item.progress = 0;
    await goal.save();
  }

  item.convertedToGoal = true;
  await item.save();

  await awardXP(req.user._id, "goal_created", "Goal", goal._id);
  res.status(201).json({ ...goal.toObject(), id: goal._id, fromVisionItemId: item._id });
};

export const generateGoalPlan = async (req, res) => {
  const item = await VisionItem.findById(req.params.id);
  if (!item) {
    return res.status(404).json({ message: "Item not found" });
  }

  const board = await VisionBoard.findById(item.board);
  if (!board) {
    return res.status(404).json({ message: "Board not found" });
  }

  if (!canAccessBoard(board, req.user._id)) {
    return res.status(403).json({ message: "You do not have access to this board" });
  }

  const plan = await generateGoalMilestonesFromDream({
    title: item.title,
    description: item.description,
    motivation: item.motivation,
    category: item.category,
    targetYear: item.targetYear,
    tags: item.tags,
  }).catch(() => ({ milestones: [], source: "fallback" }));

  return res.json(plan);
};

export const shareBoard = async (req, res) => {
  const { userId } = req.body;
  if (!userId) {
    return res.status(400).json({ message: "userId is required" });
  }

  if (String(userId) === String(req.user._id)) {
    return res.status(400).json({ message: "You cannot share a board with yourself" });
  }

  const targetUser = await User.findById(userId);
  if (!targetUser) {
    return res.status(404).json({ message: "Target user not found" });
  }

  const board = await VisionBoard.findOne({ _id: req.params.id, user: req.user._id });
  if (!board) {
    return res.status(404).json({ message: "Board not found" });
  }

  const acceptedConnection = await Connection.findOne({
    status: "accepted",
    $or: [
      { sender: req.user._id, receiver: userId },
      { sender: userId, receiver: req.user._id },
    ],
  });

  if (!acceptedConnection) {
    return res.status(403).json({ message: "You can only share boards with accepted connections" });
  }

  board.sharedWith = board.sharedWith || [];
  if (!board.sharedWith.some((memberId) => String(memberId) === String(userId))) {
    board.sharedWith.push(userId);
    await board.save();
  }

  await Notification.create({
    user: userId,
    recipient: userId,
    actor: req.user._id,
    type: "vision_board_shared",
    title: "A vision board was shared with you",
    message: `${req.user.name} shared "${board.title}" with you.`,
    data: {
      boardId: board._id,
      boardTitle: board.title,
    },
  });

  return res.json({ message: "Board shared successfully", boardId: board._id, sharedWith: board.sharedWith });
};
