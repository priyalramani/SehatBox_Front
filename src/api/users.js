// src/api/users.js
import http from './http';

// helper: always send the ADMIN token for admin-only endpoints
const adminHeaders = () => {
  const t = localStorage.getItem('adminToken') || localStorage.getItem('admin_token');
  return t ? { Authorization: `Bearer ${t}` } : {};
};

// GET /api/users?q=
export const listUsers = async (q = '') => {
  const params = {};
  if (q) params.q = q;
  const { data } = await http.get('/api/users', {
    params,
    headers: adminHeaders(),        // <<< attach admin token
    withCredentials: true,
  });
  return data;
};

// POST /api/users
export const createUser = async (payload) => {
  const { data } = await http.post('/api/users', payload, {
    headers: adminHeaders(),
    withCredentials: true,
  });
  return data;
};

// PUT /api/users/:idOrUuid
export const updateUser = async (idOrUuid, payload) => {
  const { data } = await http.put(`/api/users/${idOrUuid}`, payload, {
    headers: adminHeaders(),
    withCredentials: true,
  });
  return data;
};

// PATCH /api/users/:idOrUuid/status
export const patchUserStatus = async (idOrUuid, status) => {
  const { data } = await http.patch(`/api/users/${idOrUuid}/status`, { status }, {
    headers: adminHeaders(),
    withCredentials: true,
  });
  return data;
};
