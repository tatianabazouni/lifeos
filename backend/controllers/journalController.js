import JournalEntry from "../models/JournalEntry.js";
import { awardXP } from "../services/gamificationService.js";
import { ingestJournalEntryMemory } from "../services/lifeMemoryService.js";

export const createJournal = async (req, res) => {
  try {
    if (!req.body.content?.trim()) return res.status(400).json({ message: "content is required" });

    // Parse date string to Date object if provided
    let entryDate = new Date();
    if (req.body.date) {
      const parsedDate = new Date(req.body.date);
      if (!isNaN(parsedDate.getTime())) {
        entryDate = parsedDate;
      }
    }

    const entry = await JournalEntry.create({
      user: req.user._id,
      userId: req.user._id,
      title: req.body.title,
      content: req.body.content,
      mood: req.body.mood,
      tags: req.body.tags,
      date: entryDate,
    });

    await awardXP(req.user._id, "journal_created", "JournalEntry", entry._id);
    try {
      await ingestJournalEntryMemory({ userId: req.user._id, entry });
    } catch {
      // Journal creation should still succeed even if memory extraction fails.
    }
    res.status(201).json(entry);
  } catch (error) {
    res.status(500).json({ message: error.message || "Failed to create journal entry" });
  }
};

export const getJournal = async (req, res) => {
  try {
    const entries = await JournalEntry.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json(entries);
  } catch (error) {
    res.status(500).json({ message: error.message || "Failed to load journal entries" });
  }
};

export const getJournalById = async (req, res) => {
  try {
    const entry = await JournalEntry.findOne({ _id: req.params.id, user: req.user._id });
    if (!entry) return res.status(404).json({ message: "Entry not found" });
    res.json(entry);
  } catch (error) {
    res.status(500).json({ message: error.message || "Failed to load journal entry" });
  }
};

export const updateJournal = async (req, res) => {
  try {
    const entry = await JournalEntry.findOne({ _id: req.params.id, user: req.user._id });
    if (!entry) return res.status(404).json({ message: "Entry not found" });
    Object.assign(entry, req.body);
    await entry.save();
    try {
      await ingestJournalEntryMemory({ userId: req.user._id, entry });
    } catch {
      // Journal updates should still persist even if memory extraction fails.
    }
    res.json(entry);
  } catch (error) {
    res.status(500).json({ message: error.message || "Failed to update journal entry" });
  }
};

export const deleteJournal = async (req, res) => {
  try {
    const entry = await JournalEntry.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!entry) return res.status(404).json({ message: "Entry not found" });
    res.json({ message: "Entry deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message || "Failed to delete journal entry" });
  }
};
