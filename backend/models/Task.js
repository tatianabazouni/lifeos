import mongoose from "mongoose";

const taskSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, trim: true, default: "" },
    dueDate: { type: Date, default: null },
    priority: { type: String, enum: ["low", "medium", "high"], default: "medium" },
    completed: { type: Boolean, default: false },
    completedAt: { type: Date, default: null },
    goal: { type: mongoose.Schema.Types.ObjectId, ref: "Goal", default: null },
  },
  { timestamps: true }
);

taskSchema.index({ user: 1, completed: 1, dueDate: 1 });

export default mongoose.model("Task", taskSchema);
