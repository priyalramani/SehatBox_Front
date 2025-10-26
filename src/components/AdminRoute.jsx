import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import http from "../api/http.js"; // use the shared axios instance

export default function AdminRoute({ children }) {
  const [ok, setOk] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    // get admin token from localStorage (same logic you had)
    const token =
      localStorage.getItem("adminToken") ||
      localStorage.getItem("admin_token");

    // if there's no token at all, don't even bother calling backend
    if (!token) {
      setOk(false);
      setChecked(true);
      return;
    }

    (async () => {
      try {
        // IMPORTANT:
        // We now call /api/admin/me directly using the shared axios client.
        // http has baseURL = "" in production, so this becomes:
        //   https://sehatbox.in/api/admin/me
        //
        // Nginx proxies /api -> http://localhost:4000/
        // so backend sees:    /admin/me
        const { data } = await http.get("/api/admin/me", {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true,
        });

        // keep your existing success flag logic
        setOk(Boolean(data?.success));
      } catch (err) {
        console.error("Admin auth check failed:", err?.response?.status, err?.message);
        setOk(false);
      } finally {
        setChecked(true);
      }
    })();
  }, []);

  // while we haven't finished checking auth, show a lightweight placeholder
  if (!checked) {
    return <div className="p-6">Checking admin…</div>;
  }

  // if not ok -> bounce to login
  if (!ok) {
    return <Navigate to="/admin-login" replace />;
  }

  // if ok -> render protected content
  return children;
}
