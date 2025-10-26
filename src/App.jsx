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

import Landing from "./pages/Landing.jsx"; // <-- NEW redirect logic

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
            {/* Root: decide based on token.
               Landing will redirect:
               - if logged in  -> /dishes
               - if not logged -> /admin-login
            */}
            <Route path="/" element={<Landing />} />

            {/* Public/admin login routes */}
            <Route path="/admin-login" element={<AdminLogin />} />
            <Route path="/login" element={<Login />} />

            {/* Admin routes (show Navbar + require auth via AdminRoute) */}
            <Route element={<AdminLayout />}>
              {/* Home / dashboard */}
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

              {/* Single Dish view */}
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

              {/* All Orders list */}
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

              {/* Orders grouped routes */}
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
            </Route>

            {/* Customer / mobile routes (no Navbar) */}
            <Route element={<MobileLayout />}>
              <Route path="/meal" element={<MealPlan />} />
              <Route path="/meal/:user_uuid" element={<MealPlan />} />
              <Route path="/customer/:id" element={<CustomerProfile />} />
            </Route>

            {/* Fallback 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </DishesProvider>
      </UsersProvider>
    </BrowserRouter>
  );
}
