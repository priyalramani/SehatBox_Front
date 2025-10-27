// src/pages/Users.jsx
import React, { useEffect, useMemo, useState } from "react";
import { api } from "../lib/axios";
import WalletStatementModal from "../components/WalletStatementModal";

/* -------------------------------- helpers -------------------------------- */

const money = (n) =>
  typeof n === "number" && !Number.isNaN(n) ? `₹${n.toFixed(2)}` : "₹0.00";

// 0: admin, 1: customer, 2: delivery
const TYPE_OPTS = [
  { label: "customer", value: 1 },
  { label: "admin", value: 0 },
  { label: "delivery", value: 2 },
];

const STATUS_OPTS = [
  { label: "Active (1)", value: 1 },
  { label: "Inactive (0)", value: 0 },
];

const GENDER_OPTS = [
  { label: "Unknown", value: "unknown" },
  { label: "Male", value: "male" },
  { label: "Female", value: "female" },
  { label: "Others", value: "others" },
];

// Dynamic origin for building profile links (works on localhost and prod)
const getOrigin = () =>
  (typeof window !== "undefined" && window.location && window.location.origin) ||
  "";

/* --------------------------------- page ---------------------------------- */

export default function Users() {
  const [list, setList] = useState([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [balModalOpen, setBalModalOpen] = useState(false);
  const [editing, setEditing] = useState(null); // user doc or null
  const [balanceUser, setBalanceUser] = useState(null);
  const [err, setErr] = useState("");

  // statement modal state
  const [stmtOpen, setStmtOpen] = useState(false);
  const [stmtUser, setStmtUser] = useState({ id: "", title: "" });

  // Prevent background scroll when a modal is open
  useEffect(() => {
    const anyOpen = modalOpen || balModalOpen || stmtOpen;
    const prev = document.body.style.overflow;
    document.body.style.overflow = anyOpen ? "hidden" : prev || "";
    return () => {
      document.body.style.overflow = prev || "";
    };
  }, [modalOpen, balModalOpen, stmtOpen]);

  const fetchUsers = async () => {
    setLoading(true);
    setErr("");
    try {
      // /api/users is admin-protected. api already attaches admin auth header.
      const { data } = await api.get("/api/users", {
        params: q ? { q } : undefined,
      });
      const arr = Array.isArray(data) ? data : data?.users || [];
      setList(arr);
    } catch (e) {
      setErr(e?.response?.data?.error || e?.message || "Failed to load users");
      setList([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // local filter (mobile, alt mobile, title)
  const filtered = useMemo(() => {
    if (!q) return list;
    const s = q.trim().toLowerCase();
    return list.filter((u) => {
      const mob = String(u.mobile_number || "").toLowerCase();
      const alt = String(u.alternate_mobile_number || "").toLowerCase();
      const title = String(u.user_title || "").toLowerCase();
      return mob.includes(s) || alt.includes(s) || title.includes(s);
    });
  }, [list, q]);

  const onNew = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const onEdit = (u) => {
    setEditing(u);
    setModalOpen(true);
  };

  const onAddBalance = (u) => {
    setBalanceUser(u);
    setBalModalOpen(true);
  };

  const onStatement = (u) => {
    const id = u._id || u.uuid || u.user_uuid;
    setStmtUser({ id, title: u.user_title || u.name || u.mobile_number || id });
    setStmtOpen(true);
  };

  const onSaved = () => {
    setModalOpen(false);
    fetchUsers();
  };

  const onBalanceSaved = () => {
    setBalModalOpen(false);
    fetchUsers();
  };

  // Build a base profile URL without token
  const profileUrl = (uid) => `${getOrigin()}/customer/${uid}`;

  // NEW: call backend to generate a magic link WITH key, copy/share it
  const copyMagicLink = async (uid) => {
    try {
      // ask backend to generate 1-time-ish link
      const { data } = await api.post("/api/admin/generate-magic-link", {
        user_uuid: uid,
      });

      const linkToShare = data.magic_link || profileUrl(uid);

      try {
        // prefer native share on mobile
        if (navigator.share) {
          await navigator.share({
            title: "Your Sehat Box link",
            url: linkToShare,
          });
          return;
        }
      } catch {
        /* ignore share fail and fall back to clipboard */
      }

      try {
        await navigator.clipboard.writeText(linkToShare);
        alert("Magic link copied!");
      } catch {
        alert(linkToShare);
      }
    } catch (err) {
      console.error("copyMagicLink error", err);
      alert(
        err?.response?.data?.error ||
          "Failed to generate magic link. Check if you're logged in as admin."
      );
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Users</h1>
        <button
          onClick={onNew}
          className="px-3 py-2 rounded-md bg-black text-white"
        >
          + New User
        </button>
      </div>

      <div className="flex gap-2">
        <input
          className="border rounded-md px-3 py-2 w-full"
          placeholder="Search by mobile, alt mobile or title…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button
          onClick={fetchUsers}
          className="px-3 py-2 rounded-md border bg-white"
        >
          Search
        </button>
      </div>

      {err && <div className="text-sm text-red-600">{err}</div>}

      <div className="overflow-x-auto">
        <table className="min-w-full border rounded-md">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 border text-left">S.No.</th>
              <th className="px-3 py-2 border text-left">Mobile No.</th>
              <th className="px-3 py-2 border text-left">Alt. Mobile</th>
              <th className="px-3 py-2 border text-left">Title</th>
              <th className="px-3 py-2 border text-left">Gender</th>
              <th className="px-3 py-2 border text-left">Wallet</th>
              <th className="px-3 py-2 border text-left">Status</th>
              <th className="px-3 py-2 border text-left">Type</th>
              <th className="px-3 py-2 border text-left">Created at</th>
              <th className="px-3 py-2 border text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="px-3 py-2 border" colSpan={11}>
                  Loading…
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td className="px-3 py-2 border" colSpan={11}>
                  No users found.
                </td>
              </tr>
            ) : (
              filtered.map((u, i) => {
                const status = Number(u.status);
                const type = Number(u.type);
                const created =
                  u.created_at || u.createdAt || u.created_on || null;
                const createdText = created
                  ? new Date(created).toLocaleString()
                  : "—";
                const wallet =
                  typeof u.wallet_balance === "number"
                    ? u.wallet_balance
                    : Number(u.wallet_balance) || 0;
                const uid = u._id || u.user_uuid || u.uuid;

                return (
                  <tr key={uid || i}>
                    <td className="px-3 py-2 border">{i + 1}</td>
                    <td className="px-3 py-2 border">
                      {u.mobile_number || "—"}
                    </td>
                    <td className="px-3 py-2 border">
                      {u.alternate_mobile_number || "—"}
                    </td>
                    <td className="px-3 py-2 border">{u.user_title || "—"}</td>
                    <td className="px-3 py-2 border">{u.gender || "unknown"}</td>
                    <td className="px-3 py-2 border">
                      {type === 2 ? "—" : money(wallet)}
                    </td>
                    <td className="px-3 py-2 border">
                      {status === 1 ? (
                        <span className="text-green-700 bg-green-100 px-2 py-1 rounded">
                          Active
                        </span>
                      ) : (
                        <span className="text-gray-700 bg-gray-100 px-2 py-1 rounded">
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 border">
                      {type === 0
                        ? "admin"
                        : type === 2
                        ? "delivery"
                        : "customer"}
                    </td>
                    <td className="px-3 py-2 border">{createdText}</td>
                    <td className="px-3 py-2 border">
                      <div className="flex gap-2 flex-wrap">
                        <button
                          onClick={() => onEdit(u)}
                          className="px-2 py-1 rounded border"
                        >
                          Edit
                        </button>

                        {/* NEW: Copy Magic Link (secure bootstrap link) */}
                        {uid && (
                          <button
                            onClick={() => copyMagicLink(uid)}
                            className="px-2 py-1 rounded border bg-white hover:bg-gray-50"
                            title="Generate & copy secure link for this user"
                          >
                            Magic Link
                          </button>
                        )}

                        {/* Wallet actions (not for delivery) */}
                        {type !== 2 && (
                          <>
                            <button
                              onClick={() => onAddBalance(u)}
                              className="px-2 py-1 rounded border bg-green-50 hover:bg-green-100"
                              title="Add wallet balance"
                            >
                              Add Balance
                            </button>
                            <button
                              onClick={() => onStatement(u)}
                              className="px-2 py-1 rounded border bg-blue-50 hover:bg-blue-100"
                              title="View wallet statement"
                            >
                              Statement
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <UserModal
          initial={editing}
          onClose={() => setModalOpen(false)}
          onSaved={onSaved}
        />
      )}

      {balModalOpen && balanceUser && (
        <AddBalanceModal
          user={balanceUser}
          onClose={() => setBalModalOpen(false)}
          onSaved={onBalanceSaved}
        />
      )}

      {stmtOpen && stmtUser.id && (
        <WalletStatementModal
          open={stmtOpen}
          userId={stmtUser.id}
          userTitle={stmtUser.title}
          onClose={() => setStmtOpen(false)}
        />
      )}
    </div>
  );
}

/* ------------------------------ Add Balance modal ------------------------------ */

function AddBalanceModal({ user, onClose, onSaved }) {
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(() => {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  });
  const [narration, setNarration] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const isDelivery = Number(user?.type) === 2;

  const submit = async (e) => {
    e?.preventDefault?.();
    if (isDelivery) {
      setErr("Wallet is not available for delivery users.");
      return;
    }
    const val = Number(String(amount).replace(/[^0-9.]/g, ""));
    if (!Number.isFinite(val) || val <= 0) {
      setErr("Amount must be a positive number.");
      return;
    }
    setSaving(true);
    setErr("");
    try {
      await api.post(`/api/users/${user._id || user.user_uuid}/wallet/add`, {
        amount: val,
        date,
        narration: narration?.trim() || undefined,
      });
      onSaved();
    } catch (e) {
      setErr(
        e?.response?.data?.message ||
          e?.response?.data?.error ||
          e?.message ||
          "Failed to add wallet balance"
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/20 flex items-center justify-center p-4 z-50">
      <div className="w-full max-w-sm bg-white rounded-xl shadow p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold">Add Wallet Balance</h3>
          <button className="px-2 py-1 rounded border" onClick={onClose} disabled={saving}>
            ✕
          </button>
        </div>

        {err && <div className="text-sm text-red-600 mb-2">{err}</div>}

        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1">
            <label className="text-sm">Amount</label>
            <input
              type="text"
              inputMode="decimal"
              className="w-full border rounded-md px-3 py-2"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter amount"
              disabled={isDelivery}
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm">Date</label>
            <input
              type="date"
              className="w-full border rounded-md px-3 py-2"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              disabled={isDelivery}
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm">Narration (optional)</label>
            <textarea
              className="w-full border rounded-md px-3 py-2 h-20"
              value={narration}
              onChange={(e) => setNarration(e.target.value)}
              placeholder="e.g. Balance added for October subscription"
              disabled={isDelivery}
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-3 py-2 rounded-md border" disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="px-3 py-2 rounded-md bg-green-600 text-white" disabled={saving || isDelivery}>
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ------------------------------ User modal ------------------------------ */

function emptyAddress() {
  return { text: "", is_default: "1", location_url: "" };
}

function normalizeAddresses(addrs) {
  const arr = Array.isArray(addrs) ? addrs : [];
  let seenDefault = false;
  const out = arr
    .map((a) => {
      const isDef =
        a?.is_default === "1" || a?.is_default === 1 || a?.is_default === true;
      const item = {
        text: String(a?.text || "").trim(),
        is_default: isDef && !seenDefault ? "1" : "0",
        location_url: String(a?.location_url || "").trim(),
      };
      if (item.is_default === "1") seenDefault = true;
      return item;
    })
    .filter((a) => a.text.length > 0);

  if (!seenDefault && out.length > 0) out[0].is_default = "1";
  return out;
}

function UserModal({ initial, onClose, onSaved }) {
  const isEdit = !!initial;
  const [mobile, setMobile] = useState(initial?.mobile_number || "");
  const [altMobile, setAltMobile] = useState(initial?.alternate_mobile_number || "");
  const [type, setType] = useState(
    Number.isFinite(Number(initial?.type)) ? Number(initial.type) : 1
  );
  const [status, setStatus] = useState(
    Number.isFinite(Number(initial?.status)) ? Number(initial.status) : 1
  );
  const [userTitle, setUserTitle] = useState(initial?.user_title || "");
  const [gender, setGender] = useState(initial?.gender || "unknown");

  const [addresses, setAddresses] = useState(
    Array.isArray(initial?.address) && initial.address.length > 0
      ? normalizeAddresses(initial.address)
      : [emptyAddress()]
  );

  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const showWallet = Number(type) !== 2;
  const showAddresses = Number(type) === 1;
  const showAltMobile = Number(type) === 1;

  const setDefault = (idx) => {
    setAddresses((prev) =>
      prev.map((a, i) => ({ ...a, is_default: i === idx ? "1" : "0" }))
    );
  };
  const addAddress = () => setAddresses((prev) => [...prev, emptyAddress()]);
  const removeAddress = (idx) =>
    setAddresses((prev) => prev.filter((_, i) => i !== idx));
  const updateAddr = (idx, field, value) =>
    setAddresses((prev) =>
      prev.map((a, i) => (i === idx ? { ...a, [field]: value } : a))
    );

  const cleanMobile = (v) => v.replace(/[^\d]/g, "").slice(0, 10);

  const validate = () => {
    if (!/^\d{10}$/.test(mobile)) return "Mobile number must be 10 digits.";
    if (![0, 1, 2].includes(Number(type))) return "Invalid user type.";
    if (![0, 1].includes(Number(status))) return "Status must be 0 or 1.";
    if (showAddresses) {
      const hasAny = addresses.some((a) => a.text.trim());
      if (!hasAny) return "Add at least one address (text).";
    }
    if (!["male", "female", "others", "unknown"].includes(String(gender))) {
      return "Invalid gender value.";
    }
    return null;
  };

  const idOf = (u) => u?._id || u?.uuid || u?.user_uuid;

  const onSubmit = async (e) => {
    e?.preventDefault?.();
    const v = validate();
    if (v) {
      setErr(v);
      return;
    }

    setSaving(true);
    setErr("");

    const payload = {
      mobile_number: cleanMobile(mobile),
      type: Number(type),
      status: Number(status),
      user_title: userTitle,
      gender,
      alternate_mobile_number: showAltMobile
        ? cleanMobile(altMobile) || undefined
        : undefined,
      address: showAddresses ? normalizeAddresses(addresses) : [],
    };

    try {
      if (isEdit) {
        const id = idOf(initial);
        if (!id) throw new Error("User id missing");
        await api.patch(`/api/users/${id}`, payload);
      } else {
        await api.post("/api/users", payload);
      }
      onSaved();
    } catch (e) {
      setErr(
        e?.response?.data?.message ||
          e?.response?.data?.error ||
          e?.message ||
          "Failed to save user"
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/20 flex items-center justify-center p-4 z-50">
      <div className="w-full max-w-2xl bg-white rounded-xl shadow max-h-[85vh] overflow-y-auto">
        <div className="p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              {isEdit ? "Edit User" : "New User"}
            </h2>
            <button
              className="px-2 py-1 rounded border"
              onClick={onClose}
              disabled={saving}
              title="Close"
            >
              ✕
            </button>
          </div>

          {err && <div className="text-sm text-red-600 mt-2">{err}</div>}

          <form onSubmit={onSubmit} className="mt-3 space-y-3">
            <div className="space-y-1">
              <label className="text-sm">Mobile Number *</label>
              <input
                className="w-full border rounded-md px-3 py-2"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                placeholder="10-digit mobile"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-sm">Type</label>
                <select
                  className="w-full border rounded-md px-3 py-2"
                  value={type}
                  onChange={(e) => setType(Number(e.target.value))}
                >
                  {TYPE_OPTS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-sm">Status</label>
                <select
                  className="w-full border rounded-md px-3 py-2"
                  value={status}
                  onChange={(e) => setStatus(Number(e.target.value))}
                >
                  {STATUS_OPTS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm">User Title</label>
              <input
                className="w-full border rounded-md px-3 py-2"
                value={userTitle}
                onChange={(e) => setUserTitle(e.target.value)}
                placeholder="Full name"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm">Gender</label>
              <select
                className="w-full border rounded-md px-3 py-2"
                value={gender}
                onChange={(e) => setGender(e.target.value)}
              >
                {GENDER_OPTS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            {Number(type) === 1 && (
              <div className="space-y-1">
                <label className="text-sm">Alternate Mobile (optional)</label>
                <input
                  className="w-full border rounded-md px-3 py-2"
                  value={altMobile}
                  onChange={(e) => setAltMobile(e.target.value)}
                  placeholder="Alternate 10-digit mobile"
                />
              </div>
            )}

            {Number(type) !== 2 && (
              <div className="space-y-1">
                <label className="text-sm">Wallet (read-only)</label>
                <input
                  className="w-full border rounded-md px-3 py-2 bg-gray-100"
                  value={money(
                    typeof initial?.wallet_balance === "number"
                      ? initial.wallet_balance
                      : Number(initial?.wallet_balance) || 0
                  )}
                  disabled
                  readOnly
                />
              </div>
            )}

            {Number(type) === 1 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">
                    Addresses ({addresses.length})
                  </label>
                  <button
                    type="button"
                    onClick={addAddress}
                    className="px-2 py-1 rounded border"
                  >
                    + Add address
                  </button>
                </div>

                <div className="space-y-3">
                  {addresses.map((a, idx) => (
                    <div key={idx} className="border rounded-md p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-medium">
                          Address #{idx + 1}
                        </div>
                        <div className="flex items-center gap-3">
                          <label className="text-sm flex items-center gap-1">
                            <input
                              type="radio"
                              name="defaultAddress"
                              checked={a.is_default === "1"}
                              onChange={() => setDefault(idx)}
                            />
                            Default
                          </label>
                          <button
                            type="button"
                            onClick={() => removeAddress(idx)}
                            className="px-2 py-1 rounded border text-red-700"
                            disabled={addresses.length === 1}
                            title={
                              addresses.length === 1
                                ? "At least one address required"
                                : "Remove"
                            }
                          >
                            Delete
                          </button>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-sm">Address Text *</label>
                        <textarea
                          className="w-full border rounded-md px-3 py-2 h-20"
                          placeholder="House, street, area, landmark…"
                          value={a.text}
                          onChange={(e) => updateAddr(idx, "text", e.target.value)}
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-sm">Location URL (optional)</label>
                        <input
                          className="w-full border rounded-md px-3 py-2"
                          placeholder="https://maps.google.com/?q=..."
                          value={a.location_url}
                          onChange={(e) =>
                            updateAddr(idx, "location_url", e.target.value)
                          }
                        />
                      </div>

                      <input type="hidden" value={a.is_default} readOnly />
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-2 rounded-md border"
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-3 py-2 rounded-md bg-black text-white"
              >
                {saving ? (isEdit ? "Saving…" : "Creating…") : isEdit ? "Save" : "Create"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
