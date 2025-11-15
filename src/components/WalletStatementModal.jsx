import React, { useEffect, useMemo, useState } from "react"
import api from "../lib/axios"
import { MdModeEdit } from "react-icons/md"
import classNames from "classnames"
import { IoCheckbox, IoCheckmarkCircle } from "react-icons/io5"
import { FcCheckmark } from "react-icons/fc"
import { IoMdClose } from "react-icons/io"
import { Spinner, SpinnerOverlay } from "./Spinner"

function fmtINR(n) {
	const v = Number(n) || 0
	const sign = v >= 0 ? "" : "-"
	return `${sign}₹${Math.abs(v).toFixed(2)}`
}
function fmtDate(d) {
	const dt = new Date(d)
	if (isNaN(dt)) return "-"
	return dt.toISOString().slice(0, 10).split("-").reverse().join("/")
}
function getSortTime(row) {
	const d = row.created_at || row.createdAt || row.transaction_date || row.date || row.tx_date || row.time
	const t = new Date(d).getTime()
	return Number.isFinite(t) ? t : 0
}

export default function WalletStatementModal({ userId, userTitle, onClose, open }) {
	const [loading, setLoading] = useState(false)
	const [err, setErr] = useState("")
	const [rows, setRows] = useState([])
	const [balance, setBalance] = useState(0)
	const [inputState, setInputState] = useState()

	useEffect(() => {
		if (!open || !userId) return
		;(async () => {
			setLoading(true)
			setErr("")
			try {
				const { data } = await api.get(`/wallet/users/${encodeURIComponent(userId)}/statement`)
				const logs = Array.isArray(data?.logs) ? data.logs : []
				setRows(logs)
				setBalance(Number(data?.balance) || 0)
			} catch (e) {
				setErr(e?.response?.data?.message || e?.message || "Failed to load statement")
			} finally {
				setLoading(false)
			}
		})()
	}, [open, userId])

	const sorted = useMemo(() => {
		const arr = Array.isArray(rows) ? [...rows] : []
		arr.sort((a, b) => getSortTime(b) - getSortTime(a))
		return arr
	}, [rows])

	if (!open) return null

	const handleLogUpdate = async () => {
		setInputState((prev) => ({ ...prev, loading: true }))
		try {
			const { data } = await api.put("/wallet", inputState)
			setRows((prev) => data.rows.concat(prev.slice(inputState?.rowIndex + 1)))
			setBalance(data.balance)
			setInputState()
		} catch (error) {
			console.error(error)
			setInputState((prev) => ({ ...prev, loading: false }))
		}
	}

	return (
		<div className='fixed inset-0 z-50 bg-black/40 flex items-center justify-center'>
			{/* Outer panel with max height and flex layout */}
			<div className='bg-white rounded-xl w-[min(900px,95vw)] max-h-[90vh] flex flex-col overflow-hidden shadow-xl'>
				{/* Header */}
				<div className='px-4 py-3 border-b flex items-start justify-between'>
					<div className='min-w-0'>
						<div className='text-lg font-semibold'>Wallet Statement</div>
						<div className='text-sm text-gray-600 truncate'>{userTitle || userId}</div>
						<div className='text-sm text-gray-700 mt-1'>
							Current Wallet Balance: <span className='font-semibold'>{fmtINR(balance)}</span>
						</div>
					</div>
					<button
						onClick={onClose}
						className='px-3 py-1.5 rounded border hover:bg-gray-50 text-sm text-gray-700'
					>
						Close
					</button>
				</div>

				{/* Scrollable content area */}
				<div className='flex-1 overflow-auto p-4'>
					{err && <div className='text-red-600 text-sm mb-3'>{err}</div>}

					<div className='border rounded-lg overflow-auto'>
						<table className='min-w-full text-sm'>
							<thead className='bg-gray-200 sticky top-0'>
								<tr>
									<th className='text-left px-3 py-2 border-b'>Trans. Date</th>
									<th className='text-right px-3 py-2 border-b'>Amount</th>
									<th className='py-2 border-b' />
									<th className='text-left px-3 py-2 border-b'>Remarks</th>
									<th className='text-right px-3 py-2 border-b'>Balance After</th>
								</tr>
							</thead>
							<tbody>
								{loading ? (
									<tr>
										<td className='px-3 py-3 text-center' colSpan={4}>
											Loading…
										</td>
									</tr>
								) : sorted.length === 0 ? (
									<tr>
										<td className='px-3 py-3 text-gray-500 text-center' colSpan={4}>
											No transactions found.
										</td>
									</tr>
								) : (
									sorted.map((r, idx) => {
										const amtNum = +r.balance_after_update - +r.balance_before_update
										return (
											<tr key={idx} className='odd:bg-white even:bg-gray-100'>
												<td className='px-3 py-2 border-b'>{fmtDate(r.transaction_date)}</td>

												<td className='border-b w-46'>
													<div className='flex items-center font-medium h-full'>
														{inputState?.logId === r._id ? (
															<input
																autoFocus
																type='number'
																className='bg-gray-100 block ml-auto p-2 border w-full'
																value={inputState?.amount}
																onChange={(e) => {
																	const v = e.target.value
																	if (!v.toString().includes("e"))
																		setInputState((p) => ({ ...p, amount: v }))
																}}
																onWheel={(e) => e.target.blur()}
															/>
														) : (
															<span
																className={classNames(
																	"block w-full text-right px-3 py-2",
																	amtNum < 0 ? "text-blue-600" : "text-green-600"
																)}
															>
																{fmtINR(amtNum)}
															</span>
														)}
													</div>
												</td>

												<td className='border-b'>
													{amtNum > 0 && !r.remarks.includes("Refund") ? (
														inputState?.logId === r._id ? (
															inputState?.loading ? (
																<Spinner className='mx-2' />
															) : (
																<div className='flex gap-2 px-2'>
																	<button
																		className='flex cursor-pointer text-xl'
																		onClick={handleLogUpdate}
																	>
																		<FcCheckmark />
																	</button>
																	<button
																		className='flex cursor-pointer text-xl'
																		onClick={() => setInputState()}
																	>
																		<IoMdClose color='red' />
																	</button>
																</div>
															)
														) : (
															<button
																className='flex cursor-pointer text-base px-2'
																onClick={() =>
																	setInputState({
																		logId: r._id,
																		amount: amtNum,
																		rowIndex: idx
																	})
																}
															>
																<MdModeEdit />
															</button>
														)
													) : null}
												</td>

												<td className='px-3 py-2 border-b'>
													<div>
														{r.remarks ||
															(amtNum < 0 ? "Deduction" : "Wallet Balance Added")}
													</div>

													{r.narration && (
														<div className='text-xs italic text-gray-600 mt-1'>
															{r.narration}
														</div>
													)}
												</td>

												<td className='px-3 py-2 border-b text-right'>
													{typeof r.balance_after_update === "number"
														? `${fmtINR(r.balance_after_update)}`
														: "-"}
												</td>
											</tr>
										)
									})
								)}
							</tbody>
						</table>
					</div>
				</div>
				{/* end scrollable */}
			</div>
		</div>
	)
}
