// src/pages/Landing.jsx
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../lib/axios"; // admin axios (has admin token)
import { customerApi, getCustomerUuid } from "../lib/customerApi";

// Helper: check if we have what looks like admin token in localStorage
function getAdminToken() {
  return (
    localStorage.getItem("auth-token") ||
    localStorage.getItem("admin_token") ||
    ""
  );
}

export default function Landing() {
  const navigate = useNavigate();

  useEffect(() => {
    const tryRedirect = async () => {
      // 1. Try admin first
      const adminT = getAdminToken();
      if (adminT) {
        try {
          // verify admin session by calling /api/admin/me
          await api.get("/admin/me", {
            // api already attaches Authorization for you
            withCredentials: true,
          });
          navigate("/dishes", { replace: true });
          return;
        } catch {
          // invalid admin token, continue to customer check
        }
      }

      // 2. Try customer session
      const uuid = getCustomerUuid();
      if (uuid) {
        try {
          await customerApi.get("/customer/me");
          navigate(`/customer/${uuid}`, { replace: true });
          return;
        } catch {
          // invalid/expired customer token
        }
      }

      // 3. Fallback: go to admin-login for now
      navigate("/admin-login", { replace: true });
    };

    tryRedirect();
  }, [navigate]);

  // Very small fallback UI while deciding
  return (
    <div className="min-h-screen flex items-center justify-center text-gray-600">
      <div className="text-center space-y-2">
        <div className="text-lg font-medium">Loading…</div>
        <div className="text-sm text-gray-500">
          Redirecting you to the correct place.
        </div>
      </div>
    </div>
  );
}
