// backend/controllers/userController.js
import User from "../models/User.js";

// @desc    Get current logged-in user
// @route   GET /api/users/me
// @access  Private
export const getMe = async (req, res) => {
  try {
    // req.user is already set by your JWT middleware
    const user = await User.findById(req.user._id).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update current logged-in user
// @route   PUT /api/users/me
// @access  Private
export const updateMe = async (req, res) => {
  try {
    const updates = req.body;

    // Prevent updating password here — use separate endpoint if needed
    if (updates.password) {
      delete updates.password;
    }

    const updatedUser = await User.findByIdAndUpdate(req.user._id, updates, {
      new: true,
      runValidators: true,
    }).select("-password");

    res.json(updatedUser);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all users (example for admin route)
// @route   GET /api/users
// @access  Private/Admin
export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password");
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};