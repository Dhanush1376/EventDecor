import React, { createContext, useContext, useEffect, useRef } from 'react';
// socket.io is imported dynamically inside the useEffect to keep it out of the initial bundle
import { useAuth } from './AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { getWebSocketUrl } from '../config/apiConfig';
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

    const socketServerUrl = getWebSocketUrl();

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

        socket.on('product_update', () => {
          logger.dev('[WEBSOCKET] Product update received, invalidating wishlist and products');
          queryClient.invalidateQueries({ queryKey: ['wishlist'] });
          queryClient.invalidateQueries({ queryKey: ['products'] });
          queryClient.invalidateQueries({ queryKey: ['product'] });
        });

        socket.on('stock_update', () => {
          logger.dev('[WEBSOCKET] Stock update received, invalidating wishlist and products');
          queryClient.invalidateQueries({ queryKey: ['wishlist'] });
          queryClient.invalidateQueries({ queryKey: ['products'] });
          queryClient.invalidateQueries({ queryKey: ['product'] });
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

        socket.on('order_status_updated', () => {
          logger.dev('[WEBSOCKET] Order status updated, invalidating queries');
          queryClient.invalidateQueries({ queryKey: ['orders'] });
          queryClient.invalidateQueries({ queryKey: ['order'] });
        });

        socket.on('order_status_update', () => {
          logger.dev('[WEBSOCKET] Order status update, invalidating queries');
          queryClient.invalidateQueries({ queryKey: ['orders'] });
          queryClient.invalidateQueries({ queryKey: ['order'] });
        });

        socket.on('refund:status_updated', () => {
          logger.dev('[WEBSOCKET] Refund status updated, invalidating queries');
          queryClient.invalidateQueries({ queryKey: ['orders'] });
          queryClient.invalidateQueries({ queryKey: ['order'] });
        });

        socket.on('booking_status_updated', () => {
          logger.dev('[WEBSOCKET] Booking status updated, invalidating queries');
          queryClient.invalidateQueries({ queryKey: ['bookings'] });
          queryClient.invalidateQueries({ queryKey: ['my-bookings'] });
        });

        socket.on('customOrder:newMessage', () => {
          logger.dev('[WEBSOCKET] Custom order new message, invalidating queries');
          queryClient.invalidateQueries({ queryKey: ['custom-orders'] });
        });

        socket.on('customOrder:statusChange', () => {
          logger.dev('[WEBSOCKET] Custom order status change, invalidating queries');
          queryClient.invalidateQueries({ queryKey: ['custom-orders'] });
        });

        socket.on('customOrder:quoteCreated', () => {
          logger.dev('[WEBSOCKET] Custom order quote created, invalidating queries');
          queryClient.invalidateQueries({ queryKey: ['custom-orders'] });
        });

        socket.on('timeline_update', () => {
          logger.dev('[WEBSOCKET] Timeline update, invalidating queries');
          queryClient.invalidateQueries({ queryKey: ['order-timeline'] });
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
