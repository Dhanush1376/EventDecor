import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { authService } from '../services/domainServices';
import {
  setAccessToken,
  getAccessToken,
  refreshAccessToken,
  setAuthBootstrapActive,
} from '../services/api';
import toast from 'react-hot-toast';
import { loadCachedProfile, saveCachedProfile, clearCachedProfile } from '../utils/authSessionCache';
import {
  hasSessionMarker,
  setSessionMarker,
  clearAuthStorage,
  persistRefreshToken,
  getPersistedRefreshToken,
  getPersistedAccessToken,
} from '../utils/authStorage';

import logger from '../utils/logger';
const AuthContext = createContext();

export function AuthProvider({ children }) {
  const cachedProfile = loadCachedProfile();
  const hasStoredSession =
    hasSessionMarker() || !!getPersistedRefreshToken() || !!getPersistedAccessToken();
  const [user, setUser] = useState(cachedProfile);
  const [loading, setLoading] = useState(hasStoredSession || !!cachedProfile);
  const [isAuthenticated, setIsAuthenticated] = useState(!!cachedProfile || hasStoredSession);
  const [isAuthInitialized, setIsAuthInitialized] = useState(false);

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [intendedAction, setIntendedAction] = useState(null);

  const initStarted = useRef(false);

  const logout = useCallback(async (silent = false) => {
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
  }, []);

  const restoreSession = useCallback(async (signal) => {
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
        logger.warn('[Auth] Session invalid or expired (401) — clearing local credentials');
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
              logger.warn('[Auth] Retry session invalid (401) — clearing credentials');
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
      }

      if (!cachedProfile && !user) {
        logout(true);
      }
      return false;
    } finally {
      setAuthBootstrapActive(false);
    }
    return false;
  }, [logout, cachedProfile, user]);

  useEffect(() => {
    if (!hasStoredSession && !cachedProfile) {
      setLoading(false);
      setIsAuthInitialized(true);
      return;
    }

    if (initStarted.current) return;
    initStarted.current = true;

    if (cachedProfile) {
      setUser(cachedProfile);
      setIsAuthenticated(true);
    }

    const controller = new AbortController();

    const safetyTimeout = setTimeout(() => {
      logger.warn('[Auth] Session restoration timeout reached — forcing loader to turn off');
      setLoading(false);
      setIsAuthInitialized(true);
    }, 12000);

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
    import('../utils/observability')
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

  const runProtectedAction = (actionCallback) => {
    if (isAuthenticated) {
      actionCallback();
      return true;
    }
    setIntendedAction(() => actionCallback);
    setIsAuthModalOpen(true);
    toast.error('Authentication required to access this feature');
    return false;
  };

  const loginSuccess = async (userData, token, refreshToken) => {
    const accessToken = token || null;
    if (!accessToken) {
      logger.error('[Auth] loginSuccess called without access token');
      toast.error('Sign-in incomplete. Please try again.');
      return;
    }

    setAccessToken(accessToken);
    setSessionMarker();
    if (refreshToken) {
      persistRefreshToken(refreshToken);
    }

    setUser(userData);
    setIsAuthenticated(true);
    setIsAuthInitialized(true);
    setLoading(false);
    saveCachedProfile(userData);
    setIsAuthModalOpen(false);

    toast.success('Welcome back to the Studio!');

    const adminRoles = [
      'super_admin',
      'main_admin',
      'moderator',
      'support_admin',
      'order_manager',
      'content_manager',
      'admin',
      'manager',
      'coordinator',
    ];
    if (adminRoles.includes(userData?.role)) {
      window.location.href = '/admin';
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
  };

  return (
    <AuthContext.Provider
      value={{
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
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
