// src/api/dishes.js
import { api } from "../lib/axios";

// grab admin token for all dish endpoints
function adminHeaders() {
  const t =
    localStorage.getItem("adminToken") ||
    localStorage.getItem("admin_token");
  return t ? { Authorization: `Bearer ${t}` } : {};
}

// helper that tries a primary URL, then fallback if 404
async function tryWithFallback(method, primaryUrl, fallbackUrl, options = {}) {
  try {
    const res = await api.request({
      method,
      url: primaryUrl,
      ...options,
    });
    return res;
  } catch (err) {
    if (err?.response?.status === 404 && fallbackUrl) {
      // try fallback
      const res2 = await api.request({
        method,
        url: fallbackUrl,
        ...options,
      });
      return res2;
    }
    throw err;
  }
}

// LIST dishes
export async function listDishes(q = "") {
  const params = q ? { q } : undefined;
  const res = await tryWithFallback(
    "get",
    "/api/admin/dishes",
    "/api/dishes",
    {
      params,
      headers: adminHeaders(),
      withCredentials: true,
    }
  );

  const data = res.data;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.dishes)) return data.dishes;
  return [];
}

// CREATE dish
export async function createDish(payload) {
  // backend probably expects POST /api/admin/dishes
  const res = await tryWithFallback(
    "post",
    "/api/admin/dishes",
    "/api/dishes",
    {
      data: payload,
      headers: adminHeaders(),
      withCredentials: true,
    }
  );
  return res.data;
}

// UPDATE dish
export async function updateDish(idOrUuid, payload) {
  const res = await tryWithFallback(
    "put",
    `/api/admin/dishes/${idOrUuid}`,
    `/api/dishes/${idOrUuid}`,
    {
      data: payload,
      headers: adminHeaders(),
      withCredentials: true,
    }
  );
  return res.data;
}

// DELETE dish
export async function deleteDish(idOrUuid) {
  const res = await tryWithFallback(
    "delete",
    `/api/admin/dishes/${idOrUuid}`,
    `/api/dishes/${idOrUuid}`,
    {
      headers: adminHeaders(),
      withCredentials: true,
    }
  );
  return res.data;
}

// PATCH status (activate/deactivate dish)
export async function patchDishStatus(idOrUuid, newStatus) {
  // some backends do PATCH /.../status with body { status: ... }
  const res = await tryWithFallback(
    "patch",
    `/api/admin/dishes/${idOrUuid}/status`,
    `/api/dishes/${idOrUuid}/status`,
    {
      data: { status: newStatus },
      headers: adminHeaders(),
      withCredentials: true,
    }
  );
  return res.data;
}
