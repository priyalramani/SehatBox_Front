// src/api/orders.js
import api from "../lib/axios"

// Pull token the same way the rest of the app does (cover common keys)
function getAuthHeader() {
	try {
		const token =
			localStorage.getItem("token") ||
			localStorage.getItem("authToken") ||
			localStorage.getItem("accessToken") ||
			sessionStorage.getItem("token") ||
			""
		return token ? { Authorization: `Bearer ${token}` } : {}
	} catch {
		return {}
	}
}

/**
 * Create an order (same endpoint/shape as user side).
 * - If you're placing on behalf of someone: include user_uuid in payload.
 * - Backend will compute amount if it wants; we send minimal shape.
 */
export async function createOrder(payload) {
	const { data } = await api.post("/orders", payload, {
		withCredentials: false
	})
	return data
}
