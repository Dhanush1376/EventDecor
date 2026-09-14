import React from 'react';
import { Map } from 'lucide-react';

const GPSMap = React.lazy(() => import('../../../pages/GPSMapLazy'));

/**
 * Split panel showing the verified shipping destination address and synced GPS location preview.
 */
export default function OrderDeliveryAddressCard({ shippingAddress }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Address Card */}
      <div className="bg-surface-bright border border-outline-variant/40 rounded-lg p-5 shadow-xs">
        <div className="pb-4 mb-4 border-b border-outline-variant/20">
          <h2 className="text-[9px] font-bold uppercase tracking-widest text-secondary flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[14px]">pin_drop</span>
            Shipping Destination
          </h2>
        </div>
        {shippingAddress ? (
          <div className="p-3 border border-outline-variant/30 rounded-lg bg-surface-container-lowest text-[11px]">
            <p className="font-bold text-on-surface uppercase tracking-wider">
              {shippingAddress.name}
            </p>
            <p className="text-secondary mt-1 leading-relaxed">
              {shippingAddress.addressString || shippingAddress.address}, {shippingAddress.locality}
              <br />
              {shippingAddress.city}, {shippingAddress.state} - {shippingAddress.pincode}
            </p>
            <p className="text-[9px] text-secondary mt-2 tracking-widest uppercase font-medium">
              Phone: {shippingAddress.phone}
            </p>
          </div>
        ) : (
          <div className="text-[9px] text-secondary italic tracking-wider">
            Address details currently unavailable.
          </div>
        )}
      </div>

      {/* Coordinate Map Panel */}
      <div className="bg-surface-bright border border-outline-variant/40 rounded-lg p-5 shadow-xs flex flex-col">
        <div className="pb-4 mb-4 border-b border-outline-variant/20 flex justify-between items-center">
          <h2 className="text-[9px] font-bold uppercase tracking-widest text-secondary flex items-center gap-1.5">
            <Map className="text-[14px]" strokeWidth={1.5} />
            Destination GPS
          </h2>
          <span className="text-[8px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded uppercase tracking-widest border border-emerald-200">
            Synced
          </span>
        </div>
        <div className="relative flex-1 rounded-lg bg-surface-container overflow-hidden border border-outline-variant/20 z-0 min-h-[120px]">
          <React.Suspense fallback={<div className="h-full bg-surface-container animate-pulse" />}>
            <GPSMap address={shippingAddress} />
          </React.Suspense>
        </div>
      </div>
    </div>
  );
}
