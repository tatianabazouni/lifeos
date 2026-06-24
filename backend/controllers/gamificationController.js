import XPLog from "../models/XPLog.js";
import { awardXP, getGamificationSnapshot, getLevelProgress } from "../services/gamificationService.js";


export const getSnapshot = async (req, res) => {
  try {
    const data = await getGamificationSnapshot(req.user._id);
    const xp = data.user?.xp || 0;

    res.json({
      xp,
      level: data.user?.level || 1,
      badges: data.user?.badges || [],
      badgesCatalog: data.badgesCatalog || [],
      streak: data.user?.streak || 0,
      levelProgress: getLevelProgress(xp),
      history: data.history,

    });
  } catch (error) {
    res.status(500).json({ message: error.message || "Failed to load gamification data" });
  }
};

export const createXPEvent = async (req, res) => {
  try {
    const { event, referenceType = "Manual", referenceId = `manual-${Date.now()}`, metadata = {} } = req.body;
    if (!event) return res.status(400).json({ message: "event is required" });

    const result = await awardXP(req.user._id, event, referenceType, referenceId, metadata);
    if (!result.awarded) {
      return res.status(409).json(result);
    }

    return res.status(201).json(result);
  } catch (error) {
    res.status(500).json({ message: error.message || "Failed to create XP event" });
  }
};

export const getXPEvent = async (req, res) => {
  try {
    const event = await XPLog.findOne({ _id: req.params.id, user: req.user._id });
    if (!event) return res.status(404).json({ message: "XP event not found" });
    res.json(event);
  } catch (error) {
    res.status(500).json({ message: error.message || "Failed to load XP event" });
  }
};

export const updateXPEvent = async (req, res) => {
  try {
    const event = await XPLog.findOne({ _id: req.params.id, user: req.user._id });
    if (!event) return res.status(404).json({ message: "XP event not found" });

    Object.assign(event, req.body);
    await event.save();
    res.json(event);
  } catch (error) {
    res.status(500).json({ message: error.message || "Failed to update XP event" });
  }
};

export const deleteXPEvent = async (req, res) => {
  try {
    const deleted = await XPLog.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!deleted) return res.status(404).json({ message: "XP event not found" });
    res.json({ message: "XP event deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message || "Failed to delete XP event" });
  }
};


