import { BrowserRouter, Routes, Route } from "react-router-dom";
import Register from "./pages/Register";
import Login from "./pages/Login";
import "./index.css";
import Dashboard from "./pages/UserDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import ProtectedRoute from "./routes/ProtectedRoute";
import MyLeaves from "./components/user/MyLeaves";
import DashboardHome from "./components/user/DashboardHome";
import ApplyLeave from "./components/user/ApplyLeave";
import UserNotificationsPage from "./components/user/NotificationsPage";
import UserProfile from "./components/user/UserProfile";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />

        <Route
          path="/employee"
          element={
            <ProtectedRoute requiredRole="employee">
              <Dashboard />
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardHome />} />
          <Route path="dashboard" element={<DashboardHome />} />
          <Route path="my-leaves" element={<MyLeaves />} />
          <Route path="apply-leave" element={<ApplyLeave />} />
          <Route
            path="user-notifications"
            element={<UserNotificationsPage />}
          />
          <Route path="profile" element={<UserProfile />} />
        </Route>

        <Route
          path="/admin/*"
          element={
            <ProtectedRoute requiredRole="admin">
              <AdminDashboard />
            </ProtectedRoute>
          }
        ></Route>

        {/* <Route
          path="/superadmin"
          element={
            <ProtectedRoute requiredRole="superadmin">
              <AdminDashboard />
            </ProtectedRoute>
          }
        /> */}

        <Route path="/my-leaves" element={<MyLeaves />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
