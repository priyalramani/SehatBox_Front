import React, { useState } from "react"
import api from "../lib/axios"
import { dateString } from "../lib/dateUtils"

const pageSizes = [25, 50, 100, 200]

export default function CashFlowStatement() {
	const [transactions, setTransactions] = useState([])
	const [loadingPlans, setLoadingPlans] = useState(false)
	const [paginationState, setPaginationState] = useState({
		pageSize: pageSizes[1],
		pageIndex: 0,
		totalCount: 0,
		totalPages: 0
	})
	const [filters, setFilters] = useState({
		fromDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toJSON().slice(0, 10),
		toDate: new Date().toJSON().slice(0, 10)
	})

	const fetchData = async (pagination = paginationState) => {
		setLoadingPlans(true)
		try {
			const response = await api.post("/wallet/cashflow-statement", { ...filters, ...pagination })

			if (response.data.totalCount) pagination.totalCount = response.data.totalCount
			pagination.totalPages = Math.ceil(pagination.totalCount / pagination.pageSize)

			setPaginationState(pagination)
			setTransactions(response.data.data)
		} catch (error) {
			console.error(error)
		}
		setLoadingPlans(false)
	}

	const handleSearch = (e) => {
		e.preventDefault()
		fetchData()
	}

	const renderPlansTable = () => {
		if (loadingPlans) {
			return <div className='p-6 text-center text-sm text-slate-500'>Loading meal plans…</div>
		}

		return (
			<div className='border border-slate-200 bg-white rounded-md text-left overflow-auto max-h-[77vh]'>
				<table className='w-full'>
					<thead className='sticky top-0 bg-slate-100 border-b border-slate-200 text-xs text-slate-600 uppercase font-medium whitespace-nowrap'>
						<tr>
							<th className='px-3 py-2 text-center font-medium'>#</th>
							<th className='px-3 py-2'>Date</th>
							<th className='px-3 py-2'>Customer</th>
							<th className='px-3 py-2 text-right'>Amount</th>
							<th className='px-3 py-2'>Remarks</th>
							<th className='px-3 py-2'>Narration</th>
						</tr>
					</thead>

					<tbody className='divide-y divide-slate-200'>
						{transactions.map((planDoc, index) => (
							<tr key={planDoc._id || index} className='border-b last:border-0 text-sm whitespace-nowrap'>
								<td className='px-3 py-2 text-center'>
									{paginationState.pageIndex * paginationState.pageSize + index + 1}.
								</td>
								<td className='px-3 py-2 font-semibold'>{dateString(planDoc.transaction_date)}</td>
								<td className='px-3 py-2'>{planDoc.userName}</td>
								<td className='px-3 py-2 text-right'>₹{planDoc.transaction_amount}</td>
								<td className='px-3 py-2'>{planDoc.remarks}</td>
								<td className='px-3 py-2'>{planDoc.narration}</td>
							</tr>
						))}
					</tbody>
				</table>

				<div className='sticky bottom-0 bg-slate-100 px-3 py-2 flex justify-between items-center text-sm'>
					<div className='flex gap-4'>
						<label className='flex gap-2 items-center text-sm'>
							<span>Rows</span>
							<select
								value={paginationState?.pageSize}
								onChange={(e) =>
									fetchData({
										...paginationState,
										pageSize: +e.target.value,
										pageIndex: Math.floor(
											(paginationState.pageSize * paginationState.pageIndex) / +e.target.value
										)
									})
								}
								className='border rounded-md border-slate-600'
							>
								{pageSizes.map((n) => (
									<option key={n} value={n}>
										{n}
									</option>
								))}
							</select>
						</label>

						{paginationState?.totalPages > 1 && (
							<>
								<label className='flex gap-2 items-center text-sm'>
									<span>Page</span>
									<select
										value={paginationState?.pageIndex}
										onChange={(e) => fetchData({ ...paginationState, pageIndex: +e.target.value })}
										className='border rounded-md border-slate-800'
									>
										{Array(paginationState?.totalPages)
											?.fill()
											?.map((_, i) => (
												<option key={"page:" + i} value={i}>
													{i + 1}
												</option>
											))}
									</select>
								</label>
								<div>
									<button
										onClick={() =>
											fetchData({
												...paginationState,
												pageIndex: paginationState?.pageIndex - 1
											})
										}
										disabled={paginationState?.pageIndex === 0}
										className='cursor-pointer disabled:cursor-auto disabled:opacity-50 border rounded-md px-2 py-[1px] border-slate-800 mr-1'
									>
										Prev
									</button>
									<button
										onClick={() =>
											fetchData({
												...paginationState,
												pageIndex: paginationState?.pageIndex + 1
											})
										}
										disabled={paginationState?.pageIndex === paginationState?.totalPages - 1}
										className='cursor-pointer disabled:cursor-auto disabled:opacity-50 border rounded-md px-2 py-[1px] border-slate-800'
									>
										Next
									</button>
								</div>
							</>
						)}
					</div>
					<span className='text-slate-600'>Total {paginationState?.totalCount}</span>
				</div>
			</div>
		)
	}

	return (
		<div className='p-4 md:px-6 w-full max-w-6xl mx-auto'>
			<div className='w-full flex justify-between items-center mb-4'>
				<h1 className='text-lg font-semibold text-slate-800'>Cash Flow Statement</h1>

				<form className='flex gap-2 text-sm items-center' onSubmit={handleSearch}>
					<span className='font-semibold text-slate-600 asterisk'>From</span>
					<input
						type='date'
						className='border border-slate-200 px-3 py-2 rounded-lg'
						required
						value={filters?.fromDate}
						onChange={(e) => setFilters((p) => ({ ...p, fromDate: e.target.value }))}
					/>
					<span className='font-semibold text-slate-600 asterisk'>To</span>
					<input
						type='date'
						className='border border-slate-200 px-3 py-2 rounded-lg'
						required
						value={filters.toDate}
						onChange={(e) => setFilters((p) => ({ ...p, toDate: e.target.value }))}
					/>
					<button
						type='submit'
						className={"px-3 py-2 rounded-lg text-sm font-semibold bg-black text-white cursor-pointer"}
					>
						Search
					</button>
				</form>
			</div>

			<div className='bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden'>
				{renderPlansTable()}
			</div>
		</div>
	)
}
