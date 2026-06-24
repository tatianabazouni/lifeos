import mongoose from "mongoose";

const lifeStoryEntrySchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type: {
      type: String,
      enum: ["lifebook", "freewrite", "guided", "reflection"],
      required: true,
      default: "lifebook",
    },
    section: {
      type: String,
      enum: ["identity", "past", "emotions", "purpose", "patterns", "growth", null],
      default: null,
    },
    promptId: { type: String, trim: true, default: null },
    title: { type: String, required: true, trim: true, maxlength: 160 },
    content: { type: String, required: true, trim: true },
    heartContent: { type: String, trim: true, default: "" },
    mood: { type: String, trim: true, default: "neutral" },
    depthLevel: { type: Number, min: 1, max: 3, default: 1 },
    wordCount: { type: Number, min: 0, default: 0 },
  },
  { timestamps: true }
);

lifeStoryEntrySchema.index({ user: 1, createdAt: -1 });
lifeStoryEntrySchema.index({ user: 1, section: 1, promptId: 1 });

lifeStoryEntrySchema.pre("validate", function (next) {
  if (this.user && !this.userId) this.userId = this.user;
  if (this.userId && !this.user) this.user = this.userId;
  next();
});

export default mongoose.model("LifeStoryEntry", lifeStoryEntrySchema);
