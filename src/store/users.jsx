import { createContext, useContext, useEffect, useMemo, useState } from "react";

const LS_KEY = "healthy_food_users_v1";

const sample = [
  { id: "u1", mobile: "9876543210", balance: 150, status: "on",  type: "customer", createdAt: new Date().toISOString() },
  { id: "u2", mobile: "9123456780", balance:   0, status: "off", type: "customer", createdAt: new Date(Date.now()-86400000).toISOString() },
];

function newId() {
  return Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
}

const Ctx = createContext(null);

export function UsersProvider({ children }) {
  const [users, setUsers] = useState(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      return raw ? JSON.parse(raw) : sample;
    } catch {
      return sample;
    }
  });

  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify(users));
  }, [users]);

  const api = useMemo(() => ({
    users,
    createUser: (data) => {
      const user = {
        id: newId(),
        balance: 0,
        type: "customer",
        createdAt: new Date().toISOString(),
        status: "on",
        ...data,
      };
      setUsers((prev) => [user, ...prev]);
      return user;
    },
    updateUser: (id, patch) => {
      setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, ...patch } : u)));
    },
    deleteUser: (id) => {
      setUsers((prev) => prev.filter((u) => u.id !== id));
    },
  }), [users]);

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useUsers() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useUsers must be used within UsersProvider");
  return ctx;
}
