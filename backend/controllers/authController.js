import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Profile from "../models/Profile.js";

const signToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE || "7d" });

const userPayload = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  xp: user.xp,
  level: user.level,
  streak: user.streak,
  badges: user.badges,
});

export const registerUser = async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) return res.status(400).json({ message: "All fields are required" });

  const normalizedEmail = String(email).toLowerCase().trim();
  const exists = await User.findOne({ email: normalizedEmail });
  if (exists) return res.status(409).json({ message: "User already exists" });

  const user = await User.create({ name: String(name).trim(), email: normalizedEmail, password });
  await Profile.create({ user: user._id });

  res.status(201).json({ success: true, token: signToken(user._id), user: userPayload(user) });
};

export const loginUser = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: "Email and password required" });

  const user = await User.findOne({ email: String(email).toLowerCase().trim() }).select("+password");
  if (!user || !(await user.matchPassword(password))) {
    return res.status(401).json({ message: "Invalid email or password" });
  }

  res.json({ success: true, token: signToken(user._id), user: userPayload(user) });
};

export const getProfile = async (req, res) => {
  const profile = await Profile.findOne({ user: req.user._id });
  res.json({ success: true, user: req.user, profile });
};

export const updateProfile = async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) return res.status(404).json({ message: "User not found" });

  if (req.body.name) user.name = String(req.body.name).trim();
  if (req.body.email) user.email = String(req.body.email).toLowerCase().trim();
  await user.save();

  const profile = await Profile.findOneAndUpdate(
    { user: req.user._id },
    {
      bio: req.body.bio,
      birthDate: req.body.birthDate,
      timezone: req.body.timezone,
      interests: req.body.interests,
    },
    { upsert: true, new: true, runValidators: true }
  );

  res.json({ success: true, user: userPayload(user), profile });
};

export const createProfilePost = async (req, res) => {
  const title = String(req.body.title || "").trim();
  const content = String(req.body.content || "").trim();
  const mediaUrl = String(req.body.mediaUrl || "").trim();
  const visibility = req.body.visibility === "public" ? "public" : "private";

  if (!title && !content && !mediaUrl) {
    return res.status(400).json({ message: "Post cannot be empty" });
  }

  const profile = await Profile.findOneAndUpdate(
    { user: req.user._id },
    { $setOnInsert: { bio: "", timezone: "UTC", interests: [], posts: [] } },
    { upsert: true, new: true }
  );

  profile.posts.unshift({
    title,
    content,
    mediaUrl,
    visibility,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  await profile.save();
  return res.status(201).json({ success: true, post: profile.posts[0], profile });
};

export const deleteProfilePost = async (req, res) => {
  const profile = await Profile.findOne({ user: req.user._id });
  if (!profile) {
    return res.status(404).json({ message: "Profile not found" });
  }

  const before = profile.posts.length;
  profile.posts = profile.posts.filter((post) => String(post._id) !== String(req.params.postId));

  if (profile.posts.length === before) {
    return res.status(404).json({ message: "Post not found" });
  }

  await profile.save();
  return res.json({ success: true, profile });
};
