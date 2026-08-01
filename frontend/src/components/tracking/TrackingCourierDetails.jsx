import { MapPin, PackageCheck } from 'lucide-react';
import React from 'react';

export function TrackingCourierDetails({ order }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Destination Site */}
      <div className="bg-white border border-outline-variant/30 rounded-2xl p-6 shadow-xs text-[12px]">
        <h3 className="text-[11px] font-bold text-secondary uppercase tracking-widest mb-3 flex items-center gap-1.5 border-b border-outline-variant/20 pb-2">
          <MapPin className="text-sm text-primary" strokeWidth={1.5} />
          <span>Destination Parameters</span>
        </h3>
        <div className="space-y-1 text-on-surface">
          <strong className="text-xs font-bold block mb-1">{order.shippingAddress.name}</strong>
          <p className="text-secondary leading-relaxed lowercase">
            {order.shippingAddress.address}, {order.shippingAddress.locality},
            <br />
            {order.shippingAddress.city}, {order.shippingAddress.state} —{' '}
            <strong>{order.shippingAddress.pincode}</strong>
          </p>
          <p className="pt-2 font-bold">Contact: {order.shippingAddress.phone}</p>
        </div>
      </div>

      {/* Package items details */}
      <div className="bg-white border border-outline-variant/30 rounded-2xl p-6 shadow-xs text-[12px]">
        <h3 className="text-[11px] font-bold text-secondary uppercase tracking-widest mb-3 flex items-center gap-1.5 border-b border-outline-variant/20 pb-2">
          <PackageCheck className="text-sm text-primary" strokeWidth={1.5} />
          <span>Consignment Summary</span>
        </h3>
        <div className="divide-y divide-surface-container max-h-[140px] overflow-y-auto pr-1">
          {order.items.map((item, idx) => (
            <div
              key={idx}
              className="py-2.5 flex justify-between gap-3 text-[11px] first:pt-0 last:pb-0"
            >
              <div className="min-w-0">
                <h4 className="font-bold text-on-surface line-clamp-1">{item.title}</h4>
                <span className="text-[10px] text-secondary font-light">
                  Style: {item.variant || 'Default'} × Qty: {item.quantity}
                </span>
              </div>
              <strong className="text-on-surface shrink-0">
                ₹{(item.price * item.quantity).toLocaleString()}
              </strong>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
