import User from "../models/User.js";
import Goal from "../models/Goal.js";
import JournalEntry from "../models/JournalEntry.js";
import LifeChapter from "../models/LifeChapter.js";
import Memory from "../models/Memory.js";
import MoodEntry from "../models/MoodEntry.js";
import DailyPhoto from "../models/DailyPhoto.js";

import { getLevelProgress } from "../services/gamificationService.js";

export const getDashboardSummary = async (req, res) => {
  try {
    const userId = req.user._id;

    const [user, goals, journals, lifeChapterCount, memories, todayMood, todayPhoto] = await Promise.all([
      User.findById(userId).select("name xp level streak badges"),
      Goal.find({ user: userId }).sort({ updatedAt: -1 }),
      JournalEntry.find({ user: userId }).sort({ updatedAt: -1 }),
      LifeChapter.countDocuments({ user: userId }),
      Memory.find({ user: userId }).sort({ date: -1, createdAt: -1 }).limit(10),
      MoodEntry.findOne({ user: userId, date: new Date().toISOString().slice(0, 10) }),
      DailyPhoto.findOne({ user: userId }).sort({ createdAt: -1 }),
    ]);

    const completedGoals = goals.filter((goal) => goal.completed || goal.progress >= 100).length;
    const levelData = getLevelProgress(user?.xp || 0);


    const recentActivity = [
      ...goals.slice(0, 6).map((goal) => ({
        id: goal._id,
        type: "goal",
        title: goal.title,
        date: goal.updatedAt,
      })),
      ...journals.slice(0, 6).map((entry) => ({
        id: entry._id,
        type: "journal",
        title: entry.title || "Journal entry",
        date: entry.updatedAt,
      })),
      ...memories.slice(0, 6).map((memory) => ({
        id: memory._id,
        type: "memory",
        title: memory.title,
        date: memory.updatedAt,
      })),
    ]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 12);

    res.json({
      user: {
        name: user?.name || "Explorer",
        xp: user?.xp || 0,
        level: user?.level || 1,
        streak: user?.streak || 0,
        badges: user?.badges || [],
      },
      levelProgress: levelData,
      goalsTotal: goals.length,
      goalsCompleted: completedGoals,
      journalCount: journals.length,
      lifeChapterCount,
      recentGoals: goals.slice(0, 5).map((goal) => ({
        id: goal._id,
        title: goal.title,
        deadline: goal.deadline,
        progress: goal.progress,
        xpReward: goal.xpReward,
      })),
      recentJournalEntries: journals.slice(0, 5).map((entry) => ({
        id: entry._id,
        title: entry.title || "Journal entry",
        date: entry.createdAt,
      })),


      timelineEvents: memories.slice(0, 6).map((memory) => ({
        id: memory._id,
        label: memory.title,
        emoji: memory.type === "photo" ? "📸" : "📝",
        color: "primary",
      })),
      recentActivity,
      todayMood: todayMood ? { id: todayMood._id, mood: todayMood.mood, date: todayMood.date } : { mood: null, date: new Date().toISOString().slice(0, 10) },
      todayPhoto: todayPhoto ? todayPhoto.image || todayPhoto.imageUrl || null : null,
    });
  } catch (error) {
    res.status(500).json({ message: error.message || "Failed to load dashboard summary" });
  }
};
