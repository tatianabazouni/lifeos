import { request } from "./client";

export const gamificationApi = {
  getSnapshot: () => request("/gamification"),
  createXpEvent: (payload) => request("/gamification", { method: "POST", body: JSON.stringify(payload) }),
  getXpEvent: (id) => request(`/gamification/${id}`),
  updateXpEvent: (id, payload) => request(`/gamification/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  deleteXpEvent: (id) => request(`/gamification/${id}`, { method: "DELETE" }),
};
