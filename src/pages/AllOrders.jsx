// src/pages/AllOrders.jsx
import React, { useMemo, useState, useEffect } from "react";
import { api } from "../lib/axios";
import { toast } from "react-hot-toast";
import { useNavigate } from "react-router-dom";

const STATUS_LABELS = {
  0: "Upcoming",
  1: "Placed",
  2: "Completed",
  3: "Cancelled",
};
const ALL_STATUS_VALUES = ["0", "1", "2", "3"];

// map meal_id -> label (keep these ids in sync with your DB)
const MEAL_NAME_MAP = {
  "689f6fcc5d6f90aa8ab14251": "Breakfast",
  "68fc95b974853d663d125743": "Post Lunch",
};

// ---------- date utils ----------
function maskDDMMYY(v) {
  const d = (v || "").replace(/\D+/g, "").slice(0, 6);
  if (d.length === 0) return "";
  if (d.length <= 2) return d + (d.length === 2 ? "/" : "");
  if (d.length <= 4)
    return (
      d.slice(0, 2) + "/" + d.slice(2) + (d.length === 4 ? "/" : "")
    );
  return d.slice(0, 2) + "/" + d.slice(2, 4) + "/" + d.slice(4);
}

function toDDMMYYYY(masked) {
  if (!masked) return "";
  const m = masked.match(/^(\d{2})\/(\d{2})\/(\d{2})$/);
  if (!m) return "";
  const dd = parseInt(m[1], 10);
  const mm = parseInt(m[2], 10);
  const yy = parseInt(m[3], 10);
  if (mm < 1 || mm > 12) return "";
  const days = new Date(2000, mm, 0).getDate();
  if (dd < 1 || dd > days) return "";
  const yyyy = yy >= 70 ? 1900 + yy : 2000 + yy;
  return `${String(dd).padStart(2, "0")}${String(mm).padStart(
    2,
    "0"
  )}${String(yyyy)}`;
}

// "For Date" EXACTLY as stored (no +1)
function fmtForDateNoShift(v) {
  if (!v) return "-";
  try {
    const raw = v.$date || v;
    if (typeof raw !== "string") return "-";
    const justDate = raw.split("T")[0]; // "2025-10-27"
    if (!/^\d{4}-\d{2}-\d{2}$/.test(justDate)) return "-";
    const d = new Date(justDate + "T00:00:00Z");
    if (isNaN(d.getTime())) return "-";
    const dd = String(d.getUTCDate()).padStart(2, "0");
    const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
    const yyyy = d.getUTCFullYear();
    return `${dd}/${mm}/${yyyy}`;
  } catch {
    return "-";
  }
}

// placed date (created_at)
function fmtPlacedDate(v) {
  if (!v) return "-";
  try {
    const raw = v.$date || v;
    const d = new Date(raw);
    if (isNaN(d.getTime())) return "-";
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  } catch {
    return "-";
  }
}

// normalize possible ObjectId wrappers
function extractId(val) {
  // string already?
  if (typeof val === "string") return val;
  // Object with $oid?
  if (val && typeof val === "object") {
    if (val.$oid && typeof val.$oid === "string") return val.$oid;
    // maybe { _id: "..." }?
    if (val._id && typeof val._id === "string") return val._id;
    // or val._id.$oid?
    if (
      val._id &&
      typeof val._id === "object" &&
      typeof val._id.$oid === "string"
    ) {
      return val._id.$oid;
    }
  }
  return "";
}

// try to get meal_id from different shapes in the row
function getMealIdFromRow(orderRow) {
  if (!orderRow) return "";

  // direct
  if (orderRow.meal_id) return extractId(orderRow.meal_id);
  if (orderRow.mealId) return extractId(orderRow.mealId);
  if (orderRow.mealSlot) return extractId(orderRow.mealSlot);

  // nested object like orderRow.meal = { _id: "...", meal_title: "Breakfast" }
  if (orderRow.meal) {
    // first try _id
    const nestedId = extractId(orderRow.meal);
    if (nestedId) return nestedId;
    // then try meal._id or meal.meal_id fields
    if (orderRow.meal._id) return extractId(orderRow.meal._id);
    if (orderRow.meal.meal_id) return extractId(orderRow.meal.meal_id);
  }

  return "";
}

export default function AllOrders() {
  const navigate = useNavigate();

  // filters
  const [statuses, setStatuses] = useState(ALL_STATUS_VALUES.slice());
  const [mealFilter, setMealFilter] = useState("ALL");
  const [customerQ, setCustomerQ] = useState("");

  const [placedFromMask, setPlacedFromMask] = useState("");
  const [placedToMask, setPlacedToMask] = useState("");
  const [forFromMask, setForFromMask] = useState("");
  const [forToMask, setForToMask] = useState("");

  // data
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);

  // paging
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);

  // ui
  const [errors, setErrors] = useState({});
  const [hasSearched, setHasSearched] = useState(false);

  // cancel modal
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelOrder, setCancelOrder] = useState(null);
  const [refund, setRefund] = useState(true);
  const [reason, setReason] = useState("");

  // validate dd/mm/yy
  const validDates = useMemo(() => {
    const e = {};
    const list = [
      ["placedFrom", placedFromMask],
      ["placedTo", placedToMask],
      ["forFrom", forFromMask],
      ["forTo", forToMask],
    ];
    list.forEach(([k, v]) => {
      if (v && !/^\d{2}\/\d{2}\/\d{2}$/.test(v)) {
        e[k] = "Use dd/mm/yy";
      }
    });
    setErrors(e);
    return Object.keys(e).length === 0;
  }, [placedFromMask, placedToMask, forFromMask, forToMask]);

  function buildParams(customPage) {
    const params = {};

    // status filter
    if (statuses.length && statuses.length < ALL_STATUS_VALUES.length) {
      params.status = statuses;
    }

    // meal filter
    if (mealFilter !== "ALL") {
      // send both keys just in case
      params.meal_id = mealFilter;
      params.mealId = mealFilter;
    }

    // customer
    if (customerQ.trim()) {
      params.customer_q = customerQ.trim();
    }

    // placed date range
    const pf = toDDMMYYYY(placedFromMask);
    const pt = toDDMMYYYY(placedToMask);
    if (pf) params.placed_from = pf;
    if (pt) params.placed_to = pt;

    // for-date range
    const ff = toDDMMYYYY(forFromMask);
    const ft = toDDMMYYYY(forToMask);
    if (ff) params.for_from = ff;
    if (ft) params.for_to = ft;

    params.page = customPage ?? page;
    params.limit = limit;

    return params;
  }

  async function fetchOrders(customPage) {
    if (!validDates) {
      toast.error("Fix date format (dd/mm/yy).");
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.get("/admin/orders", {
        params: buildParams(customPage),
      });

      const d = data?.data || [];
      setRows(d);
      setTotal(Number(data?.total ?? d.length));
      setTotalAmount(Number(data?.total_amount ?? 0));
    } catch (err) {
      console.error(err);
      toast.error(
        err?.response?.data?.message || "Failed to fetch orders"
      );
    } finally {
      setLoading(false);
    }
  }

  // re-fetch when limit changes IF already searched
  useEffect(() => {
    if (hasSearched) fetchOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [limit]);

  // re-fetch when page changes IF already searched
  useEffect(() => {
    if (hasSearched) fetchOrders(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  // on mount, fill placedFrom/placedTo with today string
  useEffect(() => {
    const now = new Date();
    const dd = String(now.getDate()).padStart(2, "0");
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const yy = String(now.getFullYear()).slice(-2);
    const todayMask = `${dd}/${mm}/${yy}`;
    setPlacedFromMask(todayMask);
    setPlacedToMask(todayMask);
  }, []);

  function onReset() {
    const now = new Date();
    const dd = String(now.getDate()).padStart(2, "0");
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const yy = String(now.getFullYear()).slice(-2);
    const todayMask = `${dd}/${mm}/${yy}`;

    setStatuses(ALL_STATUS_VALUES.slice());
    setMealFilter("ALL");
    setCustomerQ("");

    setPlacedFromMask(todayMask);
    setPlacedToMask(todayMask);
    setForFromMask("");
    setForToMask("");

    setPage(1);
    setRows([]);
    setTotal(0);
    setTotalAmount(0);
    setHasSearched(false);
  }

  function rupee(n) {
    return `₹${Number(n || 0).toFixed(2)}`;
  }

  async function confirmCancel() {
    if (!cancelOrder) return;
    if (!reason.trim()) {
      toast.error("Please enter a cancellation reason.");
      return;
    }
    try {
      setLoading(true);
      const res = await api.post(
        `/admin/orders/${cancelOrder._id}/cancel`,
        {
          refund: !!refund,
          reason: reason.trim(),
        }
      );
      if (res.data && res.data.ok) {
        toast.success(
          refund
            ? "Order cancelled & refunded"
            : "Order cancelled"
        );
      } else {
        toast.error("Failed to cancel order");
      }

      setCancelOpen(false);
      setCancelOrder(null);
      setReason("");
      setRefund(true);

      if (hasSearched) {
        await fetchOrders();
      }
    } catch (err) {
      console.error(err);
      toast.error(
        err?.response?.data?.message || "Failed to cancel order"
      );
    } finally {
      setLoading(false);
    }
  }

  function onStatusChange(e) {
    const opts = Array.from(e.target.selectedOptions).map(
      (o) => o.value
    );
    setStatuses(opts.length ? opts : []);
  }

  // --- render meal cell w/ fallback ---
  function renderMealCell(orderRow) {
    // try multiple shapes to get the meal id
    const mid = getMealIdFromRow(orderRow);

    if (mid && MEAL_NAME_MAP[mid]) {
      return MEAL_NAME_MAP[mid];
    }

    // If backend maybe already sent the title string on row.meal.meal_title
    if (orderRow.meal && orderRow.meal.meal_title) {
      return orderRow.meal.meal_title;
    }

    // if we still don't know but there WAS something: show that raw id
    if (mid) return mid;

    return "-";
  }

  return (
    <section className="max-w-7xl mx-auto p-4">
      <header className="mb-4">
        <h1 className="text-2xl font-semibold">All Orders</h1>
        <p className="text-sm text-gray-600">
          Choose filters, then click Search. Meal filter supports
          Breakfast/Post Lunch etc. Placed Date defaults to today.
        </p>
      </header>

      {/* FILTERS */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end bg-white p-4 rounded-xl shadow-sm border">
        {/* Status multi-select */}
        <div className="md:col-span-3">
          <label className="block text-sm font-medium mb-1">
            Status (multi-select)
          </label>
          <select
            multiple
            value={statuses}
            onChange={onStatusChange}
            className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring min-h-[120px]"
          >
            <option value="0">Upcoming (0)</option>
            <option value="1">Placed (1)</option>
            <option value="2">Completed (2)</option>
            <option value="3">Cancelled (3)</option>
          </select>
          <p className="text-[11px] text-gray-500 mt-1">
            Ctrl/Cmd+Click for multi. By default all are selected.
          </p>
        </div>

        {/* Meal dropdown */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium mb-1">
            Meal
          </label>
          <select
            value={mealFilter}
            onChange={(e) => setMealFilter(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring min-h-[44px]"
          >
            <option value="ALL">ALL</option>
            {Object.entries(MEAL_NAME_MAP).map(
              ([mealId, mealName]) => (
                <option key={mealId} value={mealId}>
                  {mealName}
                </option>
              )
            )}
          </select>
          <p className="text-[11px] text-gray-500 mt-1">
            Filter by meal slot. Default ALL.
          </p>
        </div>

        {/* Customer */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium mb-1">
            Customer (mobile or name)
          </label>
          <input
            type="text"
            value={customerQ}
            onChange={(e) => setCustomerQ(e.target.value)}
            placeholder="ALL"
            className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring"
          />
          <p className="text-[11px] text-gray-500 mt-1">
            Leave empty for ALL.
          </p>
        </div>

        {/* Placed date range */}
        <div className="md:col-span-3">
          <label className="block text-sm font-medium mb-1">
            Placed Date (From / To)
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              inputMode="numeric"
              placeholder="dd/mm/yy"
              value={placedFromMask}
              onChange={(e) =>
                setPlacedFromMask(maskDDMMYY(e.target.value))
              }
              className="w-full border rounded-lg px-3 py-2"
            />
            <input
              type="text"
              inputMode="numeric"
              placeholder="dd/mm/yy"
              value={placedToMask}
              onChange={(e) =>
                setPlacedToMask(maskDDMMYY(e.target.value))
              }
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>
          <p className="text-[11px] text-red-600 mt-1">
            {errors.placedFrom || errors.placedTo}
          </p>
        </div>

        {/* For date range */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium mb-1">
            For Date (From / To)
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              inputMode="numeric"
              placeholder="dd/mm/yy"
              value={forFromMask}
              onChange={(e) =>
                setForFromMask(maskDDMMYY(e.target.value))
              }
              className="w-full border rounded-lg px-3 py-2"
            />
            <input
              type="text"
              inputMode="numeric"
              placeholder="dd/mm/yy"
              value={forToMask}
              onChange={(e) =>
                setForToMask(maskDDMMYY(e.target.value))
              }
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>
          <p className="text-[11px] text-red-600 mt-1">
            {errors.forFrom || errors.forTo}
          </p>
        </div>

        {/* Search / Reset */}
        <div className="md:col-span-12 flex gap-2 justify-end">
          <button
            onClick={() => {
              setPage(1);
              setHasSearched(true);
              fetchOrders(1);
            }}
            className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700"
          >
            Search
          </button>
          <button
            onClick={onReset}
            className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200"
          >
            Reset
          </button>
        </div>
      </div>

      {/* RESULTS TABLE */}
      <div className="mt-4 bg-white rounded-xl shadow-sm border">
        <div className="flex items-center justify-between p-3 border-b">
          <div className="text-sm text-gray-600">
            {loading
              ? "Loading..."
              : hasSearched
              ? `Showing ${rows.length}${
                  total ? ` of ${total}` : ""
                } | Total Amount: ${rupee(totalAmount)}`
              : "No results yet. Choose filters and Search."}
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Rows</label>
            <select
              value={limit}
              onChange={(e) =>
                setLimit(parseInt(e.target.value, 10))
              }
              className="border rounded-lg px-2 py-1"
            >
              {[10, 25, 50, 100].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left">
                <th className="px-3 py-2 border-b">Order #</th>
                <th className="px-3 py-2 border-b">Customer</th>
                <th className="px-3 py-2 border-b">Mobile</th>
                <th className="px-3 py-2 border-b">Meal</th>
                <th className="px-3 py-2 border-b">Status</th>
                <th className="px-3 py-2 border-b">Placed</th>
                <th className="px-3 py-2 border-b">For Date</th>
                <th className="px-3 py-2 border-b text-right">
                  Amount
                </th>
                <th className="px-3 py-2 border-b text-right">
                  Items
                </th>
                <th className="px-3 py-2 border-b">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(!hasSearched || rows.length === 0) && !loading ? (
                <tr>
                  <td
                    className="px-3 py-4 text-center text-gray-500"
                    colSpan={10}
                  >
                    {hasSearched
                      ? "No orders found for the selected filters."
                      : "No results yet. Choose filters and Search."}
                  </td>
                </tr>
              ) : (
                rows.map((o) => (
                  <tr
                    key={o._id || o.id}
                    className={`${
                      o.status === 3 ? "bg-red-50" : "bg-white"
                    } hover:bg-gray-50`}
                  >
                    <td className="px-3 py-2 border-b">
                      {o.order_number ||
                        o.number ||
                        (o._id || "").slice(-6)}
                    </td>

                    <td className="px-3 py-2 border-b">
                      {o.customer?.title ||
                        o.customer?.user_title ||
                        o.customer_name ||
                        "-"}
                    </td>

                    <td className="px-3 py-2 border-b">
                      {o.customer?.mobile ||
                        o.mobile ||
                        o.customer?.mobile_number ||
                        "-"}
                    </td>

                    <td className="px-3 py-2 border-b">
                      {renderMealCell(o)}
                    </td>

                    <td className="px-3 py-2 border-b">
                      {STATUS_LABELS[o.status] ??
                        String(o.status)}
                    </td>

                    <td className="px-3 py-2 border-b">
                      {fmtPlacedDate(
                        o.placed_date || o.created_at
                      )}
                    </td>

                    <td className="px-3 py-2 border-b">
                      {fmtForDateNoShift(o.for_date)}
                    </td>

                    <td className="px-3 py-2 border-b text-right">
                      {rupee(o.amount)}
                    </td>

                    <td className="px-3 py-2 border-b text-right">
                      {o.dish_count ??
                        o.items_count ??
                        o.dish_details?.length ??
                        "-"}
                    </td>

                    <td className="px-3 py-2 border-b">
                      <div className="flex items-center gap-3">
                        <button
                          className="text-green-700 hover:underline"
                          onClick={() =>
                            navigate(
                              `/addorder?id=${encodeURIComponent(
                                o._id
                              )}&view=1`
                            )
                          }
                        >
                          View
                        </button>

                        {o.status !== 3 && (
                          <button
                            className="text-red-700 hover:underline"
                            onClick={() => {
                              setCancelOrder(o);
                              setRefund(true);
                              setReason("");
                              setCancelOpen(true);
                            }}
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* pagination */}
        <div className="flex items-center justify-between p-3 border-t gap-2">
          <div className="text-sm text-gray-600">
            Page {page}{" "}
            {total
              ? `of ${Math.ceil(total / limit)}`
              : ""}
          </div>
          <div className="flex gap-2">
            <button
              className="px-3 py-1 rounded-lg border disabled:opacity-50"
              onClick={() =>
                setPage((p) => Math.max(1, p - 1))
              }
              disabled={page <= 1 || loading}
            >
              Prev
            </button>
            <button
              className="px-3 py-1 rounded-lg border disabled:opacity-50"
              onClick={() => setPage((p) => p + 1)}
              disabled={
                loading ||
                (total &&
                  page >= Math.ceil(total / limit))
              }
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Cancel modal */}
      {cancelOpen && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white w-full max-w-md rounded-xl shadow p-4 relative">
            <button
              className="absolute right-2 top-2 text-gray-500 hover:text-gray-800"
              onClick={() => setCancelOpen(false)}
              aria-label="Close"
            >
              ✕
            </button>

            <h3 className="text-lg font-semibold mb-2">
              Cancel Order
            </h3>
            <p className="text-sm text-gray-600 mb-3">
              Are you sure you want to cancel{" "}
              <span className="font-semibold">
                {cancelOrder?.order_number ||
                  (cancelOrder?._id || "").slice(-6)}
              </span>
              ?
            </p>

            <label className="block text-sm font-medium">
              Reason
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) =>
                setReason(e.target.value)
              }
              className="w-full border rounded-lg px-3 py-2 mt-1 mb-3"
              placeholder="Enter cancellation reason"
            />

            <label className="inline-flex items-center gap-2 mb-4">
              <input
                type="checkbox"
                checked={refund}
                onChange={(e) =>
                  setRefund(e.target.checked)
                }
              />
              <span className="text-sm">
                Refund amount to customer wallet
              </span>
            </label>

            <div className="flex justify-end gap-2">
              <button
                className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200"
                onClick={() => setCancelOpen(false)}
              >
                Close
              </button>
              <button
                className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-60"
                onClick={confirmCancel}
                disabled={loading}
              >
                Confirm Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
