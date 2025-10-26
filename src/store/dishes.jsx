import { createContext, useContext, useEffect, useMemo, useState } from "react";

const LS_KEY = "healthy_food_dishes_v1";

const sample = [
  { id: "1", title: "Sprout Chaat", ingredients: "sprouts, onion, tomato, lemon", status: "on" },
  { id: "2", title: "Paneer Salad Bowl", ingredients: "paneer, capsicum, lettuce", status: "off" },
  { id: "3", title: "Corn Salad",   ingredients: "corn, cucumber, pepper, salt",  status: "on" },
];

function newId() {
  return Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
}

const Ctx = createContext(null);

export function DishesProvider({ children }) {
  const [dishes, setDishes] = useState(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      return raw ? JSON.parse(raw) : sample;
    } catch {
      return sample;
    }
  });

  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify(dishes));
  }, [dishes]);

  const api = useMemo(() => ({
    dishes,
    getById: (id) => dishes.find((d) => (d.id || d._id) === id),
    createDish: (data) => {
      const dish = { id: newId(), status: "on", ...data };
      setDishes((prev) => [dish, ...prev]);
      return dish;
    },
    updateDish: (id, patch) => {
      setDishes((prev) => prev.map((d) => ((d.id || d._id) === id ? { ...d, ...patch } : d)));
    },
    deleteDish: (id) => {
      setDishes((prev) => prev.filter((d) => (d.id || d._id) !== id));
    },
  }), [dishes]);

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useDishes() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useDishes must be used within DishesProvider");
  return ctx;
}
