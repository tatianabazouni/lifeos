import { request } from "./client";

export const tasksApi = {
  getAll: () => request("/tasks"),
  getById: (id) => request(`/tasks/${id}`),
  create: (payload) => request("/tasks", { method: "POST", body: JSON.stringify(payload) }),
  update: (id, payload) => request(`/tasks/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  remove: (id) => request(`/tasks/${id}`, { method: "DELETE" }),
};
