// src/lib/customerApi.js
import axios from "axios";

// get and set helper for customer identity on this browser
export function getCustomerToken() {
  return (
    localStorage.getItem("customerToken") || ""
  );
}

export function setCustomerSession(token, uuid) {
  if (token) {
    localStorage.setItem("customerToken", token);
  }
  if (uuid) {
    localStorage.setItem("customerUuid", uuid);
  }
}

// We will sometimes want to know which uuid belongs to this session
export function getCustomerUuid() {
  return (
    localStorage.getItem("customerUuid") || ""
  );
}

// axios instance for CUSTOMER calls only.
// baseURL "/api" is correct because nginx forwards /api/... to Node.
const customerApi = axios.create({
  baseURL: "/api",
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
