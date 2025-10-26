import React, { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../../lib/axios";
import WalletStatementModal from "../../components/WalletStatementModal";

/* ----------------- helpers ----------------- */
function rupee(n) {
  const v = Number(n || 0);
  return `₹${v.toFixed(2)}`;
}
function fmt0(n) {
  const num = Number(n);
  return Number.isFinite(num) ? num.toFixed(0) : "0";
}
function StatusBadge({ status }) {
  const on = Number(status) === 1;
  return on ? (
    <span className="text-green-700 bg-green-100 px-2 py-0.5 rounded text-xs font-medium">
      Active
    </span>
  ) : (
    <span className="text-gray-700 bg-gray-100 px-2 py-0.5 rounded text-xs font-medium">
      Inactive
    </span>
  );
}
function idFrom(u, fallback) {
  return u?._id || u?.user_uuid || u?.uuid || fallback;
}
function titleFrom(u) {
  return (
    (u?.user_title && String(u.user_title).trim()) ||
    (u?.name && String(u.name).trim()) ||
    (u?.mobile_number && String(u.mobile_number).trim()) ||
    "Customer"
  );
}
function initials(name = "") {
  const parts = String(name)
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return "SB";
  return (parts[0][0] + (parts[1]?.[0] || "")).toUpperCase();
}
function normalizeNutrition(obj = {}) {
  const toNum = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };
  return {
    calories: toNum(obj.calories ?? obj.kcal ?? obj.energy),
    protein: toNum(obj.protein),
    fat: toNum(obj.fat ?? obj.fats),
    carbs: toNum(obj.carbs ?? obj.carbohydrates),
  };
}
function ymd(dateLike) {
  const d = new Date(dateLike);
  if (isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const dd = d.getDate();
  return `${y}-${String(m).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
}
function fromYmd(str) {
  if (!str) return null;
  const [y, m, d] = str.split("-").map((x) => parseInt(x, 10));
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d, 0, 0, 0, 0);
}
// "Thu, 21 Oct 25"
function prettyDateShort(dateLike) {
  const d = new Date(dateLike);
  if (isNaN(d.getTime())) return "";
  const weekday = d.toLocaleString("en-GB", { weekday: "short" });
  const day = d.toLocaleString("en-GB", { day: "2-digit" });
  const month = d.toLocaleString("en-GB", { month: "short" });
  const year2 = String(d.getFullYear()).slice(-2);
  return `${weekday}, ${day} ${month} ${year2}`;
}

/* ----------------- API helpers ----------------- */
async function loadUser(userIdFromRoute) {
  const res = await api.get(`/api/users/${userIdFromRoute}`);
  return res.data || res;
}
async function loadOrdersForUser(userUuid) {
  try {
    const { data } = await api.get("/api/orders", {
      params: { user_uuid: userUuid, limit: 500 },
    });
    const items = Array.isArray(data.items)
      ? data.items
      : Array.isArray(data)
      ? data
      : [];
    const filtered = items.filter(
      (o) => String(o.user_uuid || "") === String(userUuid || "")
    );
    return { items: filtered, total: filtered.length };
  } catch (err) {
    console.error("loadOrdersForUser error:", err);
    return { items: [], total: 0 };
  }
}
async function loadDishById(id) {
  try {
    const { data } = await api.get(`/api/dishes/${id}`);
    const dish = data || {};
    return {
      title: dish.title || dish.name || "Dish",
      nutrition: normalizeNutrition(dish.nutrition || dish),
    };
  } catch (err) {
    console.error("loadDishById error for", id, err);
    return {
      title: "Dish",
      nutrition: { calories: 0, protein: 0, fat: 0, carbs: 0 },
    };
  }
}

/* ----------------- component ----------------- */
export default function CustomerProfile() {
  const { id: routeId } = useParams();

  const [user, setUser] = useState(null);
  const [orders, setOrders] = useState([]);
  const [ordersTotal, setOrdersTotal] = useState(0);
  const [dishMap, setDishMap] = useState({});
  const [loading, setLoading] = useState(true);

  const [stmtOpen, setStmtOpen] = useState(false);

  const todayStr = ymd(new Date());
  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(todayStr);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);

        // user
        const u = await loadUser(routeId);
        if (!alive) return;
        setUser(u);

        const uuid = idFrom(u, routeId);

        // orders
        const { items, total } = await loadOrdersForUser(uuid);
        if (!alive) return;
        setOrders(items);
        setOrdersTotal(total);

        // dish ids
        const ids = new Set();
        for (const o of items) {
          if (Array.isArray(o.nutritions)) {
            for (const n of o.nutritions) {
              if (n?.dish_uuid) ids.add(String(n.dish_uuid));
            }
          }
          if (Array.isArray(o.dish_details)) {
            for (const d of o.dish_details) {
              if (d?.dish_uuid) ids.add(String(d.dish_uuid));
            }
          }
        }

        // load dish info
        const map = {};
        for (const did of ids) {
          // eslint-disable-next-line no-await-in-loop
          const info = await loadDishById(did);
          map[did] = info;
        }
        if (alive) setDishMap(map);
      } catch (err) {
        console.error(err);
        if (alive) {
          setUser(null);
          setOrders([]);
          setOrdersTotal(0);
          setDishMap({});
        }
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [routeId]);

  // filter orders by selected range
  const filteredOrders = useMemo(() => {
    const s = fromYmd(startDate);
    const e = fromYmd(endDate);
    if (!s || !e) return [];
    const endMs = e.getTime() + 24 * 60 * 60 * 1000 - 1;
    return orders.filter((o) => {
      const dRaw = o.for_date || o.delivery_date || o.created_at;
      if (!dRaw) return false;
      const d = new Date(dRaw);
      if (isNaN(d.getTime())) return false;
      const ms = d.getTime();
      return ms >= s.getTime() && ms <= endMs;
    });
  }, [orders, startDate, endDate]);

  // nutrition rows
  const { nutritionRows, nutritionTotals } = useMemo(() => {
    const rows = [];
    const totals = { protein: 0, fat: 0, carbs: 0, calories: 0 };

    for (const o of filteredOrders) {
      const dRaw = o.for_date || o.delivery_date || o.created_at;
      const dateStrPretty = prettyDateShort(dRaw);

      if (Array.isArray(o.nutritions) && o.nutritions.length > 0) {
        for (const line of o.nutritions) {
          const dishId = String(line.dish_uuid || "");
          if (!dishId) continue;
          const qty =
            Number(line.quantity ?? line.qty ?? line.count ?? 1) || 1;

          const dishTitle =
            (dishMap[dishId] && dishMap[dishId].title) || "Dish";

          const normTotal = normalizeNutrition(line.nutrition || {});
          const protein = normTotal.protein;
          const fat = normTotal.fat;
          const carbs = normTotal.carbs;
          const calories = normTotal.calories;

          rows.push({
            datePretty: dateStrPretty,
            dish: dishTitle,
            qty,
            protein,
            fat,
            carbs,
            calories,
          });

          totals.protein += protein;
          totals.fat += fat;
          totals.carbs += carbs;
          totals.calories += calories;
        }
        continue;
      }

      // fallback if no snapshot
      if (Array.isArray(o.dish_details)) {
        for (const line of o.dish_details) {
          const dishId = String(line.dish_uuid || "");
          if (!dishId) continue;

          const qty =
            Number(line.quantity ?? line.qty ?? line.count ?? 1) || 1;

          const info = dishMap[dishId] || {};
          const dishTitle = info.title || "Dish";
          const perServing = info.nutrition || {
            calories: 0,
            protein: 0,
            fat: 0,
            carbs: 0,
          };

          const protein = perServing.protein * qty;
          const fat = perServing.fat * qty;
          const carbs = perServing.carbs * qty;
          const calories = perServing.calories * qty;

          rows.push({
            datePretty: dateStrPretty,
            dish: dishTitle,
            qty,
            protein,
            fat,
            carbs,
            calories,
          });

          totals.protein += protein;
          totals.fat += fat;
          totals.carbs += carbs;
          totals.calories += calories;
        }
      }
    }

    return { nutritionRows: rows, nutritionTotals: totals };
  }, [filteredOrders, dishMap]);

  const wallet = Number(user?.wallet_balance) || 0;
  const finalUserId = idFrom(user, routeId);

  /* ----------------- UI ----------------- */
  return (
    <section className="max-w-xl mx-auto p-4 space-y-4 text-[#111] bg-white min-h-screen">
      {/* CUSTOMER HEADER CARD */}
      <div className="border rounded-lg p-4 flex flex-col gap-4 bg-white shadow-sm">
        {/* top row: avatar + info + Meals button */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-12 h-12 flex-shrink-0 rounded-full bg-green-600 text-white flex items-center justify-center text-lg font-semibold">
              {initials(titleFrom(user))}
            </div>
            <div className="min-w-0">
              <div className="text-lg font-semibold flex flex-wrap items-center gap-2">
                <span className="truncate">{titleFrom(user)}</span>
                <StatusBadge status={user?.status} />
              </div>

              <div className="text-sm text-gray-700">
                {user?.mobile_number || "—"}
              </div>

              <div className="text-[11px] text-gray-500 break-all">
                ID: {finalUserId}
              </div>
            </div>
          </div>

          {/* Meals button */}
          <Link
            to={`/meal/${finalUserId}`}
            className="px-3 py-2 rounded-lg border text-sm font-medium text-green-700 border-green-600 bg-green-50 hover:bg-green-100"
          >
            Meals
          </Link>
        </div>

        {/* wallet + orders in one row always, even on mobile */}
        <div className="grid grid-cols-2 gap-3">
          <div className="border rounded-lg p-3 bg-gray-50">
            <div className="text-[12px] text-gray-600">
              Wallet Balance
            </div>
            <div className="text-xl font-semibold leading-tight">
              {rupee(wallet)}
            </div>
            <button
              className="mt-2 text-[12px] px-2 py-1 rounded-md bg-green-600 text-white font-medium hover:bg-green-700"
              onClick={() => setStmtOpen(true)}
            >
              Statement
            </button>
          </div>

          <div className="border rounded-lg p-3 bg-gray-50 text-right">
            <div className="text-[12px] text-gray-600">
              Orders
            </div>
            <div className="text-xl font-semibold leading-tight">
              {ordersTotal}
            </div>
          </div>
        </div>
      </div>

      {/* NUTRITION CARD */}
      <div className="border rounded-lg bg-white shadow-sm">
        {/* Header row with title + dates in a single horizontal row */}
        <div className="border-b px-4 py-3 flex flex-col gap-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="text-sm font-semibold text-green-700">
              Nutritional Info
            </div>

            {/* date range inline on mobile */}
            <form
              className="flex items-center flex-wrap gap-2 text-sm"
              onSubmit={(e) => e.preventDefault()}
            >
              <label className="flex items-center gap-1 text-[12px] text-gray-600">
                <span>From</span>
                <input
                  type="date"
                  className="border rounded px-2 py-1 text-sm"
                  value={startDate}
                  max={endDate}
                  onChange={(e) => {
                    const v = e.target.value;
                    setStartDate(v);
                    if (v && endDate && v > endDate) {
                      setEndDate(v);
                    }
                  }}
                />
              </label>

              <label className="flex items-center gap-1 text-[12px] text-gray-600">
                <span>To</span>
                <input
                  type="date"
                  className="border rounded px-2 py-1 text-sm"
                  value={endDate}
                  min={startDate}
                  onChange={(e) => {
                    const v = e.target.value;
                    setEndDate(v);
                    if (v && startDate && v < startDate) {
                      setStartDate(v);
                    }
                  }}
                />
              </label>
            </form>
          </div>
        </div>

        {/* Table or empty state */}
        <div className="p-4">
          {loading ? (
            <div className="text-sm text-gray-600">
              Loading…
            </div>
          ) : nutritionRows.length === 0 ? (
            <div className="text-sm text-gray-700">
              No nutrition records in this date range.
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm border rounded-lg">
                  <thead>
                    <tr className="bg-gray-50 text-left">
                      <th className="px-3 py-2 border whitespace-nowrap">
                        Date
                      </th>
                      <th className="px-3 py-2 border">Dish</th>
                      <th className="px-3 py-2 border text-right whitespace-nowrap">
                        Protein (g)
                      </th>
                      <th className="px-3 py-2 border text-right whitespace-nowrap">
                        Fat (g)
                      </th>
                      <th className="px-3 py-2 border text-right whitespace-nowrap">
                        Carbs (g)
                      </th>
                      <th className="px-3 py-2 border text-right whitespace-nowrap">
                        kcal
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {nutritionRows.map((row, idx) => (
                      <tr key={idx}>
                        <td className="px-3 py-2 border align-top whitespace-nowrap text-[13px]">
                          {row.datePretty}
                        </td>
                        <td className="px-3 py-2 border align-top">
                          <div className="font-medium text-[14px] leading-snug whitespace-pre-line">
                            {row.dish}
                          </div>
                          <div className="text-[12px] text-gray-500">
                            Qty: {row.qty}
                          </div>
                        </td>
                        <td className="px-3 py-2 border text-right align-top text-[14px]">
                          {fmt0(row.protein)}
                        </td>
                        <td className="px-3 py-2 border text-right align-top text-[14px]">
                          {fmt0(row.fat)}
                        </td>
                        <td className="px-3 py-2 border text-right align-top text-[14px]">
                          {fmt0(row.carbs)}
                        </td>
                        <td className="px-3 py-2 border text-right align-top text-[14px]">
                          {fmt0(row.calories)}
                        </td>
                      </tr>
                    ))}

                    <tr className="bg-gray-50 font-semibold text-[14px]">
                      <td className="px-3 py-2 border">Total</td>
                      <td className="px-3 py-2 border">—</td>
                      <td className="px-3 py-2 border text-right">
                        {fmt0(nutritionTotals.protein)}
                      </td>
                      <td className="px-3 py-2 border text-right">
                        {fmt0(nutritionTotals.fat)}
                      </td>
                      <td className="px-3 py-2 border text-right">
                        {fmt0(nutritionTotals.carbs)}
                      </td>
                      <td className="px-3 py-2 border text-right">
                        {fmt0(nutritionTotals.calories)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="text-[11px] text-gray-500 mt-2 leading-snug">
                * Per-line nutrition values are already multiplied by
                quantity. Totals are summed across all orders in the
                selected date range.
              </div>
            </>
          )}
        </div>
      </div>

      {stmtOpen && finalUserId && (
        <WalletStatementModal
          open={stmtOpen}
          userId={finalUserId}
          userTitle={titleFrom(user)}
          onClose={() => setStmtOpen(false)}
        />
      )}
    </section>
  );
}
