import { useEffect, useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import { api } from "../../lib/axios";

const CANCELLED_STATUS_CODE = 3;

const MEAL_NAME_MAP = {
  "689f6fcc5d6f90aa8ab14251": "Breakfast",
  "68fc95b974853d663d125743": "Post Lunch",
};

const MEAL_TIME_MAP = {
  "689f6fcc5d6f90aa8ab14251": "8:30 AM to 10:00 AM",
  "68fc95b974853d663d125743": "3:00 PM to 5:00 PM",
};

export default function MealPlan() {
  const { user_uuid: routeUserUuid } = useParams();

  const currentUserUuid = useMemo(() => {
    return routeUserUuid || localStorage.getItem("User_uuid") || null;
  }, [routeUserUuid]);

  const [userProfile, setUserProfile] = useState(null);

  const [mealPlan, setMealPlan] = useState(null);
  const [mealSlots, setMealSlots] = useState([]);
  const [allDishesMap, setAllDishesMap] = useState({});

  const [selectedMealId, setSelectedMealId] = useState("");

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [expandedMap, setExpandedMap] = useState({});

  const [cart, setCart] = useState({});
  const cartItems = useMemo(() => Object.values(cart), [cart]);

  const cartCount = useMemo(
    () => cartItems.reduce((sum, line) => sum + (line.qty || 0), 0),
    [cartItems]
  );
  const cartTotalAmount = useMemo(() => {
    return cartItems.reduce((sum, line) => {
      const priceEach = Number(line.dish?.price || 0);
      return sum + priceEach * (line.qty || 0);
    }, 0);
  }, [cartItems]);

  const [showCartDrawer, setShowCartDrawer] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [walletBalance, setWalletBalance] = useState(null);

  const [existingOrder, setExistingOrder] = useState(null);
  const [cartLocked, setCartLocked] = useState(false);

  const [showLockWarning, setShowLockWarning] = useState(false);
  const [initialMealChoiceOpen, setInitialMealChoiceOpen] = useState(false);
  const [mealDropdownOpen, setMealDropdownOpen] = useState(false);

  const isViewingLockedExistingOrder = !!existingOrder && cartLocked;
  const isEditingExistingOrder = !!existingOrder && !cartLocked;
  const isCreatingNewOrder = !existingOrder && cartCount > 0;

  const fmtNumber = (n) =>
    new Intl.NumberFormat("en-IN", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(Number(n || 0));

  const getDishMacros = (dish) => ({
    calories: dish.calories || dish.kcal || dish.energy || 0,
    protein: dish.protein || 0,
    carbs: dish.carbs || dish.carbohydrates || 0,
    fat: dish.fats || dish.fat || 0,
  });

  const getDishImage = (dish) => {
    if (!dish) return null;
    if (Array.isArray(dish.image_url) && dish.image_url.length > 0) {
      return dish.image_url[0] || null;
    }
    if (typeof dish.image_url === "string" && dish.image_url.trim()) {
      return dish.image_url;
    }
    return null;
  };

  const getIngredientsPreview = (dish) => {
    const full = (dish?.ingredients || "").trim();
    if (!full) return "";
    const id = dish._id || dish.dish_uuid || "";
    const expanded = !!expandedMap[id];
    if (expanded) return full + " ";
    if (full.length <= 80) return full;
    return full.slice(0, 80).trim() + " ...more";
  };

  const shouldShowMoreToggle = (dish) => {
    const full = (dish?.ingredients || "").trim();
    if (!full) return false;
    const id = dish._id || dish.dish_uuid || "";
    if (expandedMap[id]) return true;
    return full.length > 80;
  };

  const toggleExpandIngredients = (dish) => {
    const id = dish._id || dish.dish_uuid || "";
    if (!id) return;
    setExpandedMap((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const cartNutritionTotals = useMemo(() => {
    let totalCals = 0;
    let totalProtein = 0;
    let totalCarbs = 0;
    let totalFat = 0;
    cartItems.forEach((line) => {
      const { dish, qty } = line;
      if (!dish || !qty) return;
      const m = getDishMacros(dish);
      totalCals += m.calories * qty;
      totalProtein += m.protein * qty;
      totalCarbs += m.carbs * qty;
      totalFat += m.fat * qty;
    });
    return {
      calories: totalCals,
      protein: totalProtein,
      carbs: totalCarbs,
      fat: totalFat,
    };
  }, [cartItems]);

  const headerDateText = useMemo(() => {
    if (!mealPlan?.date) return "";
    const d = new Date(mealPlan.date);
    if (isNaN(d.getTime())) return "";
    const weekday = d.toLocaleString("en-GB", { weekday: "long" });
    const dayNum = d.toLocaleString("en-GB", { day: "2-digit" });
    const mon = d.toLocaleString("en-GB", { month: "short" });
    return `For ${weekday}, ${dayNum} ${mon}`;
  }, [mealPlan]);

  const selectedMealLabel = useMemo(
    () => MEAL_NAME_MAP[selectedMealId] || selectedMealId || "",
    [selectedMealId]
  );
  const selectedMealTimeText = useMemo(
    () => MEAL_TIME_MAP[selectedMealId] || "",
    [selectedMealId]
  );

  // include user_title at the top bar
  const displayNameShort = useMemo(() => {
    const full =
      userProfile?.user_title ||
      userProfile?.title ||
      userProfile?.name ||
      userProfile?.customer_name ||
      "";
    if (!full) return "Profile";
    if (full.length <= 15) return full;
    return full.slice(0, 15) + "…";
  }, [userProfile]);

  const visibleDishes = useMemo(() => {
    if (!selectedMealId) return [];
    const slot = mealSlots.find(
      (s) => String(s.meal_id) === String(selectedMealId)
    );
    if (!slot) return [];
    const arr = [];
    slot.dish_ids.forEach((dishId) => {
      const dObj =
        allDishesMap[dishId] || allDishesMap[String(dishId)];
      if (dObj) arr.push(dObj);
    });
    return arr;
  }, [mealSlots, selectedMealId, allDishesMap]);

  // fetch user
  useEffect(() => {
    if (!currentUserUuid) return;
    api
      .get(`/api/users/${currentUserUuid}`)
      .then((res) => {
        setUserProfile(res.data || null);
        if (res.data?.wallet_balance !== undefined) {
          setWalletBalance(res.data.wallet_balance);
        }
      })
      .catch(() => {});
  }, [currentUserUuid]);

  // fetch meal plan and dishes
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setErr("");

        const mpRes = await api.get("/api/meal-plan");
        let plansArray = [];
        if (Array.isArray(mpRes.data?.data)) {
          plansArray = mpRes.data.data;
        } else if (Array.isArray(mpRes.data)) {
          plansArray = mpRes.data;
        }

        const activePlan =
          plansArray.find((p) => Number(p.status) === 1) || null;

        if (!activePlan) {
          if (!alive) return;
          setMealPlan(null);
          setMealSlots([]);
          setSelectedMealId("");
          setAllDishesMap({});
          setErr("No active meal plan.");
          setLoading(false);
          return;
        }

        const initialSlots = Array.isArray(activePlan.plan)
          ? activePlan.plan.map((slot) => ({
              meal_id: slot.meal_id,
              dish_ids: Array.isArray(slot.dish_id)
                ? slot.dish_id
                : [],
            }))
          : [];

        const slotsWithDishes = initialSlots.filter(
          (s) => s.dish_ids.length > 0
        );

        const dishMap = {};
        for (const slot of slotsWithDishes) {
          for (const dishId of slot.dish_ids) {
            try {
              const dRes = await api.get(`/api/dishes/${dishId}`);
              const dObj = dRes.data || {};
              const finalId = dObj._id || dishId;
              dishMap[finalId] = {
                ...dObj,
                _id: finalId,
                dish_uuid: finalId,
              };
            } catch (innerErr) {
              console.error("Failed to load dish", dishId, innerErr);
            }
          }
        }

        if (!alive) return;

        setMealPlan(activePlan);
        setMealSlots(slotsWithDishes);
        setAllDishesMap(dishMap);

        // auto-select meal logic
        if (slotsWithDishes.length === 1) {
          const onlyId = slotsWithDishes[0].meal_id;
          setSelectedMealId(onlyId);
          setInitialMealChoiceOpen(false);
          await checkExistingOrderForSelection(onlyId, activePlan);
        } else if (slotsWithDishes.length > 1) {
          setInitialMealChoiceOpen(true);
        } else {
          setSelectedMealId("");
          setInitialMealChoiceOpen(false);
        }
      } catch (e) {
        console.error("MealPlan load error:", e);
        if (!alive) return;
        setErr(
          e?.response?.data?.message ||
            e?.response?.data?.error ||
            "Unable to load meal plan."
        );
        setMealPlan(null);
        setMealSlots([]);
        setSelectedMealId("");
        setAllDishesMap({});
      } finally {
        alive && setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const setDishQty = (dish, newQty) => {
    const id = dish._id || dish.dish_uuid;
    if (!id) return;
    if (cartLocked && existingOrder) return;

    setCart((prev) => {
      if (!newQty || newQty <= 0) {
        const clone = { ...prev };
        delete clone[id];
        return clone;
      }
      return {
        ...prev,
        [id]: {
          ...(prev[id] || { dish, qty: 0, instructions: "" }),
          dish,
          qty: newQty,
        },
      };
    });
  };

  const updateInstructions = (dishId, text) => {
    if (cartLocked && existingOrder) return;
    setCart((prev) => {
      if (!prev[dishId]) return prev;
      return {
        ...prev,
        [dishId]: {
          ...prev[dishId],
          instructions: text,
        },
      };
    });
  };

  const prefillCartFromOrder = (orderObj) => {
    if (!orderObj?.dish_details) return;
    const newCart = {};
    orderObj.dish_details.forEach((dd) => {
      const dishId = dd.dish_uuid;
      const dishData =
        allDishesMap[dishId] || allDishesMap[String(dishId)];
      if (!dishData) return;
      newCart[dishId] = {
        dish: dishData,
        qty: dd.quantity,
        instructions: "",
      };
    });
    setCart(newCart);
  };

  const cancelEditing = () => {
    if (existingOrder) {
      prefillCartFromOrder(existingOrder);
      setCartLocked(true);
    }
  };

  // checks if an order already exists for (user, meal, date)
  const checkExistingOrderForSelection = async (
    chosenMealId,
    planOverride
  ) => {
    const planObj = planOverride || mealPlan;
    if (!currentUserUuid || !planObj?.date || !chosenMealId) {
      setExistingOrder(null);
      setCartLocked(false);
      return;
    }

    try {
      const params = {
        user_uuid: currentUserUuid,
        meal_id: chosenMealId,
        for_date: planObj.date,
      };
      const resp = await api.get("/api/orders", { params });

      const arr = Array.isArray(resp.data)
        ? resp.data
        : Array.isArray(resp.data?.data)
        ? resp.data.data
        : [];

      if (arr.length > 0) {
        const found = arr[0];
        const isCancelled =
          Number(found.status) === CANCELLED_STATUS_CODE;

        // only show as editable if not cancelled
        if (!isCancelled) {
          setExistingOrder(found);
          prefillCartFromOrder(found);
          setCartLocked(true);
        } else {
          setExistingOrder(null);
          setCartLocked(false);
          setCart({});
        }
      } else {
        setExistingOrder(null);
        setCartLocked(false);
        setCart({});
      }
    } catch (e) {
      console.error("checkExistingOrderForSelection failed", e);
      setExistingOrder(null);
      setCartLocked(false);
    }
  };

  const handleEditExisting = () => {
    setCartLocked(false);
  };

  // 🔁 UPDATED: cancel now uses /admin/orders/:id/cancel with refund
  const cancelExistingOrder = async () => {
    if (!existingOrder?._id) return;
    const sure = window.confirm(
      "Are you sure you want to cancel this order? The amount will be refunded to your wallet."
    );
    if (!sure) return;

    try {
      await api.post(
        `/admin/orders/${existingOrder._id}/cancel`,
        {
          refund: true,
          reason: `Cancelled by Customer #${
            existingOrder.order_number || existingOrder._id
          }`,
        }
      );

      alert("Order cancelled and amount refunded to wallet.");

      // clear order from UI and unlock cart
      setExistingOrder(null);
      setCartLocked(false);
      setCart({});
    } catch (e) {
      alert(
        e?.response?.data?.message ||
          e?.response?.data?.error ||
          "Failed to cancel order"
      );
    }
  };

  const canNavigateAwaySafely = isViewingLockedExistingOrder;

  const attemptSelectMealSlot = async (newMealId) => {
    // guard: can't switch meals if we have a cart in progress and not yet submitted
    if (
      !canNavigateAwaySafely &&
      cartCount > 0 &&
      newMealId !== selectedMealId
    ) {
      setShowLockWarning(true);
      return;
    }

    setSelectedMealId(newMealId);
    setInitialMealChoiceOpen(false);
    setMealDropdownOpen(false);

    await checkExistingOrderForSelection(newMealId);
  };

  const handleGoProfile = () => {
    if (!currentUserUuid) return;

    if (!canNavigateAwaySafely && cartCount > 0) {
      setShowLockWarning(true);
      return;
    }

    window.location.href = `/customer/${currentUserUuid}`;
  };

  const openCartDrawer = () => {
    setShowCartDrawer(true);
  };

  const submitCartOrder = async () => {
    if (!cartItems.length) return;
    setSubmitting(true);
    setSubmitError("");

    try {
      const dish_details = cartItems.map((line) => ({
        dish_uuid: line.dish._id || line.dish.dish_uuid,
        quantity: line.qty,
        price: line.dish.price || 0,
      }));

      const mergedInstructions = cartItems
        .map((line) => {
          const dishName =
            line.dish.title || line.dish.name || "Dish";
          const instr = line.instructions?.trim();
          if (!instr) return "";
          return `${dishName}: ${instr}`;
        })
        .filter(Boolean)
        .join("\n");

      const meal_id = selectedMealId || null;

      let for_date = null;
      if (mealPlan?.date) {
        // you were already doing this logic (18:30:00Z)
        for_date = new Date(`${mealPlan.date}T18:30:00.000Z`);
      }

      const placedByUuid = currentUserUuid || null;

      const body = {
        dish_details,
        amount: cartTotalAmount,
        meal_id,
        for_date,
        instructions: mergedInstructions,
        user_uuid: placedByUuid,
        placed_by: placedByUuid,
      };

      // EDIT FLOW (existing order unlocked)
      if (existingOrder && !cartLocked) {
        await api.put(`/api/orders/${existingOrder._id}`, body);

        alert("✅ Order updated!");

        const refreshed = await api.get(
          `/api/orders/${existingOrder._id}`
        );
        const updatedOrder = refreshed.data || existingOrder;
        setExistingOrder(updatedOrder);

        prefillCartFromOrder(updatedOrder);
        setCartLocked(true);
        setShowCartDrawer(false);
        setSubmitting(false);
        return;
      }

      // NEW ORDER FLOW
      await api.post("/api/orders", body);

      alert("✅ Order placed!");

      setCart({});
      setShowCartDrawer(false);

      // refresh existing order state after placing
      await checkExistingOrderForSelection(selectedMealId);
    } catch (e) {
      const msg =
        e?.response?.data?.message ||
        e?.response?.data?.error ||
        e.message ||
        "Failed to place/update order";
      setSubmitError(msg);
      alert(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const MacroChip = ({ value, label }) => (
    <div className="flex flex-col items-center justify-center border border-gray-300 rounded-xl px-3 py-2 min-w-[70px] bg-white">
      <div className="text-[16px] font-semibold text-gray-900 leading-none">
        {value}
      </div>
      <div className="text-[13px] leading-none text-gray-600 mt-1">
        {label}
      </div>
    </div>
  );

  const DishCartButton = ({ dish }) => {
    const dishId = dish._id || dish.dish_uuid;
    const line = cart[dishId];
    const qty = line?.qty || 0;
    const disabled = cartLocked && !!existingOrder;

    if (!qty) {
      return (
        <button
          className={`w-[110px] rounded-xl border border-green-600 bg-green-50 text-green-700 font-semibold text-lg py-2 flex items-center justify-center gap-2 ${
            disabled ? "opacity-50 cursor-not-allowed" : ""
          }`}
          disabled={disabled}
          onClick={() => !disabled && setDishQty(dish, 1)}
        >
          <span>ADD</span>
          <span className="text-xl leading-none">+</span>
        </button>
      );
    }

    return (
      <div
        className={`flex items-center justify-between w-[110px] rounded-xl border border-green-600 bg-green-50 text-green-700 font-semibold text-lg px-3 py-2 select-none ${
          disabled ? "opacity-50 cursor-not-allowed" : ""
        }`}
      >
        <button
          className="text-xl leading-none px-1 disabled:opacity-50"
          disabled={disabled}
          onClick={() => !disabled && setDishQty(dish, qty - 1)}
        >
          –
        </button>
        <div className="text-base font-bold">{qty}</div>
        <button
          className="text-xl leading-none px-1 disabled:opacity-50"
          disabled={disabled}
          onClick={() => !disabled && setDishQty(dish, qty + 1)}
        >
          +
        </button>
      </div>
    );
  };

  const DishRow = ({ dish }) => {
    const img = getDishImage(dish);
    const price = dish.price || 0;
    const macros = getDishMacros(dish);

    const ingText = getIngredientsPreview(dish);
    const showToggle = shouldShowMoreToggle(dish);

    return (
      <div className="border-b border-gray-300 py-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="text-[18px] font-semibold text-gray-900 leading-snug">
              {dish.title || dish.name || "Dish"}
            </div>

            <div className="mt-1 text-[16px] font-medium text-gray-900">
              ₹{fmtNumber(price)}
            </div>

            {ingText ? (
              <div className="mt-3 text-[14px] text-gray-700 leading-snug">
                {ingText}
                {showToggle && (
                  <button
                    className="text-green-700 font-medium ml-1"
                    onClick={() => toggleExpandIngredients(dish)}
                  >
                    {expandedMap[dish._id || dish.dish_uuid]
                      ? "...less"
                      : ""}
                  </button>
                )}
              </div>
            ) : null}
          </div>

          <div className="flex-shrink-0 flex flex-col items-center">
            {img ? (
              <div className="w-[110px] h-[110px] rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center mb-2">
                <img
                  src={img}
                  alt={dish.title || "dish photo"}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
            ) : null}

            <DishCartButton dish={dish} />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2 text-[14px] text-gray-900">
          <MacroChip value={`${fmtNumber(macros.calories)}`} label="kcal" />
          <MacroChip
            value={`${fmtNumber(macros.protein)}g`}
            label="protein"
          />
          <MacroChip
            value={`${fmtNumber(macros.carbs)}g`}
            label="carbs"
          />
          <MacroChip value={`${fmtNumber(macros.fat)}g`} label="fat" />
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white text-gray-700 flex items-center justify-center">
        Loading…
      </div>
    );
  }

  // 🔁 UPDATED: friendly "cooking" message instead of harsh no-plan
  if (err || !mealPlan || !mealSlots.length) {
    if (
      err === "No active meal plan." ||
      !mealPlan ||
      !mealSlots.length
    ) {
      return (
        <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4 text-center text-gray-700">
          <div className="text-lg font-semibold text-green-700 mb-2">
            Your next meal plan is cooking! 🍲
          </div>
          <div className="text-sm text-gray-600">
            Please check back soon.
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-white text-red-600 flex flex-col items-center justify-center px-4 text-center">
        <div className="text-lg font-semibold mb-2">
          Something went wrong
        </div>
        <div className="text-sm">{err}</div>
      </div>
    );
  }

  // CART DRAWER
  const cartDrawer = showCartDrawer ? (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
      onClick={() => setShowCartDrawer(false)}
    >
      <div
        className="bg-white rounded-t-2xl w-full max-w-xl p-4 max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="text-lg font-semibold">Your Cart</div>
          <button
            className="text-sm text-gray-500"
            onClick={() => setShowCartDrawer(false)}
          >
            Close
          </button>
        </div>

        {walletBalance !== null && (
          <div className="text-[13px] text-gray-700 mb-4">
            Wallet Balance:{" "}
            <span className="font-semibold text-gray-900">
              ₹{fmtNumber(walletBalance)}
            </span>
          </div>
        )}

        <div className="overflow-y-auto flex-1 pr-1">
          {cartItems.length === 0 ? (
            <div className="text-center text-gray-500 text-sm py-10">
              Cart is empty.
            </div>
          ) : (
            cartItems.map((line) => {
              const dish = line.dish;
              const dishId = dish._id || dish.dish_uuid;
              const disabled = cartLocked && !!existingOrder;
              const priceEach = Number(dish?.price || 0);

              return (
                <div
                  key={dishId}
                  className="border-b border-gray-200 pb-4 mb-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="text-[16px] font-semibold text-gray-900 leading-snug">
                        {dish.title || dish.name || "Dish"}
                      </div>
                      <div className="text-[14px] text-gray-700 leading-tight">
                        ₹{fmtNumber(priceEach)} each
                      </div>
                    </div>

                    <div className="flex-shrink-0">
                      <div
                        className={`flex items-center justify-between min-w-[110px] rounded-xl border border-green-600 bg-green-50 text-green-700 font-semibold text-lg px-3 py-2 select-none ${
                          disabled
                            ? "opacity-50 cursor-not-allowed"
                            : ""
                        }`}
                      >
                        <button
                          className="text-xl leading-none px-1 disabled:opacity-50"
                          disabled={disabled}
                          onClick={() =>
                            !disabled &&
                            setDishQty(dish, line.qty - 1)
                          }
                        >
                          –
                        </button>
                        <div className="text-base font-bold">
                          {line.qty}
                        </div>
                        <button
                          className="text-xl leading-none px-1 disabled:opacity-50"
                          disabled={disabled}
                          onClick={() =>
                            !disabled &&
                            setDishQty(dish, line.qty + 1)
                          }
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3">
                    <label className="block text-[13px] font-medium text-gray-700 mb-1">
                      Cooking Instructions
                    </label>
                    <textarea
                      className={`w-full border rounded-lg p-2 text-[14px] text-gray-800 placeholder-gray-400 ${
                        disabled
                          ? "bg-gray-100 text-gray-500 cursor-not-allowed"
                          : ""
                      }`}
                      placeholder="Any cooking instructions for this dish…"
                      value={line.instructions || ""}
                      onChange={(e) =>
                        updateInstructions(
                          dishId,
                          e.target.value
                        )
                      }
                      disabled={disabled}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {cartItems.length > 0 && (
          <div className="mt-2 text-[13px] text-gray-700 leading-snug border-t border-gray-300 pt-3">
            <div className="text-gray-900 mb-1 font-medium">
              Today's Intake (Selected Items)
            </div>
            <div className="flex flex-wrap gap-3 text-[13px]">
              <div>
                <span className="font-medium">
                  {fmtNumber(cartNutritionTotals.calories)}
                </span>{" "}
                kcal
              </div>
              <div>
                <span className="font-medium">
                  {fmtNumber(cartNutritionTotals.protein)}
                </span>{" "}
                g protein
              </div>
              <div>
                <span className="font-medium">
                  {fmtNumber(cartNutritionTotals.carbs)}
                </span>{" "}
                g carbs
              </div>
              <div>
                <span className="font-medium">
                  {fmtNumber(cartNutritionTotals.fat)}
                </span>{" "}
                g fat
              </div>
            </div>

            <div className="mt-2 text-[13px] text-gray-600">
              Cart Total:{" "}
              <span className="font-semibold text-gray-900">
                ₹{fmtNumber(cartTotalAmount)}
              </span>
            </div>

            {submitError && (
              <div className="text-red-600 text-[13px] mt-2">
                {submitError}
              </div>
            )}

            <button
              disabled={submitting || (existingOrder && cartLocked)}
              onClick={submitCartOrder}
              className="w-full mt-3 bg-green-700 text-white rounded-xl px-4 py-3 text-base font-semibold disabled:opacity-50"
            >
              {submitting
                ? "Submitting..."
                : `Submit • ₹${fmtNumber(
                    cartTotalAmount
                  )}`}
            </button>
          </div>
        )}
      </div>
    </div>
  ) : null;

  const initialMealChoiceModal =
    initialMealChoiceOpen && mealSlots.length > 1 ? (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
        <div className="bg-white w-full max-w-sm rounded-xl p-5 shadow-2xl">
          <div className="text-base font-semibold text-gray-900 mb-2">
            Choose a meal
          </div>
          <div className="text-sm text-gray-600 mb-4">
            Which meal do you want to order right now?
          </div>

          <div className="space-y-3">
            {mealSlots.map((slot) => (
              <button
                key={slot.meal_id}
                className="w-full border border-green-600 rounded-lg py-3 px-4 text-left text-green-700 font-semibold bg-green-50"
                onClick={() => attemptSelectMealSlot(slot.meal_id)}
              >
                <div className="flex flex-col">
                  <div>
                    {MEAL_NAME_MAP[slot.meal_id] ||
                      slot.meal_id}
                  </div>
                  {MEAL_TIME_MAP[slot.meal_id] ? (
                    <div className="text-[12px] text-gray-600 font-normal">
                      {MEAL_TIME_MAP[slot.meal_id]}
                    </div>
                  ) : null}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    ) : null;

  const lockWarningPopup = showLockWarning ? (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white w-full max-w-sm rounded-xl p-4 shadow-2xl relative">
        <button
          className="absolute right-3 top-3 text-gray-500 text-sm"
          onClick={() => setShowLockWarning(false)}
        >
          ✕
        </button>
        <div className="text-sm text-gray-700 leading-snug pr-6">
          Submit this order first, then create a new one.
        </div>
      </div>
    </div>
  ) : null;

  const headerBar = (
    <header className="sticky top-0 z-40 bg-green-700 text-white">
      <div className="max-w-xl mx-auto px-4 py-3 border-b border-green-800">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div className="flex flex-col text-white min-w-0">
            <button
              onClick={handleGoProfile}
              className="flex items-center gap-2 text-left"
              title="Profile"
            >
              <span className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white text-sm font-semibold border border-white/40 leading-none select-none">
                👤
              </span>
              <span className="text-lg font-semibold leading-tight text-white truncate max-w-[140px]">
                {displayNameShort}
              </span>
            </button>

            {headerDateText ? (
              <div className="text-[13px] font-medium text-green-100 leading-tight mt-2">
                {headerDateText}
              </div>
            ) : null}
          </div>

          <div className="flex-shrink-0 relative text-right">
            {mealSlots.length > 0 ? (
              <button
                onClick={() =>
                  setMealDropdownOpen((o) => !o)
                }
                className="bg-white text-green-700 text-sm font-medium px-3 py-2 rounded-lg border border-green-700 flex items-center gap-2"
              >
                <span>
                  {selectedMealLabel || "Select Meal"}
                </span>
                <span className="text-green-700 text-sm leading-none">
                  ▼
                </span>
              </button>
            ) : null}

            {selectedMealTimeText ? (
              <div className="text-[12px] text-green-100 leading-tight mt-1 whitespace-nowrap">
                {selectedMealTimeText}
              </div>
            ) : null}

            {mealDropdownOpen ? (
              <div className="absolute right-0 mt-2 bg-white border border-gray-300 rounded-md shadow-lg z-[60] w-44">
                {mealSlots.map((slot) => (
                  <button
                    key={slot.meal_id}
                    onClick={() =>
                      attemptSelectMealSlot(slot.meal_id)
                    }
                    className="w-full text-left text-[14px] px-3 py-2 hover:bg-green-50 whitespace-normal"
                  >
                    <div className="font-medium text-green-800">
                      {MEAL_NAME_MAP[slot.meal_id] ||
                        slot.meal_id}
                    </div>
                    {MEAL_TIME_MAP[slot.meal_id] ? (
                      <div className="text-[12px] text-gray-600">
                        {MEAL_TIME_MAP[slot.meal_id]}
                      </div>
                    ) : null}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );

  const bottomBar =
    cartCount > 0 || isViewingLockedExistingOrder ? (
      <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center">
        <div className="w-full max-w-xl px-4 pb-4 space-y-2">
          {isViewingLockedExistingOrder && (
            <>
              <div className="text-center text-[13px] text-gray-800 bg-yellow-50 border border-yellow-300 rounded-lg px-3 py-2 leading-snug">
                Order already placed for the schedule
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={cancelExistingOrder}
                  className="flex-1 bg-white text-red-600 border border-red-600 rounded-xl px-4 py-3 text-base font-semibold flex items-center justify-center"
                >
                  CANCEL ORDER
                </button>

                <button
                  onClick={handleEditExisting}
                  className="flex-1 bg-green-700 text-white rounded-xl px-4 py-3 text-base font-semibold flex items-center justify-center text-center"
                >
                  EDIT ORDER • ₹{fmtNumber(cartTotalAmount)}
                </button>
              </div>
            </>
          )}

          {isEditingExistingOrder && (
            <div className="flex flex-col gap-3">
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={cancelEditing}
                  className="flex-1 bg-white text-green-700 border border-green-700 rounded-xl px-4 py-3 text-base font-semibold flex items-center justify-center"
                >
                  Cancel Editing
                </button>

                <button
                  onClick={openCartDrawer}
                  className="flex-1 bg-green-700 text-white rounded-xl px-4 py-3 text-base font-semibold flex items-center justify-between"
                >
                  <span>
                    {cartCount}{" "}
                    {cartCount === 1 ? "item" : "items"}
                  </span>
                  <span className="underline font-medium">
                    View Cart &gt;
                  </span>
                </button>
              </div>
            </div>
          )}

          {!existingOrder && cartCount > 0 && (
            <button
              onClick={openCartDrawer}
              className="w-full bg-green-700 text-white rounded-xl px-4 py-3 text-base font-semibold flex items-center justify-between"
            >
              <span>
                {cartCount}{" "}
                {cartCount === 1 ? "item" : "items"}
              </span>
              <span className="underline font-medium">
                View Cart &gt;
              </span>
            </button>
          )}
        </div>
      </div>
    ) : null;

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {headerBar}

      <main className="flex-1 max-w-xl mx-auto w-full px-4 pt-2 pb-24 bg-white">
        {!selectedMealId ? (
          <div className="text-center text-gray-500 text-sm py-10">
            Please choose a meal to continue.
          </div>
        ) : visibleDishes.length === 0 ? (
          <div className="text-center text-gray-500 text-sm py-10">
            No dishes available for this meal slot.
          </div>
        ) : (
          visibleDishes.map((d) => (
            <DishRow key={d._id || d.dish_uuid} dish={d} />
          ))
        )}
      </main>

      {bottomBar}
      {cartDrawer}
      {initialMealChoiceModal}
      {lockWarningPopup}
    </div>
  );
}
