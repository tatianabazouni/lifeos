import { request } from "./client";

export const aiApi = {
  analyze: (payload) => request("/ai/analyze", { method: "POST", body: JSON.stringify(payload) }),
  
  // Personalized AI endpoints
  getInsight: () => request("/ai/insight", { method: "GET" }),
  transformDream: (payload) => request("/ai/transform-dream", { method: "POST", body: JSON.stringify(payload) }),
  applyDreamPlan: (payload) => request("/ai/transform-dream/apply", { method: "POST", body: JSON.stringify(payload) }),
  getWeeklyReview: (refresh = false) =>
    request(refresh ? "/ai/weekly-review?refresh=true" : "/ai/weekly-review", { method: "GET" }),
  generateWeeklyReview: (payload = {}) =>
    request("/ai/weekly-review", { method: "POST", body: JSON.stringify(payload) }),
  applyWeeklyReview: (payload = {}) =>
    request("/ai/weekly-review/apply", { method: "POST", body: JSON.stringify(payload) }),
  getContextDebug: () => request("/ai/context-debug", { method: "GET" }),
  analyzeJournal: (payload) => request("/ai/journal-insight", { 
    method: "POST", 
    body: JSON.stringify(payload) 
  }),
  proactiveCheck: (payload) => request("/ai/proactive-check", { 
    method: "POST", 
    body: JSON.stringify(payload) 
  }),
};
