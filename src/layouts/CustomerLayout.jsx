import React, { useEffect, useState } from "react"
import { useParams } from "react-router-dom"
import { Outlet, useNavigate } from "react-router"
import api from "../lib/axios"
import { getCustomerUuid, setCustomerSession } from "../lib/customerApi"

export default function CustomerLayout() {
	const { user_uuid } = useParams()
	const navigate = useNavigate()

	const [customerProfile, setCustomerProfile] = useState()
	const [errorMessage, setErrorMessage] = useState()
	const [loading, setLoading] = useState(true)

	const fetchProfile = async () => {
		const { data } = await api.get("/customer/me")
		setCustomerProfile(data || null)
	}

	useEffect(() => {
		const bootstrapSession = async () => {
			setLoading(true)
			const currCustomerID = getCustomerUuid()

			try {
				if (!currCustomerID) {
					const { data } = await api.post("/customer/bootstrap-session", {
						user_uuid,
					})

					setCustomerSession(data.customer_token, data.user_uuid)
				} else if (currCustomerID !== user_uuid) {
					const route = window.location.pathname.split("/")[1]
					navigate(`/${route}/${currCustomerID}`)
				}

				const { data } = await api.get("/customer/me")
				setCustomerProfile(data || null)
			} catch (err) {
				console.error("bootstrap-session failed", err)
				setErrorMessage(
					err?.response?.data?.error || "Your secure link expired. Please request a new link from Sehat Box."
				)
			}
			setLoading(false)
		}

		bootstrapSession()
	}, [])

	if (loading) {
		return <div className='p-4 text-gray-600 text-sm'>Loading your profile…</div>
	}
	if (!customerProfile) {
		if (errorMessage)
			return (
				<div className='p-4 max-w-md mx-auto text-center space-y-4'>
					<div className='text-lg font-semibold text-red-600'>{errorMessage}</div>
					<div className='text-sm text-gray-600'>Please request a fresh secure link from Sehat Box.</div>
				</div>
			)

		return <div className='p-4 text-gray-600 text-sm'>Loading your profile…</div>
	}

	return (
		<div className='min-h-screen max-w-2xl mx-auto text-gray-900 bg-white flex flex-col'>
			<Outlet context={{ customerID: user_uuid, customerProfile, fetchProfile }} />
			{errorMessage && <div className='text-center text-xs text-red-600 mt-6'>{errorMessage}</div>}
		</div>
	)
}
