import { BrowserRouter, Routes, Route } from "react-router-dom"

import { DishesProvider } from "./store/dishes"
import { UsersProvider } from "./store/users"

import AdminLayout from "./layouts/AdminLayout.jsx"
import CustomerLayout from "./layouts/CustomerLayout.jsx"

import Home from "./pages/Home"
import Dishes from "./pages/Dishes"
import DishDetails from "./pages/DishDetails"
import Users from "./pages/Users"
import NotFound from "./pages/NotFound"
// import Login from "./pages/Login"

import MealPlan from "./pages/user/MealPlan"
import CustomerProfile from "./pages/user/CustomerProfile"

import AdminLogin from "./pages/AdminLogin"
import AddOrder from "./pages/AddOrder"
import AllOrders from "./pages/AllOrders"
import MealPlanner from "./pages/MealPlanner"

import Landing from "./pages/Landing.jsx"
import CashFlowStatement from "./pages/CashFlowStatement.jsx"

export default function App() {
	return (
		<BrowserRouter>
			<UsersProvider>
				<DishesProvider>
					<Routes>
						<Route path='/' element={<Landing />} />

						<Route path='/admin-login' element={<AdminLogin />} />
						{/* <Route path='/login' element={<Login />} /> */}

						<Route element={<AdminLayout />}>
							<Route path='/admin-home' element={<Home />} />
							<Route path='/dishes' element={<Dishes />} />
							<Route path='/dishes/:id' element={<DishDetails />} />
							<Route path='/users' element={<Users />} />
							<Route path='/all-orders' element={<AllOrders />} />
							<Route path='/addorder' element={<AddOrder />} />
							<Route path='/orders' element={<AllOrders />} />
							<Route path='/orders/new' element={<AddOrder />} />
							<Route path='/orders/edit' element={<AddOrder />} />
							<Route path='/meal-planner' element={<MealPlanner />} />
							<Route path='/cashflow-statement' element={<CashFlowStatement />} />
						</Route>

						<Route element={<CustomerLayout />}>
							<Route path='/meal/:user_uuid' element={<MealPlan />} />
							<Route path='/customer/:user_uuid' element={<CustomerProfile />} />
						</Route>

						<Route path='*' element={<NotFound />} />
					</Routes>
				</DishesProvider>
			</UsersProvider>
		</BrowserRouter>
	)
}
