import express from "express";
import protect from "../middleware/authMiddleware.js";
import {
  createXPEvent,
  deleteXPEvent,
  getSnapshot,
  getXPEvent,
  updateXPEvent,
} from "../controllers/gamificationController.js";

const router = express.Router();

router.route("/").get(protect, getSnapshot).post(protect, createXPEvent);

router.route("/:id").get(protect, getXPEvent).put(protect, updateXPEvent).delete(protect, deleteXPEvent);

export default router;
