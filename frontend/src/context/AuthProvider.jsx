import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';
import { authService } from '../services/domainServices';
import {
  setAccessToken,
  getAccessToken,
  refreshAccessToken,
  setAuthBootstrapActive,
} from '../services/api';
import {
  loadCachedProfile,
  saveCachedProfile,
  clearCachedProfile,
} from '../utils/auth/authSessionCache';
import {
  hasSessionMarker,
  setSessionMarker,
  clearAuthStorage,
  setFallbackRefreshToken,
} from '../utils/auth/authStorage';
import { AuthContext } from './AuthContext';
import { CACHE_KEY } from '../utils/performance/queryPersister';
import logger from '../utils/core/logger';
import { ADMIN_ROLES } from '../constants/roles';
import { logCartTrace, forensicHashId } from '../utils/forensic/cartTrace';

export function AuthProvider({ children }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  // Use lazy initialization to avoid synchronous exceptions during render body
  const getInitialState = () => {
    try {
      const cp = loadCachedProfile();
      const hs = hasSessionMarker();
      // If the session marker is gone but the profile is cached, this is a zombie session!
      if (!hs && cp) {
        clearCachedProfile();
        return { cachedProfile: null, hasStoredSession: false };
      }
      return { cachedProfile: cp, hasStoredSession: hs };
    } catch {
      return { cachedProfile: null, hasStoredSession: false };
    }
  };

  const [initialState] = useState(getInitialState);
  const { cachedProfile, hasStoredSession } = initialState;

  const [user, setUser] = useState(cachedProfile);
  const [loading, setLoading] = useState(hasStoredSession && !cachedProfile);
  const [isAuthenticated, setIsAuthenticated] = useState(!!cachedProfile || hasStoredSession);

  // FORENSIC LOGGING
  useEffect(() => {
    logCartTrace('AUTH_STATE_CHANGE', {
      isAuthenticated,
      hasUser: !!user,
      hashedUserId: forensicHashId(user?._id || user?.id),
      source: 'AuthProvider',
    });
  }, [isAuthenticated, user]);
  const [isAuthInitialized, setIsAuthInitialized] = useState(
    !!cachedProfile || (!hasStoredSession && !cachedProfile),
  );

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [intendedAction, setIntendedAction] = useState(null);

  const initStarted = useRef(false);

  const logout = useCallback(
    async (silent = false) => {
      // Clear specific user-related React Query cache on logout to prevent state leakage,
      // but avoid queryClient.clear() so we don't break public pages (like ProductDetails)
      logCartTrace('QUERY_CLIENT_CLEAR', { source: 'AuthProvider.logout' });
      queryClient.removeQueries({
        predicate: (query) => {
          const key = query.queryKey[0];
          return [
            'user',
            'cart',
            'wishlist',
            'orders',
            'addresses',
            'dashboard',
            'recommendations',
          ].includes(key);
        },
      });
      try {
        logCartTrace('CACHE_REMOVE', { source: 'AuthProvider.logout' });
        localStorage.removeItem(CACHE_KEY);
      } catch (__) {}

      setAccessToken(null);
      clearCachedProfile();
      clearAuthStorage();
      if (!silent) {
        authService.logout().catch(() => {});
      }
      setUser(null);
      setIsAuthenticated(false);
      setIntendedAction(null);

      if (typeof window !== 'undefined') {
        delete window.__siri_splash_shown;
      }

      if (!silent) {
        toast.success('Logged out successfully');
      }
    },
    [queryClient],
  );

  const restoreSession = useCallback(
    async (signal) => {
      setAuthBootstrapActive(true);
      try {
        if (!getAccessToken()) {
          await refreshAccessToken();
        }

        const response = await authService.getProfile({ signal });
        if (response.success) {
          setUser(response.data);
          setIsAuthenticated(true);
          saveCachedProfile(response.data);
          setSessionMarker();
          return true;
        }
      } catch (err) {
        if (err.name === 'CanceledError' || err.code === 'ERR_NO_SESSION') {
          return false;
        }

        const isNetwork = !err.response;
        if (isNetwork && (cachedProfile || user)) {
          logger.warn('[Auth] Profile fetch failed (network) — keeping cached session');
          setIsAuthenticated(true);
          return true;
        }

        if (err.response?.status === 401) {
          logger.warn(
            '[Auth] Session invalid or expired (401) — logging out. Error:',
            err.response?.data,
          );
          toast.error(`Session Error 1: ${JSON.stringify(err.response?.data || err.message)}`);
          logout(true);
          return false;
        }

        try {
          const token = await refreshAccessToken();
          if (token) {
            try {
              const retry = await authService.getProfile({ signal });
              if (retry.success) {
                setUser(retry.data);
                setIsAuthenticated(true);
                saveCachedProfile(retry.data);
                setSessionMarker();
                return true;
              }
            } catch (retryErr) {
              if (retryErr.response?.status === 401) {
                logger.warn('[Auth] Retry session invalid (401) — logging out');
                logout(true);
                return false;
              }
              if (!retryErr.response && (cachedProfile || user)) {
                setIsAuthenticated(true);
                return true;
              }
            }
          }
        } catch (refreshErr) {
          logger.error('[Auth] Failed to refresh token in error recovery', refreshErr);
          if (
            refreshErr.name !== 'CanceledError' &&
            (refreshErr.response?.status === 401 ||
              refreshErr.response?.status === 403 ||
              refreshErr.code === 'ERR_NO_SESSION')
          ) {
            logger.warn('[Auth] Refresh token invalid — logging out', refreshErr);
            toast.error(
              `Session Error 2: ${JSON.stringify(refreshErr.response?.data || refreshErr.message)}`,
            );
            logout(true);
            return false;
          }
        }

        if (!cachedProfile && !user) {
          console.warn(
            '[AUTH_DEBUG] restoreSession failed network, no cachedProfile and no user. Logging out.',
          );
          logout(true);
        }
        return false;
      } finally {
        setAuthBootstrapActive(false);
      }
      return false;
    },
    [logout, cachedProfile, user],
  );

  useEffect(() => {
    if (initStarted.current) return;
    initStarted.current = true;

    if (!hasStoredSession && !cachedProfile) {
      console.warn('[AUTH_DEBUG] No stored session and no cached profile on mount.');
      setLoading(false);
      setIsAuthInitialized(true);
      return;
    }

    if (cachedProfile) {
      setUser(cachedProfile);
      setIsAuthenticated(true);
    }

    const controller = new AbortController();

    const safetyTimeout = setTimeout(() => {
      logger.warn('[Auth] Session restoration timeout reached — forcing loader to turn off');
      if (hasStoredSession && !cachedProfile) {
        setLoading(false);
        setIsAuthInitialized(true);
      }
    }, 8000);

    (async () => {
      try {
        await restoreSession(controller.signal);
      } catch (restoreErr) {
        logger.error('[Auth] Critical error during session restoration', restoreErr);
      } finally {
        clearTimeout(safetyTimeout);
        setLoading(false);
        setIsAuthInitialized(true);
      }
    })();

    const handleUnauthorized = () => {
      logout(true);
    };

    window.addEventListener('auth-unauthorized', handleUnauthorized);

    return () => {
      controller.abort();
      clearTimeout(safetyTimeout);
      window.removeEventListener('auth-unauthorized', handleUnauthorized);
    };
  }, [restoreSession, logout, cachedProfile, hasStoredSession]);

  useEffect(() => {
    import('../utils/core/observability')
      .then(({ setUserContext }) => {
        setUserContext(user);
      })
      .catch((err) => logger.error('Failed to load observability context:', err));
  }, [user]);

  const openAuthModal = () => setIsAuthModalOpen(true);
  const closeAuthModal = () => {
    setIsAuthModalOpen(false);
    setIntendedAction(null);
  };

  const runProtectedAction = useCallback(
    (actionCallback) => {
      if (isAuthenticated) {
        actionCallback();
        return true;
      }
      setIntendedAction(() => actionCallback);
      setIsAuthModalOpen(true);
      toast.error('Authentication required to access this feature');
      return false;
    },
    [isAuthenticated],
  );

  const loginSuccess = useCallback(
    async (userData, token, refreshToken) => {
      const accessToken = token || null;
      if (!accessToken) {
        logger.error('[Auth] loginSuccess called without access token');
        toast.error('Sign-in incomplete. Please try again.');
        return;
      }

      setAccessToken(accessToken);
      setSessionMarker();
      setFallbackRefreshToken(refreshToken);

      setUser(userData);
      setIsAuthenticated(true);
      setIsAuthInitialized(true);
      setLoading(false);
      saveCachedProfile(userData);
      setIsAuthModalOpen(false);

      toast.success('Welcome back to the Studio!');

      const searchParams = new URLSearchParams(window.location.search);
      const redirectUrl = searchParams.get('redirect');

      if (redirectUrl) {
        if (redirectUrl.startsWith('/') && !redirectUrl.startsWith('//')) {
          if (redirectUrl.startsWith('/admin') && !ADMIN_ROLES.includes(userData?.role)) {
            navigate('/');
          } else {
            navigate(redirectUrl);
          }
          return;
        }
      }

      if (ADMIN_ROLES.includes(userData?.role)) {
        navigate('/admin');
        return;
      }

      if (intendedAction) {
        try {
          await intendedAction();
        } catch (err) {
          logger.error('Failed to auto-execute intended action after login:', err);
        }
        setIntendedAction(null);
      }
    },
    [intendedAction, navigate],
  );

  const contextValue = useMemo(
    () => ({
      user,
      loading,
      isAuthenticated,
      logout,
      restoreSession,
      checkAuth: restoreSession,
      isAuthModalOpen,
      openAuthModal,
      closeAuthModal,
      runProtectedAction,
      loginSuccess,
      isAuthInitialized,
    }),
    [
      user,
      loading,
      isAuthenticated,
      logout,
      restoreSession,
      isAuthModalOpen,
      isAuthInitialized,
      runProtectedAction,
      loginSuccess,
    ],
  );

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
}
