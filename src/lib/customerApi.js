// src/lib/customerApi.js
import axios from "axios";

// get and set helper for customer identity on this browser
export function getCustomerToken() {
  return (
    localStorage.getItem("auth-token") || ""
  );
}

export function setCustomerSession(token, uuid) {
  if (token) {
    localStorage.setItem("auth-token", token);
  }
  if (uuid) {
    localStorage.setItem("customerUuid", uuid);
    localStorage.setItem("User_uuid", uuid)
  }
}

// We will sometimes want to know which uuid belongs to this session
export function getCustomerUuid() {
  return (
    localStorage.getItem("customerUuid") || ""
  );
}

// axios instance for CUSTOMER calls only.
// baseURL "" is correct because nginx forwards /api/... to Node.
const customerApi = axios.create({
  baseURL: "",
  withCredentials: false, // we are not using cookies for this flow right now
});

// attach Authorization header automatically if we have a customer token
customerApi.interceptors.request.use((config) => {
  const t = getCustomerToken();
  if (t) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${t}`;
  }
  return config;
});

export { customerApi };
