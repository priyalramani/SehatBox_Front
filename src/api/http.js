import axios from 'axios';

// read either key so both old/new .env work
const API_BASE =
  import.meta.env.VITE_API_BASE ||
  import.meta.env.VITE_API_BASE_URL ||
  'http://localhost:5000';  // fallback only for dev

const http = axios.create({
  baseURL: API_BASE,
  withCredentials: false,
});

export default http;
