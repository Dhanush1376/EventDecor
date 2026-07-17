import React from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { HelmetProvider } from 'react-helmet-async';
import { CartProvider } from '../context/CartProvider';
import { WishlistProvider } from '../context/WishlistProvider';
import { AuthProvider } from '../context/AuthProvider';
import { UserSocketProvider } from '../context/UserSocketProvider';
import { NetworkProvider } from '../context/NetworkProvider';
import { ConfigProvider } from '../context/ConfigContext';
import { QuickViewProvider } from '../context/QuickViewContext';
import { queryClient } from '../config/queryClient';
import { BrowserRouter } from 'react-router-dom';
import { ProviderComposer } from './ProviderComposer';

export function AppProviders({ children }) {
  return (
    <ProviderComposer
      contexts={[
        <QueryClientProvider client={queryClient} />,
        <NetworkProvider />,
        <ConfigProvider />,
        <HelmetProvider />,
        <BrowserRouter />,
        <AuthProvider />,
        <CartProvider />,
        <WishlistProvider />,
        <UserSocketProvider />,
        <QuickViewProvider />,
      ]}
    >
      {children}
    </ProviderComposer>
  );
}
