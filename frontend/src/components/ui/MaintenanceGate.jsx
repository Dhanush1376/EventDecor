import React, { useState } from 'react';
import { useConfig } from '../../context/ConfigContext';
import { MaintenanceScreen } from './MaintenanceScreen';
import { StoreClosedOverlay } from './StoreClosedOverlay';
import { StoreClosedBanner } from './StoreClosedBanner';
import { Outlet } from 'react-router-dom';

export function MaintenanceGate() {
  const { loading, isStoreClosed, isMaintenanceMode } = useConfig();
  const [isOverlayOpen, setIsOverlayOpen] = useState(() => {
    try {
      return sessionStorage.getItem('siri_store_closed_dismissed') !== 'true';
    } catch {
      return true;
    }
  });

  if (loading) {
    return (
      <div className="fixed inset-0 z-[9999] overflow-hidden bg-surface flex items-center justify-center">
        <div className="w-16 h-16 rounded-full border-[1px] border-primary/30 border-t-primary animate-spin duration-1000 ease-linear" />
      </div>
    );
  }

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
