import { buildUserContext, calculateJournalConsistency } from './contextBuilder.js';
import { getPersonalizedInsight, motivationalInsight } from './aiService.js';
import Goal from '../models/Goal.js';
import Notification from '../models/Notification.js';
import { calculateLevel as getUserLevel } from './gamificationService.js';



const LIFEOS_HERO_THEMES = [
  'You are the hero of your life story',
  'LifeOS helps you live intentionally', 
  'Remember how far you’ve come',
  'Reflect on your growth',
  'Build your future through action',
  'Add this moment to your core memories'
];

export const NOTIFICATION_TYPES = {
  DEADLINE_REMINDER: 'deadline_reminder',
  PROGRESS_CHEER: 'progress_cheer',
  JOURNAL_NUDGE: 'journal_nudge',
  LEVEL_UP: 'level_celebration',
  MEMORY_MOMENT: 'memory_moment'
};


/**
 * Generate AI-powered motivational content for specific trigger
 */
export const generateMotivationalContent = async (userId, trigger, contextData = {}) => {
  const baseContext = await buildUserContext(userId);
  
  const systemPrompts = {
    [NOTIFICATION_TYPES.DEADLINE_REMINDER]: `You are LifeOS AI coach. Create URGENT deadline reminder:
- Hero theme: "You're the HERO - finish this quest"
- Format: "🚨 [Goal Name] due in X days! You're Y% there"
- Actionable: Clear next step
- Keep under 120 chars`,
    
    [NOTIFICATION_TYPES.PROGRESS_CHEER]: `Motivational progress cheer:
- "You're almost there!" + progress %
- Hero theme: Celebrate the journey
- Action: "One more push!"
- Max 100 chars`,
    
    [NOTIFICATION_TYPES.JOURNAL_NUDGE]: `Journal reminder with reflection:
- "Hero's nightly reflection time"
- Theme: Growth through documentation  
- "Remember how far you've come"
- Max 110 chars`,
    
    [NOTIFICATION_TYPES.LEVEL_UP]: `Level-up celebration:
- 🎖️ "Level {level} UNLOCKED!"
- Hero progression theme
- "LifeOS journey advancing"
- Max 90 chars`,
    
    [NOTIFICATION_TYPES.MEMORY_MOMENT]: `Memory capture nudge:
- "Add this milestone to your life story"
- Nostalgia + growth theme
- Max 100 chars`
  };

  const userPrompt = JSON.stringify({
    trigger,
    ...contextData,
    ...baseContext,
    heroThemes: LIFEOS_HERO_THEMES
  });

  const content = await motivationalInsight(systemPrompts[trigger] + '\\nContext: ' + userPrompt);
  
  return {
    title: content.substring(0, 60) + '...',
    body: content,
    theme: 'hero_motivation'
  };
};

/**
 * Check for goal deadline triggers (1-3 days out)
 */
export const checkGoalDeadlines = async (userId) => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const in3days = new Date();
  in3days.setDate(in3days.getDate() + 3);

  const goals = await Goal.find({
    user: userId,
    deadline: { $gte: tomorrow, $lte: in3days },
    completed: false
  }).select('title progress deadline');

  return goals.map(goal => ({
    type: NOTIFICATION_TYPES.DEADLINE_REMINDER,
    goal,
    daysLeft: Math.ceil((goal.deadline - Date.now()) / (1000 * 60 * 60 * 24))
  }));
};

/**
 * Check journal consistency triggers
 */
export const checkJournalTriggers = async (userId) => {
  const consistency = await calculateJournalConsistency(userId);
  // Use recent journal count as streak proxy (getJournalStreak not implemented)
  const context = await buildUserContext(userId);
  const streak = context.meta?.journalCount || 0;
  
  const triggers = [];
  
  if (consistency < 40) {
    triggers.push({
      type: NOTIFICATION_TYPES.JOURNAL_NUDGE,
      reason: 'low_consistency',
      data: { consistency }
    });
  }
  
  if (streak >= 3) {
    triggers.push({
      type: NOTIFICATION_TYPES.JOURNAL_NUDGE,
      reason: 'streak_celebration',
      data: { streak }
    });
  }
  
  return triggers;
};



/**
 * Check gamification level-up triggers
 */
export const checkLevelTriggers = async (userId) => {
  // getRecentXP not available, use simplified level-up check
  const User = require('../models/User.js');
  const user = await User.findById(userId).select('xp level');
  if (!user) return [];
  
  const recentLevel = calculateLevel(user.xp); // reuse gamification logic
  if (recentLevel > user.level) {
    return [{
      type: NOTIFICATION_TYPES.LEVEL_UP,
      data: { level: recentLevel, xp: user.xp }
    }];
  }
  
  return [];
};


/**
 * Main trigger scanner - returns all active notifications for user
 */
export const scanNotificationTriggers = async (userId) => {
  const triggers = [
    ...await checkGoalDeadlines(userId),
    ...await checkJournalTriggers(userId),
    ...await checkLevelTriggers(userId)
  ];

  const notifications = [];
  
  for (const trigger of triggers) {
    const content = await generateMotivationalContent(userId, trigger.type, trigger);
    
    // Avoid duplicates (last 24h)
    const recent = await Notification.findOne({
      user: userId,
      type: trigger.type,
      goal: trigger.goal?._id,
      createdAt: { $gte: new Date(Date.now() - 24*60*60*1000) }
    });
    
    if (!recent) {
      notifications.push({
        user: userId,
        type: trigger.type,
        title: content.title,
        message: content.body,
        data: trigger.data || {},
        priority: trigger.type === NOTIFICATION_TYPES.DEADLINE_REMINDER ? 'high' : 'medium',
        theme: content.theme,
        aiGenerated: true
      });
    }
  }
  
  return notifications;
};

/**
 * Batch create notifications (cron job)
 */
export const createNotificationsBatch = async (userIds) => {
  const batch = [];
  
  for (const userId of userIds) {
    const notifications = await scanNotificationTriggers(userId);
    batch.push(...notifications);
  }
  
  return Notification.insertMany(batch);
};

/**
 * Get unread high-priority notifications count
 */
export const getNotificationCount = async (userId) => {
  return Notification.countDocuments({
    user: userId,
    read: { $ne: true },
    priority: 'high'
  });
};

export default {
  scanNotificationTriggers,
  createNotificationsBatch,
  getNotificationCount,
  NOTIFICATION_TYPES
};


