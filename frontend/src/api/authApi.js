import { request } from "./client";

export const authApi = {
  login: (credentials) => request("/auth/login", { method: "POST", body: JSON.stringify(credentials) }),
  register: (payload) => request("/auth/register", { method: "POST", body: JSON.stringify(payload) }),
  getProfile: () => request("/auth/profile"),
  updateProfile: (payload) => request("/auth/profile", { method: "PUT", body: JSON.stringify(payload) }),
  createProfilePost: (payload) => request("/auth/profile/posts", { method: "POST", body: JSON.stringify(payload) }),
  deleteProfilePost: (postId) => request(`/auth/profile/posts/${postId}`, { method: "DELETE" }),
};
