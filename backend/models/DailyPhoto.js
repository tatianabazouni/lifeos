import mongoose from "mongoose";

const dailyPhotoSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    imageUrl: { type: String, required: true },
    date: { type: String, required: true },
  },
  { timestamps: true }
);

dailyPhotoSchema.index({ user: 1, date: 1 }, { unique: true });

export default mongoose.model("DailyPhoto", dailyPhotoSchema);
