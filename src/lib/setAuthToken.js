import axios from "axios";

export default function setAuthToken(token) {
  // baseURL for ANY accidental plain axios usage
  axios.defaults.baseURL = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";

  if (token) {
    axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  } else {
    delete axios.defaults.headers.common["Authorization"];
  }
}
