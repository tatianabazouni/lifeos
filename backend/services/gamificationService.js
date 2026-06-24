import User from "../models/User.js";
import XPLog from "../models/XPLog.js";
import Badge from "../models/Badge.js";


const EVENT_POINTS = {
  goal_created: 15,
  goal_completed: 60,
  journal_created: 10,
  memory_uploaded: 12,
  daily_photo_uploaded: 5,

};

const DEFAULT_BADGES = [
  { key: "first_steps", title: "First Steps", description: "Earn 50 XP", thresholdXP: 50 },
  { key: "goal_getter", title: "Goal Getter", description: "Earn 200 XP", thresholdXP: 200 },
  { key: "life_master", title: "Life Master", description: "Earn 500 XP", thresholdXP: 500 },
];



const ensureDefaults = async () => {
  const existingBadgeCount = await Badge.countDocuments();
  if (existingBadgeCount === 0) {
    await Badge.insertMany(DEFAULT_BADGES);
  }


};

export const calculateLevel = (xp) => Math.floor(Math.sqrt(xp / 25)) + 1;

export const getUserLevel = async (userId) => {
  // Wrapper for notification service compatibility
  const User = require('../models/User.js');
  const user = await User.findById(userId);
  return calculateLevel(user?.xp || 0);
};



export const getLevelProgress = (xp) => {
  const level = calculateLevel(xp);
  const currentLevelMinXP = Math.max(0, Math.ceil(((level - 1) ** 2) * 25));
  const nextLevelMinXP = Math.ceil((level ** 2) * 25);
  const progressPercent = Math.max(0, Math.min(100, ((xp - currentLevelMinXP) / Math.max(1, nextLevelMinXP - currentLevelMinXP)) * 100));

  return {
    level,
    currentLevelMinXP,
    nextLevelMinXP,
    progressPercent,
    xpToNextLevel: Math.max(0, nextLevelMinXP - xp),
  };
};

export const awardXP = async (userId, event, referenceType, referenceId, metadata = {}) => {
  await ensureDefaults();

  const fallbackPoints = EVENT_POINTS[event] ?? 0;
  const metadataPoints = Number(metadata?.points ?? 0);
  const points = metadataPoints > 0 ? metadataPoints : fallbackPoints;
  if (!points) return { awarded: false, reason: "No points configured" };

  const existing = await XPLog.findOne({ user: userId, event, referenceType, referenceId });
  if (existing) return { awarded: false, reason: "Duplicate award prevented" };

  await XPLog.create({ user: userId, userId, event, points, referenceType, referenceId: String(referenceId), metadata });

  const user = await User.findById(userId);
  if (!user) return { awarded: false, reason: "User not found" };

  user.xp += points;
  user.level = calculateLevel(user.xp);

  const badgeDefinitions = await Badge.find().sort({ thresholdXP: 1 });
  for (const badge of badgeDefinitions) {
    if (user.xp >= Number(badge.thresholdXP || 0) && !user.badges.includes(badge.key)) {
      user.badges.push(String(badge.key));
    }
  }

  await user.save();

  return { awarded: true, points, xp: user.xp, level: user.level, badges: user.badges };
};

export const getGamificationSnapshot = async (userId) => {
  await ensureDefaults();

  const user = await User.findById(userId).select("xp level streak badges");
  const history = await XPLog.find({ user: userId }).sort({ createdAt: -1 }).limit(50);
  const badgeDefinitions = await Badge.find().sort({ thresholdXP: 1 });
  return {
    user,
    history,
    badgesCatalog: badgeDefinitions.map((badge) => ({
      id: badge._id,
      key: badge.key,
      title: badge.title,
      description: badge.description,
      thresholdXP: badge.thresholdXP,
      earned: Array.isArray(user?.badges) ? user.badges.includes(badge.key) : false,
    })),
  };
};
