import express from "express";
import protect from "../middleware/authMiddleware.js";
import { createHabit, deleteHabit, getAllHabits, getHabitById, updateHabit } from "../controllers/habitController.js";

const router = express.Router();

router.route("/").get(protect, getAllHabits).post(protect, createHabit);
router.route("/:id").get(protect, getHabitById).put(protect, updateHabit).delete(protect, deleteHabit);

export default router;
