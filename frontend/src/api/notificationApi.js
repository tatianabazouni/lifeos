import { request } from "./client";

export const notificationApi = {
  getNotifications: () => request("/notifications"),
  getNotification: (id) => request(`/notifications/${id}`),
  markRead: (id) => request(`/notifications/${id}/read`, { method: "PUT" }),
  markAllRead: () => request("/notifications/read-all", { method: "PUT" }),
  deleteNotification: (id) => request(`/notifications/${id}`, { method: "DELETE" }),
  clearAll: () => request("/notifications", { method: "DELETE" }),
};
