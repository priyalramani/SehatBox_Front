import React, { useEffect, useMemo, useState } from "react";
import api from "../lib/api";

// Formatters
function fmtINR(n) {
  const v = Number(n) || 0;
  return `₹${v.toFixed(2)}`;
}
function fmtDate(d) {
  const dt = new Date(d);
  if (isNaN(dt)) return "-";
  return dt.toLocaleString();
}
function getSortTime(row) {
  const d =
    row.created_at ||
    row.createdAt ||
    row.transaction_date ||
    row.date ||
    row.tx_date ||
    row.time;
  const t = new Date(d).getTime();
  return Number.isFinite(t) ? t : 0;
}

// Figure out debit / credit.
// We keep your logic: blue for money going out, green for incoming.
function detectType(amount, remarksRaw) {
  const amt = Number(amount ?? 0);
  const remarks = String(remarksRaw || "").toLowerCase();

  const isDebitText = /deduct|deduce|debit|charge|used|consum|for order|purchase/.test(
    remarks
  );
  const isCreditText = /refund|cashback|added|recharge|credit|wallet balance added|top[-\s]?up/.test(
    remarks
  );

  if (amt < 0) return "debit";
  if (amt > 0 && isDebitText && !isCreditText) return "debit";
  if (amt > 0 && isCreditText) return "credit";

  return amt < 0 ? "debit" : "credit";
}

export default function WalletStatementModal({
  userId,
  userTitle,
  onClose,
  open,
}) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [rows, setRows] = useState([]);
  const [balance, setBalance] = useState(0);

  useEffect(() => {
    if (!open || !userId) return;
    (async () => {
      setLoading(true);
      setErr("");
      try {
        const { data } = await api.get(
          `/api/wallet/users/${encodeURIComponent(userId)}/statement`
        );
        const logs = Array.isArray(data?.logs) ? data.logs : [];
        setRows(logs);
        setBalance(Number(data?.balance) || 0);
      } catch (e) {
        setErr(
          e?.response?.data?.message ||
            e?.message ||
            "Failed to load statement"
        );
      } finally {
        setLoading(false);
      }
    })();
  }, [open, userId]);

  const sorted = useMemo(() => {
    const arr = Array.isArray(rows) ? [...rows] : [];
    arr.sort((a, b) => getSortTime(b) - getSortTime(a));
    return arr;
  }, [rows]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
      {/* Outer panel with max height and flex layout */}
      <div className="bg-white rounded-xl w-[min(900px,95vw)] max-h-[90vh] flex flex-col overflow-hidden shadow-xl">
        {/* Header */}
        <div className="px-4 py-3 border-b flex items-start justify-between">
          <div className="min-w-0">
            <div className="text-lg font-semibold">Wallet Statement</div>
            <div className="text-sm text-gray-600 truncate">
              {userTitle || userId}
            </div>
            <div className="text-sm text-gray-700 mt-1">
              Current Wallet Balance:{" "}
              <span className="font-semibold">
                {fmtINR(balance)}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded border hover:bg-gray-50 text-sm text-gray-700"
          >
            Close
          </button>
        </div>

        {/* Scrollable content area */}
        <div className="flex-1 overflow-auto p-4">
          {err && (
            <div className="text-red-600 text-sm mb-3">{err}</div>
          )}

          <div className="border rounded-lg overflow-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-100 sticky top-0">
                <tr>
                  <th className="text-left px-3 py-2 border-b">
                    Trans. Date
                  </th>
                  <th className="text-left px-3 py-2 border-b">
                    Amount
                  </th>
                  <th className="text-left px-3 py-2 border-b">
                    Remarks
                  </th>
                  <th className="text-left px-3 py-2 border-b">
                    Balance After
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td
                      className="px-3 py-3 text-center"
                      colSpan={4}
                    >
                      Loading…
                    </td>
                  </tr>
                ) : sorted.length === 0 ? (
                  <tr>
                    <td
                      className="px-3 py-3 text-gray-500 text-center"
                      colSpan={4}
                    >
                      No transactions found.
                    </td>
                  </tr>
                ) : (
                  sorted.map((r, idx) => {
                    const transDate =
                      r.transaction_date ||
                      r.tx_date ||
                      r.date ||
                      r.time ||
                      r.created_at;

                    const amtNum = Number(
                      r.transaction_amount ?? r.amount ?? 0
                    );
                    const remarks =
                      r.remarks ||
                      r.remark ||
                      r.description ||
                      r.note ||
                      "";

                    const kind = detectType(amtNum, remarks); // "debit" | "credit"
                    const absAmt = Math.abs(amtNum);

                    const narration =
                      r.narration || r.note2 || "";

                    const balanceAfter =
                      r.balance_after_update ??
                      r.balance_after ??
                      r.running_balance ??
                      r.balance ??
                      null;

                    return (
                      <tr
                        key={idx}
                        className="align-top odd:bg-white even:bg-gray-50"
                      >
                        <td className="px-3 py-2 border-b">
                          {fmtDate(transDate)}
                        </td>

                        {/* amount */}
                        <td
                          className={`px-3 py-2 border-b font-medium ${
                            kind === "debit"
                              ? "text-blue-600"
                              : "text-green-600"
                          }`}
                        >
                          {kind === "debit"
                            ? `- ${fmtINR(absAmt)}`
                            : fmtINR(absAmt)}
                        </td>

                        <td className="px-3 py-2 border-b">
                          <div>
                            {remarks ||
                              (kind === "debit"
                                ? "Deduction"
                                : "Wallet Balance Added")}
                          </div>
                          {narration && (
                            <div className="text-xs italic text-gray-600 mt-1">
                              {narration}
                            </div>
                          )}
                        </td>

                        <td className="px-3 py-2 border-b">
                          {balanceAfter != null
                            ? fmtINR(balanceAfter)
                            : "-"}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
        {/* end scrollable */}
      </div>
    </div>
  );
}
