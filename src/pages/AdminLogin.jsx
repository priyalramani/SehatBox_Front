// src/pages/AdminLogin.jsx
import React, { useState } from "react";
import axios from "axios";
import setAuthToken from "../lib/setAuthToken"; // ⬅️ add this

const API = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";

export default function AdminLogin() {
  const [email, setEmail] = useState("admin3@local");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      const { data } = await axios.post(`${API}/admin/login`, { email, password });
      if (!data?.success || !data?.token) throw new Error(data?.message || "Login failed");

      // save + immediately apply the token for all axios calls
      localStorage.setItem("adminToken", data.token);
      localStorage.setItem("adminUser", JSON.stringify(data.user));
      setAuthToken(data.token); // ⬅️ critical

      // go to admin home (users list will now work without a refresh)
      window.location.href = "/";
    } catch (e) {
      setErr(e?.response?.data?.message || e?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <form onSubmit={onSubmit} className="w-full max-w-sm bg-white shadow rounded-xl p-6 space-y-4">
        <h1 className="text-2xl font-semibold text-center">Admin Login</h1>
        {err && <div className="text-sm text-red-600">{err}</div>}
        <div className="space-y-1">
          <label className="text-sm">Email</label>
          <input
            className="w-full border rounded-lg px-3 py-2"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin3@local"
            autoComplete="username"
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm">Password</label>
          <input
            type="password"
            className="w-full border rounded-lg px-3 py-2"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="current-password"
          />
        </div>
        <button disabled={loading} className="w-full rounded-lg bg-black text-white py-2 disabled:opacity-60">
          {loading ? "Signing in…" : "Sign In"}
        </button>
      </form>
    </div>
  );
}
