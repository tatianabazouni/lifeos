import User from "../models/User.js";

export const updateDailyStreak = async (req, res, next) => {
  // Skip if no authenticated user
  if (!req.user || !req.user._id) {
    return next();
  }

  try {
    const user = await User.findById(req.user._id);
    if (!user) return next();

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Check if visited yesterday
    const lastVisit = new Date(user.lastVisit || 0);
    if (lastVisit >= yesterday && lastVisit < today) {
      // Continued streak
      user.streak = (user.streak || 0) + 1;
    } else if (lastVisit < yesterday || !user.lastVisit) {
      // Reset streak
      user.streak = 1;
    }
    // Award daily login XP
    if (lastVisit < today) {
      user.xp += 5; // Daily login bonus
    }

    user.lastVisit = new Date();
    await user.save();

    next();
  } catch (error) {
    console.error("Streak update error:", error);
    next();
  }
};

