import express from "express";
import protect from "../middleware/authMiddleware.js";
import {
  getBoards,
  getBoardById,
  createBoard,
  updateBoard,
  deleteBoard,
  getVisionItems,
  getVisionItemById,
  createVisionItem,
  updateVisionItem,
  deleteVisionItem,
  convertToGoal,
  generateGoalPlan,
  shareBoard,
} from "../controllers/visionController.js";

const router = express.Router();

router.route("/boards").get(protect, getBoards).post(protect, createBoard);
router.route("/boards/:id").get(protect, getBoardById).put(protect, updateBoard).delete(protect, deleteBoard);
router.post("/boards/:id/share", protect, shareBoard);

router.route("/vision-items").get(protect, getVisionItems).post(protect, createVisionItem);
router.route("/vision-items/:id").get(protect, getVisionItemById).put(protect, updateVisionItem).delete(protect, deleteVisionItem);
router.post("/vision-items/:id/goal-plan", protect, generateGoalPlan);
router.post("/vision-items/:id/convert-to-goal", protect, convertToGoal);

export default router;
