import React from 'react';
export function OrderShipping({ order }) {
  return (
    <div className="bg-[var(--admin-surface)] rounded-xl shadow-sm border border-[var(--admin-border)] overflow-hidden">
      <div className="px-3 sm:px-5 py-3 sm:py-4 border-b border-[var(--admin-border-subtle)] bg-[var(--admin-bg-subtle)] flex items-center justify-between">
        <h3 className="text-[14px] font-bold text-[var(--admin-text-primary)] flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">local_shipping</span>
          Shipping Profile
        </h3>
        <span className="text-[10px] bg-[var(--admin-surface)] text-[var(--admin-text-secondary)] px-2 py-0.5 rounded-xl font-bold uppercase tracking-wider border border-[var(--admin-border)] shadow-sm">
          {order.shipping?.type || 'Standard'}
        </span>
      </div>

      <div className="px-3 py-4 sm:p-5 lg:p-6 space-y-5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[20px]">person</span>
          </div>
          <div>
            <p className="text-[14px] font-bold text-[var(--admin-text-primary)]">
              {order.customer || order.shippingAddress?.name}
            </p>
            <div className="text-[12px] text-[var(--admin-text-secondary)] mt-0.5 flex flex-col gap-0.5">
              <span className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[14px]">phone</span>{' '}
                {order.phone || order.shippingAddress?.phone}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[14px]">mail</span>{' '}
                {order.email || order.shippingAddress?.email || order.user?.email}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-start gap-3 pt-4 border-t border-[var(--admin-border-subtle)]">
          <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[20px]">location_on</span>
          </div>
          <div className="flex-1">
            <div className="text-[13px] text-[var(--admin-text-primary)] leading-relaxed">
              <p>
                {order.shipping?.address ||
                  order.shippingAddress?.address ||
                  order.address ||
                  'Address not provided'}
                {order.shippingAddress?.locality ? `, ${order.shippingAddress.locality}` : ''}
              </p>
              {order.shippingAddress?.landmark && (
                <p className="mt-0.5 text-[var(--admin-text-tertiary)] italic">
                  Landmark: {order.shippingAddress.landmark}
                </p>
              )}
              {(order.shippingAddress?.city || order.shippingAddress?.state) && (
                <p className="mt-0.5 font-medium">
                  {[order.shippingAddress?.city, order.shippingAddress?.state]
                    .filter(Boolean)
                    .join(', ')}
                </p>
              )}
            </div>
            <div className="mt-2 text-[12px] text-[var(--admin-text-secondary)] font-medium">
              Pincode:{' '}
              <span className="text-[var(--admin-text-primary)] font-bold">
                {order.shipping?.pincode || order.shippingAddress?.pincode || 'N/A'}
              </span>
            </div>
          </div>
        </div>

        <div className="pt-2">
          <a
            href={`https://maps.google.com/?q=${encodeURIComponent(
              [
                order.shipping?.address || order.shippingAddress?.address || order.address,
                order.shippingAddress?.locality,
                order.shippingAddress?.city,
                order.shippingAddress?.state,
                order.shipping?.pincode || order.shippingAddress?.pincode,
              ]
                .filter(Boolean)
                .join(', '),
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full h-10 flex items-center justify-center rounded-xl bg-[var(--admin-surface)] text-[var(--admin-text-primary)] hover:bg-[var(--admin-bg-subtle)] transition-colors border border-[var(--admin-border)] shadow-sm font-bold text-[12px]"
          >
            <span className="material-symbols-outlined text-[16px] mr-1.5">map</span>
            Open in Maps
          </a>
        </div>
      </div>
    </div>
  );
}
