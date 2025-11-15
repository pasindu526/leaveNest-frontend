import React, { useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import Sidebar from "../components/layout/Sidebar";
import Header from "../components/layout/Header";

const Dashboard: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const navigate = useNavigate();

  // Get user from localStorage
  const userRaw = localStorage.getItem("user");
  const user = userRaw ? JSON.parse(userRaw) : null;
  const role = user?.roles?.[0] || "employee";

  const handleLogout = () => {
    localStorage.clear();
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <Sidebar
        collapsed={!sidebarOpen}
        variant={role === "admin" ? "admin" : "user"}
        onNavigate={() => setSidebarOpen(false)}
        onLogout={handleLogout}
      />

      {/* Main content area */}
      <div className="flex-1 flex flex-col h-screen lg:ml-64">
        {/* Header */}
        <Header
          title="Employee Dashboard"
          onToggleSidebar={() => setSidebarOpen((s) => !s)}
        />

        {/* Page content */}
        <main className="mt-20 bg-gray-100 flex-1 max-h-screen overflow-auto">
          <div className="w-11/12 mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
