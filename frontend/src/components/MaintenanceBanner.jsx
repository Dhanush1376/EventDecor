import React from 'react';
import { useMaintenanceSession } from '../admin/hooks/useMaintenanceSession';
import { Link } from 'react-router-dom';

export function MaintenanceBanner() {
  const { isAuthenticated } = useMaintenanceSession();

  if (!isAuthenticated) return null;

  return (
    <div className="fixed top-0 left-0 w-full bg-red-600 text-white px-4 py-2 text-center text-sm font-medium z-[100] flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 shadow-md">
      <div className="flex items-center gap-2">
        <span className="material-symbols-outlined text-[18px]">gpp_maybe</span>
        Enterprise Maintenance Mode is Active
      </div>
      <Link
        to="/admin/maintenance-console"
        className="bg-black/20 hover:bg-black/30 px-3 py-1 rounded transition-colors text-xs uppercase tracking-wider"
      >
        Console
      </Link>
    </div>
  );
}
