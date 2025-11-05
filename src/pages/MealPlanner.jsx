// src/pages/MealPlanner.jsx
import React, { useState, useEffect, useCallback } from "react";
import api from "../lib/axios"; // 🔁 use same axios instance as Users/AddOrder

/* ---------------- date helpers ---------------- */
function getTomorrowYMD() {
  const d = new Date();
  d.setDate(d.getDate() + 1); // tomorrow
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`; // yyyy-mm-dd
}

function formatDisplayDDMMYY(ymd) {
  if (!ymd) return "";
  const [yyyy, mm, dd] = ymd.split("-");
  const yy = yyyy.slice(-2);
  return `${dd}/${mm}/${yy}`;
}

function formatHumanDate(ymd) {
  if (!ymd) return "";
  const [yyyy, mm, dd] = ymd.split("-");
  const dt = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
  const weekday = dt.toLocaleString("en-US", { weekday: "short" });
  const day = dt.toLocaleString("en-US", { day: "2-digit" });
  const mon = dt.toLocaleString("en-US", { month: "short" });
  const yy = String(dt.getFullYear()).slice(-2);
  return `${weekday}, ${day} ${mon} ${yy}`;
}

// helper to format Date -> yyyy-mm-dd
function formatYMD(dateObj) {
  const yyyy = dateObj.getFullYear();
  const mm = String(dateObj.getMonth() + 1).padStart(2, "0");
  const dd = String(dateObj.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/* ---------------- component ---------------- */
export default function MealPlanner() {
  const [showModal, setShowModal] = useState(false);
  const [mode, setMode] = useState("create"); // "create" | "edit"
  const [selectedDate, setSelectedDate] = useState(getTomorrowYMD());

  // master data
  const [meals, setMeals] = useState([]);   // /api/meals
  const [dishes, setDishes] = useState([]); // /api/dishes
  const [mealPlans, setMealPlans] = useState([]); // /api/meal-plan

  // mealId -> [dishId,...]
  const [selectedMealDishes, setSelectedMealDishes] = useState({});

  // loading states
  const [loadingMeals, setLoadingMeals] = useState(false);
  const [loadingDishes, setLoadingDishes] = useState(false);
  const [loadingPlans, setLoadingPlans] = useState(false);

  const [errorMsg, setErrorMsg] = useState("");
  const [searchText, setSearchText] = useState("");

  const [saveStatus, setSaveStatus] = useState(""); // "", "saving", "saved", "error"
  const [activateStatus, setActivateStatus] = useState(""); // "", "saving","saved","error"

  const mealsLoadedOutside = meals.length > 0;

  // lookup maps
  const mealTitleMap = {};
  meals.forEach((m) => {
    mealTitleMap[m._id] = m.meal_title || "Untitled Meal";
  });

  const dishMap = {};
  dishes.forEach((d) => {
    dishMap[d._id] = d;
  });

  const takenDates = mealPlans.map((p) => p.date); // ["2025-10-26","2025-10-27",...]

  /* ---------------- fetch all plans ---------------- */
  const fetchMealPlans = useCallback(async () => {
    try {
      setLoadingPlans(true);

      const [plansRes, mealsRes, dishesRes] = await Promise.all([
        api.get("/meal-plan"),
        api.get("/meals"),
        api.get("/dishes"),
      ]);

      const planArr =
        plansRes.data && plansRes.data.data ? plansRes.data.data : [];
      const mealArr = Array.isArray(mealsRes.data) ? mealsRes.data : [];
      const dishArr = Array.isArray(dishesRes.data) ? dishesRes.data : [];

      setMealPlans(planArr);
      setMeals(mealArr);
      setDishes(dishArr);

      setSelectedMealDishes((prev) => {
        const copy = { ...prev };
        mealArr.forEach((m) => {
          if (!copy[m._id]) copy[m._id] = [];
        });
        return copy;
      });
    } catch (err) {
      console.error("Failed to load meal plans data", err);
    } finally {
      setLoadingPlans(false);
    }
  }, []);

  useEffect(() => {
    fetchMealPlans();
  }, [fetchMealPlans]);

  /* ---------------- open modal in ADD mode ---------------- */
  const handleAddClick = async () => {
    setMode("create");
    setErrorMsg("");
    setSaveStatus("");
    setSearchText("");

    // pick default date = tomorrow, but skip already-taken dates
    let base = getTomorrowYMD();
    let probe = new Date(base);
    if (typeof probe === "string") probe = new Date(base);
    while (takenDates.includes(formatYMD(probe))) {
      probe.setDate(probe.getDate() + 1);
    }
    const picked = formatYMD(probe);
    setSelectedDate(picked);

    try {
      setLoadingMeals(true);
      setLoadingDishes(true);

      const [mealsRes, dishesRes] = await Promise.all([
        api.get("/meals"),
        api.get("/dishes"),
      ]);

      const mealArr = Array.isArray(mealsRes.data) ? mealsRes.data : [];
      const dishArr = Array.isArray(dishesRes.data) ? dishesRes.data : [];

      setMeals(mealArr);
      setDishes(dishArr);

      const selObj = {};
      mealArr.forEach((m) => {
        selObj[m._id] = [];
      });
      setSelectedMealDishes(selObj);

      setShowModal(true);
    } catch (err) {
      console.error("Failed to load meals/dishes for popup", err);
      setErrorMsg("Couldn't load meals or dishes. Please try again.");
      setShowModal(true);
    } finally {
      setLoadingMeals(false);
      setLoadingDishes(false);
    }
  };

  /* ---------------- open modal in EDIT mode ---------------- */
  const handleEditClick = async (planDoc) => {
    setMode("edit");
    setErrorMsg("");
    setSaveStatus("");
    setSearchText("");

    setSelectedDate(planDoc.date);

    try {
      setLoadingMeals(true);
      setLoadingDishes(true);

      const [mealsRes, dishesRes] = await Promise.all([
        api.get("/meals"),
        api.get("/dishes"),
      ]);

      const mealArr = Array.isArray(mealsRes.data) ? mealsRes.data : [];
      const dishArr = Array.isArray(dishesRes.data) ? dishesRes.data : [];

      setMeals(mealArr);
      setDishes(dishArr);

      const selObj = {};
      mealArr.forEach((m) => {
        selObj[m._id] = [];
      });

      (planDoc.plan || []).forEach((entry) => {
        selObj[entry.meal_id] = Array.isArray(entry.dish_id)
          ? entry.dish_id.slice()
          : [];
      });

      setSelectedMealDishes(selObj);

      setShowModal(true);
    } catch (err) {
      console.error("Failed to load meals/dishes for edit", err);
      setErrorMsg("Couldn't load meals or dishes. Please try again.");
      setShowModal(true);
    } finally {
      setLoadingMeals(false);
      setLoadingDishes(false);
    }
  };

  /* ---------------- dish checkbox logic ---------------- */
  const handleMealDishChange = (mealId, dishId, checked) => {
    setSelectedMealDishes((prev) => {
      const oldList = prev[mealId] || [];
      const newList = checked
        ? oldList.includes(dishId)
          ? oldList
          : [...oldList, dishId]
        : oldList.filter((id) => id !== dishId);
      return { ...prev, [mealId]: newList };
    });
  };

  /* ---------------- payload + save ---------------- */
  const buildMealPlanPayload = () => {
    const adminUserRaw = localStorage.getItem("adminUser") || "";

    const planArray = meals.map((mealObj) => {
      const mealId = mealObj._id;
      return {
        meal_id: mealId,
        dish_id: selectedMealDishes[mealId] || [],
      };
    });

    return {
      date: selectedDate,
      created_by: adminUserRaw,
      plan: planArray,
    };
  };

  const handleConfirmPopup = async () => {
    if (!selectedDate) {
      setErrorMsg("Please pick a date first.");
      return;
    }

    if (mode === "create" && takenDates.includes(selectedDate)) {
      setErrorMsg("This date already has a plan. Please pick another date.");
      return;
    }

    const body = buildMealPlanPayload();

    try {
      setSaveStatus("saving");
      await api.post("/meal-plan", body);
      setSaveStatus("saved");
      setShowModal(false);

      fetchMealPlans();
    } catch (err) {
      console.error("Failed to save meal plan", err);
      setSaveStatus("error");
      setShowModal(false);
    }
  };

  /* ---------------- activate / deactivate ---------------- */
  const handleActivate = async (planId) => {
    try {
      setActivateStatus("saving");
      await api.patch(`/meal-plan/${planId}/activate`);
      setActivateStatus("saved");

      fetchMealPlans();
    } catch (err) {
      console.error("Failed to activate/deactivate meal plan", err);
      setActivateStatus("error");
    }
  };

  /* ---------------- search filter ---------------- */
  const norm = (s) => String(s || "").toLowerCase().trim();

  const visibleDishesGlobalFiltered = () => {
    const q = norm(searchText);
    if (!q) return dishes;
    return dishes.filter((dish) => {
      const hayTitle = norm(dish.title);
      const hayIngr = norm(dish.ingredients);
      return hayTitle.includes(q) || hayIngr.includes(q);
    });
  };

  /* ---------------- render meal sections in popup ---------------- */
  const renderMealRowInPopup = (mealObj) => {
    const mealId = mealObj._id;
    const title = mealObj.meal_title || "Untitled Meal";
    const hours = mealObj.delivery_hours || "";
    const chosen = selectedMealDishes[mealId] || [];

    const filteredList = visibleDishesGlobalFiltered();

    return (
      <div
        key={mealId}
        className="border border-gray-300 rounded bg-white"
      >
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between px-3 pt-3">
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-gray-900">{title}</div>
            <div className="text-xs text-gray-600">{hours}</div>
          </div>

          <div className="mt-2 sm:mt-0 text-[11px] text-gray-500">
            {chosen.length === 0
              ? "No dishes selected"
              : `${chosen.length} dish(es) selected`}
          </div>
        </div>

        <div className="mt-3 mb-3 mx-3 max-h-40 overflow-y-auto border border-gray-200 rounded bg-gray-50 p-2">
          {loadingDishes ? (
            <div className="text-xs text-gray-500 text-center py-2">
              Loading dishes…
            </div>
          ) : filteredList.length === 0 ? (
            <div className="text-xs text-gray-500 text-center py-2">
              No matches
            </div>
          ) : (
            <ul className="space-y-1 text-xs text-gray-700">
              {filteredList.map((dish) => {
                const dishId = dish._id;
                const isChecked = chosen.includes(dishId);
                const price =
                  dish.price !== undefined && dish.price !== null
                    ? `₹${dish.price}`
                    : "";

                return (
                  <li
                    key={dishId}
                    className="flex items-start gap-2"
                  >
                    <input
                      type="checkbox"
                      className="mt-0.5 h-3 w-3 text-green-600 border-gray-300 rounded focus:ring-green-500"
                      checked={isChecked}
                      onChange={(e) =>
                        handleMealDishChange(
                          mealId,
                          dishId,
                          e.target.checked
                        )
                      }
                    />
                    <div className="flex-1 min-w-0 leading-tight">
                      <div className="font-medium text-gray-900 leading-none">
                        {dish.title || "Untitled Dish"}{" "}
                        {price && (
                          <span className="text-[10px] text-gray-500 font-normal">
                            ({price})
                          </span>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    );
  };

  /* ---------------- build table rows ---------------- */
  const mealColumns = meals.map((m) => ({
    mealId: m._id,
    mealTitle: m.meal_title || "Untitled Meal",
  }));

  const renderPlanRow = (planDoc, index) => {
    const perMealMap = {};
    (planDoc.plan || []).forEach((entry) => {
      perMealMap[entry.meal_id] = entry.dish_id || [];
    });

    const prettyDate = formatHumanDate(planDoc.date);
    const isActive = planDoc.status === 1;

    return (
      <tr
        key={planDoc._id || index}
        className="border-b last:border-0 text-sm"
      >
        <td className="px-3 py-2 text-gray-700 text-center align-top">
          {index + 1}
        </td>

        <td className="px-3 py-2 text-gray-900 font-medium align-top whitespace-nowrap">
          {prettyDate}
        </td>

        {mealColumns.map((col) => {
          const dishIdsForMeal = perMealMap[col.mealId] || [];
          const dishNames = dishIdsForMeal
            .map((dishId) =>
              dishMap[dishId]?.title ? dishMap[dishId].title : ""
            )
            .filter(Boolean);

          return (
            <td key={col.mealId} className="px-3 py-2 text-gray-700 align-top">
              {dishNames.length === 0 ? "-" : dishNames.join(", ")}
            </td>
          );
        })}

        <td className="px-3 py-2 text-center align-top whitespace-nowrap">
          <button
            onClick={() => handleActivate(planDoc._id)}
            className={
              "px-2 py-1 rounded text-xs font-semibold border transition " +
              (isActive
                ? "bg-green-600 text-white border-green-600"
                : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100")
            }
          >
            {isActive ? "ON" : "OFF"}
          </button>
        </td>

        <td className="px-3 py-2 text-center align-top whitespace-nowrap">
          <button
            onClick={() => handleEditClick(planDoc)}
            className="px-2 py-1 rounded text-xs font-semibold border border-gray-300 bg-white text-gray-700 hover:bg-gray-100"
          >
            Edit
          </button>
        </td>
      </tr>
    );
  };

  const renderPlansTable = () => {
    if (loadingPlans) {
      return (
        <div className="p-6 text-center text-sm text-slate-500">
          Loading meal plans…
        </div>
      );
    }

    if (!mealPlans.length) {
      return (
        <div className="p-6 text-center text-sm text-slate-500">
          No meals yet.
        </div>
      );
    }

    return (
      <div className="overflow-x-auto">
        <table className="min-w-full border border-slate-200 bg-white rounded-md overflow-hidden text-left">
          <thead className="bg-slate-100 border-b border-slate-200 text-xs text-slate-600 uppercase">
            <tr>
              <th className="px-3 py-2 text-center font-medium">#</th>
              <th className="px-3 py-2 font-medium whitespace-nowrap">
                Date
              </th>

              {mealColumns.map((col) => (
                <th
                  key={col.mealId}
                  className="px-3 py-2 font-medium whitespace-nowrap"
                >
                  {col.mealTitle}
                </th>
              ))}

              <th className="px-3 py-2 text-center font-medium whitespace-nowrap">
                Active
              </th>

              <th className="px-3 py-2 text-center font-medium whitespace-nowrap">
                Edit
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-200">
            {mealPlans.map((planDoc, idx) => renderPlanRow(planDoc, idx))}
          </tbody>
        </table>

        {activateStatus === "error" && (
          <div className="text-xs text-red-600 font-medium p-2">
            Failed to update active day.
          </div>
        )}
        {activateStatus === "saved" && (
          <div className="text-xs text-green-600 font-medium p-2">
            Active day updated.
          </div>
        )}
        {activateStatus === "saving" && (
          <div className="text-xs text-slate-500 font-medium p-2">
            Updating…
          </div>
        )}
      </div>
    );
  };

  /* ---------------- UI ---------------- */
  return (
    <div className="p-4 md:p-6 w-full max-w-6xl mx-auto">
      {/* HEADER BAR + ADD */}
      <div className="flex items-start justify-between mb-4 flex-wrap gap-3">
        <div>
          <h1 className="text-lg font-semibold text-slate-800">
            Meal Planner
          </h1>
          <p className="text-xs text-slate-500">
            Select a date, pick dishes for each meal, save.
            Activate exactly one day at a time — or turn all OFF.
            Edit existing days if you need to change dishes.
          </p>
        </div>

        <button
          onClick={handleAddClick}
          className="h-8 px-3 rounded-md bg-green-600 text-white text-sm font-medium hover:bg-green-700 active:scale-95 transition"
        >
          ADD
        </button>
      </div>

      {/* STATUS ROW */}
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between rounded-md border border-slate-200 bg-white p-3 shadow-sm text-sm">
        <div className="text-slate-700">
          <span className="font-medium text-slate-900">Selected Date: </span>
          {formatDisplayDDMMYY(selectedDate)}
        </div>

        <div className="text-xs text-slate-500 mt-2 sm:mt-0">
          {mealsLoadedOutside
            ? `${meals.length} meals loaded`
            : "No meals yet."}
        </div>

        {saveStatus === "saved" && (
          <div className="text-xs font-medium text-green-600 mt-2 sm:mt-0">
            Saved ✔
          </div>
        )}
        {saveStatus === "error" && (
          <div className="text-xs font-medium text-red-600 mt-2 sm:mt-0">
            Save failed
          </div>
        )}
        {saveStatus === "saving" && (
          <div className="text-xs font-medium text-slate-500 mt-2 sm:mt-0">
            Saving…
          </div>
        )}
      </div>

      {/* TABLE OF ALL PLANS */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
        <div className="border-b border-slate-200 px-4 py-2 flex items-center justify-between">
          <div className="text-sm font-medium text-slate-800">
            Meals
          </div>
          <div className="text-xs text-slate-500">
            {mealPlans.length
              ? `${mealPlans.length} plan(s)`
              : "Nothing to show"}
          </div>
        </div>

        {renderPlansTable()}
      </div>

      {/* MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-lg bg-white shadow-xl border border-slate-200 flex flex-col max-h-[85vh]">
            {/* header */}
            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
              <div className="text-sm font-semibold text-slate-800">
                {mode === "edit" ? "Edit Plan" : "Select Date"}
              </div>
              <button
                className="text-slate-400 hover:text-slate-600 text-lg leading-none"
                onClick={() => setShowModal(false)}
              >
                ×
              </button>
            </div>

            {/* body */}
            <div className="p-4 flex-1 overflow-y-auto space-y-4 text-sm">
              {/* DATE PICKER */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Date
                </label>
                <input
                  type="date"
                  className="w-full border border-slate-300 rounded px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  value={selectedDate}
                  onChange={(e) => {
                    const newDate = e.target.value;
                    if (
                      mode === "create" &&
                      takenDates.includes(newDate)
                    ) {
                      setErrorMsg(
                        "This date already has a plan. Please pick another date."
                      );
                    } else {
                      setErrorMsg("");
                    }
                    setSelectedDate(newDate);
                  }}
                />
                <div className="text-[11px] text-slate-500 mt-1">
                  {formatDisplayDDMMYY(selectedDate)}
                </div>
                {mode === "create" && takenDates.includes(selectedDate) && (
                  <div className="text-[11px] text-red-600 mt-1">
                    This date already has a plan.
                  </div>
                )}
              </div>

              {/* SEARCH */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Search dish
                </label>
                <input
                  type="text"
                  className="w-full border border-slate-300 rounded px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="Type to filter by name or ingredients (e.g. corn)"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                />
              </div>

              {errorMsg && (
                <div className="text-[11px] text-red-600">{errorMsg}</div>
              )}

              {/* MEAL BLOCKS */}
              {loadingMeals ? (
                <div className="text-xs text-gray-500 text-center py-4">
                  Loading meals…
                </div>
              ) : meals.length === 0 ? (
                <div className="text-xs text-gray-500 text-center py-4">
                  No meals found.
                </div>
              ) : (
                <div className="space-y-4">
                  {meals.map((mealObj) => renderMealRowInPopup(mealObj))}
                </div>
              )}
            </div>

            {/* footer */}
            <div className="px-4 py-3 border-t border-slate-200 flex items-center justify-end gap-4 bg-slate-50 rounded-b-lg">
              <button
                onClick={() => setShowModal(false)}
                className="text-xs font-medium text-slate-600 hover:text-slate-800 px-3 py-2"
              >
                Cancel
              </button>

              <button
                onClick={handleConfirmPopup}
                className="px-3 py-2 rounded-md bg-green-600 text-white text-xs font-semibold hover:bg-green-700 active:scale-95 transition"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
