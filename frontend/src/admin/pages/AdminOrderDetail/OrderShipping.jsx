import React, { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import AdminCustomerProfileModal from '../../components/AdminCustomerProfileModal';

export function OrderShipping({ order }) {
  const [showCustomerModal, setShowCustomerModal] = useState(false);

  const customerId =
    order.user?._id ||
    order.user?.id ||
    (typeof order.user === 'string' && order.user) ||
    order.userId?._id ||
    order.userId?.id ||
    (typeof order.userId === 'string' && order.userId);

  const customerName =
    order.user?.name || order.customer || order.shippingAddress?.name || 'Customer';
  const customerPhone = order.user?.phone || order.phone || order.shippingAddress?.phone || '';
  const customerEmail = order.user?.email || order.email || order.shippingAddress?.email || '';

  const resolvedCustomer = {
    _id: customerId,
    name: customerName,
    phone: customerPhone,
    email: customerEmail,
    shippingAddress: order.shippingAddress || order.shipping,
  };

  return (
    <div className="bg-[var(--admin-surface)] rounded-[4px] shadow-sm border border-[var(--admin-border)] overflow-hidden">
      <div className="px-3 sm:px-5 py-3 sm:py-4 border-b border-[var(--admin-border-subtle)] bg-[var(--admin-bg-subtle)] flex items-center justify-between">
        <h3 className="text-[14px] font-bold text-[var(--admin-text-primary)] flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">local_shipping</span>
          Shipping Profile
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-[10px] bg-[var(--admin-surface)] text-[var(--admin-text-secondary)] px-2 py-0.5 rounded-[4px] font-bold uppercase tracking-wider border border-[var(--admin-border)] shadow-sm">
            {order.shipping?.type || 'Standard'}
          </span>
          {customerId && (
            <button
              type="button"
              onClick={() => setShowCustomerModal(true)}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--admin-accent)] hover:underline cursor-pointer"
              title="View Customer Profile"
            >
              <span>View Profile</span>
              <span className="material-symbols-outlined text-[13px]">open_in_new</span>
            </button>
          )}
        </div>
      </div>

      <div className="px-3 py-4 sm:p-5 lg:p-6 space-y-5">
        <div
          onClick={() => customerId && setShowCustomerModal(true)}
          className={`flex items-start gap-3 p-1.5 -m-1.5 rounded-[4px] transition-colors ${
            customerId ? 'hover:bg-[var(--admin-surface-muted)]/70 cursor-pointer group' : ''
          }`}
          title={customerId ? 'Click to view customer profile' : undefined}
        >
          <div
            className={`w-10 h-10 rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 flex items-center justify-center shrink-0 font-bold text-[14px] border border-blue-100 dark:border-blue-900/40 ${customerId ? 'group-hover:scale-105 transition-transform' : ''}`}
          >
            {customerName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <p
                className={`text-[14px] font-bold text-[var(--admin-text-primary)] truncate ${customerId ? 'group-hover:text-[var(--admin-accent)] transition-colors' : ''}`}
              >
                {customerName}
              </p>
              {customerId && (
                <span className="material-symbols-outlined text-[13px] text-[var(--admin-text-tertiary)] opacity-0 group-hover:opacity-100 transition-opacity">
                  open_in_new
                </span>
              )}
            </div>
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
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-0.5">
              <span className="text-[10px] uppercase font-bold text-[var(--admin-text-tertiary)] tracking-wider block">
                Shipping Address
              </span>
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
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--admin-accent)] hover:underline cursor-pointer shrink-0"
                title="Open shipping address in Google Maps"
              >
                <span className="material-symbols-outlined text-[13px]">map</span>
                <span>Open in Maps</span>
              </a>
            </div>
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
                    .join(', ')}{' '}
                  -{' '}
                  <span className="font-bold">
                    {order.shipping?.pincode || order.shippingAddress?.pincode || 'N/A'}
                  </span>
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Customer 360 Profile Modal */}
      <AnimatePresence>
        {showCustomerModal && (
          <AdminCustomerProfileModal
            customer={resolvedCustomer}
            onClose={() => setShowCustomerModal(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
