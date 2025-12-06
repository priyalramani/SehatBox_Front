// src/pages/AddOrder.jsx
import React, { useEffect, useMemo, useRef, useState } from "react"
import api from "../lib/axios"
import { useLocation, useNavigate } from "react-router-dom"

const toNum = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0)
const money = (n) => `₹${toNum(n).toFixed(2)}`

/* =================== Date helpers (same UX as AllOrders) =================== */

// Tomorrow (local) as dd/mm/yy
function getTomorrowDDMMYY() {
	const t = new Date()
	t.setDate(t.getDate() + 1)
	const dd = String(t.getDate()).padStart(2, "0")
	const mm = String(t.getMonth() + 1).padStart(2, "0")
	const yy = String(t.getFullYear()).slice(-2)
	return `${dd}/${mm}/${yy}`
}

// Mask user typing as dd/mm/yy with auto slashes
function maskDDMMYY(input) {
	const digits = input.replace(/[^\d]/g, "")
	const parts = []
	if (digits.length <= 2) parts.push(digits)
	else if (digits.length <= 4) parts.push(digits.slice(0, 2), digits.slice(2))
	else parts.push(digits.slice(0, 2), digits.slice(2, 4), digits.slice(4, 6))
	return parts.filter(Boolean).join("/")
}

// Parse dd/mm/yy -> {y,m,d} or null
function parseDDMMYY(s) {
	const m = /^(\d{2})\/(\d{2})\/(\d{2})$/.exec(s)
	if (!m) return null
	const d = Number(m[1])
	const mo = Number(m[2])
	const yy = Number(m[3])
	const y = 2000 + yy // 20xx
	if (mo < 1 || mo > 12 || d < 1 || d > 31) return null
	return { y, m: mo, d }
}

// Convert dd/mm/yy to ISO string representing IST midnight
function ddmmyyToISTMidnightISO(s) {
	const p = parseDDMMYY(s)
	if (!p) return null
	const utcMidnight = Date.UTC(p.y, p.m - 1, p.d, 0, 0, 0, 0)
	// 00:00 IST = previous day 18:30 UTC
	return new Date(utcMidnight - 5.5 * 60 * 60 * 1000).toISOString()
}

// ✅ FIXED: Convert stored UTC (which represents IST midnight) back to dd/mm/yy in IST
function isoToDDMMYY(iso) {
	const dt = new Date(iso)
	if (isNaN(dt)) return getTomorrowDDMMYY()
	const ist = new Date(dt.getTime() + 5.5 * 60 * 60 * 1000) // shift to IST
	const dd = String(ist.getDate()).padStart(2, "0")
	const mm = String(ist.getMonth() + 1).padStart(2, "0")
	const yy = String(ist.getFullYear()).slice(-2)
	return `${dd}/${mm}/${yy}`
}

/* =============== Utilities =============== */
function useQuery() {
	const { search } = useLocation()
	return useMemo(() => new URLSearchParams(search), [search])
}

/* =================== Searchable SINGLE Select (Meal) =================== */
function SearchableSelect({ value, onChange, options, placeholder = "-- Choose --", disabled = false }) {
	const [open, setOpen] = useState(false)
	const [query, setQuery] = useState("")
	const rootRef = useRef(null)
	const inputRef = useRef(null)
	const listRef = useRef(null)
	const [highlight, setHighlight] = useState(0)

	const selected = useMemo(() => options.find((o) => o.value === value) || null, [options, value])

	const filtered = useMemo(() => {
		const q = query.trim().toLowerCase()
		if (!q) return options.slice(0, 200)
		return options.filter((o) => o.search.includes(q)).slice(0, 200)
	}, [options, query])

	useEffect(() => {
		function onDocClick(e) {
			if (!rootRef.current) return
			if (!rootRef.current.contains(e.target)) {
				setOpen(false)
				setQuery("")
			}
		}
		document.addEventListener("mousedown", onDocClick)
		return () => document.removeEventListener("mousedown", onDocClick)
	}, [])

	function commit(val) {
		onChange(val)
		setOpen(false)
		setQuery("")
	}

	function onKeyDown(e) {
		if (!open && (e.key.length === 1 || e.key === "Backspace")) {
			setOpen(true)
			setTimeout(() => inputRef.current?.focus(), 0)
			return
		}
		if (!open) return

		if (e.key === "ArrowDown") {
			e.preventDefault()
			setHighlight((h) => Math.min(h + 1, filtered.length - 1))
			listRef.current?.children?.[Math.min(highlight + 1, filtered.length - 1)]?.scrollIntoView({
				block: "nearest"
			})
		} else if (e.key === "ArrowUp") {
			e.preventDefault()
			setHighlight((h) => Math.max(h - 1, 0))
			listRef.current?.children?.[Math.max(highlight - 1, 0)]?.scrollIntoView({ block: "nearest" })
		} else if (e.key === "Enter") {
			e.preventDefault()
			const item = filtered[highlight]
			if (item) commit(item.value)
		} else if (e.key === "Escape") {
			setOpen(false)
			setQuery("")
		}
	}

	return (
		<div ref={rootRef} className='relative' onKeyDown={onKeyDown}>
			<button
				type='button'
				disabled={disabled}
				className={`w/full border rounded-md px-3 py-2 text-left bg-white ${
					disabled ? "opacity-60 cursor-not-allowed" : "cursor-default"
				}`}
				onClick={() => {
					if (disabled) return
					setOpen((o) => !o)
					setTimeout(() => inputRef.current?.focus(), 0)
				}}
			>
				{selected ? (
					<span className='text-gray-900'>{selected.label}</span>
				) : (
					<span className='text-gray-500'>{placeholder}</span>
				)}
			</button>

			{open && !disabled && (
				<div className='absolute z-50 mt-1 w-full bg-white border rounded-md shadow-lg'>
					<div className='p-2 border-b'>
						<input
							ref={inputRef}
							className='w/full border rounded px-2 py-1'
							placeholder='Type to search…'
							value={query}
							onChange={(e) => {
								setQuery(e.target.value)
								setHighlight(0)
							}}
						/>
					</div>
					<ul ref={listRef} className='max-h-56 overflow-auto py-1' role='listbox'>
						{filtered.length === 0 ? (
							<li className='px-3 py-2 text-sm text-gray-500'>No results</li>
						) : (
							filtered.map((o, idx) => (
								<li
									key={o.value}
									role='option'
									aria-selected={o.value === value}
									className={`px-3 py-2 text-sm cursor-pointer ${
										idx === highlight ? "bg-gray-100" : ""
									}`}
									onMouseEnter={() => setHighlight(idx)}
									onClick={() => commit(o.value)}
								>
									{o.label}
								</li>
							))
						)}
					</ul>
				</div>
			)}
		</div>
	)
}

/* =================== Searchable MULTI Select (Customers) =================== */
function SearchableMultiSelect({ values, onChange, options, placeholder = "-- Choose --", disabled = false }) {
	const [open, setOpen] = useState(false)
	const [query, setQuery] = useState("")
	const rootRef = useRef(null)
	const inputRef = useRef(null)

	const selectedCount = values.length

	const filtered = useMemo(() => {
		const q = query.trim().toLowerCase()
		if (!q) return options.slice(0, 400)
		return options.filter((o) => o.search.includes(q)).slice(0, 400)
	}, [options, query])

	useEffect(() => {
		function onDocClick(e) {
			if (!rootRef.current) return
			if (!rootRef.current.contains(e.target)) {
				setOpen(false)
				setQuery("")
			}
		}
		document.addEventListener("mousedown", onDocClick)
		return () => document.removeEventListener("mousedown", onDocClick)
	}, [])

	function toggle(val) {
		if (values.includes(val)) {
			onChange(values.filter((v) => v !== val))
		} else {
			onChange([...values, val])
		}
	}
	function selectAllFiltered() {
		const toAdd = filtered.map((o) => o.value).filter((v) => !values.includes(v))
		if (toAdd.length) onChange([...values, ...toAdd])
	}
	function clearAll() {
		onChange([])
	}

	return (
		<div ref={rootRef} className='relative'>
			<button
				type='button'
				disabled={disabled}
				className={`w/full border rounded-md px-3 py-2 text-left bg-white ${
					disabled ? "opacity-60 cursor-not-allowed" : "cursor-default"
				}`}
				onClick={() => {
					if (disabled) return
					setOpen((o) => !o)
					setTimeout(() => inputRef.current?.focus(), 0)
				}}
			>
				{selectedCount > 0 ? (
					<span className='text-gray-900'>{selectedCount} selected</span>
				) : (
					<span className='text-gray-500'>{placeholder}</span>
				)}
			</button>

			{open && !disabled && (
				<div className='absolute z-50 mt-1 w-full bg-white border rounded-md shadow-lg'>
					<div className='p-2 border-b flex gap-2'>
						<input
							ref={inputRef}
							className='flex-1 border rounded px-2 py-1'
							placeholder='Type to search…'
							value={query}
							onChange={(e) => setQuery(e.target.value)}
						/>
						<button type='button' className='border text-xs rounded px-2' onClick={selectAllFiltered}>
							Select all
						</button>
						<button type='button' className='border text-xs rounded px-2' onClick={clearAll}>
							Clear
						</button>
					</div>
					<ul className='max-h-64 overflow-auto py-1'>
						{filtered.length === 0 ? (
							<li className='px-3 py-2 text-sm text-gray-500'>No results</li>
						) : (
							filtered.map((o) => (
								<li key={o.value} className='px-3 py-2 text-sm cursor-pointer hover:bg-gray-100'>
									<label className='inline-flex items-center gap-2'>
										<input
											type='checkbox'
											checked={values.includes(o.value)}
											onChange={() => toggle(o.value)}
										/>
										<span>{o.label}</span>
									</label>
								</li>
							))
						)}
					</ul>
				</div>
			)}
		</div>
	)
}

/* =================== Page =================== */

export default function AddOrder() {
	const query = useQuery()
	const navigate = useNavigate()

	// If opened with ?id=... we are in single-order view/edit mode
	const editingOrderId = query.get("id")
	const openInView = query.get("view") === "1"

	const [users, setUsers] = useState([])
	const [usersErr, setUsersErr] = useState("")

	const [dishes, setDishes] = useState([])
	const [dishesErr, setDishesErr] = useState("")

	const [meals, setMeals] = useState([])
	const [mealsErr, setMealsErr] = useState("")

	// MULTI select users (for NEW order only)
	const [selectedUserIds, setSelectedUserIds] = useState([])

	// Meal
	const [selectedMealId, setSelectedMealId] = useState("")

	// Date (string dd/mm/yy)
	const [forDateStr, setForDateStr] = useState(getTomorrowDDMMYY())
	const [dateErr, setDateErr] = useState("")

	const [qty, setQty] = useState({}) // { dishId: quantity }
	const [instructions, setInstructions] = useState("")
	const [submitting, setSubmitting] = useState(false)
	const [msg, setMsg] = useState("")

	// Existing order information (read-only user display)
	const [existingUserInfo, setExistingUserInfo] = useState(null)
	const [viewMode, setViewMode] = useState(!!editingOrderId && openInView)
	const [negativeBalanceState, setNegativeBalanceState] = useState()

	/* ---- Users ---- */
	useEffect(() => {
		;(async () => {
			setUsersErr("")
			try {
				const { data } = await api.get("/users")
				const arr = Array.isArray(data) ? data : data?.users || []
				const normalized = arr
					.map((u) => {
						const id = u._id || u.uuid || u.user_uuid || u.id
						const nameRaw =
							u.user_title ||
							u.title ||
							u.name ||
							u.full_name ||
							[u.first_name, u.last_name].filter(Boolean).join(" ") ||
							u.username ||
							""
						const name = String(nameRaw).trim()
						const mobile = String(u.mobile_number || u.mobile || u.phone || u.contact || "").trim()
						const wallet = toNum(u.wallet_balance ?? u.wallet ?? 0)
						const status = u.status
						return { id, name, mobile, wallet, status }
					})
					.filter((u) => !!u.id)
				setUsers(normalized)
			} catch (e) {
				setUsersErr(e?.response?.data?.error || e?.message || "Failed to load users")
				setUsers([])
			}
		})()
	}, [])

	// Build searchable options (title/name + mobile)
	const userOptions = useMemo(() => {
		return users.map((u) => {
			const hasName = !!u.name
			const walletPart = Number.isFinite(u.wallet) ? ` (Wallet ${money(u.wallet)})` : ""
			const label = hasName
				? u.mobile
					? `${u.name} — +91 ${u.mobile}${walletPart}`
					: `${u.name}${walletPart}`
				: u.mobile
				? `+91 ${u.mobile}${walletPart}`
				: `Unnamed${walletPart}`
			const search = `${(u.name || "").toLowerCase()} ${(u.mobile || "").toLowerCase()}`
			return { value: u.id, label, search, wallet: +u.wallet || 0 }
		})
	}, [users])

	/* ---- Dishes ---- */
	useEffect(() => {
		;(async () => {
			setDishesErr("")
			try {
				const { data } = await api.get("/dishes?status=1")
				const arr = Array.isArray(data) ? data : data?.dishes || []
				const normalized = arr.map((d) => ({
					id: d._id || d.uuid || d.dish_uuid || d.id,
					title: d.title || d.name || "Untitled",
					ingredients: d.ingredients || "",
					price: toNum(d.price),
					status: d.status
				}))
				setDishes(normalized.filter((d) => !!d.id))
			} catch (e) {
				setDishesErr(e?.response?.data?.error || e?.message || "Failed to load dishes")
				setDishes([])
			}
		})()
	}, [])

	/* ---- Meals ---- */
	useEffect(() => {
		;(async () => {
			setMealsErr("")
			async function fetchMeals(url) {
				const { data } = await api.get(url)
				const arr = Array.isArray(data) ? data : data?.meals || []
				return arr
					.map((m) => ({
						id: m._id || m.meal_uuid,
						title: m.meal_title || "Untitled",
						delivery: m.delivery_hours || "",
						status: m.status
					}))
					.filter((m) => !!m.id)
			}
			try {
				let list = await fetchMeals("/meals?status=1")
				if (!Array.isArray(list) || list.length === 0) list = await fetchMeals("/meals")
				setMeals(list)
				if (list.length === 0) setMealsErr("No meals found")
			} catch (e) {
				setMeals([])
				setMealsErr(e?.response?.data?.error || e?.message || "Failed to load meals")
			}
		})()
	}, [])

	/* ---- If editing: load that order ---- */
	useEffect(() => {
		if (!editingOrderId) return
		;(async () => {
			try {
				const { data } = await api.get(`/orders/${encodeURIComponent(editingOrderId)}`)
				// seed fields
				setSelectedMealId(data.meal_id || "")
				setForDateStr(isoToDDMMYY(data.for_date))
				setInstructions(data.instructions || "")
				// qty map
				const m = {}
				;(data.dish_details || []).forEach((l) => (m[l.dish_uuid] = l.quantity))
				setQty(m)
				// user info label
				const u = users.find((x) => x.id === data.user_uuid)
				setExistingUserInfo(u || { id: data.user_uuid, name: "", mobile: "" })
			} catch (e) {
				alert(e?.response?.data?.message || "Failed to load order")
			}
		})()
	}, [editingOrderId, users])

	/* ---- Derived ---- */
	const activeDishes = useMemo(() => dishes.filter((d) => Number(d.status) === 1 || d.status === true), [dishes])

	const lines = useMemo(
		() => activeDishes.map((d) => ({ ...d, quantity: toNum(qty[d.id] ?? 0) || 0 })).filter((l) => l.quantity > 0),
		[activeDishes, qty]
	)

	const total = useMemo(() => lines.reduce((s, l) => s + l.price * l.quantity, 0), [lines])

	/* ---- Date handlers ---- */
	function onDateChange(e) {
		const masked = maskDDMMYY(e.target.value)
		setForDateStr(masked)
		setDateErr("")
	}
	function getForDateISOorError() {
		const iso = ddmmyyToISTMidnightISO(forDateStr)
		if (!iso) return { error: "Enter date as dd/mm/yy" }
		return { iso }
	}

	/* ---- Helpers ---- */
	const userMap = useMemo(() => {
		const m = new Map()
		for (const u of users) m.set(u.id, u)
		return m
	}, [users])
	const formatUserLine = (uid, extraReason) => {
		const u = userMap.get(uid)
		const title = u?.name || "Unnamed"
		const mob = u?.mobile || ""
		let line = `${title} - ${mob}`
		if (extraReason && !/Current Wallet Balance/i.test(extraReason)) line += ` (${extraReason})`
		return line
	}

	/* ---- Submit (NEW multi) ---- */
	const submitOrder = async (allowedUsers) => {
		setMsg("")
		setDateErr("")

		if (selectedUserIds.length === 0) return setMsg("Please select at least one customer.")
		if (!selectedMealId) return setMsg("Please select a meal.")
		if (lines.length === 0) return setMsg("Add at least one dish (quantity > 0).")

		const { iso, error } = getForDateISOorError()
		if (error) {
			setDateErr(error)
			return
		}

		if (!allowedUsers) {
			const unsuffcientBalanceUsers = userOptions?.filter(
				(i) => selectedUserIds.includes(i.value) && +i.wallet < +total
			)

			if (unsuffcientBalanceUsers.length)
				return setNegativeBalanceState({
					active: true,
					users: unsuffcientBalanceUsers
				})
		}

		const customersList = userOptions?.filter(
			(i) => selectedUserIds.includes(i.value) && (+i.wallet >= +total || allowedUsers?.includes(i.value))
		)

		const dish_details = lines.map((l) => ({ dish_uuid: l.id, quantity: l.quantity }))
		const common = {
			dish_details,
			meal_id: selectedMealId,
			instructions: String(instructions || "").trim(),
			for_date: iso
		}

		setSubmitting(true)

		try {
			const calls = customersList.map(({ value }) =>
				api
					.post("/orders", { ...common, user_uuid: value })
					.then((res) => ({ ok: true, uid: value, res }))
					.catch((err) => ({
						ok: false,
						uid: value,
						errMsg:
							err?.response?.data?.message ||
							err?.response?.data?.error ||
							err?.message ||
							"Unknown error"
					}))
			)

			const results = await Promise.all(calls)
			const ok = results.filter((r) => r.ok)
			const bad = results.filter((r) => !r.ok)

			let summary = `${ok.length} order${ok.length === 1 ? "" : "s"} placed`
			if (bad.length > 0) {
				const insuff = bad.filter((b) => /Current Wallet Balance|Insufficient wallet/i.test(b.errMsg))
				const others = bad.filter((b) => !/Current Wallet Balance|Insufficient wallet/i.test(b.errMsg))

				if (insuff.length) {
					summary += `\n${insuff.length} order${
						insuff.length === 1 ? "" : "s"
					} unsuccessful due to insufficient balance:`
					for (const b of insuff) summary += `\n• ${formatUserLine(b.uid)}`
				}
				if (others.length) {
					summary += `\n${others.length} order${others.length === 1 ? "" : "s"} unsuccessful:`
					for (const b of others) summary += `\n• ${formatUserLine(b.uid, b.errMsg)}`
				}
			}
			alert(summary)
			setMsg(ok.length > 0 ? "Order(s) placed." : "No orders were placed.")
      if (negativeBalanceState) setNegativeBalanceState()
		} catch (e) {
			const m =
				e?.response?.data?.message || e?.response?.data?.error || e?.message || "Failed to place order(s)."
			setMsg(m)
			alert(m)
		} finally {
			setSubmitting(false)
		}
	}

	/* ---- Save edit (single) ---- */
	const saveEdit = async () => {
		setMsg("")
		setDateErr("")
		if (!editingOrderId) return
		if (!selectedMealId) return setMsg("Please select a meal.")
		if (lines.length === 0) return setMsg("Add at least one dish (quantity > 0).")

		const { iso, error } = getForDateISOorError()
		if (error) {
			setDateErr(error)
			return
		}

		const dish_details = lines.map((l) => ({ dish_uuid: l.id, quantity: l.quantity }))
		const payload = {
			dish_details,
			meal_id: selectedMealId,
			instructions: String(instructions || "").trim(),
			for_date: iso
		}

		setSubmitting(true)
		try {
			const { data } = await api.put(`/orders/${encodeURIComponent(editingOrderId)}`, payload)
			alert("Order updated.")
			// refresh screen from response and switch back to view mode
			setSelectedMealId(data.meal_id || "")
			setForDateStr(isoToDDMMYY(data.for_date))
			const m = {}
			;(data.dish_details || []).forEach((l) => (m[l.dish_uuid] = l.quantity))
			setQty(m)
			setInstructions(data.instructions || "")
			setViewMode(true)
		} catch (e) {
			const m = e?.response?.data?.message || e?.message || "Failed to update order."
			alert(m)
			setMsg(m)
		} finally {
			setSubmitting(false)
		}
	}

	const isEditingExisting = !!editingOrderId
	const [dishQuery, setDishQuery] = useState("")
	const filteredDishes = useMemo(() => {
		if (!dishQuery || !activeDishes?.[0]) return (activeDishes || [])
		return activeDishes?.filter(i =>
			[i.title, i.ingredients].join(" ").toLowerCase().includes(dishQuery.toLowerCase()) 
		)
	}, [dishQuery, activeDishes])

	return (
		<section className='space-y-4'>
			<div className='flex items-center justify-between'>
				<h1 className='text-2xl font-semibold'>{isEditingExisting ? "Order" : "Add Order"}</h1>
				{isEditingExisting && (
					<div className='flex gap-2'>
						{viewMode ? (
							<>
								<button className='px-3 py-2 rounded-md border' onClick={() => navigate(-1)}>
									Back
								</button>
								<button
									className='px-3 py-2 rounded-md bg-blue-600 text-white'
									onClick={() => setViewMode(false)}
								>
									Edit
								</button>
							</>
						) : (
							<>
								<button
									className='px-3 py-2 rounded-md border'
									onClick={() => setViewMode(true)}
									disabled={submitting}
								>
									Cancel
								</button>
								<button
									className='px-3 py-2 rounded-md bg-green-600 text-white'
									onClick={saveEdit}
									disabled={submitting}
								>
									{submitting ? "Saving…" : "Save"}
								</button>
							</>
						)}
					</div>
				)}
			</div>

			{/* Users */}
			{isEditingExisting ? (
				<div className='p-4 border rounded-md'>
					<label className='block text-sm font-medium mb-1'>User</label>
					<div className='px-3 py-2 border rounded-md bg-gray-50'>
						{existingUserInfo ? (
							<>
								<div>{existingUserInfo.name || "Unnamed"}</div>
								<div className='text-sm text-gray-600'>+91 {existingUserInfo.mobile || "—"}</div>
							</>
						) : (
							"Loading…"
						)}
					</div>
				</div>
			) : (
				<div className='p-4 border rounded-md'>
					<label className='block text-sm font-medium mb-1'>Select Users (multiple)</label>
					<SearchableMultiSelect
						values={selectedUserIds}
						onChange={setSelectedUserIds}
						options={userOptions}
						placeholder={usersErr ? "Failed to load users" : "-- Choose customer(s) --"}
						disabled={!!usersErr}
					/>
					{usersErr && <p className='text-xs text-red-600 mt-1'>Couldn’t load users: {usersErr}</p>}
				</div>
			)}

			{/* Meal */}
			<div className='p-4 border rounded-md'>
				<label className='block text-sm font-medium mb-1'>Select Meal</label>
				<SearchableSelect
					value={selectedMealId}
					onChange={(v) => !viewMode && setSelectedMealId(v)}
					options={meals.map((m) => ({
						value: m.id,
						label: `${m.title}${m.delivery ? ` (${m.delivery})` : ""}`,
						search: `${(m.title || "").toLowerCase()} ${(m.delivery || "").toLowerCase()}`
					}))}
					placeholder={mealsErr ? "Failed to load meals" : "-- Choose meal --"}
					disabled={!!mealsErr || (isEditingExisting && viewMode)}
				/>
				{mealsErr && <p className='text-xs text-red-600 mt-1'>{mealsErr}</p>}
			</div>

			{/* For Date */}
			<div className='p-4 border rounded-md'>
				<label className='block text-sm font-medium mb-1'>For Date (dd/mm/yy)</label>
				<input
					className='w-full border rounded-md px-3 py-2'
					placeholder='dd/mm/yy'
					value={forDateStr}
					onChange={(e) => !viewMode && onDateChange(e)}
					maxLength={8}
					disabled={isEditingExisting && viewMode}
				/>
				{dateErr && <p className='text-xs text-red-600 mt-1'>{dateErr}</p>}
				{!isEditingExisting && (
					<p className='text-xs text-gray-500 mt-1'>
						Default is tomorrow. Saved as midnight IST (00:00 IST → 18:30 UTC previous day).
					</p>
				)}
			</div>

			{/* Dishes */}
			<div className='p-4 border rounded-md'>
				<div className='flex items-center justify-between mb-3'>
					<h2 className='text-lg font-medium'>Active Dishes</h2>
					<span className='text-sm text-gray-600'>
						{dishesErr ? "Load failed" : `${activeDishes.length} found`}
					</span>
				</div>
				<input
					placeholder="Search..."
					className='border rounded px-3 py-2 mb-2 w-full'
					value={dishQuery}
					onChange={e => setDishQuery(e.target.value)}
					disabled={dishesErr || !activeDishes?.[0]}
				/>
				{dishesErr ? (
					<p className='text-sm text-red-600'>Couldn’t load dishes: {dishesErr}</p>
				) : filteredDishes.length === 0 ? (
					<p className='text-sm text-gray-500'>No active dishes.</p>
				) : (
					<div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
						{filteredDishes.map((d) => {
							const q = qty[d.id] ?? ""
							const ing = d.ingredients || "—"
							const ingShort = String(ing).length > 120 ? String(ing).slice(0, 117) + "…" : ing
							return (
								<div key={d.id} className='border rounded-md p-3 flex flex-col gap-2'>
									<div className='flex items-start justify-between gap-3'>
										<div>
											<div className='font-medium'>{d.title}</div>
											<div className='text-xs text-gray-600 mt-1'>{ingShort}</div>
										</div>
										<div className='text-sm font-medium'>{money(d.price)}</div>
									</div>
									<div className='mt-1 flex items-center gap-2'>
										<label className='text-sm'>Qty</label>
										<input
											type='number'
											min={0}
											className='w-24 border rounded px-2 py-1'
											value={q}
											onChange={(e) =>
												!viewMode &&
												setQty((prev) => ({
													...prev,
													[d.id]: Math.max(0, toNum(e.target.value))
												}))
											}
											disabled={isEditingExisting && viewMode}
										/>
									</div>
								</div>
							)
						})}
					</div>
				)}
			</div>

			{/* Instructions */}
			<div className='p-4 border rounded-md'>
				<label className='block text-sm font-medium mb-1'>Cooking Instructions (optional)</label>
				<textarea
					className='w-full border rounded-md px-3 py-2 h-24'
					placeholder='Any cooking instructions...'
					value={instructions}
					onChange={(e) => !viewMode && setInstructions(e.target.value)}
					disabled={isEditingExisting && viewMode}
				/>
			</div>

			{/* Summary + Submit / Save */}
			<div className='sticky bottom-0 bg-white p-4 border rounded-md flex items-center justify-between'>
				<div className='text-sm'>
					<div className='text-gray-600'>
						Items: <b>{lines.reduce((s, l) => s + l.quantity, 0)}</b>
					</div>
					<div className='text-base'>
						Total: <b>{money(total)}</b>
					</div>
				</div>

				{isEditingExisting ? (
					viewMode ? (
						<button
							className='px-4 py-2 rounded-md bg-blue-600 text-white'
							onClick={() => setViewMode(false)}
						>
							Edit
						</button>
					) : (
						<button
							className='px-4 py-2 rounded-md bg-green-600 text-white'
							onClick={saveEdit}
							disabled={submitting}
						>
							{submitting ? "Saving..." : "Save Changes"}
						</button>
					)
				) : (
					<button
						onClick={() => submitOrder()}
						disabled={submitting || selectedUserIds.length === 0 || !selectedMealId || lines.length === 0}
						className={`px-4 py-2 rounded-md text-white ${
							submitting || selectedUserIds.length === 0 || !selectedMealId || lines.length === 0
								? "bg-gray-400 cursor-not-allowed"
								: "bg-green-600 hover:bg-green-700"
						}`}
					>
						{submitting
							? "Submitting..."
							: `Submit ${selectedUserIds.length || ""} Order${selectedUserIds.length > 1 ? "s" : ""}`}
					</button>
				)}
			</div>

			{msg && (
				<p className={`text-sm ${msg.toLowerCase().includes("placed") ? "text-green-700" : "text-red-600"}`}>
					{msg}
				</p>
			)}

			{negativeBalanceState?.active && (
				<NegativeBalanceConfirmation
					orderAmount={total}
					options={negativeBalanceState?.users}
					onSubmit={submitOrder}
					close={() => setNegativeBalanceState()}
				/>
			)}
		</section>
	)
}

function NegativeBalanceConfirmation({ options, onSubmit, orderAmount, close }) {
	const [selection, setSelection] = useState([])
	const [query, setQuery] = useState("")
	const rootRef = useRef(null)
	const inputRef = useRef(null)

	const filtered = useMemo(() => {
		const q = query.trim().toLowerCase()
		if (!q) return options.slice(0, 400)
		return options.filter((o) => o.search.includes(q)).slice(0, 400)
	}, [options, query])

	useEffect(() => {
		function onDocClick(e) {
			if (!rootRef.current) return
			if (!rootRef.current.contains(e.target)) {
				setQuery("")
			}
		}
		document.addEventListener("mousedown", onDocClick)
		return () => document.removeEventListener("mousedown", onDocClick)
	}, [])

	return (
		<div className='z-50 fixed top-0 left-0 w-full h-full overflow-hidden bg-black/20 flex items-center justify-center'>
			<div className='w-[80vw] bg-white border rounded-md shadow-lg px-5 py-4'>
				<div className='mb-2.5'>
					<h6 className='text-lg font-bold'>Allow Negative Balance</h6>
					<span className='text-sm'>
						Order Amount: <b>{money(orderAmount)}</b>
					</span>
					<br />
					<span className='text-sm text-gray-600'>
						Below is a list of customers that have unsuffcient balance, on allowing them to place the order,
						the wallet will reflect negative balance.
					</span>
				</div>
				<div className='border-b flex gap-2 pb-2.5'>
					<input
						ref={inputRef}
						className='flex-1 border rounded px-2 py-1'
						placeholder='Type to search…'
						value={query}
						onChange={(e) => setQuery(e.target.value)}
					/>
					<button
						type='button'
						className='border text-xs rounded px-2'
						onClick={() => setSelection(options?.map((i) => i.value))}
					>
						Select all
					</button>
					<button type='button' className='border text-xs rounded px-2' onClick={() => setSelection([])}>
						Clear
					</button>
				</div>
				<ul className='max-h-64 overflow-auto py-1'>
					{filtered.length === 0 ? (
						<li className='px-3 py-2 text-sm text-gray-500'>No results</li>
					) : (
						filtered.map((o) => (
							<li key={o.value}>
								<label className='flex items-center gap-2 cursor-pointer px-3 py-2 text-sm hover:bg-gray-100'>
									<input
										type='checkbox'
										checked={selection.includes(o.value)}
										onChange={() =>
											setSelection((prev) =>
												prev.includes(o.value)
													? prev.filter((i) => i !== o.value)
													: prev.concat([o.value])
											)
										}
									/>
									<span>{o.label}</span>
								</label>
							</li>
						))
					)}
				</ul>
				<div className='flex gap-2'>
					<button
						type='button'
						className='bg-white font-semibold border text-sm rounded py-2 px-3 mt-2 cursor-pointer'
						onClick={close}
					>
						Cancel
					</button>
					<button
						type='button'
						className='bg-green-500 text-white font-semibold border text-sm rounded py-2 px-3 mt-2 cursor-pointer'
						onClick={() => onSubmit(selection)}
					>
						✓ Place Orders
					</button>
				</div>
			</div>
		</div>
	)
}
