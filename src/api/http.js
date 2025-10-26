// src/api/http.js
import axios from "axios";
import { API_BASE } from "../config.js"; // reuse the same base from config.js

// Create the axios instance that the rest of the app uses
const http = axios.create({
  // In production:
  //   API_BASE === ""   ➜ axios will NOT prepend anything
  //   and service calls like http.get('/api/dishes') stay '/api/dishes'
  //
  // In local dev (if you set VITE_API_BASE in .env):
  //   API_BASE could be "http://localhost:4000"
  //   so http.get('/api/dishes') becomes http://localhost:4000/api/dishes
  baseURL: API_BASE,
  withCredentials: false,
});

export default http;
