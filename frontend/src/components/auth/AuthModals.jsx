import React, { Suspense } from 'react';
import { useAuth } from '../../context/AuthContext';
import { lazyWithRetry as lazy } from '../../utils/performance/lazyWithRetry';

const AuthModal = lazy(() => import('./AuthModal').then((m) => ({ default: m.AuthModal })));

export function AuthModals() {
  const { isAuthModalOpen } = useAuth();

  if (!isAuthModalOpen) return null;

  return (
    <Suspense fallback={null}>
      <AuthModal />
    </Suspense>
  );
}
