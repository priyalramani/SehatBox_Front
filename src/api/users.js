// src/users.js
import api from "../lib/axios"

// helper: always send the ADMIN token for admin-only endpoints
const adminHeaders = () => {
	const t = localStorage.getItem("auth-token") || localStorage.getItem("admin_token")
	return t ? { Authorization: `Bearer ${t}` } : {}
}

// GET /users?q=
export const listUsers = async (q = "") => {
	const params = {}
	if (q) params.q = q
	const { data } = await api.get("/users", {
		params,
		headers: adminHeaders(), // <<< attach admin token
		withCredentials: true
	})
	return data
}

// POST /users
export const createUser = async (payload) => {
	const { data } = await api.post("/users", payload, {
		headers: adminHeaders(),
		withCredentials: true
	})
	return data
}

// PUT /users/:idOrUuid
export const updateUser = async (idOrUuid, payload) => {
	const { data } = await api.put(`/users/${idOrUuid}`, payload, {
		headers: adminHeaders(),
		withCredentials: true
	})
	return data
}

// PATCH /users/:idOrUuid/status
export const patchUserStatus = async (idOrUuid, status) => {
	const { data } = await api.patch(
		`/users/${idOrUuid}/status`,
		{ status },
		{
			headers: adminHeaders(),
			withCredentials: true
		}
	)
	return data
}
