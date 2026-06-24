import express from "express";
import protect from "../middleware/authMiddleware.js";
import {
  createLifeStoryEntry,
  deleteLifeStoryEntry,
  getAllLifeStoryEntries,
  getLifeStoryEntryById,
  updateLifeStoryEntry,
} from "../controllers/lifeStoryController.js";

const router = express.Router();

router.route("/").get(protect, getAllLifeStoryEntries).post(protect, createLifeStoryEntry);
router.route("/:id").get(protect, getLifeStoryEntryById).put(protect, updateLifeStoryEntry).delete(protect, deleteLifeStoryEntry);

export default router;
