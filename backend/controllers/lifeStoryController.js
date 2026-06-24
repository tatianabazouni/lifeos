import LifeStoryEntry from "../models/LifeStoryEntry.js";

export const getAllLifeStoryEntries = async (req, res) => {
  try {
    const entries = await LifeStoryEntry.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json(entries);
  } catch (error) {
    res.status(500).json({ message: error.message || "Failed to load life story entries" });
  }
};

export const getLifeStoryEntryById = async (req, res) => {
  try {
    const entry = await LifeStoryEntry.findOne({ _id: req.params.id, user: req.user._id });
    if (!entry) return res.status(404).json({ message: "Life story entry not found" });
    res.json(entry);
  } catch (error) {
    res.status(500).json({ message: error.message || "Failed to load life story entry" });
  }
};

export const createLifeStoryEntry = async (req, res) => {
  try {
    if (!req.body.title?.trim() || !req.body.content?.trim()) {
      return res.status(400).json({ message: "title and content are required" });
    }

    const entry = await LifeStoryEntry.create({
      user: req.user._id,
      userId: req.user._id,
      ...req.body,
      wordCount: Number(req.body.wordCount ?? String(req.body.content || "").trim().split(/\s+/).filter(Boolean).length),
    });

    res.status(201).json(entry);
  } catch (error) {
    res.status(500).json({ message: error.message || "Failed to create life story entry" });
  }
};

export const updateLifeStoryEntry = async (req, res) => {
  try {
    const entry = await LifeStoryEntry.findOne({ _id: req.params.id, user: req.user._id });
    if (!entry) return res.status(404).json({ message: "Life story entry not found" });

    Object.assign(entry, req.body);
    if (typeof req.body.content === "string" && req.body.wordCount == null) {
      entry.wordCount = req.body.content.trim().split(/\s+/).filter(Boolean).length;
    }

    await entry.save();
    res.json(entry);
  } catch (error) {
    res.status(500).json({ message: error.message || "Failed to update life story entry" });
  }
};

export const deleteLifeStoryEntry = async (req, res) => {
  try {
    const deleted = await LifeStoryEntry.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!deleted) return res.status(404).json({ message: "Life story entry not found" });
    res.json({ message: "Life story entry deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message || "Failed to delete life story entry" });
  }
};
