import axios from "axios"

const api = axios.create({
	baseURL: import.meta.env.VITE_API_BASE_URL || "/api",
	headers: {
		Authorization: `Bearer ${localStorage.getItem("auth-token")}`
	},
	withCredentials: false
})

export default api
