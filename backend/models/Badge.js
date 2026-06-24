import mongoose from "mongoose";

const badgeSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    thresholdXP: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.model("Badge", badgeSchema);
