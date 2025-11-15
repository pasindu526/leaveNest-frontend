import axios from "axios";

// Vite env vars are available via import.meta.env and are baked in at build time.
const raw = import.meta.env.VITE_API_BASE_URL;
let API_BASE = (raw ?? "http://localhost:5000").replace(/\/+$/, "");

// Ensure the base always includes the /api prefix used by your server routes
if (!/\/api$/i.test(API_BASE)) {
  API_BASE = `${API_BASE}/api`;
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
