import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";

import connectDB from "./config/db.js";
import { errorHandler, notFound } from "./middleware/errorMiddleware.js";

import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import goalRoutes from "./routes/goalRoutes.js";
import journalRoutes from "./routes/journalRoutes.js";
import lifeRoutes from "./routes/lifeRoutes.js";
import aiRoutes from "./routes/aiRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import gamificationRoutes from "./routes/gamificationRoutes.js";
import dailyPhotoRoutes from "./routes/dailyPhotoRoutes.js";
import visionRoutes from "./routes/visionRoutes.js";
import connectionRoutes from "./routes/connectionRoutes.js";
import lifeStoryRoutes from "./routes/lifeStoryRoutes.js";
import taskRoutes from "./routes/taskRoutes.js";
import habitRoutes from "./routes/habitRoutes.js";
import uploadRoutes from "./routes/uploadRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import { startProactiveEngine } from "./services/proactiveCoachService.js";
// import cron from 'node-cron';
// import notificationService from './services/notificationService.js';

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* ===========================
   PRODUCTION SAFE CORS SETUP
=========================== */
const allowedOrigins = [
  process.env.FRONTEND_URL,
  "http://localhost:8080",
  "http://127.0.0.1:8080",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
].filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    console.error("❌ CORS BLOCKED:", origin);
    return callback(new Error("CORS not allowed"));
  },
  credentials: true,
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

/* ===========================
   BODY PARSING
=========================== */

app.use(express.json({ limit: "8mb" }));
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

import { updateDailyStreak } from "./middleware/streakMiddleware.js";
app.use("/api", updateDailyStreak);

app.use("/api", (req, res, next) => {
  if (mongoose.connection.readyState === 1) {
    return next();
  }

  return res.status(503).json({
    message: "Database unavailable. Check your MongoDB Atlas IP access list or connection settings.",
  });
});

/* ===========================
   ROUTES
=========================== */

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/goals", goalRoutes);
app.use("/api/journal", journalRoutes);
app.use("/api/life", lifeRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/gamification", gamificationRoutes);
app.use("/api/daily-photo", dailyPhotoRoutes);
app.use("/api", visionRoutes);
app.use("/api", connectionRoutes);
app.use("/api/life-story", lifeStoryRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/habits", habitRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api", notificationRoutes);

/* ===========================
   ROOT
=========================== */

app.get("/", (req, res) => res.send("LifeOS API running"));

// Database connection (non-blocking)
connectDB();

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log('💡 Test endpoint: POST /api/notifications/generate-ai');
  console.log('💡 Cron jobs ready (node-cron installed)');
  console.log('✅ DB Status:', mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected');
  console.log('🚀 Set LIFEOS_ENABLE_PROACTIVE=true to enable AI coach');
});


