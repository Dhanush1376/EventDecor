import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { EXTERNAL_URLS } from '../../../config/constants';
import { WhatsAppIcon } from '../../../components/ui/WhatsAppIcon';
import { m as motion, AnimatePresence } from 'framer-motion';

export function RentalCustomerAndProof({ rental }) {
  const [selectedProofImage, setSelectedProofImage] = useState(null);
  const [showFullAadhaar, setShowFullAadhaar] = useState(true);

  const customerName = rental.shippingAddress?.name || rental.user?.name || 'Customer';
  const customerPhone = rental.shippingAddress?.phone || rental.user?.phone || '';
  const customerEmail = rental.shippingAddress?.email || rental.user?.email || '';

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

  const copyToClipboard = (text, label) => {
    if (!text) return;
    navigator.clipboard.writeText(text.replace(/\s+/g, ''));
    toast.success(`${label} copied to clipboard!`);
  };

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
  const hasVerifiedProof = Boolean(hasAadhaar || hasDocuments);

  const isEmailVerified = Boolean(
    rental.user?.isEmailVerified ??
    (rental.user?.isVerified && Boolean(rental.user?.email || rental.user?.googleId)),
  );
  const isPhoneVerified = Boolean(rental.user?.isPhoneVerified);

  return (
    <div className="space-y-4">
      {/* 1. CUSTOMER PROFILE CARD */}
      <div className="bg-[var(--admin-surface)] rounded-lg shadow-sm border border-[var(--admin-border)] overflow-hidden">
        <div className="px-4 py-3 border-b border-[var(--admin-border-subtle)] bg-[var(--admin-bg-subtle)] flex items-center justify-between">
          <h3 className="text-[13.5px] font-bold text-[var(--admin-text-primary)] flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px] text-[var(--admin-accent)]">
              person
            </span>
            Customer & Delivery Profile
          </h3>
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
            {rental.user?.role || 'Customer'}
          </span>
        </div>

        <div className="p-4 space-y-4">
          {/* Customer Header Info */}
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100/70 text-blue-700 flex items-center justify-center font-bold text-[16px] shrink-0 border border-blue-200">
              {customerName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-[14.5px] font-bold text-[var(--admin-text-primary)] truncate">
                  {customerName}
                </h4>
                {rental.user?._id && (
                  <span className="text-[10px] font-mono text-[var(--admin-text-tertiary)] bg-[var(--admin-bg-subtle)] px-1.5 py-0.5 rounded border border-[var(--admin-border-subtle)]">
                    ID: {rental.user._id.slice(-6)}
                  </span>
                )}
              </div>

              {/* Direct Contact Links */}
              <div className="mt-2 flex flex-wrap gap-1.5">
                {customerPhone && (
                  <>
                    <a
                      href={`tel:${cleanPhone}`}
                      className="h-7 px-2.5 rounded-md bg-[var(--admin-bg-subtle)] hover:bg-[var(--admin-border)] text-[var(--admin-text-primary)] font-bold text-[11px] flex items-center gap-1 border border-[var(--admin-border-subtle)] transition-colors"
                      title="Call customer"
                    >
                      <span className="material-symbols-outlined text-[13px] text-emerald-600">
                        call
                      </span>
                      {customerPhone}
                    </a>
                    <a
                      href={`${EXTERNAL_URLS.WHATSAPP_BASE}/${cleanPhone}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="h-7 px-2.5 rounded-md bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#128C7E] font-bold text-[11px] flex items-center gap-1 border border-[#25D366]/30 transition-colors"
                      title="Open WhatsApp"
                    >
                      <WhatsAppIcon className="w-[12px] h-[12px]" />
                      WhatsApp
                    </a>
                  </>
                )}
              </div>

              {customerEmail && (
                <div className="mt-2 flex items-center justify-between text-[11.5px] text-[var(--admin-text-secondary)] bg-[var(--admin-bg-subtle)] px-2.5 py-1.5 rounded-md border border-[var(--admin-border-subtle)]">
                  <a
                    href={`mailto:${customerEmail}`}
                    className="flex items-center gap-1.5 hover:text-[var(--admin-accent)] truncate"
                  >
                    <span className="material-symbols-outlined text-[14px]">mail</span>
                    {customerEmail}
                  </a>
                  <button
                    onClick={() => copyToClipboard(customerEmail, 'Email')}
                    className="text-[var(--admin-text-tertiary)] hover:text-[var(--admin-accent)] ml-1 cursor-pointer"
                    title="Copy Email"
                  >
                    <span className="material-symbols-outlined text-[14px]">content_copy</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Account Verification Badges */}
          {rental.user && (
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[var(--admin-border-subtle)] text-[11px]">
              <span
                className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                  isEmailVerified
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-amber-50 text-amber-700 border-amber-200'
                }`}
              >
                <span className="material-symbols-outlined text-[13px]">
                  {isEmailVerified ? 'verified' : 'mail_lock'}
                </span>
                Email {isEmailVerified ? 'Verified' : 'Unverified'}
              </span>

              <span
                className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                  isPhoneVerified
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-stone-50 text-stone-600 border-stone-200'
                }`}
              >
                <span className="material-symbols-outlined text-[13px]">
                  {isPhoneVerified ? 'verified' : 'phonelink_erase'}
                </span>
                Phone {isPhoneVerified ? 'Verified' : 'Unverified'}
              </span>
            </div>
          )}

          {/* Shipping Address */}
          <div className="pt-3 border-t border-[var(--admin-border-subtle)] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--admin-text-tertiary)] flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px] text-emerald-600">
                  location_on
                </span>
                Delivery Address
              </span>
              {pincode && (
                <span className="text-[11px] font-bold text-[var(--admin-text-primary)] bg-[var(--admin-bg-subtle)] px-2 py-0.5 rounded border border-[var(--admin-border-subtle)]">
                  PIN: {pincode}
                </span>
              )}
            </div>

            <div className="text-[12.5px] text-[var(--admin-text-primary)] leading-relaxed bg-[var(--admin-bg-subtle)] p-2.5 rounded-md border border-[var(--admin-border-subtle)]">
              <p className="font-medium">{address || 'No street address specified'}</p>
              {locality && (
                <p className="text-[var(--admin-text-secondary)]">Locality: {locality}</p>
              )}
              {landmark && (
                <p className="text-[var(--admin-text-tertiary)] italic">Landmark: {landmark}</p>
              )}
              {(city || state) && (
                <p className="font-semibold text-[var(--admin-text-primary)] mt-0.5">
                  {[city, state].filter(Boolean).join(', ')}
                </p>
              )}
            </div>

            <a
              href={`https://maps.google.com/?q=${encodeURIComponent(fullAddressString)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full h-8 flex items-center justify-center rounded-lg bg-[var(--admin-surface)] hover:bg-[var(--admin-border-subtle)] text-[var(--admin-text-primary)] transition-colors border border-[var(--admin-border)] font-bold text-[11.5px] gap-1.5 shadow-xs"
            >
              <span className="material-symbols-outlined text-[15px] text-blue-600">map</span>
              Open in Google Maps
            </a>
          </div>
        </div>
      </div>

      {/* 2. REDESIGNED IDENTITY & LEGAL VERIFICATION PROOF CARD */}
      <div className="bg-[var(--admin-surface)] rounded-lg shadow-sm border border-[var(--admin-border)] overflow-hidden">
        {/* Card Header */}
        <div className="px-4 py-3 border-b border-[var(--admin-border-subtle)] bg-[var(--admin-bg-subtle)] flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="material-symbols-outlined text-[18px] text-emerald-600 shrink-0">
              verified_user
            </span>
            <h3 className="text-[13.5px] font-bold text-[var(--admin-text-primary)] truncate">
              Identity & Legal Verification
            </h3>
          </div>
          <span
            className={`h-6 px-2.5 rounded-md text-[10px] font-bold uppercase tracking-wider border shadow-xs whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
              hasVerifiedProof
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-stone-100 text-stone-600 border-stone-200'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${hasVerifiedProof ? 'bg-emerald-500' : 'bg-stone-400'}`}
            />
            {hasVerifiedProof ? 'ID Verified' : 'Data Unavailable'}
          </span>
        </div>

        <div className="p-4 space-y-4">
          {/* Aadhaar Identity Section - Shows UIDAI card if available, else clean Data Unavailable */}
          {hasAadhaar ? (
            <div className="relative rounded-lg border border-emerald-200/80 bg-gradient-to-br from-emerald-50/60 via-white to-amber-50/40 p-3.5 shadow-xs overflow-hidden">
              {/* Top Security & UIDAI Header Bar */}
              <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-emerald-100">
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px] text-emerald-700">
                    fingerprint
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-900">
                    Government of India • UIDAI
                  </span>
                </div>
                <span className="text-[9.5px] font-bold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded border border-emerald-200">
                  ✓ Aadhaar Verified
                </span>
              </div>

              {/* Aadhaar Number Display */}
              <div className="flex items-center justify-between gap-2">
                <div>
                  <span className="text-[9.5px] font-bold uppercase tracking-widest text-[var(--admin-text-tertiary)] block mb-0.5">
                    Aadhaar Number
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-extrabold text-[15px] sm:text-[16px] text-gray-900 tracking-[0.14em]">
                      {showFullAadhaar ? formattedAadhaar : maskedAadhaar}
                    </span>
                    <button
                      onClick={() => setShowFullAadhaar(!showFullAadhaar)}
                      className="text-gray-400 hover:text-gray-700 cursor-pointer p-0.5"
                      title={showFullAadhaar ? 'Mask Aadhaar' : 'Show full Aadhaar'}
                    >
                      <span className="material-symbols-outlined text-[15px]">
                        {showFullAadhaar ? 'visibility_off' : 'visibility'}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Copy Button */}
                <button
                  onClick={() => copyToClipboard(rawAadhaar, 'Aadhaar Number')}
                  className="h-7 px-2.5 rounded-md bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-xs flex items-center gap-1 text-[11px] font-bold cursor-pointer transition-all active:scale-95 shrink-0"
                  title="Copy 12-digit Aadhaar Number"
                >
                  <span className="material-symbols-outlined text-[14px]">content_copy</span>
                  <span>Copy</span>
                </button>
              </div>

              <div className="mt-2.5 pt-2 border-t border-emerald-100/60 flex items-center justify-between text-[10px] text-emerald-800 font-medium">
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[13px] text-emerald-600">
                    check_circle
                  </span>
                  12-Digit Biometric Identity on File
                </span>
                <span className="text-[var(--admin-text-tertiary)]">Verified</span>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-[var(--admin-border-subtle)] bg-[var(--admin-bg-subtle)] p-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-md bg-stone-200/70 text-stone-500 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[18px]">badge</span>
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--admin-text-tertiary)] block">
                    Aadhaar Number
                  </span>
                  <span className="text-[13px] font-semibold text-[var(--admin-text-secondary)]">
                    Data Unavailable
                  </span>
                </div>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-stone-100 text-stone-600 border border-stone-200 shrink-0">
                Not Provided
              </span>
            </div>
          )}

          {/* Uploaded Identity Proof Documents */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--admin-text-tertiary)]">
                Uploaded Identity Documents ({identityDocs.length})
              </span>
              <span
                className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${
                  hasDocuments
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-stone-100 text-stone-600 border-stone-200'
                }`}
              >
                {hasDocuments
                  ? `${identityDocs.length} Document${identityDocs.length > 1 ? 's' : ''}`
                  : 'Data Unavailable'}
              </span>
            </div>

            {hasDocuments ? (
              <div className="grid grid-cols-1 gap-2.5">
                {identityDocs.map((doc, dIdx) => (
                  <div
                    key={dIdx}
                    className="border border-[var(--admin-border-subtle)] rounded-lg overflow-hidden bg-white shadow-xs group flex items-center p-2 gap-3"
                  >
                    {/* Document Thumbnail with zoom overlay */}
                    <div
                      onClick={() => setSelectedProofImage(doc.url)}
                      className="w-16 h-14 rounded-md bg-gray-100 relative cursor-pointer overflow-hidden shrink-0 border border-gray-200"
                    >
                      <img
                        src={doc.url}
                        alt={doc.type || 'Aadhaar Card'}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                        <span className="material-symbols-outlined text-[16px]">zoom_in</span>
                      </div>
                    </div>

                    {/* Document Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[15px] text-emerald-600">
                          badge
                        </span>
                        <h5 className="text-[12.5px] font-bold text-[var(--admin-text-primary)] truncate">
                          {doc.type || 'Identity Document Proof'}
                        </h5>
                      </div>
                      <p className="text-[10.5px] text-[var(--admin-text-tertiary)] mt-0.5">
                        Document on File
                      </p>
                    </div>

                    {/* Open / Preview Action */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => setSelectedProofImage(doc.url)}
                        className="h-7 px-2 rounded-md bg-[var(--admin-bg-subtle)] hover:bg-[var(--admin-border-subtle)] text-[var(--admin-text-primary)] font-bold text-[10.5px] flex items-center gap-1 border border-[var(--admin-border-subtle)] cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[13px]">visibility</span>
                        View
                      </button>
                      {doc.url && (
                        <a
                          href={doc.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-7 h-7 rounded-md bg-[var(--admin-bg-subtle)] hover:bg-[var(--admin-border-subtle)] text-[var(--admin-text-tertiary)] hover:text-[var(--admin-text-primary)] flex items-center justify-center border border-[var(--admin-border-subtle)]"
                          title="Open full size in new tab"
                        >
                          <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-3.5 rounded-lg border border-dashed border-[var(--admin-border-subtle)] bg-[var(--admin-bg-subtle)] text-center">
                <div className="w-8 h-8 rounded-full bg-stone-200/50 text-stone-400 flex items-center justify-center mx-auto mb-1.5">
                  <span className="material-symbols-outlined text-[17px]">folder_off</span>
                </div>
                <p className="text-[12px] font-semibold text-[var(--admin-text-primary)]">
                  Data Unavailable
                </p>
                <p className="text-[10.5px] text-[var(--admin-text-tertiary)] mt-0.5">
                  No identity documents uploaded for this order.
                </p>
              </div>
            )}
          </div>

          {/* Digital Rental Agreement Acceptance Proof */}
          <div className="p-3 bg-blue-50/60 border border-blue-200/80 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-blue-900 font-bold text-[12px]">
                <span className="material-symbols-outlined text-[16px] text-blue-600">
                  verified
                </span>
                Digital Rental Agreement
              </div>
              <span
                className={`text-[9.5px] font-bold uppercase px-1.5 py-0.5 rounded border ${
                  rental.agreementAcceptedAt
                    ? 'text-blue-700 bg-blue-100/70 border-blue-200'
                    : 'text-stone-600 bg-stone-100 border-stone-200'
                }`}
              >
                {rental.agreementAcceptedAt ? 'E-Signed' : 'Data Unavailable'}
              </span>
            </div>
            <p className="text-[11px] text-blue-800 mt-1 leading-relaxed">
              {rental.agreementAcceptedAt
                ? `Accepted & digitally signed on ${new Date(
                    rental.agreementAcceptedAt,
                  ).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true,
                  })}`
                : 'Rental agreement acceptance date is unavailable for this order.'}
            </p>
          </div>
        </div>
      </div>

      {/* Lightbox Image Preview Modal */}
      <AnimatePresence>
        {selectedProofImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedProofImage(null)}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs cursor-pointer"
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="relative max-w-2xl max-h-[85vh] overflow-hidden rounded-lg bg-white p-2 shadow-2xl cursor-default"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center px-2 py-1 mb-2 border-b border-gray-100">
                <span className="text-[12px] font-bold text-gray-700">
                  Proof Document Full View
                </span>
                <button
                  onClick={() => setSelectedProofImage(null)}
                  className="w-6 h-6 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[15px]">close</span>
                </button>
              </div>
              <img
                src={selectedProofImage}
                alt="Document proof preview"
                className="max-h-[70vh] w-auto mx-auto object-contain rounded"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
