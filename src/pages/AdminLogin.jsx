// src/pages/AdminLogin.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/axios";        // 🔁 use the SAME client as Users/AddOrder
import setAuthToken from "../lib/setAuthToken";

export default function AdminLogin() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    setLoading(true);

    try {
      // 🔁 IMPORTANT: this matches Users/AddOrder style
      const { data } = await api.post("/api/admin/login", {
        email,
        password,
      });

      if (!data?.success || !data?.token) {
        throw new Error(data?.message || "Login failed");
      }

      // store token and user
      localStorage.setItem("adminToken", data.token);
      localStorage.setItem(
        "adminUser",
        JSON.stringify(data.user ?? data.adminUser ?? "")
      );

      // apply token to axios for future requests
      setAuthToken(data.token);

      // ✅ go to /admin-home (NOT "/")
      navigate("/admin-home", { replace: true });
    } catch (e) {
      setErr(
        e?.response?.data?.message ||
          e?.message ||
          "Login failed"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm bg-white shadow rounded-xl p-6 space-y-4"
      >
        <h1 className="text-2xl font-semibold text-center">
          Admin Login
        </h1>

        {err && (
          <div className="text-sm text-red-600">
            {err}
          </div>
        )}

        <div className="space-y-1">
          <label className="text-sm">Email</label>
          <input
            className="w-full border rounded-lg px-3 py-2"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your admin email"
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

        <button
          disabled={loading}
          className="w-full rounded-lg bg-black text-white py-2 disabled:opacity-60"
        >
          {loading ? "Signing in…" : "Sign In"}
        </button>
      </form>
    </div>
  );
}
