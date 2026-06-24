import mongoose from "mongoose";
import LifeCapsule from "../models/LifeCapsule.js";
import LifeChapter from "../models/LifeChapter.js";
import Memory from "../models/Memory.js";
import { awardXP } from "../services/gamificationService.js";

const chapterTitleByKey = {
  childhood: "Childhood",
  school: "School",
  achievements: "Achievements",
  friends: "Important People",
  travels: "Travel",
  goals: "Turning Points",
  reflections: "Reflections",
};

const defaultChapters = [
  { title: "Childhood", icon: "baby" },
  { title: "School", icon: "book" },
  { title: "Achievements", icon: "star" },
  { title: "Important People", icon: "users" },
  { title: "Travel", icon: "plane" },
  { title: "Turning Points", icon: "flag" },
  { title: "Reflections", icon: "feather" },
  { title: "My Memories", icon: "note" },
];

const normalizeIncomingMemoryType = (value) => {
  const type = String(value || "text").trim().toLowerCase();

  if (type === "image") return "photo";
  if (type === "photo" || type === "video" || type === "text" || type === "voice") {
    return type;
  }

  return "text";
};

const normalizeOutgoingMemoryType = (value) => (value === "photo" ? "image" : value);

const mapMemory = (memory) => ({
  ...memory.toObject(),
  id: memory._id,
  chapterId: memory.chapter,
  imageUrl: memory.mediaUrl,
  image: memory.mediaUrl,
  type: normalizeOutgoingMemoryType(memory.type),
});

const ensureCapsule = async (userId) => {
  return LifeCapsule.findOneAndUpdate(
    { user: userId },
    { $setOnInsert: { title: "My Life Capsule", description: "" } },
    { new: true, upsert: true }
  );
};

const ensureDefaultChapters = async (userId, capsuleId) => {
  const docs = defaultChapters.map((ch, index) => ({
    updateOne: {
      filter: { user: userId, title: ch.title },
      update: {
        $setOnInsert: {
          title: ch.title,
          icon: ch.icon,
          user: userId,
          lifeCapsule: capsuleId,
          position: index,
        },
      },
      upsert: true,
    },
  }));

  if (docs.length > 0) {
    await LifeChapter.bulkWrite(docs);
  }
};

const resolveMemoryChapter = async (userId, chapterInput) => {
  const raw = typeof chapterInput === "string" ? chapterInput.trim() : chapterInput;

  if (raw && mongoose.Types.ObjectId.isValid(raw)) {
    const byId = await LifeChapter.findOne({ _id: raw, user: userId });
    if (byId) return byId;
  }

  if (typeof raw === "string" && raw.length > 0) {
    const normalized = raw.toLowerCase();
    const title = chapterTitleByKey[normalized] || raw;
    const capsule = await ensureCapsule(userId);

    await ensureDefaultChapters(userId, capsule._id);

    return LifeChapter.findOneAndUpdate(
      { user: userId, title },
      {
        $setOnInsert: {
          title,
          icon: "note",
          lifeCapsule: capsule._id,
        },
      },
      { upsert: true, new: true }
    );
  }

  const capsule = await ensureCapsule(userId);
  await ensureDefaultChapters(userId, capsule._id);
  return LifeChapter.findOneAndUpdate(
    { user: userId, title: "My Memories" },
    {
      $setOnInsert: {
        title: "My Memories",
        icon: "note",
        lifeCapsule: capsule._id,
      },
    },
    { upsert: true, new: true }
  );
};

export const getChapters = async (req, res) => {
  try {
const capsule = await ensureCapsule(req.user._id);
    await ensureDefaultChapters(req.user._id, capsule._id);
    const chapters = await LifeChapter.find({ user: req.user._id }).sort({ position: 1, createdAt: -1 });
    const memories = await Memory.find({ user: req.user._id }).sort({ date: 1, createdAt: 1 });

    res.json(
      chapters.map((chapter) => ({
        ...chapter.toObject(),
        id: chapter._id,
        capsuleId: capsule._id,
        dateRange: [chapter.startDate, chapter.endDate].filter(Boolean).join(" - "),
        memories: memories.filter((m) => String(m.chapter) === String(chapter._id)).map(mapMemory),
      }))
    );
  } catch (error) {
    res.status(500).json({ message: error.message || "Failed to load chapters" });
  }
};

export const getChapterById = async (req, res) => {
  try {
    const chapter = await LifeChapter.findOne({ _id: req.params.id, user: req.user._id });
    if (!chapter) return res.status(404).json({ message: "Chapter not found" });

const memories = await Memory.find({ user: req.user._id, chapter: chapter._id }).sort({ date: 1, createdAt: 1 });
    res.json({ ...chapter.toObject(), id: chapter._id, memories: memories.map(mapMemory) });
  } catch (error) {
    res.status(500).json({ message: error.message || "Failed to load chapter" });
  }
};

export const createChapter = async (req, res) => {
  try {
    if (!req.body.title?.trim()) return res.status(400).json({ message: "title is required" });
    const normalizedTitle = req.body.title.trim();
    const existing = await LifeChapter.findOne({
      user: req.user._id,
      title: { $regex: `^${normalizedTitle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" },
    });
    if (existing) {
      return res.status(200).json({ ...existing.toObject(), id: existing._id, memories: [] });
    }

    const capsule = await ensureCapsule(req.user._id);
    const count = await LifeChapter.countDocuments({ user: req.user._id });
    const chapter = await LifeChapter.create({
      title: normalizedTitle,
      icon: req.body.icon || "note",
      startDate: req.body.startDate,
      endDate: req.body.endDate,
      user: req.user._id,
      lifeCapsule: capsule._id,
      position: typeof req.body.position === "number" ? req.body.position : count,
    });
    res.status(201).json({ ...chapter.toObject(), id: chapter._id, memories: [] });
  } catch (error) {
    res.status(500).json({ message: error.message || "Failed to create chapter" });
  }
};

export const updateChapter = async (req, res) => {
  try {
    const chapter = await LifeChapter.findOne({ _id: req.params.id, user: req.user._id });
    if (!chapter) return res.status(404).json({ message: "Chapter not found" });
    Object.assign(chapter, req.body);
    await chapter.save();
    res.json({ ...chapter.toObject(), id: chapter._id });
  } catch (error) {
    res.status(500).json({ message: error.message || "Failed to update chapter" });
  }
};

export const deleteChapter = async (req, res) => {
  try {
    const deleted = await LifeChapter.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!deleted) return res.status(404).json({ message: "Chapter not found" });
    await Memory.deleteMany({ chapter: req.params.id, user: req.user._id });
    res.json({ message: "Chapter deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message || "Failed to delete chapter" });
  }
};

export const getMemories = async (req, res) => {
  try {
    const query = { user: req.user._id };
    if (req.query.tag) query.tags = req.query.tag;
    if (req.query.person) query.people = req.query.person;
    if (req.query.from || req.query.to) {
      query.date = {};
      if (req.query.from) query.date.$gte = new Date(req.query.from);
      if (req.query.to) query.date.$lte = new Date(req.query.to);
    }

const memories = await Memory.find(query).sort({ date: 1, createdAt: 1 });
    res.json(memories.map(mapMemory));
  } catch (error) {
    res.status(500).json({ message: error.message || "Failed to load memories" });
  }
};

export const getMemoryById = async (req, res) => {
  try {
    const memory = await Memory.findOne({ _id: req.params.id, user: req.user._id });
    if (!memory) return res.status(404).json({ message: "Memory not found" });
    res.json(mapMemory(memory));
  } catch (error) {
    res.status(500).json({ message: error.message || "Failed to load memory" });
  }
};

export const createMemory = async (req, res) => {
  try {
    const chapter = await resolveMemoryChapter(req.user._id, req.body.chapterId || req.body.chapter);

    const payload = {
      user: req.user._id,
      userId: req.user._id,
      chapter: chapter._id,
      title: req.body.title,
      description: req.body.description,
      type: normalizeIncomingMemoryType(req.body.type),
      mediaUrl: req.body.mediaUrl || req.body.imageUrl || req.body.image,
      date: req.body.date,
      location: req.body.location,
      people: req.body.people,
      emotion: req.body.emotion,
      tags: req.body.tags,
    };

    const existing = payload.mediaUrl
      ? await Memory.findOne({ user: req.user._id, mediaUrl: payload.mediaUrl })
      : null;

    if (existing) {
      Object.assign(existing, payload);
      await existing.save();
      return res.status(200).json(mapMemory(existing));
    }

    const memory = await Memory.create(payload);
    await awardXP(req.user._id, "memory_uploaded", "Memory", memory._id);
    res.status(201).json(mapMemory(memory));
  } catch (error) {
    res.status(500).json({ message: error.message || "Failed to create memory" });
  }
};

export const updateMemory = async (req, res) => {
  try {
    const memory = await Memory.findOne({ _id: req.params.id, user: req.user._id });
    if (!memory) return res.status(404).json({ message: "Memory not found" });

    const updates = { ...req.body };
    if (typeof updates.chapterId === "string" && !updates.chapter) {
      const chapter = await resolveMemoryChapter(req.user._id, updates.chapterId);
      updates.chapter = chapter._id;
    }
    if (typeof updates.chapter === "string" && !mongoose.Types.ObjectId.isValid(updates.chapter)) {
      const chapter = await resolveMemoryChapter(req.user._id, updates.chapter);
      updates.chapter = chapter._id;
    }
    if (typeof updates.type === "string") {
      updates.type = normalizeIncomingMemoryType(updates.type);
    }
    if (typeof updates.imageUrl === "string" && !updates.mediaUrl) {
      updates.mediaUrl = updates.imageUrl;
    }

    Object.assign(memory, updates);
    await memory.save();
    res.json(mapMemory(memory));
  } catch (error) {
    res.status(500).json({ message: error.message || "Failed to update memory" });
  }
};

export const deleteMemory = async (req, res) => {
  try {
    const deleted = await Memory.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!deleted) return res.status(404).json({ message: "Memory not found" });
    res.json({ message: "Memory deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message || "Failed to delete memory" });
  }
};

export const bulkMoveMemories = async (req, res) => {
  try {
    const { ids = [], chapterId } = req.body;
    if (!Array.isArray(ids) || ids.length === 0 || !chapterId) {
      return res.status(400).json({ message: "ids and chapterId are required" });
    }
    const chapter = await resolveMemoryChapter(req.user._id, chapterId);
    await Memory.updateMany(
      { _id: { $in: ids }, user: req.user._id },
      { $set: { chapter: chapter._id, chapterId: chapter._id } }
    );
    res.json({ message: "Memories moved" });
  } catch (error) {
    res.status(500).json({ message: error.message || "Failed to move memories" });
  }
};

export const reorderChapters = async (req, res) => {
  try {
    const updates = Array.isArray(req.body?.order) ? req.body.order : [];
    if (updates.length === 0) return res.status(400).json({ message: "order array required" });

    const ops = updates.map((item) => ({
      updateOne: {
        filter: { _id: item.id, user: req.user._id },
        update: { $set: { position: item.position } },
      },
    }));
    await LifeChapter.bulkWrite(ops);
    res.json({ message: "Chapters reordered" });
  } catch (error) {
    res.status(500).json({ message: error.message || "Failed to reorder chapters" });
  }
};
