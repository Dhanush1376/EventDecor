import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export function ProtectedRoute({ children, adminOnly = false }) {
  const { user, loading, isAuthenticated } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fdfcfb]">
        <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    const loginPath = adminOnly
      ? `/admin/login?redirect=${encodeURIComponent(location.pathname)}`
      : `/auth?redirect=${encodeURIComponent(location.pathname)}`;
    return <Navigate to={loginPath} replace />;
  }

  const allowedAdminRoles = ['super_admin', 'main_admin', 'moderator', 'support_admin', 'order_manager', 'content_manager', 'admin', 'manager', 'coordinator'];
  
  if (adminOnly && !allowedAdminRoles.includes(user?.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
}
