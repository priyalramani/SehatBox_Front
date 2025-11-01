// src/lib/adminApi.js
import axios from "axios";

const adminApi = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "",
  withCredentials: true,
});

// Always send the ADMIN token (not the user token)
adminApi.interceptors.request.use((config) => {
  const t =
    localStorage.getItem("auth-token") || // our current key
    localStorage.getItem("admin_token");  // fallback if older code used this
  if (t) config.headers.Authorization = `Bearer ${t}`;
  return config;
});

export default adminApi;
