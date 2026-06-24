import DailyPhoto from "../models/DailyPhoto.js";
import { awardXP } from "../services/gamificationService.js";

export const getDailyPhoto = async (req, res) => {
  const photos = await DailyPhoto.find({ user: req.user._id }).sort({ createdAt: -1 });
  res.json(photos.map((photo) => ({ ...photo.toObject(), image: photo.imageUrl, id: photo._id })));
};

export const createDailyPhoto = async (req, res) => {
  const today = new Date().toISOString().slice(0, 10);

  const imageUrl = req.body.imageUrl || req.body.image;
  if (!imageUrl) {
    return res.status(400).json({ message: "imageUrl is required" });
  }

  const exists = await DailyPhoto.findOne({
    user: req.user._id,
    date: today,
  });

  if (exists) {
    return res.status(400).json({ message: "Daily photo already submitted" });
  }

  const photo = await DailyPhoto.create({
    user: req.user._id,
    imageUrl,
    date: today,
  });

  await awardXP(req.user._id, "daily_photo_uploaded", "DailyPhoto", photo._id);

  res.status(201).json({ ...photo.toObject(), image: photo.imageUrl, id: photo._id });
};

export const getDailyPhotoById = async (req, res) => {
  const photo = await DailyPhoto.findOne({ _id: req.params.id, user: req.user._id });
  if (!photo) {
    return res.status(404).json({ message: "Daily photo not found" });
  }
  return res.json({ ...photo.toObject(), image: photo.imageUrl, id: photo._id });
};

export const updateDailyPhoto = async (req, res) => {
  const photo = await DailyPhoto.findOne({ _id: req.params.id, user: req.user._id });
  if (!photo) {
    return res.status(404).json({ message: "Daily photo not found" });
  }

  const imageUrl = req.body.imageUrl || req.body.image;
  if (typeof imageUrl === "string" && imageUrl.trim()) {
    photo.imageUrl = imageUrl.trim();
  }

  if (req.body.date) {
    photo.date = req.body.date;
  }

  await photo.save();
  return res.json({ ...photo.toObject(), image: photo.imageUrl, id: photo._id });
};

export const deleteDailyPhoto = async (req, res) => {
  const deleted = await DailyPhoto.findOneAndDelete({ _id: req.params.id, user: req.user._id });
  if (!deleted) {
    return res.status(404).json({ message: "Daily photo not found" });
  }

  return res.json({ message: "Daily photo deleted" });
};
