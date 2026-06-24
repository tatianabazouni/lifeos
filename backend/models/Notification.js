import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: false },
    actor: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: false },
    type: {
      type: String,
      enum: [
        "connection_request", "connection_accepted", "connection_declined", 
        "vision_board_shared", "ai_reminder",
        "deadline_reminder", "progress_cheer", "journal_nudge", 
        "level_celebration", "memory_moment"
      ],
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    data: { type: mongoose.Schema.Types.Mixed, default: {} },
    priority: { type: String, enum: ["low", "medium", "high"], default: "medium", index: true },
    theme: { type: String, default: "default" },
    aiGenerated: { type: Boolean, default: false },
    readAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export default mongoose.model("Notification", notificationSchema);
