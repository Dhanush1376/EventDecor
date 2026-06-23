import React from 'react';
import { m as motion } from 'framer-motion';
import { fadeUp } from '../../components/AdminUIKit';

export function OrderShipping({ order }) {
  return (
    <motion.div variants={fadeUp} className="admin-card p-6">
      <h2 className="text-[14px] font-bold text-[var(--admin-text-primary)] mb-5">
        Shipping Destination
      </h2>
      <div className="flex items-center gap-3 mb-6 pb-5 border-b border-[var(--admin-border-subtle)]">
        <div className="w-12 h-12 rounded-[var(--admin-radius-md)] bg-[var(--admin-bg-subtle)] flex items-center justify-center border border-[var(--admin-border)] shrink-0">
          <span className="text-[14px] font-bold text-[var(--admin-text-primary)]">
            {order.customer
              .split(' ')
              .filter(Boolean)
              .map((n) => n[0])
              .join('')
              .slice(0, 2)
              .toUpperCase()}
          </span>
        </div>
        <div>
          <p className="text-[14px] font-bold text-[var(--admin-text-primary)] leading-tight">
            {order.customer}
          </p>
          <p className="text-[12px] text-[var(--admin-text-tertiary)] font-medium mt-1">
            {order.email}
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <span className="material-symbols-outlined text-[18px] text-[var(--admin-text-tertiary)] shrink-0 mt-0.5">
            phone
          </span>
          <div>
            <span className="block text-[13px] font-medium text-[var(--admin-text-primary)]">
              {order.phone}
            </span>
            {order.shippingAddress?.alternatePhone && (
              <span className="block text-[11px] text-[var(--admin-text-secondary)] mt-1 font-medium">
                Alt: {order.shippingAddress.alternatePhone}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-start gap-3">
          <span className="material-symbols-outlined text-[18px] text-[var(--admin-text-tertiary)] shrink-0 mt-0.5">
            location_on
          </span>
          <div className="leading-relaxed text-[13px] text-[var(--admin-text-secondary)] font-medium">
            <span className="block">{order.address}</span>
            {order.shippingAddress?.landmark && (
              <span className="block text-[11px] mt-1.5 text-[var(--admin-text-primary)] font-bold">
                Landmark: {order.shippingAddress.landmark}
              </span>
            )}
          </div>
        </div>

        {order.needByDate && (
          <div className="flex items-start gap-3 mt-5 p-3.5 bg-[var(--admin-success-light)] rounded-[var(--admin-radius-lg)] border border-[#bbf7d0]">
            <span className="material-symbols-outlined text-[18px] text-[var(--admin-success)] mt-0.5 shrink-0">
              calendar_today
            </span>
            <div>
              <span className="block text-[12px] font-bold text-[#166534]">
                Required Need-By Date
              </span>
              <span className="block text-[13px] font-bold text-[#15803d] mt-1">
                {new Date(order.needByDate).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </span>
            </div>
          </div>
        )}

        {order.shippingAddress?.deliveryInstructions && (
          <div className="flex items-start gap-3 mt-4 p-3.5 bg-[#fffbeb] rounded-[var(--admin-radius-lg)] border border-[#fde68a]">
            <span className="material-symbols-outlined text-[18px] text-[#d97706] mt-0.5 shrink-0">
              info
            </span>
            <span className="text-[12px] text-[#92400e] font-medium italic">
              "{order.shippingAddress.deliveryInstructions}"
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
}
