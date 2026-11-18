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
import { ConfirmProvider } from '../context/ConfirmProvider';
import { queryClient } from '../config/queryClient';
import { unstable_HistoryRouter as HistoryRouter } from 'react-router-dom';
import { ProviderComposer } from './ProviderComposer';
import { createSharedElementHistory } from '../utils/navigation/sharedElementTransition';

// One history for the app's lifetime. It behaves like BrowserRouter's, plus shared element
// transitions for navigations that start from a tagged product image.
const appHistory = createSharedElementHistory();

export function AppProviders({ children }) {
  return (
    <ProviderComposer
      contexts={[
        <QueryClientProvider client={queryClient} />,
        <NetworkProvider />,
        <ConfigProvider />,
        <HelmetProvider />,
        <HistoryRouter history={appHistory} />,
        <AuthProvider />,
        <CartProvider />,
        <WishlistProvider />,
        <UserSocketProvider />,
        <QuickViewProvider />,
        <ConfirmProvider />,
      ]}
    >
      {children}
    </ProviderComposer>
  );
}
