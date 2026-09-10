import { useLocation } from 'react-router-dom';
import { getAdminRouteSkeleton } from './getAdminRouteSkeleton';

/**
 * Fallback component for React.Suspense in AdminLayout and RouteSkeleton.
 * Automatically inspects current route and displays the exact page-specific
 * wireframe silhouette instead of generic loaders or dashboards.
 */
export function AdminRouteSuspenseFallback() {
  const location = useLocation();
  return getAdminRouteSkeleton(location.pathname);
}

export default AdminRouteSuspenseFallback;
