import React, { useState } from 'react';
import { EXTERNAL_URLS } from '../../../config/constants';
import { WhatsAppIcon } from '../../../components/ui/WhatsAppIcon';
import { m as motion, AnimatePresence } from 'framer-motion';

export function RentalCustomerAndProof({ rental }) {
  const [selectedProofImage, setSelectedProofImage] = useState(null);
  const [showFullAadhaar, setShowFullAadhaar] = useState(false);

  const customerName =
    rental.shippingAddress?.name || rental.userId?.name || rental.user?.name || 'Customer';
  const customerPhone =
    rental.shippingAddress?.phone || rental.userId?.phone || rental.user?.phone || '';
  const customerEmail =
    rental.shippingAddress?.email || rental.userId?.email || rental.user?.email || '';

  const address = rental.shippingAddress?.address || '';
  const locality = rental.shippingAddress?.locality || '';
  const city = rental.shippingAddress?.city || '';
  const state = rental.shippingAddress?.state || '';
  const pincode = rental.shippingAddress?.pincode || '';
  const landmark = rental.shippingAddress?.landmark || '';
  const country = rental.shippingAddress?.country || 'India';

  const fullAddressString = [
    address,
    locality,
    landmark ? `Near ${landmark}` : '',
    city,
    state,
    pincode,
    country,
  ]
    .filter(Boolean)
    .join(', ');

  const cleanPhone = customerPhone.replace(/[^0-9]/g, '');

  const hasAadhaar = Boolean(
    rental.aadhaarNumber && String(rental.aadhaarNumber).trim().length > 0,
  );
  const rawAadhaar = hasAadhaar ? String(rental.aadhaarNumber).replace(/[^0-9]/g, '') : '';
  const formattedAadhaar = rawAadhaar.replace(/(\d{4})(?=\d)/g, '$1 ');
  const maskedAadhaar =
    rawAadhaar.length === 12 ? `•••• •••• ${rawAadhaar.slice(-4)}` : formattedAadhaar;

  const identityDocs = Array.isArray(rental.identityDocuments) ? rental.identityDocuments : [];
  const hasDocuments = identityDocs.length > 0;
  const isKycVerified = hasAadhaar || hasDocuments;

  return (
    <div className="bg-[var(--admin-surface)] rounded-[6px] shadow-sm border border-[var(--admin-border-subtle)] overflow-hidden">
      {/* Unified Header */}
      <div className="px-4 sm:px-5 py-3.5 border-b border-[var(--admin-border-subtle)] bg-[var(--admin-bg-subtle)]/50 flex items-center justify-between">
        <h3 className="text-[13.5px] font-bold text-[var(--admin-text-primary)] flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px] text-[var(--admin-accent)]">
            person_pin
          </span>
          Customer & Delivery
        </h3>
        <span
          className={`text-[9.5px] px-2 py-0.5 rounded-[4px] font-bold uppercase tracking-wider border shadow-2xs leading-none ${
            isKycVerified
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800'
              : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:border-amber-800'
          }`}
        >
          {isKycVerified ? 'KYC Verified' : 'KYC Pending'}
        </span>
      </div>

      <div className="p-4 sm:p-5 space-y-4">
        {/* Customer Profile Row */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 font-bold text-[14px] flex items-center justify-center shrink-0 border border-amber-200/60 dark:border-amber-800/40">
              {customerName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-[13.5px] font-bold text-[var(--admin-text-primary)] truncate">
                {customerName}
              </p>
              <div className="text-[11.5px] text-[var(--admin-text-secondary)] mt-0.5 flex items-center gap-2 flex-wrap">
                {customerPhone && (
                  <span className="inline-flex items-center gap-1 font-mono">
                    <span className="material-symbols-outlined text-[13px] text-stone-400">
                      phone
                    </span>
                    {customerPhone}
                  </span>
                )}
                {customerEmail && (
                  <span className="inline-flex items-center gap-1 truncate max-w-[180px]">
                    <span className="material-symbols-outlined text-[13px] text-stone-400">
                      mail
                    </span>
                    {customerEmail}
                  </span>
                )}
              </div>
            </div>
          </div>

          {cleanPhone && (
            <a
              href={`${EXTERNAL_URLS.WHATSAPP_BASE}/${cleanPhone}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-8 h-8 rounded-[4px] flex items-center justify-center bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366] hover:text-white transition-colors border border-[#25D366]/30 shadow-2xs shrink-0"
              title="WhatsApp Customer"
            >
              <WhatsAppIcon className="w-[15px] h-[15px]" />
            </a>
          )}
        </div>

        {/* Delivery Address Section */}
        <div className="pt-3 border-t border-[var(--admin-border-subtle)] text-[12px]">
          <div className="flex items-start justify-between gap-2">
            <span className="text-[10.5px] font-bold uppercase tracking-wider text-[var(--admin-text-tertiary)] flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">location_on</span>
              Delivery Address
            </span>
            {fullAddressString && (
              <a
                href={`https://maps.google.com/?q=${encodeURIComponent(fullAddressString)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] font-bold text-[var(--admin-accent)] hover:underline flex items-center gap-0.5 shrink-0"
              >
                Maps <span className="material-symbols-outlined text-[12px]">open_in_new</span>
              </a>
            )}
          </div>
          <p className="mt-1.5 text-[var(--admin-text-primary)] leading-relaxed text-[12.5px]">
            {[address, locality].filter(Boolean).join(', ') || 'Address not provided'}
          </p>
          {(city || state || pincode) && (
            <p className="mt-0.5 text-[var(--admin-text-secondary)] font-medium text-[11.5px]">
              {[city, state].filter(Boolean).join(', ')}
              {pincode ? ` - ${pincode}` : ''}
            </p>
          )}
          {landmark && (
            <p className="mt-0.5 text-[var(--admin-text-tertiary)] text-[11px] italic">
              Landmark: {landmark}
            </p>
          )}
        </div>

        {/* Identity & KYC Row */}
        <div className="pt-3 border-t border-[var(--admin-border-subtle)]">
          <div className="flex items-center justify-between text-[11.5px] bg-[var(--admin-bg-subtle)]/70 rounded-[4px] px-3 py-2 border border-[var(--admin-border-subtle)]">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px] text-stone-400">badge</span>
              <span className="text-[var(--admin-text-secondary)] font-medium">Aadhaar:</span>
              <span className="font-mono font-bold text-[var(--admin-text-primary)]">
                {hasAadhaar ? (showFullAadhaar ? formattedAadhaar : maskedAadhaar) : 'Not provided'}
              </span>
            </div>
            {hasAadhaar && (
              <button
                type="button"
                onClick={() => setShowFullAadhaar((prev) => !prev)}
                className="text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)] p-0.5 cursor-pointer"
                title={showFullAadhaar ? 'Hide' : 'Show'}
              >
                <span className="material-symbols-outlined text-[16px]">
                  {showFullAadhaar ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            )}
          </div>

          {/* Uploaded Documents Thumbnails if any */}
          {hasDocuments && (
            <div className="mt-2.5 space-y-1.5">
              <span className="text-[10px] uppercase font-bold text-[var(--admin-text-tertiary)] tracking-wider block">
                ID Documents ({identityDocs.length})
              </span>
              <div className="flex items-center gap-2">
                {identityDocs.map((doc, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedProofImage(doc.url || doc)}
                    className="relative w-14 h-14 rounded-[4px] border border-[var(--admin-border)] overflow-hidden bg-stone-100 dark:bg-stone-800 group cursor-pointer shrink-0 shadow-2xs"
                  >
                    <img
                      src={doc.url || doc}
                      alt={`Doc ${idx + 1}`}
                      className="w-full h-full object-cover transition-transform group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                      <span className="material-symbols-outlined text-[16px]">zoom_in</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* KYC Proof Image Preview Modal */}
      <AnimatePresence>
        {selectedProofImage && (
          <div
            onClick={() => setSelectedProofImage(null)}
            className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm cursor-pointer"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[var(--admin-surface)] rounded-[4px] p-2 max-w-2xl max-h-[85vh] overflow-hidden shadow-2xl border border-stone-300 dark:border-stone-700"
            >
              <div className="flex items-center justify-between pb-2 px-2 border-b border-[var(--admin-border-subtle)]">
                <span className="text-[12px] font-bold text-[var(--admin-text-primary)]">
                  KYC Document Preview
                </span>
                <button
                  onClick={() => setSelectedProofImage(null)}
                  className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-200"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>
              <div className="p-2 overflow-auto max-h-[75vh]">
                <img
                  src={selectedProofImage}
                  alt="KYC Document"
                  className="max-w-full h-auto rounded-[4px] mx-auto"
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
