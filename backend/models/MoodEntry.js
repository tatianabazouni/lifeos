import mongoose from "mongoose";

const moodEntrySchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    date: { type: String, required: true },
    mood: {
      type: String,
      required: true,
      enum: ["great", "good", "okay", "meh", "low"],
    },
    source: { type: String, default: "dashboard", enum: ["dashboard", "journal", "manual"] },
  },
  { timestamps: true }
);

moodEntrySchema.index({ user: 1, date: 1 }, { unique: true });

export default mongoose.model("MoodEntry", moodEntrySchema);
