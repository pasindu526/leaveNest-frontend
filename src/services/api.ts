import axios from "axios";

// Vite env vars are available via import.meta.env and are baked in at build time.
const rawBase = (import.meta.env.VITE_API_BASE_URL as string) || "";
let API_BASE = rawBase.trim() || "http://localhost:5000/api";

// If the env value didn't include a scheme, normalize it.
// Use http for localhost/127.* otherwise default to https.
if (!/^https?:\/\//i.test(API_BASE) && !API_BASE.startsWith("//")) {
  if (/^(localhost|127\.0\.0\.1)/i.test(API_BASE) || API_BASE.includes("localhost")) {
    API_BASE = "http://" + API_BASE;
  } else {
    API_BASE = "https://" + API_BASE;
  }
} else if (API_BASE.startsWith("//")) {
  // protocol-relative -> add current page protocol
  API_BASE = window.location.protocol + API_BASE;
}

const API = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
});

// Add interceptor for auth token
API.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers = config.headers ?? {};
    config.headers["Authorization"] = `Bearer ${token}`;
  }
  return config;
});

export default API;
