import mongoose from "mongoose";

const normalizeVisionCategory = (value) => {
  const normalized = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

  return normalized || "personal";
};

const itemSchema = new mongoose.Schema(
  {
    board: { type: mongoose.Schema.Types.ObjectId, ref: "VisionBoard" },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    image: String,
    imageUrl: String,
    title: String,
    description: String,
    motivation: { type: String, default: "" },
    emoji: String,
    category: { type: String, default: "personal", set: normalizeVisionCategory },
    targetYear: Number,
    tags: [{ type: String, trim: true }],
    imageScale: { type: Number, default: 1 },
    imagePosition: { type: String, default: "center" },
    imageAspect: { type: String, default: "4:3" },
    status: { type: String, enum: ["dream", "working", "reality"], default: "dream" },
    notes: String,
    progress: { type: Number, default: 0 },
    convertedToGoal: { type: Boolean, default: false },
    achieved: { type: Boolean, default: false },
    achievedPhotoUrl: { type: String, default: "" },
    achievedNote: { type: String, default: "" },
    subtasks: [
      {
        id: { type: String, required: true },
        title: { type: String, required: true, trim: true },
        done: { type: Boolean, default: false },
      },
    ],
    order: { type: Number, default: 0 },
    likes: { type: Number, default: 0 }
  },
  { timestamps: true }
);

export default mongoose.model("VisionItem", itemSchema);
