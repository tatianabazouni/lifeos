import express from "express";
import {
  registerUser,
  loginUser,
  getProfile,
  updateProfile,
  createProfilePost,
  deleteProfilePost,
} from "../controllers/authController.js";
import protect from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/profile", protect, getProfile);
router.put("/profile", protect, updateProfile);
router.post("/profile/posts", protect, createProfilePost);
router.delete("/profile/posts/:postId", protect, deleteProfilePost);

export default router;
