import { request } from "./client";

export const userApi = {
  getMe: () => request("/users/me"),
  updateMe: (payload) => request("/users/me", { method: "PUT", body: JSON.stringify(payload) }),
};
