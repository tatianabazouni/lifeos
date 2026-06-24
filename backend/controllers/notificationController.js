import Notification from "../models/Notification.js";
import notificationService, { NOTIFICATION_TYPES } from "../services/notificationService.js";

const mapNotification = (notification) => ({
  id: notification._id,
  type: notification.type,
  title: notification.title,
  message: notification.message,
  data: notification.data || {},
  readAt: notification.readAt,
  createdAt: notification.createdAt,
  actor: notification.actor
    ? {
        id: notification.actor._id || notification.actor,
        name: notification.actor.name || "Unknown",
        email: notification.actor.email || "",
      }
    : null,
});

export const listNotifications = async (req, res) => {
  const notifications = await Notification.find({ recipient: req.user._id })
    .populate("actor", "name email")
    .sort({ createdAt: -1 })
    .limit(100);

  res.json(notifications.map(mapNotification));
};

export const markNotificationRead = async (req, res) => {
  const notification = await Notification.findOne({
    _id: req.params.id,
    recipient: req.user._id,
  });

  if (!notification) {
    return res.status(404).json({ message: "Notification not found" });
  }

  if (!notification.readAt) {
    notification.readAt = new Date();
    await notification.save();
  }

  return res.json(mapNotification(notification));
};

export const getNotificationById = async (req, res) => {
  const notification = await Notification.findOne({
    _id: req.params.id,
    recipient: req.user._id,
  }).populate("actor", "name email");

  if (!notification) {
    return res.status(404).json({ message: "Notification not found" });
  }

  return res.json(mapNotification(notification));
};

export const markAllNotificationsRead = async (req, res) => {
  await Notification.updateMany(
    {
      recipient: req.user._id,
      readAt: null,
    },
    { $set: { readAt: new Date() } }
  );

  return res.json({ message: "All notifications marked as read" });
};

export const deleteNotification = async (req, res) => {
  const deleted = await Notification.findOneAndDelete({
    _id: req.params.id,
    recipient: req.user._id,
  });

  if (!deleted) {
    return res.status(404).json({ message: "Notification not found" });
  }

  return res.json({ message: "Notification deleted" });
};

export const clearNotifications = async (req, res) => {
  await Notification.deleteMany({ user: req.user._id });
  return res.json({ message: "Notifications cleared" });
};

export const generateAINotifications = async (req, res) => {
  try {
    const { userId = req.user._id, triggerType } = req.body;
    
    if (userId !== req.user._id && req.user.role !== 'admin') {
      return res.status(403).json({ message: "Cannot generate for other users" });
    }

    const triggers = await notificationService.scanNotificationTriggers(userId);
    const notifications = await Notification.insertMany(triggers.map(trigger => ({
      user: userId,
      ...trigger,
      title: trigger.title || 'LifeOS Update',
      message: trigger.message || 'New motivation awaits',
      aiGenerated: true
    })));

    res.json({
      generated: notifications.length,
      types: notifications.map(n => n.type),
      message: `${notifications.length} AI notifications created`
    });
  } catch (error) {
    console.error('AI notification generation failed:', error);
    res.status(500).json({ message: error.message });
  }
};

export const cronGenerateNotifications = async (req, res) => {
  try {
    // For dev testing - limit to recent users or specific
    const limitUsers = req.query.limit ? parseInt(req.query.limit) : 5;
    
    // Get recent active users (placeholder - implement user activity query)
    const userIds = ['test-user-1', 'test-user-2']; // Replace with real query
    
    const result = await notificationService.createNotificationsBatch(userIds.slice(0, limitUsers));
    
    res.json({
      generated: result.length,
      forUsers: userIds.slice(0, limitUsers),
      message: 'Cron batch complete'
    });
  } catch (error) {
    console.error('Cron notification generation failed:', error);
    res.status(500).json({ message: error.message });
  }
};

export const getUnreadCount = async (req, res) => {
  const count = await notificationService.getNotificationCount(req.user._id);
  res.json({ unreadHighPriority: count });
};

