import express from "express";
import multer from "multer";
import protect from "../middleware/authMiddleware.js";
import { uploadImage, uploadVideo, uploadAudio } from "../controllers/uploadController.js";

const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 200 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (
      file.mimetype.startsWith("image/")
      || file.mimetype.startsWith("video/")
      || file.mimetype.startsWith("audio/")
    ) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type"));
    }
  },
});

router.post("/image", protect, upload.single("image"), uploadImage);
router.post("/video", protect, upload.single("video"), uploadVideo);
router.post("/audio", protect, upload.single("audio"), uploadAudio);

export default router;
