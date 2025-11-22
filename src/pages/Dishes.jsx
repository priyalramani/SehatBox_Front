import React, { useEffect, useMemo, useState, useRef } from "react";
import { useReactToPrint } from "react-to-print";
import {
  listDishes,
  createDish,
  updateDish,
  deleteDish,
  patchDishStatus,
} from "../api/dishes";
import api from "../lib/axios";

export default function Dishes() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");
  const [recipeModal, setRecipeModal] = useState()

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);

  const [form, setForm] = useState({
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

  const [errMsg, setErrMsg] = useState("");

  // ---------------------------------
  // helpers
  // ---------------------------------

  const numOrEmpty = (v) => (v === "" ? "" : Number(v));

  async function refreshTable() {
    setLoading(true);
    setErrMsg("");
    try {
      const data = await listDishes(q);
      setRows(data);
    } catch (err) {
      console.error("Failed to load dishes:", err);
      setErrMsg(
        err?.response?.data?.error ||
          err?.response?.data?.message ||
          err?.message ||
          "Failed to load dishes"
      );
    } finally {
      setLoading(false);
    }
  }

  // load on first mount
  useEffect(() => {
    refreshTable();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => rows, [rows]);

  // ---------------------------------
  // form open/edit/new
  // ---------------------------------

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

  // ---------------------------------
  // submit create/update
  // ---------------------------------

  const onSubmit = async (e) => {
    e.preventDefault();

    const payload = {
      title: form.title.trim(),
      ingredients: form.ingredients,
      status: Number(form.status) === 1 ? 1 : 0,
      image_url: form.image_url, // comma-separated. backend can split.
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
      await refreshTable();
    } catch (err) {
      console.error("Save failed:", err);
      alert("Save failed");
    }
  };

  // ---------------------------------
  // delete
  // ---------------------------------

  const onDelete = async (row) => {
    if (!confirm("Delete this dish?")) return;
    try {
      await deleteDish(row._id || row.dish_uuid);
      await refreshTable();
    } catch (err) {
      console.error("Delete failed:", err);
      alert("Delete failed");
    }
  };

  // ---------------------------------
  // toggle active/inactive
  // ---------------------------------

  const toggleStatus = async (row) => {
    try {
      const newStatus = row.status === 1 ? 0 : 1;
      await patchDishStatus(row._id || row.dish_uuid, newStatus);
      await refreshTable();
    } catch (err) {
      console.error("Status update failed:", err);
      alert("Status update failed");
    }
  };

  // ---------------------------------
  // search
  // ---------------------------------

  const onSearch = async (e) => {
    e.preventDefault();
    await refreshTable();
  };

  const fmt = (n) =>
    new Intl.NumberFormat("en-IN", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(Number(n || 0));

  // ---------------------------------
  // UI
  // ---------------------------------

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
                  <td className="p-2 max-w-xs whitespace-pre-wrap break-words">
                    {row.ingredients || "—"}
                  </td>
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
                  <td className="p-2 flex gap-2 flex-wrap">
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
                    <button
                      className="px-2 py-1 border rounded"
                      onClick={() => setRecipeModal(row)}
                    >
                      Recipe
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
      {recipeModal && <DishRecipeModal close={() => setRecipeModal()} dish={recipeModal} />}
    </div>
  );
}

const units = [
  { label: 'Unit', value: '' },
  { label: 'Gram', value: 'g' },
  { label: 'Kilogram', value: 'kg' },
  { label: 'Milliliter', value: 'ml' },
  { label: 'Liter', value: 'l' },
  { label: 'Teaspoon', value: ' tsp' },
  { label: 'Tablespoon', value: ' tbsp' },
  { label: 'Cup', value: ' cup' },
  { label: 'Ounce', value: 'oz' },
  { label: 'Pound', value: 'lb' },
]

const DishRecipeModal = ({ close, dish }) => {
  const componentRef = useRef()
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState([])
  const [platesCount, setPlatesCount] = useState(1)
  const [isEditable, setIsEditable] = useState(false)
  
  useEffect(() => {
    if (!dish?._id) return
    ;(async () => {
      setLoading(true)
      try {
        const {data} = await api.get(`/recipe/${dish?._id}`)
        if (!data?.items) return setIsEditable(true)
        setItems(data.items)
        setPlatesCount(data.plates_count)
      } catch (error) {
        console.error(error)
      }
      setLoading(false)
    })()
  }, [dish?._id])

  const handlePrint = useReactToPrint({
    contentRef: componentRef,
    documentTitle: `Recipe for ${dish.title}`,
    pageStyle: `@page { size: A4; margin: 10mm; }`,
  });

  const handleInput = (field, value, idx) => {
    setItems(p =>
      p.slice(0, idx).concat([{
        ...p[idx],
        [field]: value
      }]).concat(p.slice(idx + 1, items.length))
    )
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await api.post('/recipe', {
        dish_uuid: dish?._id,
        items
      })
      setIsEditable(false)
    } catch (error) {
      console.error(error)
    }
    setLoading(false)
  }

  const emptyMessage = (
    <span className="italic text-stone-500 text-center block">
      Wow such empty! Try adding a few items...
    </span>
  )

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center shadow">
      <div className="bg-white rounded p-4 w-full max-w-3xl print:max-w-full" ref={componentRef}>
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-lg mb-3">
            Recipe for {dish?.title}
            <span className="hidden print:inline"> ({platesCount} plate{platesCount > 1 ? 's' : ''})</span>
          </h2>
          <button
            type="button"
            className="font-bold px-1 cursor-pointer print:hidden"
            onClick={close}
          >
            ✕
          </button>
        </div>

        {
          !isEditable
          ? (
            <>
              <div className="h-[56vh] overflow-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b font-bold">
                      <td className="py-1 px-2"></td>
                      <td className="py-1 px-2">#</td>
                      <td className="py-1 px-2 w-full">Item name</td>
                      <td className="text-right py-1 px-2">Qty</td>
                    </tr>
                  </thead>
                  <tbody>
                    {
                      items?.map((i, idx) => (
                        !i.item_name
                          ? null
                          : (
                            <React.Fragment key={'recipe-item:tr:'+idx}>
                              <tr className="border-t border-stone-300">
                                <td rowSpan={i.remarks ? 2 : 1} className="py-1 px-2">
                                  <input type="checkbox" checked={false} className="hidden print:block" />
                                </td>
                                <td className="py-1 px-2">{idx+1}.</td>
                                <td className="py-1 px-2">{i.item_name}</td>
                                <td className="py-1 px-2 text-right whitespace-nowrap">{i.qty * platesCount}{i.unit}</td>
                              </tr>
                              {i.remarks && <tr>
                                <td colSpan={3} className="py-1 px-2">
                                  <span className="text-stone-500 text-sm italic">Remarks:</span> {i.remarks}</td>
                              </tr>}
                            </React.Fragment>
                          )
                      ))
                    }
                  </tbody>
                </table>
              </div>

              <div className="print:hidden">
                <div className="flex gap-2 justify-end">
                  <button
                    type="button"
                    className="px-3 py-1.5 border rounded mt-4"
                    onClick={() => setIsEditable(true)}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="px-3 py-1.5 border rounded mt-4"
                    onClick={handlePrint}
                  >
                    Print
                  </button>
                </div>
              </div>
            </>
          ) : (
            <form onSubmit={onSubmit}>
              <div className="space-y-3 mb-4 h-[56vh] overflow-auto">
                {items?.length
                  ? items?.map((i, idx) => (
                    <div key={'recipe-item:'+idx} className="flex">
                      <span className="py-2 pr-3">{idx + 1}.</span>
                      <div className="space-y-1 w-full">
                        <div className="flex gap-1 items-center">
                          <input
                            required
                            className="border w-full px-3 py-2 rounded"
                            placeholder="* Item Name"
                            autoFocus
                            value={i.item_name || ""}
                            onChange={(e) => handleInput("item_name", e.target.value, idx)}
                          />
                          <input
                            required
                            className="border px-3 py-2 rounded w-20 text-right"
                            placeholder="* Qty"
                            value={i.qty || ""}
                            onChange={(e) => handleInput("qty", e.target.value, idx)}
                          />
                          <select
                            className="border px-3 py-2 rounded"
                            placeholder="Unit"
                            value={i.unit}
                            onChange={(e) => handleInput("unit", e.target.value, idx)}
                          >
                            {
                              units.map(u => <option key={u.label} value={u.value}>{u.label}</option>)
                            }
                          </select>
                          <button
                            type="button"
                            className="px-3 py-2 border rounded text-red-500 bg-red-100 font-bold"
                            onClick={() => setItems(p =>[...p.slice(0, idx), ...p.slice(idx + 1)])}
                          >
                            ✕
                          </button>
                        </div>

                        <textarea
                          className="border w-full px-3 py-2 rounded"
                          rows={3}
                          placeholder="Remarks"
                          value={i.remarks || ""}
                          onChange={(e) => handleInput("remarks", e.target.value, idx)}
                        />
                      </div>
                    </div>
                  )) : emptyMessage}
              </div>
              <div className="flex justify-between items-end">
                <div className="flex gap-2 items-end">
                  <label className="flex flex-col">
                    <span className="text-sm text-stone-500">Plates</span>
                    <input
                      className="border px-2 py-1.5 rounded w-12 text-right"
                      value={platesCount}
                      onChange={(e) => setPlatesCount(e.target.value)}
                    />
                  </label>
                  <button
                    type="button"
                    className="px-3 py-1.5 border rounded"
                    onClick={() => setItems(p => p.concat([{}]))}
                  >
                    + Add
                  </button>
                </div>
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    className="px-3 py-1.5 border rounded"
                    onClick={() => items?.length ? setIsEditable() : close()}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-3 py-1.5 rounded bg-black text-white disabled:opacity-50"
                    disabled={!items.length}
                  >
                    Save
                  </button>
                </div>
              </div>
            </form>
          )
        }
      </div>
    </div>
  )
}