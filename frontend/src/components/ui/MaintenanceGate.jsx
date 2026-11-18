import React, { useState } from 'react';
import { useConfig } from '../../context/ConfigContext';
import { MaintenanceScreen } from './MaintenanceScreen';
import { StoreClosedOverlay } from './StoreClosedOverlay';
import { StoreClosedBanner } from './StoreClosedBanner';
import { Outlet } from 'react-router-dom';

export function MaintenanceGate() {
  // `loading` is intentionally not used to block rendering. The storefront used to
  // show a full-screen spinner until /settings/public returned, so first-time
  // visitors waited on a cold backend before seeing anything. Settings defaults
  // keep the storefront usable; maintenance / closed states apply as soon as the
  // settings response (or its localStorage copy) says so. The backend still
  // enforces maintenance on its own endpoints.
  const { isStoreClosed, isMaintenanceMode } = useConfig();
  const [isOverlayOpen, setIsOverlayOpen] = useState(() => {
    try {
      return sessionStorage.getItem('siri_store_closed_dismissed') !== 'true';
    } catch {
      return true;
    }
  });

  // Hard technical maintenance mode
  if (isMaintenanceMode) {
    return <MaintenanceScreen />;
  }

  const handleCloseOverlay = () => {
    setIsOverlayOpen(false);
    try {
      sessionStorage.setItem('siri_store_closed_dismissed', 'true');
    } catch {}
  };

  return (
    <>
      {isStoreClosed && (
        <>
          <StoreClosedBanner onShowDetails={() => setIsOverlayOpen(true)} />
          <StoreClosedOverlay isOpen={isOverlayOpen} onClose={handleCloseOverlay} />
        </>
      )}
      <Outlet />
    </>
  );
}
