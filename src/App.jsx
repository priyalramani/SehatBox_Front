// src/App.jsx
import { BrowserRouter, Routes, Route, Outlet } from "react-router-dom";
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

// ✅ import MealPlanner from corrected path
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
            {/* Public admin login route */}
            <Route path="/admin-login" element={<AdminLogin />} />

            {/* Admin pages (with Navbar) */}
            <Route element={<AdminLayout />}>
              {/* Dashboard home */}
              <Route path="/" element={<Home />} />

              {/* Dishes */}
              <Route
                path="/dishes"
                element={
                  <AdminRoute>
                    <Dishes />
                  </AdminRoute>
                }
              />
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

              {/* Add Order (legacy URL) */}
              <Route
                path="/addorder"
                element={
                  <AdminRoute>
                    <AddOrder />
                  </AdminRoute>
                }
              />

              {/* New order URLs */}
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

              {/* ✅ Meal Planner route */}
              <Route
                path="/meal-planner"
                element={
                  <AdminRoute>
                    <MealPlanner />
                  </AdminRoute>
                }
              />

              {/* legacy login */}
              <Route path="/login" element={<Login />} />
            </Route>

            {/* Customer / mobile routes */}
            <Route element={<MobileLayout />}>
              <Route path="/meal" element={<MealPlan />} />
              <Route path="/meal/:user_uuid" element={<MealPlan />} />
              <Route path="/customer/:id" element={<CustomerProfile />} />
            </Route>

            {/* 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </DishesProvider>
      </UsersProvider>
    </BrowserRouter>
  );
}
