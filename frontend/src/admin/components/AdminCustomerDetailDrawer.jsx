import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { m as motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';
import { formatCurrency, AdminStatusPill, AdminPaymentBadge } from './AdminUIKit';
import { WhatsAppIcon } from '../../components/ui/WhatsAppIcon';
import { EXTERNAL_URLS } from '../../config/constants';
import { customerIntelligenceService, orderService } from '../../services/domainServices';
import { getErrorMessage } from '../../utils/core/errorHelpers';
import { AdminOrderDrawer } from './AdminOrderDrawer';
import { useConfig } from '../../context/ConfigContext';

const getOrderCardStyle = (o) => {
  const s = (o.status || o.orderStatus || '').toLowerCase();
  if (s === 'delivered' || s === 'settled') {
    return 'border border-emerald-500/40 bg-gradient-to-r from-emerald-500/[0.035] via-emerald-500/[0.01] to-white dark:to-[#26241f] hover:border-emerald-500/60 shadow-xs';
  }
  if (s === 'cancelled' || s === 'rejected') {
    return 'border border-rose-500/40 bg-gradient-to-r from-rose-500/[0.035] via-rose-500/[0.01] to-white dark:to-[#26241f] hover:border-rose-500/60 shadow-xs';
  }
  if (s === 'processing' || s === 'confirmed' || s === 'shipped') {
    return 'border border-blue-500/40 bg-gradient-to-r from-blue-500/[0.035] via-blue-500/[0.01] to-white dark:to-[#26241f] hover:border-blue-500/60 shadow-xs';
  }
  return 'border border-amber-500/40 bg-gradient-to-r from-amber-500/[0.045] via-amber-500/[0.015] to-white dark:to-[#26241f] hover:border-amber-500/60 shadow-xs';
};

/**
 * Proper Skeleton Loaders for Customer Profile Modal
 */
function CustomerModalSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {/* 4 Symmetric KPI Cards Skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-[74px] sm:h-[82px] p-3 bg-white dark:bg-[#211f1b] rounded-[8px] border border-stone-200 dark:border-stone-800 flex flex-col justify-between"
          >
            <div className="w-16 h-2.5 bg-stone-200 dark:bg-stone-700 rounded" />
            <div className="w-20 h-4 sm:h-5 bg-stone-200 dark:bg-stone-700 rounded" />
          </div>
        ))}
      </div>

      {/* Identity & Delivery Dossier Skeleton */}
      <div className="p-4 bg-white dark:bg-[#211f1b] rounded-[8px] border border-stone-200 dark:border-stone-800 space-y-3">
        <div className="w-32 h-3 bg-stone-200 dark:bg-stone-700 rounded" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <div className="w-16 h-2.5 bg-stone-200 dark:bg-stone-700 rounded" />
            <div className="w-36 h-4 bg-stone-200 dark:bg-stone-700 rounded" />
          </div>
          <div className="space-y-1.5">
            <div className="w-20 h-2.5 bg-stone-200 dark:bg-stone-700 rounded" />
            <div className="w-48 h-4 bg-stone-200 dark:bg-stone-700 rounded" />
          </div>
        </div>
      </div>

      {/* Lifecycle Skeleton */}
      <div className="p-4 bg-white dark:bg-[#211f1b] rounded-[8px] border border-stone-200 dark:border-stone-800 space-y-2.5">
        <div className="w-28 h-3 bg-stone-200 dark:bg-stone-700 rounded" />
        <div className="flex justify-between">
          <div className="w-20 h-3 bg-stone-200 dark:bg-stone-700 rounded" />
          <div className="w-24 h-3 bg-stone-200 dark:bg-stone-700 rounded" />
        </div>
      </div>
    </div>
  );
}

function OrdersListSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      {[1, 2].map((i) => (
        <div
          key={i}
          className="p-3.5 sm:p-4 bg-white dark:bg-[#211f1b] rounded-[8px] border border-stone-200 dark:border-stone-800 space-y-3"
        >
          <div className="flex justify-between items-center pb-2.5 border-b border-stone-100 dark:border-stone-800">
            <div className="flex items-center gap-2">
              <div className="w-18 h-3.5 bg-stone-200 dark:bg-stone-700 rounded" />
              <div className="w-16 h-4 bg-stone-200 dark:bg-stone-700 rounded-full" />
            </div>
            <div className="w-16 h-3.5 bg-stone-200 dark:bg-stone-700 rounded" />
          </div>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-[6px] bg-stone-200 dark:bg-stone-700 shrink-0" />
            <div className="space-y-1.5 flex-1">
              <div className="w-36 h-3.5 bg-stone-200 dark:bg-stone-700 rounded" />
              <div className="w-20 h-2.5 bg-stone-200 dark:bg-stone-700 rounded" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function AdminCustomerDetailDrawer({
  customerId,
  customerData,
  customer,
  isOpen = true,
  onClose,
  onDelete,
}) {
  const { storeName } = useConfig();
  const navigate = useNavigate();
  const rawCustomer = customerData || (typeof customer === 'object' ? customer : null) || {};
  const resolvedCustomerId =
    customerId ||
    customer?._id ||
    customer?.id ||
    rawCustomer._id ||
    rawCustomer.id ||
    (typeof customer === 'string' ? customer : null);

  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'cart' | 'orders' | 'journey' | 'notes'
  const [loading, setLoading] = useState(false);
  const [copiedField, setCopiedField] = useState(null);

  // Responsive state for Laptop Pop-up vs Mobile App Drawer (matches md: 768px breakpoint)
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(max-width: 767px)').matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mql = window.matchMedia('(max-width: 767px)');
    const onChange = (e) => setIsMobile(e.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  // Deep customer intelligence data states
  const [profile360, setProfile360] = useState(null);
  const [journeyData, setJourneyData] = useState(null);
  const [orders, setOrders] = useState([]);
  const [activeOrderForDrawer, setActiveOrderForDrawer] = useState(null);
  const [notes, setNotes] = useState([]);
  const [newNoteText, setNewNoteText] = useState('');
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);

  // Lock body scroll while open
  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen]);

  // Handle ESC key to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Fetch enriched customer details seamlessly in background
  const fetchCustomerDetails = useCallback(async () => {
    if (!resolvedCustomerId) return;
    setLoading(true);

    try {
      const customerEmail =
        rawCustomer.email ||
        customer?.email ||
        (typeof customer === 'string' && customer.includes('@') ? customer : '');

      const [p360Res, journeyRes, ordersRes, notesRes] = await Promise.allSettled([
        customerIntelligenceService.getCustomer360(resolvedCustomerId),
        customerIntelligenceService.getCustomerJourney(resolvedCustomerId),
        orderService.getAll({
          user: resolvedCustomerId,
          email: customerEmail || undefined,
          limit: 100,
        }),
        customerIntelligenceService.getCustomerNotes(resolvedCustomerId),
      ]);

      if (p360Res.status === 'fulfilled' && p360Res.value) {
        setProfile360(p360Res.value);
      }
      if (journeyRes.status === 'fulfilled' && journeyRes.value) {
        setJourneyData(journeyRes.value?.data || journeyRes.value);
      }
      if (ordersRes.status === 'fulfilled') {
        const fetchedOrders =
          ordersRes.value?.data?.data ||
          ordersRes.value?.data?.orders ||
          ordersRes.value?.data ||
          ordersRes.value?.orders ||
          (Array.isArray(ordersRes.value) ? ordersRes.value : []);
        setOrders(Array.isArray(fetchedOrders) ? fetchedOrders : []);
      }
      if (notesRes.status === 'fulfilled' && notesRes.value) {
        setNotes(Array.isArray(notesRes.value) ? notesRes.value : []);
      }
    } catch (err) {
      console.error('Failed to load deep customer profile:', err);
    } finally {
      setLoading(false);
    }
  }, [resolvedCustomerId, rawCustomer.email, customer]);

  useEffect(() => {
    if (isOpen && resolvedCustomerId) {
      fetchCustomerDetails();
    }
  }, [isOpen, resolvedCustomerId, fetchCustomerDetails]);

  // Handle adding an internal note
  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!newNoteText.trim() || !resolvedCustomerId) return;

    setIsSubmittingNote(true);
    try {
      const res = await customerIntelligenceService.addCustomerNote(resolvedCustomerId, {
        note: newNoteText.trim(),
        category: 'general',
      });
      toast.success('Admin note attached');
      setNewNoteText('');
      if (res) {
        setNotes((prev) => [res, ...prev]);
      } else {
        fetchCustomerDetails();
      }
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to save customer note'));
    } finally {
      setIsSubmittingNote(false);
    }
  };

  // Copy helper
  const handleCopy = (text, fieldName) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    toast.success(`Copied ${fieldName}`);
    setTimeout(() => setCopiedField(null), 2000);
  };

  if (!isOpen || !resolvedCustomerId) return null;

  // Resolve consolidated customer profile attributes immediately
  const identity = profile360?.identity || {};
  const overview = profile360?.overview || {};
  const journeyCustomer = journeyData?.customer || {};

  const name =
    identity.name ||
    journeyCustomer.name ||
    rawCustomer.name ||
    (rawCustomer.email ? rawCustomer.email.split('@')[0] : 'Valued Customer');

  const email = identity.email || journeyCustomer.email || rawCustomer.email || '';
  const phone = identity.phone || journeyCustomer.phone || rawCustomer.phone || '';
  const loyaltyTier = (
    identity.loyaltyTier ||
    journeyCustomer.loyaltyTier ||
    rawCustomer.loyaltyTier ||
    'Bronze'
  ).toUpperCase();

  const resolvedOrders = (() => {
    if (orders && orders.length > 0) return orders;
    // Fallback: extract order records from journeyData timeline if direct orders query returned empty
    const timelineOrders = (journeyData?.timeline || [])
      .filter((ev) => ev.type === 'order_placed' && (ev.metadata?.orderId || ev.id))
      .map((ev) => ({
        id: ev.metadata?.orderId || ev.id,
        _id: ev.metadata?.orderId || ev.id,
        customer: name,
        total: ev.metadata?.total || 0,
        totalAmount: ev.metadata?.total || 0,
        status: ev.metadata?.status || 'Confirmed',
        orderStatus: ev.metadata?.status || 'Confirmed',
        date: ev.timestamp ? new Date(ev.timestamp).toLocaleDateString() : '',
        createdAt: ev.timestamp,
        items: [],
      }));
    if (timelineOrders.length > 0) return timelineOrders;
    return [];
  })();

  const totalOrders =
    overview.totalOrders ??
    (resolvedOrders.length > 0 ? resolvedOrders.length : null) ??
    journeyCustomer.ordersCount ??
    rawCustomer.ordersCount ??
    rawCustomer.orders ??
    0;

  const totalSpent =
    overview.totalSpent ??
    journeyCustomer.totalSpent ??
    rawCustomer.totalSpent ??
    (resolvedOrders.length > 0
      ? resolvedOrders.reduce((sum, o) => sum + (o.total || o.totalAmount || 0), 0)
      : 0);

  const walletBalance = identity.walletBalance ?? rawCustomer.walletBalance ?? 0;
  const siriCoins = identity.siriCoins ?? rawCustomer.siriCoins ?? 0;
  const isVerified = identity.isVerified ?? rawCustomer.isVerified ?? false;
  const marketingEligible =
    journeyCustomer.promotionsSubscribed ??
    journeyCustomer.marketingEligible ??
    rawCustomer.promotionsSubscribed ??
    rawCustomer.marketingEligible ??
    true;

  const cartItems =
    profile360?.cart || journeyCustomer.cart || rawCustomer.cart || rawCustomer.cartItems || [];

  const addresses = profile360?.addresses || rawCustomer.addresses || [];
  const primaryAddress = addresses.find((a) => a.isDefault) || addresses[0] || null;

  const city =
    primaryAddress?.city ||
    rawCustomer.city ||
    (primaryAddress &&
    !['unknown', 'unknown city'].includes(String(primaryAddress.city || '').toLowerCase())
      ? primaryAddress.city
      : null);

  // Clean address formatting without stray commas or 'unknown'
  const formattedAddress = (() => {
    if (!primaryAddress) return null;
    const parts = [
      primaryAddress.street,
      primaryAddress.addressLine1,
      primaryAddress.address,
      primaryAddress.locality,
      primaryAddress.city &&
      !['unknown', 'unknown city'].includes(String(primaryAddress.city).toLowerCase())
        ? primaryAddress.city
        : null,
      primaryAddress.state,
      primaryAddress.postalCode || primaryAddress.pincode
        ? `PIN: ${primaryAddress.postalCode || primaryAddress.pincode}`
        : null,
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : null;
  })();

  const initials =
    name
      .split(' ')
      .filter(Boolean)
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'CU';

  const stats = journeyData?.stats || {};
  const timeline = journeyData?.timeline || [];

  const cleanPhone = phone ? phone.replace(/[^0-9]/g, '') : '';

  const isDark =
    typeof document !== 'undefined' &&
    (document.documentElement.classList.contains('dark') ||
      document.body.classList.contains('dark'));

  // Motion animation variants: native slide up on mobile, soft scale on laptop
  const containerVariants = {
    hidden: isMobile ? { y: '100%', opacity: 1 } : { opacity: 0, scale: 0.97, y: 8 },
    show: isMobile
      ? { y: 0, opacity: 1, transition: { type: 'spring', damping: 30, stiffness: 320 } }
      : { opacity: 1, scale: 1, y: 0, transition: { duration: 0.2, ease: [0.16, 1, 0.3, 1] } },
    exit: isMobile
      ? { y: '100%', opacity: 1, transition: { duration: 0.2 } }
      : { opacity: 0, scale: 0.97, y: 6, transition: { duration: 0.15 } },
  };

  const modalContent = (
    <div
      className={`fixed inset-0 z-[9999] flex items-end md:items-center justify-center p-0 md:p-4 overflow-hidden font-sans pointer-events-none ${
        isDark ? 'dark' : ''
      }`}
      style={{
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      {/* ─── REAL FROSTED GLASS BACKGROUND BLUR (Translucent, NOT Opaque) ─── */}
      <motion.div
        key="customer-modal-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={onClose}
        className="fixed inset-0 z-[9998] cursor-pointer pointer-events-auto"
        style={{
          backgroundColor: isDark ? 'rgba(0, 0, 0, 0.55)' : 'rgba(28, 25, 23, 0.42)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
        }}
      />

      {/* ─── MAIN CONTAINER: FIXED MODAL ON LAPTOP, NATIVE APP DRAWER ON MOBILE ─── */}
      <motion.div
        key="customer-modal-container"
        variants={containerVariants}
        initial="hidden"
        animate="show"
        exit="exit"
        drag={isMobile ? 'y' : false}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 0.5 }}
        onDragEnd={(e, info) => {
          if (info.offset.y > 100 || info.velocity.y > 500) {
            onClose?.();
          }
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="customer-profile-name"
        className={`admin-section-root relative z-[9999] pointer-events-auto bg-white dark:bg-[#1a1815] shadow-2xl flex flex-col border border-stone-200 dark:border-stone-800
          w-full h-[88dvh] max-h-[88dvh] rounded-t-[24px] rounded-b-none border-b-0 pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))]
          md:w-[860px] md:max-w-[92vw] md:h-[660px] md:max-h-[88vh] md:rounded-[14px] md:border md:pb-0 md:overflow-hidden
        `}
        style={{
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        }}
      >
        {/* Mobile Pull Drag Handle (always top visible on mobile) */}
        <div className="w-full flex md:hidden justify-center pt-3 pb-1.5 bg-white dark:bg-[#1a1815] shrink-0 cursor-grab active:cursor-grabbing">
          <div className="w-12 h-1.5 rounded-full bg-stone-300 dark:bg-stone-600" />
        </div>

        {/* Subtle top sync progress line */}
        {loading && (
          <div className="h-0.5 w-full bg-stone-100 dark:bg-stone-800 overflow-hidden shrink-0">
            <div className="h-full bg-[var(--admin-accent,#842a34)] animate-pulse w-full" />
          </div>
        )}

        {/* ─── ACTION BUTTONS RENDERER (Clean Icon Buttons with Tooltips) ─── */}
        {(() => {
          const renderActionButtons = (size = 'mobile') => {
            const isDesk = size === 'desktop';
            const btnCls = isDesk
              ? 'w-8 h-8 min-h-0 min-w-0 max-h-8 max-w-8 p-0 rounded-[7px] inline-flex items-center justify-center shrink-0 shadow-2xs transition-all cursor-pointer'
              : 'flex-1 h-[34px] min-h-0 min-w-0 p-0 rounded-[7px] inline-flex items-center justify-center shrink-0 shadow-2xs transition-all cursor-pointer';

            const iconSize = isDesk ? 'text-[17px]' : 'text-[18px]';
            const waIconCls = isDesk ? 'w-4 h-4' : 'w-[18px] h-[18px]';

            return (
              <>
                {/* 1. WhatsApp */}
                {phone ? (
                  <a
                    href={`${EXTERNAL_URLS.WHATSAPP_BASE}/${cleanPhone}?text=${encodeURIComponent(
                      `Hi ${name}, thank you for choosing ${storeName}! How may we assist you today?`,
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`${btnCls} bg-emerald-600 hover:bg-emerald-700 text-white hover:shadow-xs active:scale-95`}
                    title={`WhatsApp: ${phone}`}
                    aria-label={`WhatsApp ${phone}`}
                  >
                    <WhatsAppIcon className={`${waIconCls} fill-current shrink-0`} />
                  </a>
                ) : (
                  <button
                    type="button"
                    disabled
                    className={`${btnCls} bg-stone-100 dark:bg-stone-800/60 text-stone-300 dark:text-stone-600 border border-stone-200/50 dark:border-stone-700/50 cursor-not-allowed`}
                    title="No phone number available"
                    aria-label="WhatsApp not available"
                  >
                    <WhatsAppIcon className={`${waIconCls} fill-current shrink-0 opacity-40`} />
                  </button>
                )}

                {/* 2. Phone Call */}
                {phone ? (
                  <a
                    href={`tel:${phone}`}
                    className={`${btnCls} border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-700 hover:text-emerald-600 hover:border-emerald-300 active:scale-95`}
                    title={`Call: ${phone}`}
                    aria-label={`Call ${phone}`}
                  >
                    <span className={`material-symbols-outlined ${iconSize} shrink-0`}>call</span>
                  </a>
                ) : (
                  <button
                    type="button"
                    disabled
                    className={`${btnCls} border border-stone-200/50 dark:border-stone-700/50 bg-stone-100 dark:bg-stone-800/60 text-stone-300 dark:text-stone-600 cursor-not-allowed`}
                    title="No phone number available"
                    aria-label="Call not available"
                  >
                    <span className={`material-symbols-outlined ${iconSize} shrink-0 opacity-40`}>
                      call
                    </span>
                  </button>
                )}

                {/* 3. Email */}
                {email ? (
                  <a
                    href={`mailto:${email}?subject=${encodeURIComponent(
                      `Message from ${storeName}`,
                    )}`}
                    className={`${btnCls} border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-700 hover:text-sky-600 hover:border-sky-300 active:scale-95`}
                    title={`Email: ${email}`}
                    aria-label={`Email ${email}`}
                  >
                    <span className={`material-symbols-outlined ${iconSize} shrink-0`}>mail</span>
                  </a>
                ) : (
                  <button
                    type="button"
                    disabled
                    className={`${btnCls} border border-stone-200/50 dark:border-stone-700/50 bg-stone-100 dark:bg-stone-800/60 text-stone-300 dark:text-stone-600 cursor-not-allowed`}
                    title="No email available"
                    aria-label="Email not available"
                  >
                    <span className={`material-symbols-outlined ${iconSize} shrink-0 opacity-40`}>
                      mail
                    </span>
                  </button>
                )}

                {/* 4. Recycle Bin */}
                {onDelete && (
                  <button
                    type="button"
                    onClick={() => {
                      onDelete(rawCustomer._id ? rawCustomer : { _id: resolvedCustomerId, name });
                    }}
                    className={`${btnCls} border border-rose-200 dark:border-rose-900/80 bg-rose-50/90 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/60 active:scale-95`}
                    title="Move customer to recycle bin"
                    aria-label="Move to Recycle Bin"
                  >
                    <span className={`material-symbols-outlined ${iconSize} shrink-0`}>delete</span>
                  </button>
                )}
              </>
            );
          };

          return (
            <>
              {/* ─── HEADER BAR (Side-by-side on laptop, clean & responsive) ─── */}
              <div className="px-4 md:px-6 py-2.5 md:py-3 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between shrink-0 bg-white dark:bg-[#211f1b] gap-3">
                {/* Left: Customer Monogram + Name & Contact */}
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-10 h-10 md:w-10 md:h-10 rounded-[8px] bg-gradient-to-br from-[#8d6a3b] via-[var(--admin-accent,#826237)] to-[#6e532f] text-white font-black text-[14px] flex items-center justify-center shrink-0 shadow-xs tracking-wider ring-1 ring-black/5 dark:ring-white/10">
                    {initials}
                  </div>

                  <div className="min-w-0">
                    <h2
                      id="customer-profile-name"
                      className="text-[15px] md:text-[16px] font-bold text-stone-900 dark:text-stone-100 tracking-tight truncate leading-tight"
                    >
                      {name}
                    </h2>
                    <p className="text-[12px] text-stone-500 dark:text-stone-400 font-medium truncate mt-0.5">
                      {email || phone || 'Customer Details'}
                    </p>
                  </div>
                </div>

                {/* Right on Laptop: Quick Action Buttons + Close Button (side-by-side on single line!) */}
                <div className="hidden md:flex items-center gap-1.5 shrink-0">
                  {renderActionButtons('desktop')}

                  <div className="h-4 w-px bg-stone-200 dark:bg-stone-700 mx-1" />

                  <button
                    type="button"
                    onClick={onClose}
                    className="w-8 h-8 min-h-0 min-w-0 max-h-8 max-w-8 p-0 rounded-full bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 flex items-center justify-center text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 transition-colors cursor-pointer shrink-0"
                    title="Close modal"
                  >
                    <span className="material-symbols-outlined text-[18px]">close</span>
                  </button>
                </div>

                {/* Close button on Mobile (< md:) */}
                <button
                  type="button"
                  onClick={onClose}
                  className="md:hidden w-8 h-8 min-h-0 min-w-0 max-h-8 max-w-8 p-0 rounded-full bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 flex items-center justify-center text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 transition-colors cursor-pointer shrink-0"
                  title="Close drawer"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>

              {/* ─── QUICK ACTIONS STRIP (Mobile ONLY: md:hidden, 100% fits screen width) ─── */}
              <div className="w-full px-3 py-2 bg-stone-50/80 dark:bg-[#1c1a17] border-b border-stone-200 dark:border-stone-800 flex md:hidden items-center justify-between gap-1.5 shrink-0">
                {renderActionButtons('mobile')}
              </div>
            </>
          );
        })()}

        {/* ─── SEGMENTED SWITCH TAB NAVIGATION BAR (Strict Equal 4-Column Grid) ─── */}
        <div className="px-2.5 sm:px-4 md:px-6 py-2 md:py-2.5 bg-white dark:bg-[#211f1b] border-b border-stone-200 dark:border-stone-800 shrink-0">
          <div className="w-full bg-stone-100/90 dark:bg-[#161513] p-1 rounded-[10px] border border-stone-200/80 dark:border-stone-800/80 grid grid-cols-4 gap-1">
            {[
              { id: 'overview', label: 'Overview', icon: 'person' },
              {
                id: 'cart',
                label: 'Cart',
                icon: 'shopping_cart',
                badge: cartItems.length > 0 ? cartItems.length : null,
              },
              {
                id: 'orders',
                label: 'Orders',
                icon: 'shopping_bag',
                badge: totalOrders > 0 ? totalOrders : null,
              },
              {
                id: 'journey',
                label: 'Journey',
                icon: 'timeline',
                badge: timeline.length > 0 ? timeline.length : null,
              },
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              const hasBadge = typeof tab.badge === 'number' && tab.badge > 0;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative w-full h-[32px] sm:h-[36px] px-1 sm:px-2 rounded-[7px] text-[11.5px] sm:text-[12.5px] font-semibold flex items-center justify-center gap-1 sm:gap-1.5 transition-colors cursor-pointer select-none z-10 ${
                    isActive
                      ? 'text-stone-900 dark:text-stone-100 font-bold'
                      : 'text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200'
                  }`}
                >
                  {/* Sliding Switch Segment Background (Strictly Equal Size on All 4 Tabs) */}
                  {isActive && (
                    <motion.div
                      layoutId="activeCustomerTabSwitch"
                      className="absolute inset-0 bg-white dark:bg-[#272420] rounded-[7px] shadow-xs border border-stone-200/90 dark:border-stone-700/80 z-[-1]"
                      transition={{ type: 'spring', stiffness: 450, damping: 34 }}
                    />
                  )}

                  <span
                    className={`material-symbols-outlined text-[15px] md:text-[16px] leading-none shrink-0 ${
                      isActive
                        ? 'text-[var(--admin-accent,#826237)]'
                        : 'text-stone-400 dark:text-stone-500'
                    }`}
                  >
                    {tab.icon}
                  </span>

                  <span className="whitespace-nowrap tracking-tight">{tab.label}</span>

                  {hasBadge && (
                    <span
                      className={`min-w-[15px] h-[15px] sm:min-w-[17px] sm:h-[17px] px-1 rounded-full text-[8.5px] sm:text-[9.5px] font-bold flex items-center justify-center leading-none shrink-0 ${
                        isActive
                          ? 'bg-[var(--admin-accent,#826237)] text-white'
                          : 'bg-stone-200 dark:bg-stone-700 text-stone-600 dark:text-stone-300'
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ─── SCROLLABLE CONTENT BODY (Fills remaining height, hidden scrollbar) ─── */}
        <div
          className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 md:p-6 space-y-3.5 md:space-y-4 bg-stone-50/70 dark:bg-[#151412] scrollbar-none scrollbar-hide admin-drawer-scroll-hidden"
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}
        >
          {/* ═══════════════════════════════════════════════════════════ */}
          {/* TAB 1: 360 OVERVIEW */}
          {/* ═══════════════════════════════════════════════════════════ */}
          {activeTab === 'overview' && (
            <div className="space-y-3.5 sm:space-y-4">
              {/* 4 Symmetrical Financial Metric Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
                {[
                  { label: 'Lifetime Spend', value: formatCurrency(totalSpent), icon: 'payments' },
                  { label: 'Total Orders', value: totalOrders, icon: 'receipt_long' },
                  {
                    label: 'Wallet Balance',
                    value: formatCurrency(walletBalance),
                    icon: 'account_balance_wallet',
                  },
                  { label: 'Reward Coins', value: siriCoins, icon: 'stars' },
                ].map((metric, idx) => (
                  <div
                    key={idx}
                    className="h-[74px] sm:h-[84px] p-2.5 sm:p-3.5 bg-white dark:bg-[#211f1b] rounded-[8px] border border-stone-200 dark:border-stone-800 shadow-2xs flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between text-stone-500 dark:text-stone-400">
                      <span className="text-[9.5px] sm:text-[10px] uppercase font-bold tracking-wider">
                        {metric.label}
                      </span>
                      <span className="material-symbols-outlined text-[15px] sm:text-[16px] opacity-70">
                        {metric.icon}
                      </span>
                    </div>
                    <div className="text-[16px] sm:text-[18px] font-black text-stone-900 dark:text-stone-100 font-mono tracking-tight">
                      {metric.value}
                    </div>
                  </div>
                ))}
              </div>

              {/* Customer Identity Dossier */}
              <div className="p-3.5 sm:p-4 bg-white dark:bg-[#211f1b] rounded-[8px] border border-stone-200 dark:border-stone-800 shadow-2xs space-y-2.5 sm:space-y-3">
                <div className="flex items-center gap-1.5 text-stone-500 dark:text-stone-400 text-[10.5px] sm:text-[11px] font-bold uppercase tracking-wider">
                  <span className="material-symbols-outlined text-[15px]">badge</span>
                  <span>Customer Dossier</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 text-[12px]">
                  <div>
                    <span className="text-[10px] sm:text-[10.5px] text-stone-500 dark:text-stone-400 uppercase font-semibold block">
                      Full Name
                    </span>
                    <span className="font-bold text-stone-900 dark:text-stone-100 mt-0.5 block">
                      {name}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] sm:text-[10.5px] text-stone-500 dark:text-stone-400 uppercase font-semibold block">
                      Primary Email
                    </span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="font-bold text-stone-900 dark:text-stone-100 font-mono truncate">
                        {email || 'None recorded'}
                      </span>
                      {email && (
                        <button
                          type="button"
                          onClick={() => handleCopy(email, 'Email')}
                          className="text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 cursor-pointer"
                          title="Copy email"
                        >
                          <span className="material-symbols-outlined text-[13px]">
                            {copiedField === 'Email' ? 'check' : 'content_copy'}
                          </span>
                        </button>
                      )}
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] sm:text-[10.5px] text-stone-500 dark:text-stone-400 uppercase font-semibold block">
                      Contact Phone
                    </span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="font-bold text-stone-900 dark:text-stone-100">
                        {phone || 'No phone number'}
                      </span>
                      {phone && (
                        <button
                          type="button"
                          onClick={() => handleCopy(phone, 'Phone')}
                          className="text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 cursor-pointer"
                          title="Copy phone"
                        >
                          <span className="material-symbols-outlined text-[13px]">
                            {copiedField === 'Phone' ? 'check' : 'content_copy'}
                          </span>
                        </button>
                      )}
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] sm:text-[10.5px] text-stone-500 dark:text-stone-400 uppercase font-semibold block">
                      Primary Location
                    </span>
                    <span className="font-bold text-stone-900 dark:text-stone-100 mt-0.5 block">
                      {city || 'Not specified'}
                    </span>
                  </div>
                </div>

                {formattedAddress && (
                  <div className="pt-2 border-t border-stone-100 dark:border-stone-800 text-[12px]">
                    <span className="text-[10px] sm:text-[10.5px] text-stone-500 dark:text-stone-400 uppercase font-semibold block">
                      Default Delivery Address
                    </span>
                    <p className="text-stone-700 dark:text-stone-300 mt-0.5 font-medium leading-relaxed">
                      {formattedAddress}
                    </p>
                  </div>
                )}
              </div>

              {/* Account Status & Lifecycle */}
              <div className="p-3.5 sm:p-4 bg-white dark:bg-[#211f1b] rounded-[8px] border border-stone-200 dark:border-stone-800 shadow-2xs space-y-2 text-[12px]">
                <div className="flex items-center gap-1.5 text-stone-500 dark:text-stone-400 text-[10.5px] sm:text-[11px] font-bold uppercase tracking-wider">
                  <span className="material-symbols-outlined text-[15px]">info</span>
                  <span>Account Lifecycle</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-stone-600 dark:text-stone-400">Member Since:</span>
                  <span className="font-semibold text-stone-900 dark:text-stone-100">
                    {rawCustomer.createdAt
                      ? new Date(rawCustomer.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })
                      : 'Recent'}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-stone-600 dark:text-stone-400">Last Active:</span>
                  <span className="font-semibold text-stone-900 dark:text-stone-100">
                    {rawCustomer.lastLogin
                      ? formatDistanceToNow(new Date(rawCustomer.lastLogin), { addSuffix: true })
                      : 'Recent session'}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-stone-600 dark:text-stone-400">Account Segment:</span>
                  <span className="font-bold text-[var(--admin-accent,#842a34)]">
                    {overview.segment ||
                      (totalOrders > 1
                        ? 'Repeat Buyer'
                        : totalOrders === 1
                          ? 'First-time Buyer'
                          : 'Prospect')}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════ */}
          {/* TAB 2: ACTIVE CART */}
          {/* ═══════════════════════════════════════════════════════════ */}
          {activeTab === 'cart' && (
            <div className="space-y-4">
              {cartItems.length === 0 ? (
                <div className="py-12 text-center bg-white dark:bg-[#211f1b] rounded-[8px] border border-stone-200 dark:border-stone-800 space-y-2">
                  <span className="material-symbols-outlined text-[36px] text-stone-300 dark:text-stone-600">
                    shopping_cart
                  </span>
                  <h4 className="text-[14px] font-bold text-stone-900 dark:text-stone-100">
                    Cart is empty
                  </h4>
                  <p className="text-[12px] text-stone-500 dark:text-stone-400">
                    No active unpurchased items in this customer's cart.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-bold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px] text-[var(--admin-accent,#842a34)]">
                        shopping_bag
                      </span>
                      <span>Active Cart Items ({cartItems.length})</span>
                    </span>
                  </div>

                  <div className="bg-white dark:bg-[#211f1b] rounded-[8px] border border-stone-200 dark:border-stone-800 shadow-2xs divide-y divide-stone-100 dark:divide-stone-800">
                    {cartItems.map((ci, idx) => {
                      const itemImg =
                        ci.product?.imageSrc ||
                        ci.product?.image ||
                        ci.imageSrc ||
                        ci.image ||
                        ci.product?.images?.[0];
                      const itemTitle =
                        ci.product?.title || ci.product?.name || ci.title || 'Decor Item';
                      const itemPrice = ci.product?.price || ci.price || 0;
                      const itemQty = ci.quantity || ci.qty || 1;

                      return (
                        <div
                          key={idx}
                          className="p-3.5 flex items-center justify-between gap-3 text-[12px]"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {itemImg ? (
                              <img
                                src={itemImg}
                                alt={itemTitle}
                                className="w-12 h-12 object-cover rounded-[6px] border border-stone-200 dark:border-stone-700 shrink-0 bg-stone-50"
                              />
                            ) : (
                              <div className="w-12 h-12 rounded-[6px] bg-stone-100 dark:bg-stone-800 flex items-center justify-center text-stone-400 border border-stone-200 dark:border-stone-700 shrink-0">
                                <span className="material-symbols-outlined text-[20px]">
                                  palette
                                </span>
                              </div>
                            )}
                            <div className="min-w-0">
                              <h5 className="font-bold text-[13px] text-stone-900 dark:text-stone-100 truncate">
                                {itemTitle}
                              </h5>
                              <div className="text-[11.5px] text-stone-500 dark:text-stone-400 mt-0.5">
                                Qty:{' '}
                                <strong className="text-stone-900 dark:text-stone-100">
                                  {itemQty}
                                </strong>
                                {ci.variant ? ` • ${ci.variant}` : ''}
                              </div>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="font-black font-mono text-[13.5px] text-[var(--admin-accent,#842a34)]">
                              {formatCurrency(itemPrice * itemQty)}
                            </div>
                            <div className="text-[10px] text-stone-400">
                              @ {formatCurrency(itemPrice)} each
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════ */}
          {/* TAB 3: ORDERS HISTORY (WITH PRODUCT PICTURE & VISUAL HIERARCHY) */}
          {/* ═══════════════════════════════════════════════════════════ */}
          {activeTab === 'orders' && (
            <div className="space-y-4">
              {loading && resolvedOrders.length === 0 ? (
                <OrdersListSkeleton />
              ) : resolvedOrders.length === 0 ? (
                <div className="py-12 text-center bg-white dark:bg-[#211f1b] rounded-[8px] border border-stone-200 dark:border-stone-800 space-y-2">
                  <span className="material-symbols-outlined text-[36px] text-stone-300 dark:text-stone-600">
                    receipt_long
                  </span>
                  <h4 className="text-[14px] font-bold text-stone-900 dark:text-stone-100">
                    No orders placed yet
                  </h4>
                  <p className="text-[12px] text-stone-500 dark:text-stone-400">
                    This customer has not completed any online checkout orders.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-[12px] px-0.5">
                    <span className="font-bold text-stone-900 dark:text-stone-100">
                      {resolvedOrders.length} Completed Order
                      {resolvedOrders.length === 1 ? '' : 's'}
                    </span>
                    <span className="text-stone-500 dark:text-stone-400 font-mono text-[11.5px]">
                      Total:{' '}
                      <strong className="text-stone-900 dark:text-stone-100">
                        {formatCurrency(totalSpent)}
                      </strong>
                    </span>
                  </div>

                  <div className="space-y-3">
                    {resolvedOrders.map((o) => {
                      const orderId = o.id || o._id;
                      const isNew = o.date && o.date.includes('Today');
                      const isVip = (o.total || o.totalAmount || 0) >= 15000;
                      const items = o.items || o.orderItems || [];
                      const firstItem = items[0] || {};
                      const firstImg =
                        firstItem.image ||
                        firstItem.imageSrc ||
                        firstItem.images?.[0] ||
                        firstItem.thumbnail ||
                        firstItem.product?.image ||
                        firstItem.product?.imageSrc ||
                        firstItem.product?.images?.[0] ||
                        '/placeholder.png';
                      const method =
                        o.rawOrder?.paymentMethod || o.paymentMethod || o.payment || '';
                      const paymentStatus =
                        o.rawOrder?.paymentStatus || o.paymentStatus || o.payment || '';
                      const settlementStatus =
                        o.rawOrder?.settlementStatus || o.settlementStatus || 'Not Applicable';
                      const razorpayPaymentId =
                        o.rawOrder?.razorpayPaymentId || o.razorpayPaymentId;
                      const orderStatus =
                        o.status || o.orderStatus || o.rawOrder?.orderStatus || 'Confirmed';

                      const isCod =
                        method.toLowerCase().includes('cod') ||
                        method.toLowerCase().includes('cash') ||
                        paymentStatus.toLowerCase().includes('cod');

                      const isReturned =
                        ['Returned', 'returned', 'return_received', 'return_completed'].includes(
                          orderStatus,
                        ) || ['Returned', 'returned'].includes(paymentStatus);

                      const isCancelled =
                        ['Cancelled', 'cancelled', 'rejected'].includes(orderStatus) ||
                        ['Cancelled', 'cancelled'].includes(paymentStatus);

                      const isRefunded =
                        ['Refunded', 'refunded'].includes(orderStatus) ||
                        ['Refunded', 'refunded'].includes(paymentStatus);

                      const isOnlinePaid =
                        !isCod &&
                        (Boolean(razorpayPaymentId) || paymentStatus.toLowerCase() === 'paid');

                      const isCodSettled =
                        isCod && (settlementStatus === 'Settled' || orderStatus === 'Settled');

                      const isPaid =
                        (isOnlinePaid || isCodSettled) &&
                        !isReturned &&
                        !isCancelled &&
                        !isRefunded;

                      return (
                        <div
                          key={orderId}
                          id={`order-card-${orderId}`}
                          onClick={() => {
                            setActiveOrderForDrawer(o);
                          }}
                          className={`relative overflow-hidden rounded-[4px] p-3.5 flex flex-col gap-3 cursor-pointer transition-all ${getOrderCardStyle(
                            o,
                          )}`}
                        >
                          {/* Header: Customer Name + Status Pill, with subtle faded Order ID & Tag */}
                          <div className="flex justify-between items-start gap-2">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-[var(--admin-text-primary)] text-[14px] truncate leading-tight">
                                  {o.customer || o.shippingAddress?.name || name || 'Customer'}
                                </span>
                                {isVip && (
                                  <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-amber-50 text-amber-800 border border-amber-200 uppercase shrink-0">
                                    VIP
                                  </span>
                                )}
                                {isNew && (
                                  <span
                                    className="w-1.5 h-1.5 rounded-full bg-[var(--admin-accent)] animate-ping shrink-0"
                                    title="Recent order"
                                  />
                                )}
                              </div>
                              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                <span className="font-mono text-[11px] font-medium text-[var(--admin-text-tertiary)] dark:text-stone-400">
                                  #{o.orderCode || String(orderId).slice(-8).toUpperCase()}
                                </span>
                                {o.orderType && o.orderType !== 'purchase' && (
                                  <span
                                    className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded border shrink-0 ${
                                      o.orderType === 'rental'
                                        ? 'bg-indigo-50/80 text-indigo-700 border-indigo-200/80 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800'
                                        : 'bg-purple-50/80 text-purple-700 border-purple-200/80 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800'
                                    }`}
                                  >
                                    {o.orderType}
                                  </span>
                                )}
                              </div>
                            </div>
                            <AdminStatusPill status={orderStatus} className="shrink-0" />
                          </div>

                          {/* Product Item Box */}
                          <div className="bg-[#FAF9F5] dark:bg-stone-800/60 p-2.5 rounded-[4px] border border-stone-200/80 dark:border-stone-700/60 flex items-center gap-2.5">
                            <img
                              src={firstImg}
                              alt=""
                              className="w-11 h-11 rounded-[4px] object-cover border border-stone-200 bg-white shrink-0 shadow-2xs"
                              loading="lazy"
                              onError={(e) => {
                                e.target.src = '/placeholder.png';
                              }}
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-1">
                                <span className="text-[9px] font-extrabold text-amber-700 uppercase tracking-wider block leading-tight">
                                  ORDER ITEM
                                </span>
                                {items.length > 1 && (
                                  <span className="text-[9px] font-bold text-stone-500 bg-white dark:bg-stone-700 px-1.5 py-0.5 rounded border border-stone-200 dark:border-stone-600 shrink-0">
                                    +{items.length - 1} more
                                  </span>
                                )}
                              </div>
                              <p
                                className="text-[12px] font-bold text-[var(--admin-text-primary)] truncate mt-0.5"
                                title={firstItem.name || firstItem.title}
                              >
                                {firstItem.name || firstItem.title || 'Order Item'}
                                <span className="ml-1 text-[var(--admin-text-secondary)] font-medium">
                                  (x{firstItem.qty || firstItem.quantity || 1})
                                </span>
                              </p>
                              {o.needByDate ? (
                                <span className="text-[10px] text-amber-700 dark:text-amber-400 font-semibold truncate block mt-0.5 flex items-center gap-1">
                                  <span className="material-symbols-outlined text-[12px]">
                                    calendar_today
                                  </span>
                                  Required by{' '}
                                  {new Date(o.needByDate).toLocaleDateString('en-IN', {
                                    day: 'numeric',
                                    month: 'short',
                                  })}
                                </span>
                              ) : (
                                <span className="text-[10px] text-stone-500 dark:text-stone-400 truncate block mt-0.5">
                                  {items.length || 1} item{items.length > 1 ? 's' : ''} in this
                                  order
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Financial Total & Payment Strip */}
                          <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5 text-xs">
                            <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                              <span className="text-[11px] text-[var(--admin-text-secondary)] font-medium">
                                Total:
                              </span>
                              <span className="font-extrabold text-[var(--admin-text-primary)] text-[13px] whitespace-nowrap">
                                {formatCurrency(o.total || o.totalAmount || 0)}
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0 ml-auto">
                              <AdminPaymentBadge
                                isPaid={isPaid}
                                method={method}
                                status={paymentStatus}
                                orderStatus={orderStatus}
                                settlementStatus={settlementStatus}
                                razorpayPaymentId={razorpayPaymentId}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════ */}
          {/* TAB 4: MARKETING JOURNEY */}
          {/* ═══════════════════════════════════════════════════════════ */}
          {activeTab === 'journey' && (
            <div className="space-y-4">
              {/* Symmetrical KPI Strip (Balanced 2x2 grid + spend on mobile, 5 cols on desktop) */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center">
                <div className="p-2 sm:p-2.5 bg-white dark:bg-[#211f1b] rounded-[6px] border border-stone-200 dark:border-stone-800 shadow-2xs">
                  <div className="text-[9.5px] uppercase text-stone-500 dark:text-stone-400 font-bold">
                    Emails
                  </div>
                  <div className="text-[13px] font-bold font-mono text-stone-900 dark:text-stone-100 mt-0.5">
                    {stats.emailsReceived || 0}
                  </div>
                </div>
                <div className="p-2 sm:p-2.5 bg-white dark:bg-[#211f1b] rounded-[6px] border border-stone-200 dark:border-stone-800 shadow-2xs">
                  <div className="text-[9.5px] uppercase text-stone-500 dark:text-stone-400 font-bold">
                    Opens
                  </div>
                  <div className="text-[13px] font-bold font-mono text-stone-900 dark:text-stone-100 mt-0.5">
                    {stats.emailsOpened || 0}
                  </div>
                </div>
                <div className="p-2 sm:p-2.5 bg-white dark:bg-[#211f1b] rounded-[6px] border border-stone-200 dark:border-stone-800 shadow-2xs">
                  <div className="text-[9.5px] uppercase text-stone-500 dark:text-stone-400 font-bold">
                    Clicks
                  </div>
                  <div className="text-[13px] font-bold font-mono text-stone-900 dark:text-stone-100 mt-0.5">
                    {stats.linksClicked || 0}
                  </div>
                </div>
                <div className="p-2 sm:p-2.5 bg-white dark:bg-[#211f1b] rounded-[6px] border border-stone-200 dark:border-stone-800 shadow-2xs">
                  <div className="text-[9.5px] uppercase text-stone-500 dark:text-stone-400 font-bold">
                    Orders
                  </div>
                  <div className="text-[13px] font-bold font-mono text-stone-900 dark:text-stone-100 mt-0.5">
                    {totalOrders}
                  </div>
                </div>
                <div className="col-span-2 sm:col-span-1 p-2 sm:p-2.5 bg-white dark:bg-[#211f1b] rounded-[6px] border border-stone-200 dark:border-stone-800 shadow-2xs flex sm:flex-col items-center justify-between sm:justify-center px-3.5 sm:px-2">
                  <div className="text-[9.5px] uppercase text-stone-500 dark:text-stone-400 font-bold">
                    Spend
                  </div>
                  <div className="text-[13px] font-bold font-mono text-[var(--admin-accent,#826237)] mt-0.5">
                    {formatCurrency(totalSpent)}
                  </div>
                </div>
              </div>

              {/* Chronological Timeline */}
              <div className="space-y-3">
                <div className="text-[10.5px] sm:text-[11px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                  Activity Timeline
                </div>

                {timeline.length === 0 ? (
                  <div className="text-center py-8 text-[12px] text-stone-500 dark:text-stone-400 bg-white dark:bg-[#211f1b] rounded-[8px] border border-stone-200 dark:border-stone-800">
                    No marketing activity recorded yet.
                  </div>
                ) : (
                  <div className="relative pl-6 space-y-3 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-stone-200 dark:before:bg-stone-700">
                    {timeline.map((event) => {
                      let dotBg = 'bg-stone-400';
                      let icon = 'info';

                      if (event.type === 'registration') {
                        dotBg = 'bg-blue-500';
                        icon = 'person_add';
                      } else if (event.type === 'email_sent') {
                        dotBg = 'bg-amber-500';
                        icon = 'mail';
                      } else if (event.type === 'email_opened') {
                        dotBg = 'bg-emerald-500';
                        icon = 'visibility';
                      } else if (event.type === 'email_clicked') {
                        dotBg = 'bg-cyan-500';
                        icon = 'ads_click';
                      } else if (event.type === 'order_placed') {
                        dotBg = 'bg-indigo-500';
                        icon = 'shopping_bag';
                      } else if (event.type === 'conversion') {
                        dotBg = 'bg-purple-500';
                        icon = 'celebration';
                      }

                      return (
                        <div key={event.id} className="relative group">
                          <div
                            className={`absolute -left-[19px] top-1.5 w-3.5 h-3.5 rounded-full ${dotBg} border-2 border-white dark:border-stone-900 shadow-2xs flex items-center justify-center`}
                          >
                            <span className="w-1 h-1 rounded-full bg-white" />
                          </div>

                          <div className="p-3 bg-white dark:bg-[#211f1b] border border-stone-200 dark:border-stone-800 rounded-[6px] shadow-2xs hover:border-stone-400 dark:hover:border-stone-600 transition-colors">
                            <div className="flex items-center justify-between text-[12px]">
                              <span className="font-semibold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                                <span className="material-symbols-outlined text-[15px] text-stone-500">
                                  {icon}
                                </span>
                                {event.title}
                              </span>
                              <span className="text-[10px] text-stone-400 font-mono">
                                {new Date(event.timestamp).toLocaleString('en-IN', {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            </div>
                            <p className="text-[11.5px] text-stone-600 dark:text-stone-400 mt-1">
                              {event.description}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* Nested Order Slide-over Drawer */}
      <AnimatePresence>
        {activeOrderForDrawer && (
          <AdminOrderDrawer
            selectedOrder={activeOrderForDrawer}
            selectedOrderData={activeOrderForDrawer}
            setIsDrawerOpen={() => setActiveOrderForDrawer(null)}
            allStatuses={[
              'Pending',
              'Confirmed',
              'Processing',
              'Delivered',
              'Cancelled',
              'Settled',
            ]}
            updateOrderStatus={async (id, status, note, courierCharges, collectedAmount) => {
              try {
                await orderService.updateStatus(id, {
                  status,
                  note,
                  courierCharges,
                  collectedAmount,
                });
                toast.success(`Order status updated to ${status}`);
                fetchCustomerDetails();
                setActiveOrderForDrawer(null);
              } catch (err) {
                toast.error(getErrorMessage(err, 'Failed to update order'));
              }
            }}
            deleteOrder={async (id) => {
              try {
                await orderService.delete(id);
                toast.success('Order deleted');
                fetchCustomerDetails();
                setActiveOrderForDrawer(null);
              } catch (err) {
                toast.error(getErrorMessage(err, 'Failed to delete order'));
              }
            }}
            navigate={navigate}
          />
        )}
      </AnimatePresence>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : null;
}

export default AdminCustomerDetailDrawer;
