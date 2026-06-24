import { request } from "./client";

export const goalsApi = {
  getAll: () => request("/goals"),
  getById: (id) => request(`/goals/${id}`),
  create: (payload) => request("/goals", { method: "POST", body: JSON.stringify(payload) }),
  update: (id, payload) => request(`/goals/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  remove: (id) => request(`/goals/${id}`, { method: "DELETE" }),
  // ADD THIS:
  generateAIBreakdown: (id, payload) =>
    request(`/ai/goal-breakdown`, { method: "POST", body: JSON.stringify({ goalId: id, ...payload }) }),
};

