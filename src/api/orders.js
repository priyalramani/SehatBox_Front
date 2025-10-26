// src/api/orders.js
import http from './http';

// Pull token the same way the rest of the app does (cover common keys)
function getAuthHeader() {
  try {
    const token =
      localStorage.getItem('token') ||
      localStorage.getItem('authToken') ||
      localStorage.getItem('accessToken') ||
      sessionStorage.getItem('token') ||
      '';
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
}

/**
 * Create an order (same endpoint/shape as user side).
 * - If you're placing on behalf of someone: include user_uuid in payload.
 * - Backend will compute amount if it wants; we send minimal shape.
 */
export async function createOrder(payload) {
  const headers = getAuthHeader();
  const { data } = await http.post('/api/orders', payload, {
    headers,            // <-- attach bearer token if present
    withCredentials: false,
  });
  return data;
}
