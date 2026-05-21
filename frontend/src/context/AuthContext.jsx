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
    setAccessToken(null);
    if (!silent) {
      authService.logout().catch(() => {});
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
    if (checkAuthInProgress.current) return;
    checkAuthInProgress.current = true;

    try {
      const response = await authService.getProfile();
      if (response.success) {
        setUser(response.data);
        setIsAuthenticated(true);
      }
    } catch (err) {
      // If profile fails, interceptor already tried to refresh the token and failed
      // Or we simply don't have a valid session
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

    return () => {
      clearTimeout(timer);
      window.removeEventListener('auth-unauthorized', handleUnauthorized);
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
  const loginSuccess = async (userData, token) => {
    setAccessToken(token);
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
