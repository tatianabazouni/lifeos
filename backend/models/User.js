import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
      match: [/^\S+@\S+\.\S+$/, "Please provide a valid email"],
    },
    password: { type: String, required: true, minlength: 8, select: false },
    role: { type: String, enum: ["user", "admin"], default: "user", index: true },
    xp: { type: Number, default: 0, min: 0 },
    level: { type: Number, default: 1, min: 1 },
    streak: { type: Number, default: 0, min: 0 },
    badges: [{ type: String }],
    onboarding: {
      type: {
        completedSteps: [{ type: String }],
        currentStep: { type: Number, default: 1 },
        memory: { type: mongoose.Schema.Types.Mixed, default: null },
        journalEntry: { type: mongoose.Schema.Types.Mixed, default: null },
        dream: { type: mongoose.Schema.Types.Mixed, default: null },
        goal: { type: mongoose.Schema.Types.Mixed, default: null },
        completedAt: { type: String, default: null },
      },
      default: () => ({ completedSteps: [], currentStep: 1, memory: null, journalEntry: null, dream: null, goal: null, completedAt: null }),
    },
  },
  { timestamps: true }
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model("User", userSchema);

export default User;
