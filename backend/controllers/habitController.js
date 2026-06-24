import Habit from "../models/Habit.js";

export const getAllHabits = async (req, res) => {
  const habits = await Habit.find({ user: req.user._id }).sort({ createdAt: -1 });
  res.json(habits);
};

export const getHabitById = async (req, res) => {
  const habit = await Habit.findOne({ _id: req.params.id, user: req.user._id });
  if (!habit) return res.status(404).json({ message: "Habit not found" });
  res.json(habit);
};

export const createHabit = async (req, res) => {
  if (!req.body.title?.trim()) return res.status(400).json({ message: "title is required" });
  const habit = await Habit.create({ user: req.user._id, ...req.body });
  res.status(201).json(habit);
};

export const updateHabit = async (req, res) => {
  const habit = await Habit.findOne({ _id: req.params.id, user: req.user._id });
  if (!habit) return res.status(404).json({ message: "Habit not found" });

  Object.assign(habit, req.body);
  await habit.save();
  res.json(habit);
};

export const deleteHabit = async (req, res) => {
  const deleted = await Habit.findOneAndDelete({ _id: req.params.id, user: req.user._id });
  if (!deleted) return res.status(404).json({ message: "Habit not found" });
  res.json({ message: "Habit deleted" });
};
