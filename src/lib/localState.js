const TOKEN_FIELD = "auth-token"
const USERID_FIELD = "user-uuid"

export const getToken = () => localStorage.getItem(TOKEN_FIELD) || ""
export const getUserID = () => localStorage.getItem(USERID_FIELD) || ""

export const setAuthSession = (token, uuid) => {
	if (token) localStorage.setItem(TOKEN_FIELD, token)
	if (uuid) localStorage.setItem(USERID_FIELD, uuid)
}

export const clearAuthSession = () => {
	localStorage.clear()
}
