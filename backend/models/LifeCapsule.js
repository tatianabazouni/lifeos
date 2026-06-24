import mongoose from "mongoose";

const lifeCapsuleSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true, index: true },
    title: { type: String, trim: true, default: "My Life Capsule" },
    description: { type: String, trim: true, default: "" },
  },
  { timestamps: true }
);

export default mongoose.model("LifeCapsule", lifeCapsuleSchema);
