import mongoose from "mongoose";

const aiInsightSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    topic: { type: String, trim: true, default: "" },
    type: { type: String, trim: true, default: "", index: true },
    value: { type: String, trim: true, default: "" },
    confidence: { type: Number, min: 0, max: 1, default: 0.5 },
    active: { type: Boolean, default: true, index: true },
    sourceType: { type: String, trim: true, default: "" },
    sourceRef: { type: mongoose.Schema.Types.ObjectId, default: null },
    lastObservedAt: { type: Date, default: Date.now },
    prompt: { type: String, trim: true, default: "" },
    response: { type: String, trim: true, default: "" },
    model: { type: String, trim: true, default: "" },
    metadata: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

aiInsightSchema.index({ user: 1, createdAt: -1 });
aiInsightSchema.index({ user: 1, topic: 1, type: 1, active: 1, lastObservedAt: -1 });
aiInsightSchema.index({ user: 1, type: 1, value: 1, active: 1 });

export default mongoose.model("AIInsight", aiInsightSchema);
