/* eslint-disable */
import React, { createContext, useContext, useEffect, useRef } from 'react';
import { io as socketIO } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { getApiRootUrl } from '../config/apiConfig';
import logger from '../utils/logger';

const UserSocketContext = createContext(null);

export function useUserSocket() {
  return useContext(UserSocketContext);
}

export function UserSocketProvider({ children }) {
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const socketRef = useRef(null);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      return;
    }

    const rawApiUrl = getApiRootUrl();
    const socketServerUrl = rawApiUrl.endsWith('/api') ? rawApiUrl.slice(0, -4) : rawApiUrl;

    const socket = socketIO(`${socketServerUrl}/user`, {
      transports: ['websocket', 'polling'],
      withCredentials: true,
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

    socket.on('connect_error', (err) => {
      logger.warn('[WEBSOCKET] User connection error:', err.message);
    });

    return () => {
      socket.disconnect();
    };
  }, [isAuthenticated, user, queryClient]);

  return (
    <UserSocketContext.Provider value={socketRef.current}>{children}</UserSocketContext.Provider>
  );
}
