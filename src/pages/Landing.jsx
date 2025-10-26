// src/pages/Landing.jsx
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function Landing() {
  const navigate = useNavigate();

  useEffect(() => {
    // check for token in localStorage
    const token =
      localStorage.getItem("adminToken") ||
      localStorage.getItem("admin_token");

    if (token) {
      // logged in -> go to dashboard/home
      navigate("/dishes", { replace: true });
    } else {
      // not logged in -> go to login
      navigate("/admin-login", { replace: true });
    }
  }, [navigate]);

  // nothing visible, just a blank "deciding..." page
  return null;
}
