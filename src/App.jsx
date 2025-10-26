// src/App.jsx
import {
  BrowserRouter,
  Routes,
  Route,
  Outlet,
  Navigate,
} from "react-router-dom";
import { DishesProvider } from "./store/dishes";
import { UsersProvider } from "./store/users";

import Navbar from "./components/Navbar";
import AdminRoute from "./components/AdminRoute";

import Home from "./pages/Home";
import Dishes from "./pages/Dishes";
import DishDetails from "./pages/DishDetails";
import Users from "./pages/Users";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";

import MealPlan from "./pages/user/MealPlan";
import CustomerProfile from "./pages/user/CustomerProfile";

import AdminLogin from "./pages/AdminLogin";
import AddOrder from "./pages/AddOrder";
import AllOrders from "./pages/AllOrders";
import MealPlanner from "./pages/MealPlanner";

/* --------------------------- Layouts --------------------------- */

function AdminLayout() {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <Navbar />
      <Outlet />
    </div>
  );
}

function MobileLayout() {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      <Outlet />
    </div>
  );
}

/* ----------------------------- App ----------------------------- */

export default function App() {
  return (
    <BrowserRouter>
      <UsersProvider>
        <DishesProvider>
          <Routes>
            {/* 👇 Public redirect:
                Always send "/" to login. This protects the root domain. */}
            <Route path="/" element={<Navigate to="/admin-login" replace />} />

            {/* Public route: Admin login */}
            <Route path="/admin-login" element={<AdminLogin />} />

            {/* Admin routes (show Navbar, require auth via AdminRoute) */}
            <Route element={<AdminLayout />}>
              {/* NEW: Admin home dashboard after login */}
              <Route
                path="/admin-home"
                element={
                  <AdminRoute>
                    <Home />
                  </AdminRoute>
                }
              />

              {/* Dishes list */}
              <Route
                path="/dishes"
                element={
                  <AdminRoute>
                    <Dishes />
                  </AdminRoute>
                }
              />

              {/* Single dish details */}
              <Route
                path="/dishes/:id"
                element={
                  <AdminRoute>
                    <DishDetails />
                  </AdminRoute>
                }
              />

              {/* Users */}
              <Route
                path="/users"
                element={
                  <AdminRoute>
                    <Users />
                  </AdminRoute>
                }
              />

              {/* All Orders */}
              <Route
                path="/all-orders"
                element={
                  <AdminRoute>
                    <AllOrders />
                  </AdminRoute>
                }
              />

              {/* Add Order (legacy) */}
              <Route
                path="/addorder"
                element={
                  <AdminRoute>
                    <AddOrder />
                  </AdminRoute>
                }
              />

              {/* Orders routes */}
              <Route
                path="/orders"
                element={
                  <AdminRoute>
                    <AllOrders />
                  </AdminRoute>
                }
              />
              <Route
                path="/orders/new"
                element={
                  <AdminRoute>
                    <AddOrder />
                  </AdminRoute>
                }
              />
              <Route
                path="/orders/edit"
                element={
                  <AdminRoute>
                    <AddOrder />
                  </AdminRoute>
                }
              />

              {/* Meal Planner */}
              <Route
                path="/meal-planner"
                element={
                  <AdminRoute>
                    <MealPlanner />
                  </AdminRoute>
                }
              />

              {/* Old login route if still used anywhere in code */}
              <Route path="/login" element={<Login />} />
            </Route>

            {/* Customer / mobile routes (no Navbar) */}
            <Route element={<MobileLayout />}>
              <Route path="/meal" element={<MealPlan />} />
              <Route path="/meal/:user_uuid" element={<MealPlan />} />
              <Route path="/customer/:id" element={<CustomerProfile />} />
            </Route>

            {/* 404 fallback */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </DishesProvider>
      </UsersProvider>
    </BrowserRouter>
  );
}
