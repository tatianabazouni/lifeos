import { request } from "./client";

export const journalApi = {
  getAll: () => request("/journal"),
  getById: (id) => request(`/journal/${id}`),
  create: (payload) => request("/journal", { method: "POST", body: JSON.stringify(payload) }),
  update: (id, payload) => request(`/journal/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  remove: (id) => request(`/journal/${id}`, { method: "DELETE" }),
  getAllLifeStoryEntries: () => request("/life-story"),
  createLifeStoryEntry: (payload) => request("/life-story", { method: "POST", body: JSON.stringify(payload) }),
  updateLifeStoryEntry: (id, payload) => request(`/life-story/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  deleteLifeStoryEntry: (id) => request(`/life-story/${id}`, { method: "DELETE" }),
};
