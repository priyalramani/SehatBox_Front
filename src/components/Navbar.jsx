// src/components/Navbar.jsx
import { Link, NavLink, useNavigate } from "react-router-dom";

export default function Navbar() {
  const navigate = useNavigate();
  const isAdmin = !!localStorage.getItem("adminToken");

  const linkClass = ({ isActive }) =>
    [
      "no-underline",
      "inline-block",
      "px-3 py-2 rounded-lg",
      "text-sm font-medium",
      isActive ? "bg-green-600 text-white" : "text-gray-700 hover:bg-gray-100",
    ].join(" ");

  const logout = () => {
    localStorage.removeItem("adminToken");
    localStorage.removeItem("adminUser");
    navigate("/admin-login", { replace: true });
  };

  return (
    <header className="sticky top-0 z-50 bg-white border-b shadow">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Brand */}
        <Link to="/" className="no-underline flex items-center gap-2">
          <span className="inline-flex items-center justify-center w-8 h-8 rounded bg-green-600 text-white text-sm font-bold">
            SB
          </span>
          <span className="text-lg font-bold text-green-700">Sehat Box</span>
        </Link>

        <nav className="flex gap-2">
          <NavLink to="/admin-home" className={linkClass} end>
            Home
          </NavLink>

          <NavLink to="/addorder" className={linkClass}>
            Add Order
          </NavLink>

          <NavLink to="/all-orders" className={linkClass}>
            All Orders
          </NavLink>

          <NavLink to="/dishes" className={linkClass}>
            Dishes
          </NavLink>

          <NavLink to="/users" className={linkClass}>
            Users
          </NavLink>

          <NavLink to="/meal-planner" className={linkClass}>
            Meal Planner
          </NavLink>

          {isAdmin ? (
            <button
              onClick={logout}
              className="inline-block px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100"
            >
              Logout
            </button>
          ) : (
            <NavLink to="/admin-login" className={linkClass}>
              Login
            </NavLink>
          )}
        </nav>
      </div>
    </header>
  );
}
