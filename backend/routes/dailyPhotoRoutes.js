import express from "express";
import protect from "../middleware/authMiddleware.js";
import {
  createDailyPhoto,
  deleteDailyPhoto,
  getDailyPhoto,
  getDailyPhotoById,
  updateDailyPhoto,
} from "../controllers/dailyPhotoController.js";

const router = express.Router();

router.route("/").get(protect, getDailyPhoto).post(protect, createDailyPhoto);
router.route("/:id").get(protect, getDailyPhotoById).put(protect, updateDailyPhoto).delete(protect, deleteDailyPhoto);

export default router;
