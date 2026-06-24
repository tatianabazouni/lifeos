import { useState, useCallback, useEffect } from "react";
import { lifeApi } from "@/api/lifeApi";
import { journalApi } from "@/api/journalApi";
import { goalsApi } from "@/api/goalsApi";
import { visionApi } from "@/api/visionApi";
import { userApi } from "@/api/userApi";

export interface OnboardingMemory {
  id: string;
  title: string;
  description: string;
  date: string;
  tags: string[];
  createdAt: string;
}

export interface OnboardingJournalEntry {
  id: string;
  title: string;
  content: string;
  mood: string;
  createdAt: string;
}

export interface OnboardingDream {
  id: string;
  title: string;
  description: string;
  category: string;
  createdAt: string;
}

export interface OnboardingGoal {
  id: string;
  title: string;
  description: string;
  deadline: string;
  createdAt: string;
}

export interface OnboardingData {
  completedSteps: string[];
  currentStep: number;
  memory: OnboardingMemory | null;
  journalEntry: OnboardingJournalEntry | null;
  dream: OnboardingDream | null;
  goal: OnboardingGoal | null;
  completedAt: string | null;
}

const defaultData: OnboardingData = {
  completedSteps: [],
  currentStep: 1,
  memory: null,
  journalEntry: null,
  dream: null,
  goal: null,
  completedAt: null,
};

export function useOnboardingProgress() {
  const [data, setData] = useState<OnboardingData>(defaultData);

  const persistOnboarding = useCallback(async (nextData: OnboardingData) => {
    await userApi.updateMe({ onboarding: nextData });
  }, []);

  useEffect(() => {
    const load = async () => {
      const user = await userApi.getMe() as any;
      setData({ ...defaultData, ...(user?.onboarding || {}) });
    };
    void load();
  }, []);

  const updateData = useCallback((updates: Partial<OnboardingData>) => {
    setData((prev) => {
      const next = { ...prev, ...updates };
      void persistOnboarding(next);
      return next;
    });
  }, [persistOnboarding]);

  const completeStep = useCallback((stepId: string) => {
    setData((prev) => {
      const next = {
        ...prev,
        completedSteps: prev.completedSteps.includes(stepId)
          ? prev.completedSteps
          : [...prev.completedSteps, stepId],
      };
      void persistOnboarding(next);
      return next;
    });
  }, [persistOnboarding]);

  const saveMemory = useCallback(async (memory: OnboardingMemory) => {
    const next = (prev: OnboardingData): OnboardingData => ({ ...prev, memory, completedSteps: [...new Set([...prev.completedSteps, "memory"])] });
    setData((prev) => {
      const updated = next(prev);
      void persistOnboarding(updated);
      return updated;
    });
    await lifeApi.createMemory({
      title: memory.title,
      description: memory.description,
      date: memory.date,
      tags: memory.tags,
      type: "text",
      emotion: "nostalgia",
    });
  }, [persistOnboarding]);

  const saveJournalEntry = useCallback(async (entry: OnboardingJournalEntry) => {
    setData((prev) => {
      const next = { ...prev, journalEntry: entry, completedSteps: [...new Set([...prev.completedSteps, "journal"])] };
      void persistOnboarding(next);
      return next;
    });
    await journalApi.create({
      title: entry.title,
      content: entry.content,
      mood: entry.mood,
    });
  }, [persistOnboarding]);

  const saveDream = useCallback(async (dream: OnboardingDream) => {
    setData((prev) => {
      const next = { ...prev, dream, completedSteps: [...new Set([...prev.completedSteps, "dream"])] };
      void persistOnboarding(next);
      return next;
    });
    const boards = await visionApi.getBoards() as any[];
    let boardId = boards[0]?.id;
    if (!boardId) {
      const board = await visionApi.createBoard("My First Board") as any;
      boardId = board.id;
    }

    await visionApi.createVisionItem({
      boardId,
      title: dream.title,
      description: dream.description,
      motivation: "Created during onboarding",
      category: dream.category === "creativity" ? "personal" : dream.category,
      targetYear: new Date().getFullYear() + 1,
      tags: ["onboarding"],
      status: "dream",
    });
  }, [persistOnboarding]);

  const saveGoal = useCallback(async (goal: OnboardingGoal) => {
    setData((prev) => {
      const next = { ...prev, goal, completedSteps: [...new Set([...prev.completedSteps, "goal"])] };
      void persistOnboarding(next);
      return next;
    });
    await goalsApi.create({
      title: goal.title,
      description: goal.description,
      deadline: goal.deadline || undefined,
      category: "Personal",
    });
  }, [persistOnboarding]);

  const finishOnboarding = useCallback(() => {
    setData((prev) => {
      const next = { ...prev, completedAt: new Date().toISOString() };
      void persistOnboarding(next);
      return next;
    });
  }, [persistOnboarding]);

  const isCompleted = data.completedAt !== null;

  return {
    data,
    updateData,
    completeStep,
    saveMemory,
    saveJournalEntry,
    saveDream,
    saveGoal,
    finishOnboarding,
    isCompleted,
  };
}
