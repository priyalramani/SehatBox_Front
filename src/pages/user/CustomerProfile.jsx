// src/pages/user/CustomerProfile.jsx

import { useEffect, useState, useMemo } from "react";
import { useParams, useLocation, useNavigate, Link } from "react-router-dom";
import {
  customerApi,
  getCustomerToken,
  getCustomerUuid,
  setCustomerSession,
} from "../../lib/customerApi";
import WalletStatementModal from "../../components/WalletStatementModal";

// helper: read query params like ?key=...
function useQuery() {
  return new URLSearchParams(useLocation().search);
}

// get admin token (used to detect if viewer is staff/admin)
function getAdminToken() {
  return (
    localStorage.getItem("adminToken") ||
    localStorage.getItem("admin_token") ||
    ""
  );
}

// format helpers
function fmtNum(n, digits = 2) {
  const num = Number(n || 0);
  if (Number.isNaN(num)) return "0";
  return num.toFixed(digits);
}

// build initials for avatar
function getInitials(name, mobile) {
  if (name && name.trim().length > 0) {
    const parts = name.trim().split(" ");
    if (parts.length === 1) {
      return parts[0].slice(0, 2).toUpperCase();
    }
    return (
      (parts[0][0] || "") + (parts[1][0] || "")
    ).toUpperCase();
  }
  // fallback: last 2 digits of phone
  if (mobile) {
    const digits = String(mobile).replace(/[^\d]/g, "");
    return digits.slice(-2);
  }
  return "U";
}

// convert a backend status number to UI chip
function StatusChip({ statusNum }) {
  const active = Number(statusNum) === 1;
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
  );
}

export default function CustomerProfile() {
  const { id: routeUuid } = useParams(); // /customer/:id
  const query = useQuery();
  const navigate = useNavigate();

  // session/admin state
  const [bootstrapError, setBootstrapError] = useState("");
  const [loading, setLoading] = useState(true);
  const [isAdminViewer, setIsAdminViewer] = useState(false);

  // profile info
  const [profile, setProfile] = useState(null);

  // nutrition info
  const [nutritionRows, setNutritionRows] = useState([]);
  const [grandTotals, setGrandTotals] = useState({
    protein_g: 0,
    fat_g: 0,
    carbs_g: 0,
    kcal: 0,
  });

  // wallet statement modal
  const [stmtOpen, setStmtOpen] = useState(false);

  // date range (default today)
  const todayISO = new Date().toISOString().slice(0, 10);
  const [fromDate, setFromDate] = useState(todayISO);
  const [toDate, setToDate] = useState(todayISO);

  // detect if the viewer is admin
  useEffect(() => {
    const token = getAdminToken();
    if (token) {
      setIsAdminViewer(true);
    } else {
      setIsAdminViewer(false);
    }
  }, []);

  // 1) FIRST TIME VISIT FLOW (magic link onboarding)
  // If URL has ?key=..., redeem it by calling /api/public/bootstrap-session
  // This creates/stores a customer session token server-side and returns us
  // { customer_token, user_uuid }. We save that in localStorage.
  // Then we strip ?key=... from the URL so it doesn't leak.
  useEffect(() => {
    const maybeBootstrap = async () => {
      const urlKey = query.get("key");
      if (!urlKey) return; // nothing to redeem

      try {
        const body = {
          user_uuid: routeUuid,
          key: urlKey,
        };

        // We explicitly pass empty headers to avoid sending any stale Authorization.
        const { data } = await customerApi.post(
          "/public/bootstrap-session",
          body,
          { headers: {} }
        );

        // data = { customer_token, user_uuid, expires_at }
        setCustomerSession(data.customer_token, data.user_uuid);

        // remove ?key=... from URL to avoid leaking link if user screenshots
        const cleanPath = `/customer/${data.user_uuid}`;
        window.history.replaceState({}, "", cleanPath);
      } catch (err) {
        console.error("bootstrap-session failed", err);
        setBootstrapError(
          err?.response?.data?.error ||
            "Your secure link expired. Please request a new link from Sehat Box."
        );
      }
    };

    maybeBootstrap();
  }, [routeUuid, query]);

  // 2) MAIN FETCH: profile + nutrition
  const fetchAll = async () => {
    setLoading(true);
    setBootstrapError("");

    try {
      const token = getCustomerToken();
      const storedUuid = getCustomerUuid();

      // if no session token at all → can't load secure data
      if (!token) {
        setLoading(false);
        return;
      }

      // If we DO have a stored uuid + token, but the current URL uuid is different,
      // redirect to the correct one (prevents customer A from typing /customer/B).
      if (storedUuid && storedUuid !== routeUuid) {
        navigate(`/customer/${storedUuid}`, { replace: true });
        setLoading(false);
        return;
      }

      // fetch profile from /customer-api/me
      const meRes = await customerApi.get("/customer-api/me");
      const me = meRes.data || null;
      setProfile(me);

      // fetch nutrition from /customer-api/nutrition
      const nutRes = await customerApi.get("/customer-api/nutrition", {
        params: {
          from: fromDate,
          to: toDate,
        },
      });

      const nutData = nutRes.data || {};
      setNutritionRows(Array.isArray(nutData.rows) ? nutData.rows : []);
      setGrandTotals(
        nutData.grand_totals || {
          protein_g: 0,
          fat_g: 0,
          carbs_g: 0,
          kcal: 0,
        }
      );
    } catch (err) {
      console.error("fetchAll() error", err);
      setBootstrapError(
        err?.response?.data?.error ||
          "Session expired. Please request a new link."
      );
    } finally {
      setLoading(false);
    }
  };

  // run fetchAll on mount (if we already have a session in localStorage)
  useEffect(() => {
    if (getCustomerToken() || getCustomerUuid()) {
      fetchAll();
    } else {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeUuid]);

  // derived display values
  const walletDisplay = useMemo(() => {
    if (!profile) return "₹0.00";
    const bal = Number(profile.wallet_balance || 0);
    return `₹${bal.toFixed(2)}`;
  }, [profile]);

  const ordersCount = profile?.orders_count ?? 0;
  const nameDisplay = profile?.name || "Customer";
  const mobileDisplay = profile?.mobile_number || "";
  const statusNum = profile?.status;
  const uuidToShow = routeUuid; // as in URL

  const initials = useMemo(
    () => getInitials(nameDisplay, mobileDisplay),
    [nameDisplay, mobileDisplay]
  );

  // Render states
  if (loading) {
    return (
      <div className="p-4 text-gray-600 text-sm">Loading your profile…</div>
    );
  }

  if (bootstrapError && !getCustomerToken()) {
    return (
      <div className="p-4 max-w-md mx-auto text-center space-y-4">
        <div className="text-lg font-semibold text-red-600">
          {bootstrapError}
        </div>
        <div className="text-sm text-gray-600">
          Please request a fresh secure link from Sehat Box.
        </div>
      </div>
    );
  }

  if (!getCustomerToken() && !profile) {
    return (
      <div className="p-4 max-w-md mx-auto text-center space-y-4">
        <div className="text-lg font-semibold text-gray-800">
          Secure link required
        </div>
        <div className="text-sm text-gray-600">
          Please request your personal access link from Sehat Box.
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6 max-w-2xl mx-auto text-gray-900">
      {/* HEADER CARD */}
      <div className="rounded-lg border p-4 bg-white shadow-sm">
        <div className="flex items-start gap-3">
          {/* Avatar w/ initials */}
          <div className="w-12 h-12 rounded-full bg-green-600 text-white flex items-center justify-center text-lg font-semibold">
            {initials}
          </div>

          {/* Info block */}
          <div className="flex-1 flex flex-col gap-2">
            <div className="flex flex-col leading-tight">
              <div className="text-lg font-semibold text-gray-900">
                {nameDisplay}
              </div>
              {mobileDisplay && (
                <div className="text-sm text-gray-600">
                  +91 {mobileDisplay}
                </div>
              )}
            </div>

            <div className="text-[11px] text-gray-500 break-all">
              ID: {uuidToShow}
            </div>

            {/* quick actions row: Meals, Wallet Statement (admin only) */}
            <div className="flex flex-wrap gap-2 text-xs">
              {/* Meals button */}
              <Link
                to={`/meal/${uuidToShow}`}
                className="px-2 py-1 rounded border bg-white hover:bg-gray-50"
              >
                Meals
              </Link>

              {/* Wallet Statement button:
                 - if admin logged in -> open modal
                 - else -> show fallback alert
              */}
              <button
                className="px-2 py-1 rounded border bg-white hover:bg-gray-50"
                onClick={() => {
                  if (isAdminViewer) {
                    setStmtOpen(true);
                  } else {
                    alert(
                      "Please contact Sehat Box to view your full wallet statement."
                    );
                  }
                }}
              >
                Wallet Statement
              </button>
            </div>
          </div>

          {/* Status / Wallet / Orders summary */}
          <div className="flex flex-col gap-3 text-right text-sm">
            <div>
              <div className="text-gray-500 text-[11px] uppercase">
                Status
              </div>
              <div className="flex justify-end">
                <StatusChip statusNum={statusNum} />
              </div>
            </div>

            <div>
              <div className="text-gray-500 text-[11px] uppercase">
                Wallet
              </div>
              <div className="text-base font-medium">{walletDisplay}</div>
            </div>

            <div>
              <div className="text-gray-500 text-[11px] uppercase">
                Orders
              </div>
              <div className="text-base font-medium">{ordersCount}</div>
            </div>
          </div>
        </div>
      </div>

      {/* DATE FILTER + NUTRITION */}
      <div className="rounded-lg border p-4 bg-white shadow-sm space-y-4">
        {/* Filters */}
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-[11px] text-gray-500 uppercase mb-1">
              From
            </label>
            <input
              className="border rounded px-3 py-2 text-sm"
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-[11px] text-gray-500 uppercase mb-1">
              To
            </label>
            <input
              className="border rounded px-3 py-2 text-sm"
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />
          </div>
          <div>
            <button
              className="border rounded px-3 py-2 text-sm bg-black text-white"
              onClick={fetchAll}
            >
              Refresh
            </button>
          </div>
        </div>

        {/* Nutrition Data */}
        {nutritionRows.length === 0 ? (
          <div className="text-sm text-gray-600">
            No nutrition records in this date range.
          </div>
        ) : (
          <div className="space-y-4">
            {nutritionRows.map((day, i) => (
              <div
                key={i}
                className="border rounded p-3 bg-gray-50 space-y-2"
              >
                {/* Day header */}
                <div className="font-medium text-gray-800">{day.date}</div>

                {/* Meal items */}
                <div className="text-sm text-gray-700 space-y-2">
                  {Array.isArray(day.items) &&
                    day.items.map((item, j) => (
                      <div
                        key={j}
                        className="flex items-start justify-between"
                      >
                        <div className="flex-1 pr-2">
                          <div className="font-medium">
                            {item.dish_name || "Meal Item"}
                          </div>
                          <div className="text-xs text-gray-500">
                            Qty: {item.qty ?? 1}
                          </div>
                        </div>
                        <div className="text-right text-[11px] text-gray-600 leading-5">
                          <div>
                            P {fmtNum(item.protein_g, 0)}g / F{" "}
                            {fmtNum(item.fat_g, 0)}g
                          </div>
                          <div>
                            C {fmtNum(item.carbs_g, 0)}g /{" "}
                            {fmtNum(item.kcal, 0)} kcal
                          </div>
                        </div>
                      </div>
                    ))}
                </div>

                {/* Daily totals */}
                {day.daily_totals && (
                  <div className="text-[11px] text-gray-800 bg-white rounded border p-2 flex flex-wrap gap-4 justify-between">
                    <div>
                      <div className="font-semibold text-gray-700">
                        Daily Totals
                      </div>
                      <div>
                        Protein: {fmtNum(day.daily_totals.protein_g, 0)} g
                      </div>
                      <div>
                        Fat: {fmtNum(day.daily_totals.fat_g, 0)} g
                      </div>
                      <div>
                        Carbs: {fmtNum(day.daily_totals.carbs_g, 0)} g
                      </div>
                    </div>
                    <div className="text-right">
                      <div>Calories</div>
                      <div className="font-semibold text-gray-900">
                        {fmtNum(day.daily_totals.kcal, 0)} kcal
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Grand totals */}
            <div className="border rounded p-3 bg-white text-sm text-gray-800 flex flex-wrap gap-6 justify-between">
              <div>
                <div className="text-gray-500 text-[11px] uppercase">
                  Total Protein
                </div>
                <div className="font-medium">
                  {fmtNum(grandTotals.protein_g, 0)} g
                </div>
              </div>

              <div>
                <div className="text-gray-500 text-[11px] uppercase">
                  Total Fat
                </div>
                <div className="font-medium">
                  {fmtNum(grandTotals.fat_g, 0)} g
                </div>
              </div>

              <div>
                <div className="text-gray-500 text-[11px] uppercase">
                  Total Carbs
                </div>
                <div className="font-medium">
                  {fmtNum(grandTotals.carbs_g, 0)} g
                </div>
              </div>

              <div>
                <div className="text-gray-500 text-[11px] uppercase">
                  Total Calories
                </div>
                <div className="font-medium">
                  {fmtNum(grandTotals.kcal, 0)} kcal
                </div>
              </div>
            </div>
          </div>
        )}

        {bootstrapError && (
          <div className="text-center text-xs text-red-600">
            {bootstrapError}
          </div>
        )}
      </div>

      {/* Wallet Statement Modal (ADMIN-ONLY live data) */}
      {isAdminViewer && profile?.user_uuid && (
        <WalletStatementModal
          open={stmtOpen}
          userId={profile.user_uuid || uuidToShow}
          userTitle={profile.name || profile.mobile_number || uuidToShow}
          onClose={() => setStmtOpen(false)}
        />
      )}
    </div>
  );
}
