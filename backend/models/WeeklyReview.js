import mongoose from "mongoose";

const generatedTaskSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 140 },
    detail: { type: String, trim: true, default: "", maxlength: 600 },
    effort: { type: String, enum: ["low", "medium", "high"], default: "low" },
    frequency: { type: String, enum: ["daily", "weekly", "once"], default: "once" },
    dueInDays: { type: Number, min: 0, max: 30, default: 2 },
    priority: { type: String, enum: ["low", "medium", "high"], default: "medium" },
    goalId: { type: mongoose.Schema.Types.ObjectId, ref: "Goal", default: null },
    reason: { type: String, trim: true, default: "", maxlength: 500 },
    status: { type: String, enum: ["suggested", "created", "dismissed"], default: "suggested" },
    createdTaskId: { type: mongoose.Schema.Types.ObjectId, ref: "Task", default: null },
  },
  { _id: true }
);

const weeklyReviewSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    weekStart: { type: Date, required: true, index: true },
    weekEnd: { type: Date, required: true },
    status: { type: String, enum: ["active", "applied", "archived"], default: "active", index: true },
    source: { type: String, enum: ["ai", "fallback", "hybrid"], default: "fallback" },
    model: { type: String, trim: true, default: "" },
    reused: { type: Boolean, default: false },
    appliedAt: { type: Date, default: null },
    contextDigest: { type: mongoose.Schema.Types.Mixed, default: {} },
    review: {
      headline: { type: String, trim: true, default: "" },
      transformationSummary: { type: String, trim: true, default: "" },
      whatImproved: [{ type: String, trim: true }],
      whatFailed: [{ type: String, trim: true }],
      whyItHappened: [{ type: String, trim: true }],
      patternExplanation: { type: String, trim: true, default: "" },
      nextWeekFocus: { type: String, trim: true, default: "" },
      coachingTone: { type: String, trim: true, default: "steady" },
    },
    adaptivePlan: {
      difficulty: { type: String, enum: ["easy", "medium", "hard"], default: "medium" },
      strategy: { type: String, trim: true, default: "" },
      priorityOrder: [
        {
          goalId: { type: mongoose.Schema.Types.ObjectId, ref: "Goal", default: null },
          title: { type: String, trim: true, default: "" },
          reason: { type: String, trim: true, default: "" },
          recommendedAction: { type: String, trim: true, default: "" },
        },
      ],
      generatedTasks: [generatedTaskSchema],
      goalAdjustments: [
        {
          goalId: { type: mongoose.Schema.Types.ObjectId, ref: "Goal", default: null },
          goalTitle: { type: String, trim: true, default: "" },
          adjustment: { type: String, trim: true, default: "" },
          reason: { type: String, trim: true, default: "" },
          difficultyChange: { type: String, enum: ["reduce", "maintain", "increase"], default: "maintain" },
        },
      ],
    },
    metrics: [
      {
        label: { type: String, trim: true, default: "" },
        value: { type: String, trim: true, default: "" },
        interpretation: { type: String, trim: true, default: "" },
      },
    ],
    proactiveSignals: [{ type: mongoose.Schema.Types.Mixed }],
    personalizationEvidence: [{ type: String, trim: true }],
    failureAdjustments: [{ type: String, trim: true }],
    progressionTriggers: [{ type: String, trim: true }],
    createdTaskIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Task" }],
  },
  { timestamps: true }
);

weeklyReviewSchema.index({ user: 1, weekStart: 1 }, { unique: true });
weeklyReviewSchema.index({ user: 1, createdAt: -1 });

export default mongoose.model("WeeklyReview", weeklyReviewSchema);
