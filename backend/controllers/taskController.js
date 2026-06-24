import Task from "../models/Task.js";

export const getAllTasks = async (req, res) => {
  const tasks = await Task.find({ user: req.user._id }).sort({ createdAt: -1 });
  res.json(tasks);
};

export const getTaskById = async (req, res) => {
  const task = await Task.findOne({ _id: req.params.id, user: req.user._id });
  if (!task) return res.status(404).json({ message: "Task not found" });
  res.json(task);
};

export const createTask = async (req, res) => {
  if (!req.body.title?.trim()) return res.status(400).json({ message: "title is required" });
  const task = await Task.create({ user: req.user._id, ...req.body });
  res.status(201).json(task);
};

export const updateTask = async (req, res) => {
  const task = await Task.findOne({ _id: req.params.id, user: req.user._id });
  if (!task) return res.status(404).json({ message: "Task not found" });

  Object.assign(task, req.body);
  if (req.body.completed === true && !task.completedAt) task.completedAt = new Date();
  if (req.body.completed === false) task.completedAt = null;

  await task.save();
  res.json(task);
};

export const deleteTask = async (req, res) => {
  const deleted = await Task.findOneAndDelete({ _id: req.params.id, user: req.user._id });
  if (!deleted) return res.status(404).json({ message: "Task not found" });
  res.json({ message: "Task deleted" });
};
