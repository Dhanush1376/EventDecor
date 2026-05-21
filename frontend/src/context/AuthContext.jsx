import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { authService } from '../services/domainServices';
import { setAccessToken } from '../services/api';
import toast from 'react-hot-toast';

import { safeLocalStorage } from '../utils/storage';

import logger from '../utils/logger';
const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Intended Action Queue & Modal States for seamless Protected Action Interception
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [intendedAction, setIntendedAction] = useState(null);

  // Guard to prevent concurrent checkAuth calls
  const checkAuthInProgress = useRef(false);

  const logout = useCallback(async (silent = false) => {
    const storedRefreshToken = safeLocalStorage.getItem('siri_refresh_token');
    setAccessToken(null);
    safeLocalStorage.removeItem('siri_access_token');
    safeLocalStorage.removeItem('siri_refresh_token');
    if (!silent) {
      authService.logout(storedRefreshToken).catch(() => {});
    }
    setUser(null);
    setIsAuthenticated(false);
    setIntendedAction(null);
    
    // Clear session context-specific keys from in-memory window context
    if (typeof window !== 'undefined') {
      delete window.__siri_splash_shown;
    }
    
    if (!silent) {
      toast.success('Logged out successfully');
    }
  }, []);

  const checkAuth = useCallback(async () => {
    // Prevent concurrent checkAuth calls (e.g. from storage events)
    if (checkAuthInProgress.current) return;
    checkAuthInProgress.current = true;

    const storedRefreshToken = safeLocalStorage.getItem('siri_refresh_token');

    if (!storedRefreshToken) {
      setUser(null);
      setIsAuthenticated(false);
      setLoading(false);
      checkAuthInProgress.current = false;
      return;
    }

    // If we already have an access token in memory, try to use it directly
    // (the 401 interceptor will handle refresh if it's expired)
    const storedAccessToken = safeLocalStorage.getItem('siri_access_token');
    if (storedAccessToken) {
      setAccessToken(storedAccessToken);
      try {
        const response = await authService.getProfile();
        if (response.success) {
          setUser(response.data);
          setIsAuthenticated(true);
          setLoading(false);
          checkAuthInProgress.current = false;
          return;
        }
      } catch {
        // Access token is invalid/expired — fall through to refresh flow
      }
    }

    // No valid access token — try refreshing via the refresh token
    try {
      const refreshed = await authService.refresh(storedRefreshToken);
      const token = refreshed?.data?.accessToken || refreshed?.data?.token;
      if (token) setAccessToken(token);

      const newRefreshToken = refreshed?.data?.refreshToken;
      if (newRefreshToken) {
        safeLocalStorage.setItem('siri_refresh_token', newRefreshToken);
      }

      const response = await authService.getProfile();
      if (response.success) {
        setUser(response.data);
        setIsAuthenticated(true);
      } else {
        logout(true);
      }
    } catch (err) {
      logger.error('Auth check failed:', err);
      logout(true);
    } finally {
      setLoading(false);
      checkAuthInProgress.current = false;
    }
  }, [logout]);

  const login = async (email, password) => {
    try {
      const response = await authService.login(email, password);
      if (response.success) {
        const token = response.data.accessToken || response.data.token;
        setAccessToken(token);
        const refreshToken = response.data.refreshToken;
        if (refreshToken) {
          safeLocalStorage.setItem('siri_refresh_token', refreshToken);
        }
        setUser(response.data.user);
        setIsAuthenticated(true);
        toast.success('Welcome back!');
        return true;
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed');
      return false;
    }
  };

  const adminLogin = async (email, password) => {
    try {
      const response = await authService.adminLogin(email, password);
      if (response.success) {
        const token = response.data.accessToken || response.data.token;
        setAccessToken(token);
        const refreshToken = response.data.refreshToken;
        if (refreshToken) {
          safeLocalStorage.setItem('siri_refresh_token', refreshToken);
        }
        setUser(response.data.user);
        setIsAuthenticated(true);
        return true;
      }
    } catch (err) {
      throw err.response?.data || new Error('Login failed');
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      checkAuth();
    }, 0);

    const handleUnauthorized = () => {
      logout(true);
    };

    window.addEventListener('auth-unauthorized', handleUnauthorized);

    // Cross-tab token synchronization:
    // When another tab refreshes the token, update our in-memory token
    const handleStorageChange = (e) => {
      if (e.key === 'siri_access_token') {
        if (e.newValue) {
          // Another tab got a new access token — sync it
          setAccessToken(e.newValue);
        }
      }
      if (e.key === 'siri_refresh_token') {
        if (!e.newValue && e.oldValue) {
          // Another tab logged out — sync the logout
          setUser(null);
          setIsAuthenticated(false);
          setAccessToken(null);
        } else if (e.newValue && !e.oldValue) {
          // Another tab logged in — sync the login
          checkAuth();
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('auth-unauthorized', handleUnauthorized);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [checkAuth, logout]);

  useEffect(() => {
    import('../utils/observability').then(({ setUserContext }) => {
      setUserContext(user);
    }).catch(err => logger.error('Failed to load observability context:', err));
  }, [user]);

  // Open and close actions for global Auth Modal
  const openAuthModal = () => setIsAuthModalOpen(true);
  const closeAuthModal = () => {
    setIsAuthModalOpen(false);
    setIntendedAction(null);
  };

  // Intercepts any protected action. If authenticated, executes it immediately.
  // If unauthenticated, queues it and opens the Auth Modal.
  const runProtectedAction = (actionCallback) => {
    if (isAuthenticated) {
      actionCallback();
      return true;
    } else {
      setIntendedAction(() => actionCallback);
      setIsAuthModalOpen(true);
      toast.error('Authentication required to access this feature');
      return false;
    }
  };

  // Triggers after successful OTP verification to restore queued action and finalize login
  const loginSuccess = async (userData, token, refreshToken) => {
    setAccessToken(token);
    if (token) safeLocalStorage.setItem('siri_access_token', token);
    if (refreshToken) safeLocalStorage.setItem('siri_refresh_token', refreshToken);
    setUser(userData);
    setIsAuthenticated(true);
    setIsAuthModalOpen(false);

    toast.success('Welcome back to the Studio!');

    const adminRoles = ['super_admin', 'main_admin', 'moderator', 'support_admin', 'order_manager', 'content_manager', 'admin', 'manager', 'coordinator'];
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
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      isAuthenticated, 
      login, 
      adminLogin,
      logout, 
      checkAuth,
      isAuthModalOpen,
      openAuthModal,
      closeAuthModal,
      runProtectedAction,
      loginSuccess
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
