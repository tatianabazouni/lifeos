import { useState, useCallback, useEffect } from "react";
import type { MemoryItem } from "@/components/life-capsule/MemoryVaultScene";
import { lifeApi } from "@/api/lifeApi";

export interface MemoryChapter {
  id: string;
  key: string;
  label: string;
}

export type NewMemoryInput = Omit<MemoryItem, "id">;

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";
const apiOrigin = apiBaseUrl.replace(/\/api\/?$/, "");

const resolveMediaUrl = (value?: string) => {
  if (!value) return undefined;
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith("/")) return `${apiOrigin}${value}`;
  return value;
};

const mapMemory = (memory: any): MemoryItem => ({
  id: memory.id || memory._id,
  title: memory.title || "",
  description: memory.description || "",
  date: memory.date ? String(memory.date).slice(0, 10) : "",
  chapter: String(memory.chapterId || memory.chapter || ""),
  tags: Array.isArray(memory.tags) ? memory.tags : [],
  imageUrl: resolveMediaUrl(memory.imageUrl || memory.mediaUrl),
  mediaUrl: resolveMediaUrl(memory.mediaUrl || memory.imageUrl),
  type: memory.type === "photo" ? "image" : (memory.type || "text"),
  emotion: memory.emotion || "",
});

const chapterKeyByTitle: Record<string, string> = {
  childhood: "childhood",
  school: "school",
  achievements: "achievements",
  "important people": "friends",
  travel: "travels",
  "turning points": "goals",
  reflections: "reflections",
};

const mapChapter = (chapter: any): MemoryChapter => {
  const label = chapter.title || "Chapter";
  const normalized = String(label).trim().toLowerCase();

  return {
    id: chapter.id || chapter._id,
    key: chapterKeyByTitle[normalized] || normalized.replace(/\s+/g, "-"),
    label,
  };
};

export function useMemories() {
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [chapters, setChapters] = useState<MemoryChapter[]>([]);

  const refresh = useCallback(async () => {
    const [memoryData, chapterData] = await Promise.all([
      lifeApi.getMemories(),
      lifeApi.getChapters(),
    ]);
    setMemories(memoryData.map(mapMemory));
    setChapters(chapterData.map(mapChapter));
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const addMemory = useCallback(async (memory: NewMemoryInput) => {
    try {
      const created = await lifeApi.createMemory({
        title: memory.title,
        description: memory.description,
        date: memory.date,
        chapterId: memory.chapter,
        tags: memory.tags,
        type: memory.type,
        emotion: memory.emotion,
        imageUrl: memory.imageUrl,
        mediaUrl: memory.mediaUrl || memory.imageUrl,
      });

      setMemories((prev) => [mapMemory(created), ...prev]);
    } catch (error) {
      console.error("❌ Failed to create memory:", error);
      throw error;
    }
  }, []);

  const addChapter = useCallback(async (title: string) => {
    const normalizedTitle = title.trim();
    if (!normalizedTitle) return null;

    const existing = chapters.find(
      (chapter) => chapter.label.trim().toLowerCase() === normalizedTitle.toLowerCase()
    );
    if (existing) return existing;

    const created = await lifeApi.createChapter({ title: normalizedTitle });
    const mapped = mapChapter(created);
    setChapters((prev) => [mapped, ...prev]);
    return mapped;
  }, [chapters]);

  const deleteMemory = useCallback(async (id: string) => {
    await lifeApi.deleteMemory(id);
    setMemories((prev) => prev.filter((m) => m.id !== id));
  }, []);

  const updateMemory = useCallback(async (id: string, updates: Partial<MemoryItem>) => {
    const updated = await lifeApi.updateMemory(id, updates);
    setMemories((prev) => prev.map((m) => (m.id === id ? mapMemory(updated) : m)));
  }, []);

  return { memories, chapters, addMemory, addChapter, deleteMemory, updateMemory, refresh };
}
