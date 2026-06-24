import express from "express";
import protect, { requireRole } from "../middleware/authMiddleware.js";
import { getAllUsers, getMe, updateMe } from "../controllers/userController.js";

const router = express.Router();

router.get("/me", protect, getMe);
router.put("/me", protect, updateMe);
router.get("/", protect, requireRole("admin"), getAllUsers);

export default router;
