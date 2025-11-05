import axios from "axios"

const api = axios.create({
	baseURL: import.meta.env.VITE_API_BASE_URL || "/api",
	withCredentials: false
})

api.interceptors.request.use(
	(config) => {
		const token = localStorage.getItem("auth-token")
		if (token) {
			config.headers.Authorization = `Bearer ${token}`
		} else {
			delete config.headers.Authorization
		}
		return config
	},
	(error) => Promise.reject(error)
)

export default api
