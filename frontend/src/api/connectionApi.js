import { request } from "./client";

export const connectionApi = {
  getConnections: () => request("/connections"),
  getConnectionById: (id) => request(`/connections/${id}`),
  searchUsers: (query) => request(`/connections/users/search?q=${encodeURIComponent(query)}`),
  requestConnection: (userId, type = "friend") =>
    request("/connections/request", { method: "POST", body: JSON.stringify({ userId, type }) }),
  acceptConnection: (connectionId) =>
    request("/connections/accept", { method: "PUT", body: JSON.stringify({ connectionId }) }),
  declineConnection: (connectionId) =>
    request("/connections/decline", { method: "PUT", body: JSON.stringify({ connectionId }) }),
  removeConnection: (id) => request(`/connections/${id}`, { method: "DELETE" }),
};
