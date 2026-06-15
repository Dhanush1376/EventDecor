import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export function ProtectedRoute({ children, adminOnly = false }) {
  const { user, loading, isAuthenticated, isAuthInitialized, openAuthModal } = useAuth();
  const location = useLocation();

  useEffect(() => {
    if (isAuthInitialized && !loading && !isAuthenticated) {
      openAuthModal();
    }
  }, [isAuthInitialized, loading, isAuthenticated, openAuthModal]);

  if (!isAuthInitialized || (loading && !user)) {
    return <RouteSkeleton variant="page" />;
  }

  if (!isAuthenticated) {
    const loginPath = `/?redirect=${encodeURIComponent(location.pathname)}`;
    return <Navigate to={loginPath} replace />;
  }

  const allowedAdminRoles = [
    'owner',
    'super_admin',
    'main_admin',
    'moderator',
    'support_admin',
    'support',
    'order_manager',
    'content_manager',
    'admin',
    'manager',
    'coordinator',
  ];

  if (adminOnly && !allowedAdminRoles.includes(user?.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
}
