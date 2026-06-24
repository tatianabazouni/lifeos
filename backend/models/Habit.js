import mongoose from "mongoose";

const habitSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, trim: true, default: "" },
    frequency: { type: String, enum: ["daily", "weekly", "monthly"], default: "daily" },
    targetCount: { type: Number, min: 1, default: 1 },
    streak: { type: Number, min: 0, default: 0 },
    lastCompletedAt: { type: Date, default: null },
    completedDates: [{ type: Date }],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

habitSchema.index({ user: 1, isActive: 1, createdAt: -1 });

export default mongoose.model("Habit", habitSchema);
