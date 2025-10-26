import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import axios from "axios";

const API = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";

export default function AdminRoute({ children }) {
  const [ok, setOk] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("adminToken");
    if (!token) { setChecked(true); return; }

    (async () => {
      try {
        const { data } = await axios.get(`${API}/admin/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setOk(Boolean(data?.success));
      } catch {
        setOk(false);
      } finally {
        setChecked(true);
      }
    })();
  }, []);

  if (!checked) return <div className="p-6">Checking admin…</div>;
  if (!ok) return <Navigate to="/admin-login" replace />;
  return children;
}
