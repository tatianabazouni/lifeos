import mongoose from "mongoose";

const boardSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    title: String,
    coverImage: String,
    isPublic: Boolean,
    sharedWith: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: true }
);

export default mongoose.model("VisionBoard", boardSchema);
