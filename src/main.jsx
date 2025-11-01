// src/main.jsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Toaster } from "react-hot-toast";
import "./index.css";
import App from "./App.jsx";

// ⬇️ import our helper
import setAuthToken from "./lib/setAuthToken.js";

// ⬇️ set global Authorization header at app start
setAuthToken(localStorage.getItem("auth-token"));

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
    <Toaster position="top-right" />
  </StrictMode>
);
