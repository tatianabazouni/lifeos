import { request } from "./client";

export const habitsApi = {
  getAll: () => request("/habits"),
  getById: (id) => request(`/habits/${id}`),
  create: (payload) => request("/habits", { method: "POST", body: JSON.stringify(payload) }),
  update: (id, payload) => request(`/habits/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  remove: (id) => request(`/habits/${id}`, { method: "DELETE" }),
};
