import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { RouteSkeleton } from "../ui/RouteSkeleton";

export function ProtectedRoute({ children, adminOnly = false }) {
  const { user, loading, isAuthenticated } = useAuth();
  const location = useLocation();

  if (loading && !user) {
    return <RouteSkeleton variant="page" />;
  }

  if (!isAuthenticated) {
    const loginPath = `/auth?redirect=${encodeURIComponent(location.pathname)}`;
    return <Navigate to={loginPath} replace />;
  }

  const allowedAdminRoles = ['super_admin', 'main_admin', 'moderator', 'support_admin', 'order_manager', 'content_manager', 'admin', 'manager', 'coordinator'];
  
  if (adminOnly && !allowedAdminRoles.includes(user?.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
}
