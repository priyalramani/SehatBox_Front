import React, { useEffect, useState } from "react"
import { Navigate, Outlet } from "react-router-dom"
import api from "../lib/axios.js"
import Navbar from "../components/Navbar.jsx"

export default function AdminRoute() {
	const [ok, setOk] = useState(false)
	const [checked, setChecked] = useState(false)

	useEffect(() => {
		if (!localStorage.getItem("auth-token")) {
			setOk(false)
			setChecked(true)
			return
		}

		;(async () => {
			try {
				const { data } = await api.get("/admin/me")
				setOk(Boolean(data?.success))
			} catch (err) {
				setOk(false)
			}
			setChecked(true)
		})()
	}, [])

	if (!checked) return <div className='p-6'>Checking admin…</div>
	if (!ok) return <Navigate to='/admin-login' replace />

	return (
		<>
			<Navbar />
			<Outlet />
		</>
	)
}
