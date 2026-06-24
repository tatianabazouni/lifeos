import express from "express";
import  protect  from "../middleware/authMiddleware.js";
import {
  getChapters,
  createChapter,
  updateChapter,
  deleteChapter,
  getChapterById,
  reorderChapters,
  getMemories,
  getMemoryById,
  createMemory,
  updateMemory,
  deleteMemory,
  bulkMoveMemories,
} from "../controllers/lifeController.js";

const router = express.Router();

router.route("/chapters")
  .get(protect, getChapters)
  .post(protect, createChapter);

router.route("/chapters/:id")
  .get(protect, getChapterById)
  .put(protect, updateChapter)
  .delete(protect, deleteChapter);

// Reorder chapters
router.put("/chapters-reorder", protect, reorderChapters);

router.route("/memories")
  .get(protect, getMemories)
  .post(protect, createMemory);

router.route("/memories/:id")
  .get(protect, getMemoryById)
  .put(protect, updateMemory)
  .delete(protect, deleteMemory);

// Bulk move memories
router.post("/memories/bulk-move", protect, bulkMoveMemories);

export default router;
