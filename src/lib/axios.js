// axios.js
import axios from "axios";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:4000",
  withCredentials: false, // using Bearer token, not cookies
});

// ⬇️ Attach admin token to every request
api.interceptors.request.use((config) => {
  const t = localStorage.getItem("adminToken");
  if (t) config.headers.Authorization = `Bearer ${t}`;
  return config;
});
