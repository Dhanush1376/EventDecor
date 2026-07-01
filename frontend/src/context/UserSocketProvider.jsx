import React, { createContext, useContext, useEffect, useRef } from 'react';
// socket.io is imported dynamically inside the useEffect to keep it out of the initial bundle
import { useAuth } from './AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { getApiRootUrl } from '../config/apiConfig';
import { getAccessToken } from '../services/api';
import logger from '../utils/core/logger';

const UserSocketContext = createContext(null);

export function useUserSocket() {
  return useContext(UserSocketContext);
}

export function UserSocketProvider({ children }) {
  const { user, isAuthenticated, loading } = useAuth();
  const queryClient = useQueryClient();
  const socketRef = useRef(null);

  useEffect(() => {
    if (loading) return;

    if (!isAuthenticated || !user) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      return;
    }

    const rawApiUrl = getApiRootUrl();
    let socketServerUrl = rawApiUrl;
    if (socketServerUrl.endsWith('/api/v1')) {
      socketServerUrl = socketServerUrl.slice(0, -7);
    } else if (socketServerUrl.endsWith('/api')) {
      socketServerUrl = socketServerUrl.slice(0, -4);
    }

    const token = getAccessToken();

    import('socket.io-client')
      .then(({ io }) => {
        const socket = io(`${socketServerUrl}/user`, {
          transports: ['websocket', 'polling'],
          withCredentials: true,
          auth: (cb) => cb({ token: getAccessToken() }),
          reconnectionAttempts: 5,
          reconnectionDelay: 1000,
        });

        socketRef.current = socket;

        socket.on('connect', () => {
          logger.dev('[WEBSOCKET] Connected to /user namespace');
        });

        socket.on('cart_update', () => {
          logger.dev('[WEBSOCKET] Cart update received, invalidating queries');
          queryClient.invalidateQueries({ queryKey: ['cart'] });
        });

        socket.on('wishlist_update', () => {
          logger.dev('[WEBSOCKET] Wishlist update received, invalidating queries');
          queryClient.invalidateQueries({ queryKey: ['wishlist'] });
        });

        socket.on('order_update', () => {
          logger.dev('[WEBSOCKET] Order update received, invalidating queries');
          queryClient.invalidateQueries({ queryKey: ['orders'] });
          queryClient.invalidateQueries({ queryKey: ['order'] });
        });

        socket.on('return:status_updated', (data) => {
          logger.dev(`[WEBSOCKET] Return ${data?.returnId} status updated to ${data?.status}`);
          queryClient.invalidateQueries({ queryKey: ['orders'] });
          queryClient.invalidateQueries({ queryKey: ['returns'] });
        });

        socket.on('return:created', (data) => {
          logger.dev(`[WEBSOCKET] Return ${data?.returnId} created`);
          queryClient.invalidateQueries({ queryKey: ['orders'] });
          queryClient.invalidateQueries({ queryKey: ['returns'] });
        });

        socket.on('connect_error', (err) => {
          if (err.message.includes('Token missing')) return;
          logger.warn('[WEBSOCKET] User connection error:', err.message);
        });
      })
      .catch((err) => {
        logger.warn('[WEBSOCKET] Failed to load socket.io-client module:', err);
      });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [isAuthenticated, user, queryClient, loading]);

  return (
    <UserSocketContext.Provider value={socketRef.current}>{children}</UserSocketContext.Provider>
  );
}
