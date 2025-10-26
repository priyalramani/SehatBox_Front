// src/api/http.js
import axios from "axios";

// Automatically detect API base depending on environment.
// In production (nginx proxy), this should just be "/api".
// In dev, VITE_API_BASE or VITE_API_BASE_URL can still be used.
const API_BASE =
  import.meta.env.VITE_API_BASE ||
  import.meta.env.VITE_API_BASE_URL ||
  "/api"; // ✅ no localhost, works behind nginx proxy

const http = axios.create({
  baseURL: API_BASE,
  withCredentials: false,
});

export default http;
