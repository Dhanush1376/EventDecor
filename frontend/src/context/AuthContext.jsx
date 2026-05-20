import React, { createContext, useContext, useState, useEffect } from 'react';
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

  useEffect(() => {
    checkAuth();

    const handleUnauthorized = () => {
      logout(true);
    };

    window.addEventListener('auth-unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth-unauthorized', handleUnauthorized);
  }, []);

  useEffect(() => {
    import('../utils/observability').then(({ setUserContext }) => {
      setUserContext(user);
    }).catch(err => console.error('Failed to load observability context:', err));
  }, [user]);

  const checkAuth = async () => {
    try {
      console.log('[AUTH CHECK] Starting authentication check...');
      
      // First try to get profile directly (if we have a valid token from recent login)
      try {
        console.log('[AUTH CHECK] Attempting to fetch profile...');
        const response = await authService.getProfile();
        if (response.success) {
          console.log('[AUTH CHECK] Profile fetch successful. User:', response.data.email);
          setUser(response.data);
          setIsAuthenticated(true);
          setLoading(false);
          return;
        }
      } catch (profileErr) {
        console.log('[AUTH CHECK] Profile fetch failed, attempting token refresh...');
      }

      // If profile fetch fails, try to refresh the session
      try {
        const refreshed = await authService.refresh();
        const token = refreshed?.data?.accessToken || refreshed?.data?.token;
        if (token) {
          console.log('[AUTH CHECK] Token refresh successful. Setting access token.');
          setAccessToken(token);
          
          // Now try to fetch profile with the new token
          const response = await authService.getProfile();
          if (response.success) {
            console.log('[AUTH CHECK] Profile fetch successful after refresh. User:', response.data.email);
            setUser(response.data);
            setIsAuthenticated(true);
          } else {
            console.log('[AUTH CHECK] Profile fetch still failed after refresh.');
            logout(true);
          }
        } else {
          console.log('[AUTH CHECK] Token refresh returned no token.');
          logout(true);
        }
      } catch (refreshErr) {
        console.log('[AUTH CHECK] Token refresh failed. User not authenticated.');
        logout(true);
      }
    } catch (err) {
      console.error('[AUTH CHECK] Unexpected error:', err);
      logout(true);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      const response = await authService.login(email, password);
      if (response.success) {
        setAccessToken(response.data.accessToken || response.data.token);
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

  const logout = async (silent = false) => {
    console.log('[LOGOUT] Logging out user. Silent:', silent);
    setAccessToken(null);
    authService.logout().catch((err) => {
      console.error('[LOGOUT] Logout API call failed:', err);
    });
    setUser(null);
    setIsAuthenticated(false);
    setIntendedAction(null);
    
    // Clear session context-specific keys from local storage
    localStorage.removeItem('siri_last_splash_timestamp');
    
    if (!silent) {
      toast.success('Logged out successfully');
    }
    console.log('[LOGOUT] Logout complete.');
  };

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
    console.log('[LOGIN SUCCESS] OTP verification successful. Setting auth state:', {
      userId: userData._id,
      userEmail: userData.email,
      userRole: userData.role,
      hasToken: !!token
    });
    
    setAccessToken(token);
    setUser(userData);
    setIsAuthenticated(true);
    setIsAuthModalOpen(false);

    toast.success('Welcome back to the Studio!');

    if (userData?.role === 'admin' || userData?.role === 'manager') {
      console.log('[LOGIN SUCCESS] Admin/Manager detected. Redirecting to /admin');
      window.location.href = '/admin';
      return;
    }

    if (intendedAction) {
      try {
        console.log('[LOGIN SUCCESS] Executing queued intended action...');
        await intendedAction();
      } catch (err) {
        console.error('[LOGIN SUCCESS] Failed to execute intended action:', err);
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
