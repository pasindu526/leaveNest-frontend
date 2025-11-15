import axios from "axios";

// Vite env vars are available via import.meta.env and are baked in at build time.
const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

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
