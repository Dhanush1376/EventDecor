import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authService } from '../services/domainServices';
import { setAccessToken } from '../services/api';
import toast from 'react-hot-toast';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Intended Action Queue & Modal States for seamless Protected Action Interception
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [intendedAction, setIntendedAction] = useState(null);

  const logout = useCallback(async (silent = false) => {
    const storedRefreshToken = typeof window !== 'undefined' ? localStorage.getItem('siri_refresh_token') : null;
    setAccessToken(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('siri_access_token');
      localStorage.removeItem('siri_refresh_token');
    }
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
    try {
      const storedRefreshToken = typeof window !== 'undefined' ? localStorage.getItem('siri_refresh_token') : null;
      const refreshed = await authService.refresh(storedRefreshToken);
      const token = refreshed?.data?.accessToken || refreshed?.data?.token;
      const nextRefreshToken = refreshed?.data?.refreshToken;
      if (token) {
        setAccessToken(token);
      }
      if (nextRefreshToken && typeof window !== 'undefined') {
        localStorage.setItem('siri_refresh_token', nextRefreshToken);
      }

      const response = await authService.getProfile();
      if (response.success) {
        setUser(response.data);
        setIsAuthenticated(true);
      } else {
        logout(true);
      }
    } catch (err) {
      console.error('Auth check failed:', err);
      logout(true);
    } finally {
      setLoading(false);
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
    }).catch(err => console.error('Failed to load observability context:', err));
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
    if (typeof window !== 'undefined') {
      if (token) localStorage.setItem('siri_access_token', token);
      if (refreshToken) localStorage.setItem('siri_refresh_token', refreshToken);
    }
    setUser(userData);
    setIsAuthenticated(true);
    setIsAuthModalOpen(false);

    toast.success('Welcome back to the Studio!');

    if (userData?.role === 'admin' || userData?.role === 'manager') {
      window.location.href = '/admin';
      return;
    }

    if (intendedAction) {
      try {
        await intendedAction();
      } catch (err) {
        console.error('Failed to auto-execute intended action after login:', err);
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
