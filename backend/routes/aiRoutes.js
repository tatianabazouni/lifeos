import express from "express";
import { Router } from "express";
const router = Router();
import protect from "../middleware/authMiddleware.js";
import {
  analyzeLifeCore,
  lifeContextSnapshot,
  proactiveCoach,
  getInsight,
  transformDream,
  applyDreamPlan,
  getContext,
  analyzeJournal,

  dreamToGoal,
  goalBreakdown,
} from "../controllers/aiController.js";

router.get("/context", protect, lifeContextSnapshot);

router.post("/analyze", protect, analyzeLifeCore);
router.post("/proactive-check", protect, proactiveCoach);

// Personalized AI endpoints
router.get("/insight", protect, getInsight);
router.post("/transform-dream", protect, transformDream);
router.post("/transform-dream/apply", protect, applyDreamPlan);

router.post("/journal-insight", protect, analyzeJournal);
router.post("/goal-breakdown", protect, goalBreakdown);
router.get("/context-debug", protect, getContext);


export default router;
