const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";
const BASE_URL = API_BASE_URL;

class ApiClientError extends Error {
  constructor(message, status, payload) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.payload = payload;
  }
}

const getToken = () => {
  return (
    localStorage.getItem("lifeos-token") ||
    sessionStorage.getItem("lifeos-token")
  );
};

async function request(path, options = {}) {
  const { requireAuth = false, ...fetchOptions } = options;
  const token = getToken();
  const headers = new Headers(fetchOptions.headers || {});

  if (fetchOptions.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (requireAuth && !token) {
    throw new ApiClientError("No auth token found", 401, { message: "No auth token found" });
  }

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${BASE_URL}${path}`, { ...fetchOptions, headers });

  console.log("API REQUEST:", path, {
    method: fetchOptions.method || "GET",
    headers: Object.fromEntries(headers.entries()),
    body: fetchOptions.body,
  });
  const payload = await response.json().catch(() => ({}));

  if (response.status === 401) {
    sessionStorage.removeItem("lifeos-token");
    sessionStorage.removeItem("lifeos-user");
    localStorage.removeItem("lifeos-token");
    localStorage.removeItem("lifeos-user");
    window.dispatchEvent(new CustomEvent("lifeos:unauthorized"));
  }

  if (!response.ok) {
    throw new ApiClientError(payload.message || "Request failed", response.status, payload);
  }

  return payload;
}

export { BASE_URL, request, ApiClientError };
