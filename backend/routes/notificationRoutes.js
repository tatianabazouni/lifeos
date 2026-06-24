import express from "express";
import protect from "../middleware/authMiddleware.js";
import {
  clearNotifications,
  cronGenerateNotifications,
  deleteNotification,
  generateAINotifications,
  getNotificationById,
  getUnreadCount,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "../controllers/notificationController.js";

const router = express.Router();

router.get("/notifications", protect, listNotifications);
router.get("/notifications/:id", protect, getNotificationById);
router.put("/notifications/:id/read", protect, markNotificationRead);
router.put("/notifications/read-all", protect, markAllNotificationsRead);
router.delete("/notifications/:id", protect, deleteNotification);
router.delete("/notifications", protect, clearNotifications);
router.post("/generate-ai", protect, generateAINotifications);
router.get("/cron-generate", generateAINotifications); // dev testing
router.get("/unread-count", protect, getUnreadCount);

export default router;
