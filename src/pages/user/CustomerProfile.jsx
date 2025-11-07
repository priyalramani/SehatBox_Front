import { useEffect, useState, useMemo } from "react"
import { Link, useOutletContext } from "react-router-dom"
import WalletStatementModal from "../../components/WalletStatementModal"
import api from "../../lib/axios"

function fmtNum(n, digits = 2) {
	const num = Number(n || 0)
	if (Number.isNaN(num)) return "0"
	return num.toFixed(digits)
}

// build initials for avatar
function getInitials(name, mobile) {
	if (name && name.trim().length > 0) {
		const parts = name.trim().split(" ")
		if (parts.length === 1) {
			return parts[0].slice(0, 2).toUpperCase()
		}
		return ((parts[0][0] || "") + (parts[1][0] || "")).toUpperCase()
	}
	if (mobile) {
		const digits = String(mobile).replace(/[^\d]/g, "")
		return digits.slice(-2)
	}
	return "U"
}

// convert a backend status number to UI chip
function StatusChip({ statusNum }) {
	const active = Number(statusNum) === 1
	return (
		<span
			className={
				active
					? "text-green-700 bg-green-100 inline-block px-2 py-1 rounded text-xs"
					: "text-gray-700 bg-gray-100 inline-block px-2 py-1 rounded text-xs"
			}
		>
			{active ? "Active" : "Inactive"}
		</span>
	)
}

const DEFAULT_TOTALS = {
	protein: 0,
	fats: 0,
	carbs: 0,
	calories: 0
}

const ISO_DATE = new Date().toISOString().slice(0, 10)

export default function CustomerProfile() {
	const { customerID, customerProfile } = useOutletContext()

	const [loading, setLoading] = useState(true)
	const [errorMessage, setErrorMessage] = useState("")

	const [nutritionRows, setNutritionRows] = useState([])
	const [grandTotals, setGrandTotals] = useState(DEFAULT_TOTALS)

	const [stmtOpen, setStmtOpen] = useState(false)

	const [fromDate, setFromDate] = useState(ISO_DATE)
	const [toDate, setToDate] = useState(ISO_DATE)

	const fetchNutritionRows = async (from = fromDate, to = toDate) => {
		setLoading(true)
		setErrorMessage("")

		try {
			const { data } = await api.get("/customer/nutrition", {
				params: {
					from: from || ISO_DATE,
					to: to || ISO_DATE
				}
			})

			setGrandTotals(data?.totalMacros || DEFAULT_TOTALS)
			setNutritionRows(
				data?.rows?.map((i) => ({
					...i,
					for_date: new Date(i.for_date).toDateString()
				})) || []
			)
		} catch (err) {
			setErrorMessage(err?.response?.data?.error || "An error occured. Please report this to support.")
		}

		setLoading(false)
	}

	useEffect(() => {
		fetchNutritionRows()
	}, [])

	// derived display values
	const walletDisplay = useMemo(() => {
		if (!customerProfile) return "₹0.00"
		const bal = Number(customerProfile.wallet_balance || 0)
		return `₹${bal.toFixed(2)}`
	}, [customerProfile])

	const nameDisplay = customerProfile?.name || "Customer"
	const initials = useMemo(
		() => getInitials(nameDisplay, customerProfile?.mobile_number),
		[nameDisplay, customerProfile?.mobile_number]
	)

	// Render states
	if (loading) {
		return <div className='p-4 text-gray-600 text-sm'>Loading your profile…</div>
	}

	return (
		<div className='p-4 space-y-6 max-w-2xl mx-auto text-gray-900'>
			{/* HEADER CARD */}
			<div className='rounded-lg border p-4 bg-white shadow-sm'>
				<div className='flex items-start gap-3'>
					{/* Avatar w/ initials */}
					<div className='w-12 h-12 rounded-full bg-green-600 text-white flex items-center justify-center text-lg font-semibold'>
						{initials}
					</div>

					{/* Info block */}
					<div className='flex-1 flex flex-col gap-2'>
						<div className='flex flex-col leading-tight'>
							<div className='text-lg font-semibold text-gray-900'>{nameDisplay}</div>
							{customerProfile?.mobile_number && (
								<div className='text-sm text-gray-600'>+91 {customerProfile?.mobile_number}</div>
							)}
						</div>

						<div className='text-[11px] text-gray-500 break-all'>ID: {customerID}</div>

						<div className='flex flex-wrap gap-2 text-xs'>
							{/* Meals button */}
							<Link
								to={`/meal/${customerID}`}
								className='px-2 py-1 rounded border bg-white hover:bg-gray-50'
							>
								Meals
							</Link>
							<button
								className='px-2 py-1 rounded border bg-white hover:bg-gray-50'
								onClick={() => setStmtOpen(true)}
							>
								Wallet Statement
							</button>
						</div>
					</div>

					{/* Status / Wallet / Orders summary */}
					<div className='flex flex-col gap-3 text-right text-sm'>
						<div>
							<div className='text-gray-500 text-[11px] uppercase'>Status</div>
							<div className='flex justify-end'>
								<StatusChip statusNum={customerProfile?.status} />
							</div>
						</div>

						<div>
							<div className='text-gray-500 text-[11px] uppercase'>Wallet</div>
							<div className='text-base font-medium'>{walletDisplay}</div>
						</div>

						<div>
							<div className='text-gray-500 text-[11px] uppercase'>Orders</div>
							<div className='text-base font-medium'>{customerProfile?.orders_count ?? 0}</div>
						</div>
					</div>
				</div>
			</div>

			{/* DATE FILTER + NUTRITION */}
			<div className='rounded-lg border p-4 bg-white shadow-sm space-y-4'>
				{/* Filters */}
				<div className='flex flex-wrap gap-4 items-end'>
					<div>
						<label className='block text-[11px] text-gray-500 uppercase mb-1'>From</label>
						<input
							className='border rounded px-3 py-2 text-sm'
							type='date'
							value={fromDate}
							onChange={(e) => setFromDate(e.target.value)}
						/>
					</div>
					<div>
						<label className='block text-[11px] text-gray-500 uppercase mb-1'>To</label>
						<input
							className='border rounded px-3 py-2 text-sm'
							type='date'
							value={toDate}
							onChange={(e) => setToDate(e.target.value)}
						/>
					</div>
					<div>
						<button
							className='border rounded px-3 py-2 text-sm bg-black text-white'
							onClick={() => fetchNutritionRows()}
						>
							Refresh
						</button>
					</div>
				</div>

				{/* Nutrition Data */}
				{nutritionRows.length === 0 ? (
					<div className='text-sm text-gray-600'>No nutrition records in this date range.</div>
				) : (
					<div className='space-y-4'>
						{nutritionRows.map((day, i) => (
							<div key={i} className='border rounded p-3 bg-gray-50 space-y-2'>
								{/* Day header */}
								<div className='font-medium text-gray-800'>{day.for_date}</div>

								{/* Meal items */}
								<div className='text-sm text-gray-700 space-y-2'>
									{Array.isArray(day.items) &&
										day.items.map((item, j) => (
											<div key={j} className='flex items-start justify-between'>
												<div className='flex-1 pr-2'>
													<div className='font-medium'>{item.dish_name}</div>
													<div className='text-xs text-gray-500'>
														Qty: {item.quantity ?? 1}
													</div>
												</div>
												<div className='text-right text-[11px] text-gray-600 leading-5'>
													<div>
														P {fmtNum(item.nutrition.protein, 0)}g / F{" "}
														{fmtNum(item.nutrition.fats, 0)}g
													</div>
													<div>
														C {fmtNum(item.nutrition.carbs, 0)}g /{" "}
														{fmtNum(item.nutrition.calories, 0)} kcal
													</div>
												</div>
											</div>
										))}
								</div>

								{/* Daily totals */}
								{day.totalMacros && (
									<div className='text-[11px] text-gray-800 bg-white rounded border p-2 flex flex-wrap gap-4 justify-between'>
										<div>
											<div className='font-semibold text-gray-700'>Daily Totals</div>
											<div>Protein: {fmtNum(day.totalMacros.protein, 0)} g</div>
											<div>Fat: {fmtNum(day.totalMacros.fats, 0)} g</div>
											<div>Carbs: {fmtNum(day.totalMacros.carbs, 0)} g</div>
										</div>
										<div className='text-right'>
											<div>Calories</div>
											<div className='font-semibold text-gray-900'>
												{fmtNum(day.totalMacros.calories, 0)} kcal
											</div>
										</div>
									</div>
								)}
							</div>
						))}

						{/* Grand totals */}
						<div className='border rounded p-3 bg-white text-sm text-gray-800 flex flex-wrap gap-6 justify-between'>
							<div>
								<div className='text-gray-500 text-[11px] uppercase'>Total Protein</div>
								<div className='font-medium'>{fmtNum(grandTotals.protein, 0)} g</div>
							</div>

							<div>
								<div className='text-gray-500 text-[11px] uppercase'>Total Fat</div>
								<div className='font-medium'>{fmtNum(grandTotals.fats, 0)} g</div>
							</div>

							<div>
								<div className='text-gray-500 text-[11px] uppercase'>Total Carbs</div>
								<div className='font-medium'>{fmtNum(grandTotals.carbs, 0)} g</div>
							</div>

							<div>
								<div className='text-gray-500 text-[11px] uppercase'>Total Calories</div>
								<div className='font-medium'>{fmtNum(grandTotals.calories, 0)} kcal</div>
							</div>
						</div>
					</div>
				)}

				{errorMessage && <div className='text-center text-xs text-red-600'>{errorMessage}</div>}
			</div>

			{/* Wallet Statement Modal (ADMIN-ONLY live data) */}
			{customerProfile?.user_uuid && (
				<WalletStatementModal
					open={stmtOpen}
					userId={customerProfile.user_uuid || customerID}
					userTitle={customerProfile.name || customerProfile.mobile_number || customerID}
					onClose={() => setStmtOpen(false)}
				/>
			)}
		</div>
	)
}
