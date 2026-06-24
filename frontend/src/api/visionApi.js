import { request, BASE_URL } from "./client";

export const visionApi = {
  getBoards: () => request("/boards"),
  getBoardById: (id) => request(`/boards/${id}`),
  createBoard: (title) => request("/boards", { method: "POST", body: JSON.stringify({ title }) }),
  updateBoard: (id, payload) => request(`/boards/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  deleteBoard: (id) => request(`/boards/${id}`, { method: "DELETE" }),
  shareBoard: (id, userId) => request(`/boards/${id}/share`, { method: "POST", body: JSON.stringify({ userId }) }),
  getVisionItems: (boardId) => request(boardId ? `/vision-items?boardId=${boardId}` : "/vision-items"),
  getVisionItemById: (id) => request(`/vision-items/${id}`),
  createVisionItem: (payload) => request("/vision-items", { method: "POST", body: JSON.stringify(payload) }),
  updateVisionItem: (id, payload) => request(`/vision-items/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  deleteVisionItem: (id) => request(`/vision-items/${id}`, { method: "DELETE" }),
  convertToGoal: (id, payload) =>
    request(`/vision-items/${id}/convert-to-goal`, {
      method: "POST",
      body: payload ? JSON.stringify(payload) : undefined,
    }),
  getGoalPlan: (id) => request(`/vision-items/${id}/goal-plan`, { method: "POST" }),
  uploadImage: async (file) => {
    const token = localStorage.getItem("lifeos-token") || sessionStorage.getItem("lifeos-token");
    if (!token) {
      throw new Error("No auth token found");
    }

    const formData = new FormData();
    formData.append("image", file);

    const response = await fetch(`${BASE_URL}/upload/image`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.message || "Image upload failed");
    }
    return payload;
  },
  uploadImageWithProgress: (file, onProgress) =>
    new Promise((resolve, reject) => {
      const token = localStorage.getItem("lifeos-token") || sessionStorage.getItem("lifeos-token");
      if (!token) return reject(new Error("No auth token found"));

      const formData = new FormData();
      formData.append("image", file);
      const xhr = new XMLHttpRequest();
      xhr.open("POST", `${BASE_URL}/upload/image`);
      xhr.setRequestHeader("Authorization", `Bearer ${token}`);
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable && typeof onProgress === "function") {
          onProgress(Math.round((event.loaded / event.total) * 100));
        }
      };
      xhr.onload = () => {
        try {
          const payload = JSON.parse(xhr.responseText || "{}");
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(payload);
          } else {
            reject(new Error(payload.message || "Image upload failed"));
          }
        } catch (e) {
          reject(new Error("Failed to parse upload response"));
        }
      };
      xhr.onerror = () => reject(new Error("Image upload failed"));
      xhr.send(formData);
    }),
};
