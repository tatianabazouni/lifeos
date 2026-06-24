import mongoose from "mongoose";

const connectionSchema = new mongoose.Schema(
  {
    sender: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    receiver: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    status: { type: String, enum: ["pending", "accepted", "declined"] },
type: { type: String, enum: ["friend"] }
  },
  { timestamps: true }
);

export default mongoose.model("Connection", connectionSchema);