// src/pages/AdminLogin.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import http from "../api/http.js";
import setAuthToken from "../lib/setAuthToken";

export default function AdminLogin() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");        // empty in prod
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    setLoading(true);

    try {
      // hit backend
      const { data } = await http.post("/admin/login", {
        email,
        password,
      });

      // backend should respond with { success, token, user }
      if (!data?.success || !data?.token) {
        throw new Error(data?.message || "Login failed");
      }

      // persist auth
      localStorage.setItem("adminToken", data.token);
      localStorage.setItem(
        "adminUser",
        JSON.stringify(data.user ?? data.adminUser ?? "")
      );

      // set Authorization header for axios for this session
      setAuthToken(data.token);

      // ✅ IMPORTANT: send admin to /admin-home
      navigate("/admin-home", { replace: true });
    } catch (err) {
      setErr(
        err?.response?.data?.message ||
          err?.message ||
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
