import { getRouteSkeletonVariant, RouteSkeleton } from '../ui/RouteSkeleton';
import { useAuth } from '../../context/AuthContext';

export function AuthGate({ children }) {
  const { isAuthInitialized } = useAuth();

  if (!isAuthInitialized) {
    const variant =
      typeof window !== 'undefined' ? getRouteSkeletonVariant(window.location.pathname) : 'page';
    return <RouteSkeleton variant={variant} />;
  }

  return children;
}
