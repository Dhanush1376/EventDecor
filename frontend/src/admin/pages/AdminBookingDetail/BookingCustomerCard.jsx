import React, { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { EXTERNAL_URLS } from '../../../config/constants';
import { WhatsAppIcon } from '../../../components/ui/WhatsAppIcon';
import AdminCustomerProfileModal from '../../components/AdminCustomerProfileModal';

export function BookingCustomerCard({ booking }) {
  const [showProfileModal, setShowProfileModal] = useState(false);
  const customer = booking.user || {};
  const customerName = customer.name || 'Valued Client';
  const customerEmail = customer.email || 'No email provided';
  const customerPhone = booking.contactPhone || customer.phone || 'No phone provided';
  const cleanPhone = customerPhone.replace(/[^0-9]/g, '');

  const resolvedCustomer = {
    ...customer,
    _id:
      customer._id || customer.id || (typeof booking.user === 'string' ? booking.user : undefined),
    name: customerName,
    email: customerEmail,
    phone: customerPhone,
    role: customer.role || 'Client',
  };

  const copyText = (text, label) => {
    if (text && text !== 'No phone provided' && text !== 'No email provided') {
      navigator.clipboard.writeText(text);
      toast.success(`${label} copied to clipboard!`);
    }
  };

  return (
    <>
      <div
        className="bg-white dark:bg-[#1a1815] bg-[var(--admin-surface,#ffffff)] rounded-[4px] shadow-sm border border-stone-200 dark:border-stone-800 border-[var(--admin-border-subtle,#e8e4d9)] overflow-hidden !font-sans"
        style={{
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        }}
      >
        {/* Header (Matches OrderShipping) */}
        <div className="px-4 sm:px-5 py-3 sm:py-3.5 border-b border-stone-200 dark:border-stone-800 border-[var(--admin-border-subtle,#e8e4d9)] bg-[#faf9f5] dark:bg-[#211f1b] bg-[var(--admin-bg-subtle,#faf9f5)] flex items-center justify-between !font-sans">
          <h3
            className="text-[13.5px] font-bold text-stone-900 dark:text-stone-100 text-[var(--admin-text-primary,#111827)] flex items-center gap-2 !font-sans"
            style={{
              fontFamily:
                "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
            }}
          >
            <span className="material-symbols-outlined text-[18px] text-[var(--admin-accent)]">
              person
            </span>
            Customer Profile
          </h3>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] bg-white dark:bg-stone-800 bg-[var(--admin-surface,#ffffff)] text-stone-700 dark:text-stone-300 text-[var(--admin-text-secondary,#374151)] px-2 py-0.5 rounded-[4px] font-bold uppercase tracking-wider border border-stone-200 dark:border-stone-700 border-[var(--admin-border,#e8e4d9)] shadow-2xs !font-sans">
              {customer.role || 'Client'}
            </span>
            <button
              type="button"
              onClick={() => setShowProfileModal(true)}
              className="h-6 px-2 rounded-[4px] bg-white dark:bg-stone-800 bg-[var(--admin-surface,#ffffff)] hover:bg-stone-100 dark:hover:bg-stone-700 text-[var(--admin-accent)] hover:text-[var(--admin-accent-hover)] border border-stone-200 dark:border-stone-700 border-[var(--admin-border,#e8e4d9)] text-[10.5px] font-bold flex items-center gap-1 transition-colors shadow-2xs cursor-pointer !font-sans"
              title="View Full Customer Profile"
            >
              <span>View Profile</span>
              <span className="material-symbols-outlined text-[11px]">open_in_new</span>
            </button>
          </div>
        </div>

        <div className="p-4 sm:p-5 space-y-4">
          {/* Customer Avatar & Name (Clickable) */}
          <div
            onClick={() => setShowProfileModal(true)}
            className="flex items-center gap-3 p-2 -m-2 rounded-[4px] hover:bg-[var(--admin-surface-muted)]/70 transition-colors cursor-pointer group"
            title="Click to view customer 360° profile"
          >
            <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 flex items-center justify-center shrink-0 font-bold text-[15px] border border-blue-100 dark:border-blue-900/50 shadow-2xs group-hover:scale-105 transition-transform">
              {customerName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <p className="text-[14px] font-bold text-[var(--admin-text-primary)] truncate group-hover:text-[var(--admin-accent)] transition-colors">
                  {customerName}
                </p>
                <span className="material-symbols-outlined text-[13px] text-[var(--admin-text-tertiary)] opacity-0 group-hover:opacity-100 transition-opacity">
                  open_in_new
                </span>
              </div>
            </div>
          </div>

          {/* Contact Details Chips */}
          <div className="space-y-1.5 pt-2.5 border-t border-[var(--admin-border-subtle)] text-xs">
            {/* Phone */}
            <div className="flex items-center justify-between p-2 rounded-[4px] bg-[var(--admin-surface-muted)]/50 border border-[var(--admin-border-subtle)]">
              <span className="flex items-center gap-1.5 text-[12px] font-mono text-[var(--admin-text-secondary)] truncate">
                <span className="material-symbols-outlined text-[14px] text-stone-400 shrink-0">
                  phone
                </span>
                <span className="truncate">{customerPhone}</span>
              </span>
              {customerPhone && customerPhone !== 'No phone provided' && (
                <div className="flex items-center gap-1 shrink-0 ml-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      copyText(customerPhone, 'Phone number');
                    }}
                    className="w-6 h-6 rounded-[3px] bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 text-stone-600 dark:text-stone-300 flex items-center justify-center transition-colors cursor-pointer"
                    title="Copy Phone"
                  >
                    <span className="material-symbols-outlined text-[12px]">content_copy</span>
                  </button>
                  {cleanPhone && (
                    <a
                      href={`tel:${cleanPhone}`}
                      onClick={(e) => e.stopPropagation()}
                      className="w-6 h-6 rounded-[3px] bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 text-stone-700 dark:text-stone-300 flex items-center justify-center transition-colors"
                      title="Call Client"
                    >
                      <span className="material-symbols-outlined text-[13px]">call</span>
                    </a>
                  )}
                  {cleanPhone && (
                    <a
                      href={`${EXTERNAL_URLS.WHATSAPP_BASE}/${cleanPhone}`}
                      onClick={(e) => e.stopPropagation()}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-6 h-6 rounded-[3px] bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 hover:bg-emerald-100 flex items-center justify-center transition-colors"
                      title="WhatsApp Client"
                    >
                      <WhatsAppIcon className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              )}
            </div>

            {/* Email */}
            <div className="flex items-center justify-between p-2 rounded-[4px] bg-[var(--admin-surface-muted)]/50 border border-[var(--admin-border-subtle)]">
              <span className="flex items-center gap-1.5 text-[12px] text-[var(--admin-text-secondary)] truncate">
                <span className="material-symbols-outlined text-[14px] text-stone-400 shrink-0">
                  mail
                </span>
                <span className="truncate">{customerEmail}</span>
              </span>
              {customerEmail && customerEmail !== 'No email provided' && (
                <div className="flex items-center gap-1 shrink-0 ml-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      copyText(customerEmail, 'Email address');
                    }}
                    className="w-6 h-6 rounded-[3px] bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 text-stone-600 dark:text-stone-300 flex items-center justify-center transition-colors cursor-pointer"
                    title="Copy Email"
                  >
                    <span className="material-symbols-outlined text-[12px]">content_copy</span>
                  </button>
                  <a
                    href={`mailto:${customerEmail}`}
                    onClick={(e) => e.stopPropagation()}
                    className="w-6 h-6 rounded-[3px] bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 text-stone-700 dark:text-stone-300 flex items-center justify-center transition-colors"
                    title="Send Email"
                  >
                    <span className="material-symbols-outlined text-[13px]">send</span>
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Customer Profile 360 Modal */}
      <AnimatePresence>
        {showProfileModal && (
          <AdminCustomerProfileModal
            customer={resolvedCustomer}
            onClose={() => setShowProfileModal(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
export default BookingCustomerCard;
