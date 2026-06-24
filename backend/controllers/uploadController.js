import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import LifeCapsule from "../models/LifeCapsule.js";
import LifeChapter from "../models/LifeChapter.js";
import Memory from "../models/Memory.js";
import { awardXP } from "../services/gamificationService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadRoot = path.join(__dirname, "..", "uploads");

const extensionByMime = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/heic": "heic",
  "image/heif": "heif",
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
  "video/x-matroska": "mkv",
  "video/mpeg": "mpg",
  "video/mpg": "mpg",
  "video/3gpp": "3gp",
  "audio/aac": "aac",
  "audio/mpeg": "mp3",
  "audio/mp3": "mp3",
  "audio/mp4": "m4a",
  "audio/x-m4a": "m4a",
  "audio/wav": "wav",
  "audio/webm": "webm",
  "audio/ogg": "ogg",
};

const ensureDir = async (dirName) => {
  const dir = path.join(uploadRoot, dirName);
  await fs.mkdir(dir, { recursive: true });
  return dir;
};

const ensureCapsule = async (userId) => {
  return LifeCapsule.findOneAndUpdate(
    { user: userId },
    { $setOnInsert: { title: "My Life Capsule", description: "" } },
    { new: true, upsert: true }
  );
};

const resolveMemoryChapter = async (userId, chapterInput) => {
  const raw = typeof chapterInput === "string" ? chapterInput.trim() : chapterInput;

  if (raw && typeof raw === "string" && raw.length > 0) {
    const byId = await LifeChapter.findOne({ _id: raw, user: userId }).catch(() => null);
    if (byId) return byId;
  }

  const capsule = await ensureCapsule(userId);
  return LifeChapter.findOneAndUpdate(
    { user: userId, title: "My Memories" },
    {
      $setOnInsert: {
        title: "My Memories",
        icon: "note",
        user: userId,
        lifeCapsule: capsule._id,
      },
    },
    { upsert: true, new: true }
  );
};

const detectMemoryType = (file) => {
  if (file?.mimetype?.startsWith("image/")) return "photo";
  if (file?.mimetype?.startsWith("video/")) return "video";
  if (file?.mimetype?.startsWith("audio/")) return "voice";
  return "photo";
};

const upsertMemoryFromUpload = async (req, mediaUrl, file) => {
  const chapter = await resolveMemoryChapter(req.user._id, req.body?.chapterId || req.body?.chapter);
  const normalizedTitle = (req.body?.title || file?.originalname || "Untitled Memory")
    .toString()
    .trim()
    .slice(0, 160) || "Untitled Memory";

  const type = detectMemoryType(file);

  const existing = await Memory.findOne({ user: req.user._id, mediaUrl });
  if (existing) {
    existing.title = normalizedTitle;
    existing.chapter = chapter._id;
    existing.type = type;
    existing.mediaUrl = mediaUrl;

    if (req.body?.description) existing.description = req.body.description;
    if (req.body?.date) existing.date = req.body.date;
    if (req.body?.location) existing.location = req.body.location;
    if (req.body?.people) existing.people = req.body.people;
    if (req.body?.emotion) existing.emotion = req.body.emotion;
    if (req.body?.tags) existing.tags = req.body.tags;

    await existing.save();
    return { memory: existing, created: false };
  }

  const memory = await Memory.create({
    user: req.user._id,
    userId: req.user._id,
    chapter: chapter._id,
    title: normalizedTitle,
    description: req.body?.description || "",
    type,
    mediaUrl,
    date: req.body?.date || Date.now(),
    location: req.body?.location,
    people: req.body?.people,
    emotion: req.body?.emotion,
    tags: req.body?.tags,
  });

  await awardXP(req.user._id, "memory_uploaded", "Memory", memory._id);
  return { memory, created: true };
};

const saveUpload = async (file, dirName) => {
  if (!file) {
    throw new Error("No file uploaded");
  }

  const extension = extensionByMime[file.mimetype] || file.originalname.split(".").pop() || "bin";
  const safeBaseName = file.originalname
    .replace(/\.[^.]+$/, "")
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 40) || "memory";
  const fileName = `${Date.now()}-${safeBaseName}.${extension}`;
  const directory = await ensureDir(dirName);
  const fullPath = path.join(directory, fileName);

  await fs.writeFile(fullPath, file.buffer);
  return `/uploads/${dirName}/${fileName}`;
};

export const uploadImage = async (req, res) => {
  try {
    const mediaUrl = await saveUpload(req.file, "images");
    const shouldCreateMemory = req.query?.createMemory === "true" || req.body?.createMemory === "true";
    const memoryData = shouldCreateMemory ? await upsertMemoryFromUpload(req, mediaUrl, req.file) : null;

    res.status(201).json({
      mediaUrl,
      imageUrl: mediaUrl,
      url: mediaUrl,
      type: "image",
      ...(memoryData ? { memoryId: memoryData.memory._id } : {}),
    });
  } catch (error) {
    res.status(400).json({ message: error.message || "Image upload failed" });
  }
};

export const uploadVideo = async (req, res) => {
  try {
    const mediaUrl = await saveUpload(req.file, "videos");
    const shouldCreateMemory = req.query?.createMemory === "true" || req.body?.createMemory === "true";
    const memoryData = shouldCreateMemory ? await upsertMemoryFromUpload(req, mediaUrl, req.file) : null;

    res.status(201).json({ mediaUrl, url: mediaUrl, type: "video", ...(memoryData ? { memoryId: memoryData.memory._id } : {}) });
  } catch (error) {
    res.status(400).json({ message: error.message || "Video upload failed" });
  }
};

export const uploadAudio = async (req, res) => {
  try {
    const mediaUrl = await saveUpload(req.file, "audio");
    const shouldCreateMemory = req.query?.createMemory === "true" || req.body?.createMemory === "true";
    const memoryData = shouldCreateMemory ? await upsertMemoryFromUpload(req, mediaUrl, req.file) : null;

    res.status(201).json({ mediaUrl, url: mediaUrl, type: "audio", ...(memoryData ? { memoryId: memoryData.memory._id } : {}) });
  } catch (error) {
    res.status(400).json({ message: error.message || "Audio upload failed" });
  }
};
