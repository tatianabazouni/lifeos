import express from "express";
import protect from "../middleware/authMiddleware.js";
import {
  deleteConnection,
  listConnections,
  getConnectionById,
  searchUsers,
  requestConnection,
  acceptConnection,
  declineConnection,
} from "../controllers/connectionController.js";

const router = express.Router();

router.get("/connections", protect, listConnections);
router.get("/connections/users/search", protect, searchUsers);
router.get("/connections/:id", protect, getConnectionById);
router.post("/connections/request", protect, requestConnection);
router.put("/connections/accept", protect, acceptConnection);
router.put("/connections/decline", protect, declineConnection);
router.delete("/connections/:id", protect, deleteConnection);

export default router;
