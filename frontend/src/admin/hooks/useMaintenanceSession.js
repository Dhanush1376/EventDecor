import { useState, useEffect, useCallback } from 'react';
import { maintenanceService } from '../../services/api/maintenanceService';

const STORAGE_KEY = 'siri_maintenance_session';

export function useMaintenanceSession() {
  const [session, setSession] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch (e) {
      return null;
    }
  });

  const saveSession = useCallback((token, expiresAt) => {
    const data = { token, expiresAt };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    setSession(data);
  }, []);

  const clearSession = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setSession(null);
  }, []);

  const logout = useCallback(async () => {
    if (session?.token) {
      try {
        await maintenanceService.logout(session.token);
      } catch (e) {
        console.error('Failed to logout maintenance session server-side', e);
      }
    }
    clearSession();
  }, [session, clearSession]);

  // Session expiry check
  useEffect(() => {
    if (!session) return;

    const checkExpiry = () => {
      if (new Date(session.expiresAt) < new Date()) {
        clearSession();
      }
    };

    checkExpiry();
    const interval = setInterval(checkExpiry, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [session, clearSession]);

  return {
    session,
    isAuthenticated: !!session && new Date(session.expiresAt) > new Date(),
    saveSession,
    clearSession,
    logout,
  };
}
