import { BASE_URL, request } from "./client";

const uploadMemoryMedia = async (type, file, { createMemory = false } = {}) => {
  const token = localStorage.getItem("lifeos-token") || sessionStorage.getItem("lifeos-token");
  if (!token) {
    throw new Error("No auth token found");
  }

  const formData = new FormData();
  formData.append(type, file);
  if (createMemory) {
    formData.append("createMemory", "true");
  }

  const response = await fetch(`${BASE_URL}/upload/${type}${createMemory ? "?createMemory=true" : ""}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.message || "Media upload failed");
  }

  return payload;
};

export const lifeApi = {
  getMemories: () => request("/life/memories", { requireAuth: true }),
  createMemory: async (payload) => {
    return request("/life/memories", {
      method: "POST",
      body: JSON.stringify(payload),
      requireAuth: true,
    });
  },
  getMemoryById: (id) => request(`/life/memories/${id}`, { requireAuth: true }),
  updateMemory: (id, payload) => request(`/life/memories/${id}`, { method: "PUT", body: JSON.stringify(payload), requireAuth: true }),
  deleteMemory: (id) => request(`/life/memories/${id}`, { method: "DELETE", requireAuth: true }),
  getChapters: () => request("/life/chapters", { requireAuth: true }),
  createChapter: (payload) => request("/life/chapters", { method: "POST", body: JSON.stringify(payload), requireAuth: true }),
  getChapterById: (id) => request(`/life/chapters/${id}`, { requireAuth: true }),
  updateChapter: (id, payload) => request(`/life/chapters/${id}`, { method: "PUT", body: JSON.stringify(payload), requireAuth: true }),
  deleteChapter: (id) => request(`/life/chapters/${id}`, { method: "DELETE", requireAuth: true }),
  uploadMemoryMedia,
};
