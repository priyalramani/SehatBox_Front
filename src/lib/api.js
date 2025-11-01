// src/lib/axios.js
import axios from "axios";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "/api";

const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true, // send/receive refresh cookie
});

// attach access token
api.interceptors.request.use((config) => {
  const t = localStorage.getItem("auth_token");
  if (t) config.headers.Authorization = `Bearer ${t}`;
  return config;
});

let refreshing = null;

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error?.response?.status === 401 && !original._retry) {
      original._retry = true;

      if (!refreshing) {
        refreshing = axios.post("/auth/refresh", {}, { withCredentials: true })
          .then(({ data }) => {
            localStorage.setItem("auth_token", data.accessToken);
            refreshing = null;
            return data.accessToken;
          })
          .catch((e) => {
            refreshing = null;
            localStorage.removeItem("auth_token");
            localStorage.removeItem("User_uuid");
            localStorage.removeItem("Mobile");
            throw e;
          });
      }

      const newToken = await refreshing;
      original.headers.Authorization = `Bearer ${newToken}`;
      return api(original);
    }
    return Promise.reject(error);
  }
);

export default api;
