export const timeString = (timeStr, dateObj) => {
	if (!timeStr && !dateObj) return ""
	if (dateObj) dateObj = new Date(timeStr)
	return dateObj.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
}

export const dateString = (dateStr, dateObj) => {
	if (!dateStr && !dateObj) return ""
	if (dateObj) dateObj = new Date(dateStr)
	const day = String(dateObj.getDate()).padStart(2, "0")
	const month = String(dateObj.getMonth() + 1).padStart(2, "0")
	const year = dateObj.getFullYear()

	return `${day}/${month}/${year}`
}

export const dateTimeString = (str) => {
	if (!str) return ""
	const dateObj = new Date(str)
	return dateString(null, dateObj) + ", " + timeString(null, dateObj)
}
