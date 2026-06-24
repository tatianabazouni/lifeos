import mongoose from "mongoose";

const memorySchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    chapter: { type: mongoose.Schema.Types.ObjectId, ref: "LifeChapter", required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 160 },
    description: { type: String, trim: true, default: "" },
    type: { type: String, enum: ["photo", "video", "text", "voice"], default: "text" },
    mediaUrl: { type: String, trim: true, default: "" },
    date: { type: Date, default: Date.now, index: true },
    location: { type: String, trim: true, default: "" },
    people: [{ type: String, trim: true }],
    emotion: { type: String, trim: true, default: "" },
    tags: [{ type: String, trim: true }],
  },
  { timestamps: true }
);

memorySchema.index({ user: 1, chapter: 1, date: -1 });

memorySchema.pre("validate", function (next) {
  if (this.user && !this.userId) this.userId = this.user;
  if (this.userId && !this.user) this.user = this.userId;
  next();
});

export default mongoose.model("Memory", memorySchema);
