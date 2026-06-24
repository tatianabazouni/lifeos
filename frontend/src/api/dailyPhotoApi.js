import { request } from "./client";

export const dailyPhotoApi = {
  getAll: () => request("/daily-photo"),
  create: (payload) => request("/daily-photo", { method: "POST", body: JSON.stringify(payload) }),
  getById: (id) => request(`/daily-photo/${id}`),
  update: (id, payload) => request(`/daily-photo/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  remove: (id) => request(`/daily-photo/${id}`, { method: "DELETE" }),
};
