// src/pages/Dishes.jsx
import { useEffect, useMemo, useState } from "react";
import {
  listDishes,
  createDish,
  updateDish,
  deleteDish,
  patchDishStatus,
} from "../api/dishes";

// NOTE: Your existing api/dishes.js (listDishes etc.) may still be calling /api/dishes directly.
// We'll keep that for create/update/etc for now.
// But for the main table load we will override and try /api/admin/dishes first.

import { api } from "../lib/axios"; // this is your raw axios instance in lib

export default function Dishes() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [errMsg, setErrMsg] = useState("");

  const [form, setForm] = useState({
    title: "",
    image_url: "", // comma-separated input
    ingredients: "",
    status: 1,
    price: "",

    // nutrition fields
    carbs: "",
    fats: "",
    protein: "",
    calories: "",
  });

  // token helper (same pattern as Users / AddOrder pages that work)
  const adminHeaders = () => {
    const t =
      localStorage.getItem("adminToken") ||
      localStorage.getItem("admin_token");
    return t ? { Authorization: `Bearer ${t}` } : {};
  };

  // Load dishes list with fallback route logic
  const fetchRows = async () => {
    setLoading(true);
    setErrMsg("");
    try {
      const params = q ? { q } : undefined;

      let res;
      try {
        // most backends put admin-only collections under /api/admin/...
        res = await api.get("/api/admin/dishes", {
          params,
          headers: adminHeaders(),
          withCredentials: true,
        });
      } catch (e1) {
        if (e1?.response?.status === 404) {
          // fallback to non-admin path
          res = await api.get("/api/dishes", {
            params,
            headers: adminHeaders(),
            withCredentials: true,
          });
        } else {
          throw e1;
        }
      }

      // Normalize result into an array
      const data = res.data;
      const arr = Array.isArray(data)
        ? data
        : data?.dishes // sometimes APIs wrap data
        ? data.dishes
        : [];

      setRows(arr);
    } catch (e) {
      console.error("Failed to load dishes:", e);
      setErrMsg(
        e?.response?.data?.error ||
          e?.response?.data?.message ||
          e?.message ||
          "Failed to load dishes"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // server-side filter already supports q
  const filtered = useMemo(() => rows, [rows]);

  const openNew = () => {
    setEditing(null);
    setForm({
      title: "",
      image_url: "",
      ingredients: "",
      status: 1,
      price: "",
      carbs: "",
      fats: "",
      protein: "",
      calories: "",
    });
    setShowForm(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    setForm({
      title: row.title || "",
      image_url: Array.isArray(row.image_url)
        ? row.image_url.join(", ")
        : row.image_url || "",
      ingredients: row.ingredients || "",
      status: Number(row.status) === 1 ? 1 : 0,
      price: row.price ?? "",
      carbs: row.carbs ?? "",
      fats: row.fats ?? "",
      protein: row.protein ?? "",
      calories: row.calories ?? "",
    });
    setShowForm(true);
  };

  const numOrEmpty = (v) => (v === "" ? "" : Number(v));

  const onSubmit = async (e) => {
    e.preventDefault();

    const payload = {
      title: form.title.trim(),
      ingredients: form.ingredients,
      status: Number(form.status) === 1 ? 1 : 0,
      image_url: form.image_url,
      price: form.price === "" ? "" : Number(form.price),
      carbs: numOrEmpty(form.carbs),
      fats: numOrEmpty(form.fats),
      protein: numOrEmpty(form.protein),
      calories: numOrEmpty(form.calories),
    };

    try {
      if (editing) {
        await updateDish(editing._id || editing.dish_uuid, payload);
      } else {
        await createDish(payload);
      }
      setShowForm(false);
      await fetchRows();
    } catch (e) {
      console.error("Save failed:", e);
      alert("Save failed");
    }
  };

  const onDelete = async (row) => {
    if (!confirm("Delete this dish?")) return;
    try {
      await deleteDish(row._id || row.dish_uuid);
      await fetchRows();
    } catch (e) {
      console.error("Delete failed:", e);
      alert("Delete failed");
    }
  };

  const toggleStatus = async (row) => {
    try {
      const newStatus = row.status === 1 ? 0 : 1;
      await patchDishStatus(row._id || row.dish_uuid, newStatus);
      await fetchRows();
    } catch (e) {
      console.error("Status update failed:", e);
      alert("Status update failed");
    }
  };

  const onSearch = async (e) => {
    e.preventDefault();
    await fetchRows();
  };

  const fmt = (n) =>
    new Intl.NumberFormat("en-IN", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(Number(n || 0));

  return (
    <div className="p-4 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <h1 className="text-xl font-semibold">Dishes</h1>
        <button
          className="px-3 py-2 rounded bg-black text-white"
          onClick={openNew}
        >
          + New Dish
        </button>
      </div>

      {/* Search */}
      <form onSubmit={onSearch} className="flex gap-2 mb-4">
        <input
          className="border px-3 py-2 rounded w-full"
          placeholder="Search by title or ingredients..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button className="px-3 py-2 rounded border">Search</button>
      </form>

      {errMsg && (
        <div className="text-sm text-red-600 mb-3">{errMsg}</div>
      )}

      {/* Table */}
      <div className="overflow-auto border rounded">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left p-2">S.No.</th>
              <th className="text-left p-2">Title</th>
              <th className="text-left p-2">Images</th>
              <th className="text-left p-2">Ingredients</th>
              <th className="text-left p-2">Price (₹)</th>
              <th className="text-left p-2">Nutrition (g)</th>
              <th className="text-left p-2">Calories</th>
              <th className="text-left p-2">Status</th>
              <th className="text-left p-2">Created</th>
              <th className="text-left p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="p-3" colSpan={10}>
                  Loading…
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td className="p-3" colSpan={10}>
                  No dishes found
                </td>
              </tr>
            ) : (
              filtered.map((row, idx) => (
                <tr key={row._id || row.dish_uuid} className="border-t">
                  <td className="p-2">{idx + 1}</td>
                  <td className="p-2">{row.title || "Untitled"}</td>
                  <td className="p-2">
                    {Array.isArray(row.image_url) &&
                    row.image_url.length > 0
                      ? `${row.image_url.length} image(s)`
                      : "—"}
                  </td>
                  <td className="p-2">{row.ingredients || "—"}</td>
                  <td className="p-2">₹{fmt(row.price)}</td>
                  <td className="p-2">
                    C {fmt(row.carbs)} / F {fmt(row.fats)} / P{" "}
                    {fmt(row.protein)}
                  </td>
                  <td className="p-2">{fmt(row.calories)}</td>
                  <td className="p-2">
                    <button
                      className={`px-2 py-1 rounded text-xs ${
                        row.status === 1
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-700"
                      }`}
                      onClick={() => toggleStatus(row)}
                      title="Toggle status"
                    >
                      {row.status === 1 ? "Active" : "Inactive"}
                    </button>
                  </td>
                  <td className="p-2">
                    {row.created_at
                      ? new Date(row.created_at).toLocaleString()
                      : "—"}
                  </td>
                  <td className="p-2 flex gap-2">
                    <button
                      className="px-2 py-1 border rounded"
                      onClick={() => openEdit(row)}
                    >
                      Edit
                    </button>
                    <button
                      className="px-2 py-1 border rounded"
                      onClick={() => onDelete(row)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal form */}
      {showForm && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center">
          <div className="bg-white rounded p-4 w-full max-w-lg">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold">
                {editing ? "Edit Dish" : "New Dish"}
              </h2>
              <button onClick={() => setShowForm(false)}>✕</button>
            </div>

            <form onSubmit={onSubmit} className="space-y-3">
              <div>
                <label className="block text-sm mb-1">Title *</label>
                <input
                  className="border w-full px-3 py-2 rounded"
                  value={form.title}
                  onChange={(e) =>
                    setForm({ ...form, title: e.target.value })
                  }
                  required
                />
              </div>

              <div>
                <label className="block text-sm mb-1">
                  Image URLs (comma-separated)
                </label>
                <input
                  className="border w-full px-3 py-2 rounded"
                  value={form.image_url}
                  onChange={(e) =>
                    setForm({ ...form, image_url: e.target.value })
                  }
                  placeholder="https://..., https://..."
                />
              </div>

              <div>
                <label className="block text-sm mb-1">Ingredients</label>
                <textarea
                  className="border w-full px-3 py-2 rounded"
                  rows={3}
                  value={form.ingredients}
                  onChange={(e) =>
                    setForm({ ...form, ingredients: e.target.value })
                  }
                />
              </div>

              <div>
                <label className="block text-sm mb-1">Price (₹)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="border w-full px-3 py-2 rounded"
                  value={form.price}
                  onChange={(e) =>
                    setForm({ ...form, price: e.target.value })
                  }
                  placeholder="e.g. 120"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm mb-1">Carbs (g)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    className="border w-full px-3 py-2 rounded"
                    value={form.carbs}
                    onChange={(e) =>
                      setForm({ ...form, carbs: e.target.value })
                    }
                    placeholder="e.g. 35"
                  />
                </div>
                <div>
                  <label className="block text-sm mb-1">Fats (g)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    className="border w-full px-3 py-2 rounded"
                    value={form.fats}
                    onChange={(e) =>
                      setForm({ ...form, fats: e.target.value })
                    }
                    placeholder="e.g. 8"
                  />
                </div>
                <div>
                  <label className="block text-sm mb-1">Protein (g)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    className="border w-full px-3 py-2 rounded"
                    value={form.protein}
                    onChange={(e) =>
                      setForm({ ...form, protein: e.target.value })
                    }
                    placeholder="e.g. 12"
                  />
                </div>
                <div>
                  <label className="block text-sm mb-1">
                    Calories (Kcal)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    className="border w-full px-3 py-2 rounded"
                    value={form.calories}
                    onChange={(e) =>
                      setForm({ ...form, calories: e.target.value })
                    }
                    placeholder="e.g. 310"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm mb-1">Status</label>
                <select
                  className="border w-full px-3 py-2 rounded"
                  value={form.status}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      status: Number(e.target.value),
                    })
                  }
                >
                  <option value={1}>Active (1)</option>
                  <option value={0}>Inactive (0)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  className="px-3 py-2 border rounded"
                  onClick={() => setShowForm(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-2 rounded bg-black text-white"
                >
                  {editing ? "Update" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
