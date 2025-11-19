import { useEffect } from "react"
import { useNavigate } from "react-router-dom"
import api from "../lib/axios"
import { getToken, getUserID } from "../lib/localState"

export default function Landing() {
	const navigate = useNavigate()

	useEffect(() => {
		const tryRedirect = async () => {
			const token = getToken()
			if (token) {
				try {
					await api.get("/admin/me")
					navigate("/dishes", { replace: true })
					return
				} catch {
					// invalid admin token, continue to customer check
				}
			}

			const uuid = getUserID()
			if (uuid) {
				try {
					await api.get("/customer/me")
					navigate(`/customer/${uuid}`, { replace: true })
					return
				} catch {
					// invalid/expired customer token
				}
			}

			navigate("/admin-login", { replace: true })
		}

		tryRedirect()
	}, [navigate])

	return (
		<div className='min-h-screen flex items-center justify-center text-gray-600'>
			<div className='text-center space-y-2'>
				<div className='text-lg font-medium'>Loading…</div>
				<div className='text-sm text-gray-500'>Redirecting you to the correct place.</div>
			</div>
		</div>
	)
}
