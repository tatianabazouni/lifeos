import mongoose from "mongoose";

const profileSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true, index: true },
    bio: { type: String, trim: true, maxlength: 300, default: "" },
    birthDate: Date,
    timezone: { type: String, default: "UTC" },
    interests: [{ type: String, trim: true }],
    posts: [
      {
        title: { type: String, trim: true, maxlength: 140, default: "" },
        content: { type: String, trim: true, maxlength: 2000, default: "" },
        mediaUrl: { type: String, trim: true, default: "" },
        visibility: { type: String, enum: ["private", "public"], default: "private" },
        createdAt: { type: Date, default: Date.now },
        updatedAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

export default mongoose.model("Profile", profileSchema);
