import React from "react";
import { Navigate } from "react-router-dom";

interface ProtectedRouteProps {
  children: React.ReactElement;
  requiredRole?: string;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requiredRole }) => {
  const token = localStorage.getItem("token");
  const user = localStorage.getItem("user");
  const selectedRole = localStorage.getItem("selectedRole");

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && selectedRole !== requiredRole) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
};

export default ProtectedRoute;