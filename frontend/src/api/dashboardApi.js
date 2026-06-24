import { request } from "./client";

export const dashboardApi = {
  getSummary: () => request("/dashboard"),
};
