import React from 'react';
import { useConfig } from '../../context/ConfigContext';
import { MaintenanceScreen } from './MaintenanceScreen';
import { Outlet } from 'react-router-dom';

export function MaintenanceGate() {
  const { storeSettings, loading } = useConfig();

  // If loading settings, we can return null to avoid flash of content,
  // or return children if we want an optimistic render.
  // Returning null is safer to ensure we don't flash the public store if maintenance is on.
  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="w-16 h-16 rounded-full border-[1px] border-primary/30 border-t-primary animate-spin duration-1000 ease-linear" />
      </div>
    );
  }

  // If maintenance mode is active, render the Maintenance Screen instead of the storefront
  if (storeSettings?.general?.maintenanceMode === true) {
    return <MaintenanceScreen />;
  }

  return <Outlet />;
}
