import { useAuth } from '../../context/AuthContext';
import { getRouteSkeletonVariant } from '../ui/RouteSkeleton';

export function AuthGate({ children }) {
  const { isAuthInitialized } = useAuth();

  if (!isAuthInitialized) {
    const variant =
      typeof window !== 'undefined' ? getRouteSkeletonVariant(window.location.pathname) : 'page';
    return <RouteSkeleton variant={variant} />;
  }

  return children;
}
