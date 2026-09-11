import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { customerIntelligenceService, orderService } from '../../services/domainServices';
import { formatCurrency, AdminCustomerProfileModalSkeleton } from './AdminUIKit';
import { EXTERNAL_URLS } from '../../config/constants';
import { useNavigate } from 'react-router-dom';

const MaterialIcon = ({ icon, className = '' }) => (
  <span className={`material-symbols-outlined ${className}`}>{icon}</span>
);

export default function AdminCustomerProfileModal({ customer, onClose, onDelete }) {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [timeline, setTimeline] = useState([]);
  const [profile360, setProfile360] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 640);

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const customerId =
          customer?._id || customer?.id || (typeof customer === 'string' ? customer : null);
        if (!customerId) return;

        const [ordersRes, timelineRes, profile360Data] = await Promise.all([
          orderService.getAll({ user: customerId }).catch(() => ({ data: [] })),
          customerIntelligenceService
            .getCustomerTimeline(customerId, {
              skip: 0,
              limit: 50,
              filter: 'all',
            })
            .catch(() => ({ data: { timeline: [] } })),
          customerIntelligenceService.getCustomer360(customerId).catch(() => null),
        ]);

        const fetchedOrders = ordersRes?.data?.data || ordersRes?.data || [];
        setOrders(Array.isArray(fetchedOrders) ? fetchedOrders : []);

        const fetchedTimeline = timelineRes?.data?.timeline || [];
        setTimeline(Array.isArray(fetchedTimeline) ? fetchedTimeline : []);

        if (profile360Data) {
          setProfile360(profile360Data);
        }
      } catch (err) {
        console.error('Failed to fetch customer profile data', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [customer]);

  const customerId =
    customer?._id || customer?.id || (typeof customer === 'string' ? customer : null);

  if (!customer && !customerId) return null;

  const customerName =
    profile360?.identity?.name ||
    customer?.name ||
    (customer?.email ? customer.email.split('@')[0] : 'Customer');

  const initials =
    customerName
      ?.split(' ')
      .filter(Boolean)
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'CU';

  // Resolved financial & identity stats
  const totalSpent = profile360?.overview?.totalSpent ?? customer?.totalSpent ?? 0;
  const walletBalance = profile360?.identity?.walletBalance ?? customer?.walletBalance ?? 0;
  const siriCoins = profile360?.identity?.siriCoins ?? customer?.siriCoins ?? 0;
  const loyaltyTier = profile360?.identity?.loyaltyTier ?? customer?.loyaltyTier ?? 'Bronze';
  const totalOrders = profile360?.overview?.totalOrders ?? orders.length ?? customer?.orders ?? 0;
  const phone = profile360?.identity?.phone || customer?.phone || '';
  const email = profile360?.identity?.email || customer?.email || '';
  const isVerified = profile360?.identity?.isVerified ?? customer?.isVerified ?? false;

  const addresses = profile360?.addresses || customer?.addresses || [];
  const addressWithStreet = addresses.find(
    (a) => a.addressString || a.address || a.street || a.locality,
  );
  const orderWithStreet = orders.find(
    (o) =>
      o.shippingAddress?.address ||
      o.shippingAddress?.addressString ||
      o.shippingAddress?.locality ||
      o.shippingAddress?.street,
  )?.shippingAddress;

  const defaultAddr = addresses.find((a) => a.isDefault) || addresses[0] || null;
  const primaryAddress =
    addressWithStreet || defaultAddr || orderWithStreet || orders[0]?.shippingAddress || null;

  const validCity =
    primaryAddress?.city ||
    (customer?.city && !['unknown', 'unknown city'].includes(customer.city.toLowerCase())
      ? customer.city
      : null);

  const joinDate = customer?.createdAt || profile360?.identity?.createdAt;
  const formattedJoinDate = joinDate
    ? new Date(joinDate).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : 'Recent';

  const isDark =
    typeof document !== 'undefined' &&
    (document.documentElement.classList.contains('dark') ||
      document.body.classList.contains('dark'));

  const modalContent = (
    <div
      className={`admin-section-root ${isDark ? 'dark' : ''} fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-6 font-sans`}
      style={{
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/25 dark:bg-black/40 backdrop-blur-md z-[9999] cursor-pointer"
        style={{
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
        }}
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: isMobile ? 1 : 0.98, y: isMobile ? '100%' : 4 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: isMobile ? 1 : 0.98, y: isMobile ? '100%' : 4 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-[10000] w-full max-w-2xl bg-white dark:bg-[#1a1815] bg-[var(--admin-surface,#ffffff)] rounded-t-[8px] sm:rounded-[8px] shadow-2xl overflow-hidden flex flex-col max-h-[85vh] sm:max-h-[90vh] border border-stone-200 dark:border-stone-800 border-[var(--admin-border-subtle,#e8e4d9)] !font-sans"
        style={{
          backgroundColor: isDark ? '#1a1815' : '#ffffff',
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        }}
      >
        {/* Header */}
        <div
          className="flex items-start justify-between p-4 sm:p-5 border-b border-stone-200 dark:border-stone-800 border-[var(--admin-border-subtle,#e8e4d9)] bg-white dark:bg-[#211f1b] bg-[var(--admin-surface,#ffffff)] gap-3 !font-sans"
          style={{ backgroundColor: isDark ? '#211f1b' : '#ffffff' }}
        >
          <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
            <div className="w-12 h-12 sm:w-13 sm:h-13 rounded-[6px] bg-gradient-to-br from-amber-500/15 via-emerald-500/10 to-primary/15 border border-stone-200 dark:border-stone-700 border-[var(--admin-border,#e8e4d9)] flex items-center justify-center shrink-0 shadow-2xs">
              <span className="text-base sm:text-lg font-black text-stone-900 dark:text-stone-100 text-[var(--admin-text-primary,#000000)] tracking-wide !font-sans">
                {initials}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap min-w-0">
                <h2
                  className="text-base sm:text-lg font-bold text-stone-900 dark:text-stone-100 text-[var(--admin-text-primary,#000000)] tracking-tight truncate !font-sans"
                  style={{
                    fontFamily:
                      "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                  }}
                >
                  {customerName}
                </h2>
                {isVerified && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-1.5 py-0.5 rounded-[4px] border border-emerald-200/80 dark:border-emerald-800/80 whitespace-nowrap shrink-0 !font-sans">
                    <span className="material-symbols-outlined !text-[13px] !leading-none text-emerald-600 dark:text-emerald-400 shrink-0 select-none">
                      verified
                    </span>
                    <span>Verified</span>
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                {validCity && (
                  <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-stone-700 dark:text-stone-300 text-[var(--admin-text-secondary,#000000)] bg-stone-100 dark:bg-stone-800/80 bg-[var(--admin-surface-muted,#f2efe5)] px-1.5 py-0.5 rounded-[4px] border border-stone-200 dark:border-stone-700 border-[var(--admin-border-subtle,#e8e4d9)] whitespace-nowrap !font-sans">
                    <span className="material-symbols-outlined !text-[12px] !leading-none text-red-500 shrink-0 select-none">
                      location_on
                    </span>
                    <span>{validCity}</span>
                  </span>
                )}
                <span className="inline-flex items-center gap-1 text-[10.5px] font-medium text-stone-600 dark:text-stone-400 text-[var(--admin-text-tertiary,#000000)] bg-stone-100 dark:bg-stone-800/80 bg-[var(--admin-surface-muted,#f2efe5)] px-1.5 py-0.5 rounded-[4px] border border-stone-200 dark:border-stone-700 border-[var(--admin-border-subtle,#e8e4d9)] whitespace-nowrap !font-sans">
                  <span className="material-symbols-outlined !text-[12px] !leading-none text-stone-400 shrink-0 select-none">
                    calendar_today
                  </span>
                  <span>Joined {formattedJoinDate}</span>
                </span>
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[4px] text-[10px] uppercase font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200/70 dark:border-amber-800/70 whitespace-nowrap !font-sans">
                  <span className="material-symbols-outlined !text-[11px] !leading-none text-amber-600 shrink-0 select-none">
                    stars
                  </span>
                  <span>{loyaltyTier} Tier</span>
                </span>
                {customer?.segment && customer.segment !== 'New' && (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-[4px] text-[10px] font-bold bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 border border-stone-200/80 dark:border-stone-700/80 whitespace-nowrap !font-sans">
                    {customer.segment}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {customerId && (
              <button
                type="button"
                onClick={() => {
                  onClose?.();
                  navigate(`/admin/customers?id=${customerId}`);
                }}
                className="h-8 px-2.5 flex items-center gap-1 text-xs font-semibold rounded-[6px] text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800 border border-stone-200 dark:border-stone-700 transition-all cursor-pointer shadow-xs !font-sans"
                title="Open in Customers Directory"
              >
                <span className="material-symbols-outlined !text-[15px]">open_in_new</span>
                <span className="hidden sm:inline">Directory</span>
              </button>
            )}
            {onDelete && (
              <button
                onClick={() => onDelete(customer)}
                className="h-8 px-2.5 flex items-center gap-1 text-xs font-semibold rounded-[6px] text-red-600 hover:text-white hover:bg-red-600 border border-red-200 dark:border-red-900/50 hover:border-red-600 transition-all cursor-pointer shadow-xs !font-sans"
                title="Move Customer to Recycle Bin"
              >
                <span className="material-symbols-outlined !text-[16px]">delete</span>
                <span className="hidden md:inline">Recycle Bin</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-[6px] hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 transition-colors cursor-pointer"
              title="Close"
            >
              <span className="material-symbols-outlined !text-[20px]">close</span>
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div
          className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-6 bg-[#fdfbf7] dark:bg-[#181614] bg-[var(--admin-bg,#fdfbf7)] !font-sans"
          style={{
            backgroundColor: isDark ? '#181614' : '#fdfbf7',
            fontFamily:
              "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          }}
        >
          {loading && !profile360 ? (
            <AdminCustomerProfileModalSkeleton />
          ) : (
            <>
              {/* Top KPI Metrics: Amount Spent & Wallet Balance */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {/* Total Spent Card */}
                <div className="p-3.5 bg-emerald-50/90 dark:bg-emerald-950/40 rounded-[6px] border border-emerald-200/80 dark:border-emerald-800/60 flex flex-col justify-between shadow-xs">
                  <div className="flex items-center justify-between gap-1 text-emerald-800 dark:text-emerald-300 mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider !font-sans">
                      Total Spent
                    </span>
                    <MaterialIcon
                      icon="payments"
                      className="text-[18px] text-emerald-700 dark:text-emerald-400"
                    />
                  </div>
                  <p className="text-[18px] sm:text-[20px] font-black text-emerald-950 dark:text-emerald-100 tracking-tight !font-sans">
                    {formatCurrency(totalSpent)}
                  </p>
                  <span className="text-[10px] font-medium text-emerald-700/90 dark:text-emerald-400/90 mt-0.5 !font-sans">
                    Lifetime value
                  </span>
                </div>

                {/* Wallet Balance Card */}
                <div className="p-3.5 bg-indigo-50/90 dark:bg-indigo-950/40 rounded-[6px] border border-indigo-200/80 dark:border-indigo-800/60 flex flex-col justify-between shadow-xs">
                  <div className="flex items-center justify-between gap-1 text-indigo-800 dark:text-indigo-300 mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider !font-sans">
                      Wallet Balance
                    </span>
                    <MaterialIcon
                      icon="account_balance_wallet"
                      className="text-[18px] text-indigo-700 dark:text-indigo-400"
                    />
                  </div>
                  <p className="text-[18px] sm:text-[20px] font-black text-indigo-950 dark:text-indigo-100 tracking-tight !font-sans">
                    {formatCurrency(walletBalance)}
                  </p>
                  <span className="text-[10px] font-medium text-indigo-700/90 dark:text-indigo-400/90 mt-0.5 !font-sans">
                    {siriCoins > 0 ? `+ ${siriCoins} Siri Coins` : 'Store credits'}
                  </span>
                </div>

                {/* Total Orders Card */}
                <div className="p-3.5 bg-white dark:bg-[#211f1b] bg-[var(--admin-surface,#ffffff)] rounded-[6px] border border-stone-200 dark:border-stone-800 border-[var(--admin-border-subtle,#e8e4d9)] flex flex-col justify-between shadow-xs">
                  <div className="flex items-center justify-between gap-1 text-stone-600 dark:text-stone-400 text-[var(--admin-text-secondary,#4b5563)] mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider !font-sans">
                      Orders
                    </span>
                    <MaterialIcon
                      icon="shopping_bag"
                      className="text-[18px] text-amber-600 dark:text-amber-400"
                    />
                  </div>
                  <p className="text-[18px] sm:text-[20px] font-black text-stone-900 dark:text-stone-100 text-[var(--admin-text-primary,#111827)] tracking-tight !font-sans">
                    {totalOrders}
                  </p>
                  <span className="text-[10px] font-medium text-stone-500 dark:text-stone-400 text-[var(--admin-text-tertiary,#6b7280)] mt-0.5 !font-sans">
                    Total purchases
                  </span>
                </div>

                {/* Loyalty Tier Card */}
                <div className="p-3.5 bg-white dark:bg-[#211f1b] bg-[var(--admin-surface,#ffffff)] rounded-[6px] border border-stone-200 dark:border-stone-800 border-[var(--admin-border-subtle,#e8e4d9)] flex flex-col justify-between shadow-xs">
                  <div className="flex items-center justify-between gap-1 text-stone-600 dark:text-stone-400 text-[var(--admin-text-secondary,#4b5563)] mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider !font-sans">
                      Tier
                    </span>
                    <MaterialIcon icon="stars" className="text-[18px] text-amber-500" />
                  </div>
                  <p className="text-[18px] sm:text-[20px] font-black text-stone-900 dark:text-stone-100 text-[var(--admin-text-primary,#111827)] tracking-tight !font-sans">
                    {loyaltyTier}
                  </p>
                  <span className="text-[10px] font-medium text-stone-500 dark:text-stone-400 text-[var(--admin-text-tertiary,#6b7280)] mt-0.5 !font-sans">
                    Loyalty status
                  </span>
                </div>
              </div>

              {/* Quick Contact & Essential Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Email Card */}
                <a
                  href={`mailto:${email}`}
                  className="bg-white dark:bg-[#211f1b] bg-[var(--admin-surface,#ffffff)] rounded-[6px] border border-stone-200 dark:border-stone-800 border-[var(--admin-border-subtle,#e8e4d9)] p-3.5 flex items-start gap-3 hover:border-stone-400 dark:hover:border-stone-600 transition-all group shadow-xs !font-sans"
                >
                  <div className="w-9 h-9 rounded-[6px] bg-stone-100 dark:bg-stone-800 flex items-center justify-center shrink-0 text-stone-600 dark:text-stone-400 group-hover:text-primary transition-colors">
                    <MaterialIcon icon="mail" className="text-[18px]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 !font-sans">
                      Email Address
                    </p>
                    <p className="text-[13px] font-semibold text-stone-900 dark:text-stone-100 truncate mt-0.5 !font-sans">
                      {email || 'No email provided'}
                    </p>
                  </div>
                </a>

                {/* Phone & WhatsApp Card */}
                {phone ? (
                  <a
                    href={`${EXTERNAL_URLS.WHATSAPP_BASE}/${phone.replace(/[^0-9]/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-white dark:bg-[#211f1b] bg-[var(--admin-surface,#ffffff)] rounded-[6px] border border-stone-200 dark:border-stone-800 border-[var(--admin-border-subtle,#e8e4d9)] p-3.5 flex items-start gap-3 hover:border-emerald-500/50 hover:bg-emerald-50/20 dark:hover:bg-emerald-950/20 transition-all group shadow-xs !font-sans"
                  >
                    <div className="w-9 h-9 rounded-[6px] bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                      <MaterialIcon icon="chat" className="text-[18px]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 !font-sans">
                          Phone & WhatsApp
                        </p>
                        <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-0.5 !font-sans">
                          Chat <MaterialIcon icon="open_in_new" className="text-[11px]" />
                        </span>
                      </div>
                      <p className="text-[13px] font-bold text-stone-900 dark:text-stone-100 mt-0.5 !font-sans">
                        {phone}
                      </p>
                    </div>
                  </a>
                ) : (
                  <div className="bg-white dark:bg-[#211f1b] bg-[var(--admin-surface,#ffffff)] rounded-[6px] border border-stone-200 dark:border-stone-800 border-[var(--admin-border-subtle,#e8e4d9)] p-3.5 flex items-start gap-3 opacity-60 shadow-xs !font-sans">
                    <div className="w-9 h-9 rounded-[6px] bg-stone-100 dark:bg-stone-800 flex items-center justify-center shrink-0 text-stone-400">
                      <MaterialIcon icon="phone_disabled" className="text-[18px]" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 !font-sans">
                        Phone & WhatsApp
                      </p>
                      <p className="text-[13px] font-medium text-stone-500 dark:text-stone-400 mt-0.5 !font-sans">
                        Not provided
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Primary Saved Delivery Address */}
              {primaryAddress && (
                <div className="bg-white dark:bg-[#211f1b] rounded-[6px] p-3.5 sm:p-4 flex items-start gap-3 border border-stone-200/90 dark:border-stone-700/80 shadow-xs !font-sans">
                  <div className="w-9 h-9 rounded-[6px] bg-amber-500/10 border border-amber-200/60 dark:border-amber-900/40 flex items-center justify-center shrink-0 text-amber-700 dark:text-amber-400 mt-0.5 shadow-2xs">
                    <span className="material-symbols-outlined !text-[18px]">home_pin</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-stone-600 dark:text-stone-300 !font-sans">
                          Delivery Address
                        </p>
                        <span className="text-[9px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 px-1.5 py-0.5 rounded-[4px] border border-amber-200/60 uppercase !font-sans">
                          {primaryAddress.isDefault
                            ? 'Default'
                            : primaryAddress.tag || primaryAddress.type || 'Saved'}
                        </span>
                      </div>
                      {primaryAddress.phone && (
                        <span className="text-[11px] font-semibold text-stone-500 dark:text-stone-400 flex items-center gap-1 !font-sans">
                          <span className="material-symbols-outlined !text-[13px]">call</span>
                          {primaryAddress.phone}
                        </span>
                      )}
                    </div>

                    <div className="mt-1.5 text-[12.5px] leading-relaxed text-stone-800 dark:text-stone-200 !font-sans">
                      {primaryAddress.name && primaryAddress.name !== customer.name && (
                        <p className="font-bold text-stone-900 dark:text-stone-100 mb-0.5 !font-sans">
                          {primaryAddress.name}
                        </p>
                      )}
                      {/* Street Line / House No / Building / Locality / Landmark */}
                      {(primaryAddress.addressString ||
                        primaryAddress.address ||
                        primaryAddress.street ||
                        primaryAddress.locality ||
                        customer.address) && (
                        <p className="font-medium text-stone-800 dark:text-stone-200 !font-sans">
                          {[
                            primaryAddress.addressString ||
                              primaryAddress.address ||
                              primaryAddress.street ||
                              customer.address,
                            primaryAddress.locality,
                            primaryAddress.landmark
                              ? `Near ${primaryAddress.landmark.replace(/^near\s+/i, '')}`
                              : null,
                          ]
                            .filter(Boolean)
                            .join(', ')}
                        </p>
                      )}
                      {/* City, State, Pincode */}
                      <p className="text-stone-600 dark:text-stone-400 font-semibold text-[12px] mt-0.5 !font-sans">
                        {[
                          primaryAddress.city || customer.city,
                          primaryAddress.state || customer.state,
                          primaryAddress.pincode || customer.pincode,
                          primaryAddress.country && primaryAddress.country !== 'India'
                            ? primaryAddress.country
                            : null,
                        ]
                          .filter(Boolean)
                          .join(', ')}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Order History */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 border-[var(--admin-border-subtle,#e8e4d9)] pb-2">
                    <h3
                      className="text-[12px] font-bold uppercase tracking-wider text-stone-600 dark:text-stone-300 text-[var(--admin-text-secondary,#4b5563)] !font-sans"
                      style={{
                        fontFamily:
                          "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                      }}
                    >
                      Recent Orders ({orders.length})
                    </h3>
                  </div>

                  {orders.length === 0 ? (
                    <div className="p-6 text-center rounded-[6px] bg-white dark:bg-[#211f1b] bg-[var(--admin-surface-muted,#fdfbf7)] border border-dashed border-stone-200 dark:border-stone-700 !font-sans">
                      <MaterialIcon
                        icon="inventory_2"
                        className="text-[28px] text-[var(--admin-text-tertiary)] mb-1 block"
                      />
                      <p className="text-[12px] font-semibold text-stone-600 dark:text-stone-300 !font-sans">
                        No orders placed yet
                      </p>
                      <p className="text-[11px] text-stone-500 dark:text-stone-400 !font-sans">
                        When this customer makes a purchase, it will appear here.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {orders.slice(0, 5).map((order) => (
                        <div
                          key={order._id}
                          onClick={() => {
                            onClose();
                            navigate(`/admin/orders/${order._id || order.orderId}`);
                          }}
                          className="flex items-center justify-between p-3 bg-white dark:bg-[#211f1b] bg-[var(--admin-surface,#ffffff)] rounded-[6px] border border-stone-200 dark:border-stone-800 border-[var(--admin-border-subtle,#e8e4d9)] hover:border-emerald-500/50 hover:bg-emerald-50/10 dark:hover:bg-emerald-950/20 cursor-pointer transition-all active:scale-[0.99] group shadow-xs !font-sans"
                        >
                          <div>
                            <p className="text-[12.5px] font-bold text-stone-900 dark:text-stone-100 group-hover:text-emerald-700 transition-colors !font-sans">
                              {order.orderId || order._id.slice(-6).toUpperCase()}
                            </p>
                            <p className="text-[11px] font-medium text-stone-500 dark:text-stone-400 mt-0.5 !font-sans">
                              {new Date(order.createdAt).toLocaleDateString('en-IN', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-[13px] font-bold text-stone-900 dark:text-stone-100 !font-sans">
                              {formatCurrency(order.totalAmount || order.total || 0)}
                            </p>
                            <span
                              className={`inline-block text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-[4px] mt-0.5 !font-sans ${
                                order.orderStatus === 'Delivered'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : order.orderStatus === 'Cancelled'
                                    ? 'bg-red-100 text-red-800'
                                    : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {order.orderStatus || 'Pending'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Activity Timeline */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 border-[var(--admin-border-subtle,#e8e4d9)] pb-2">
                    <h3
                      className="text-[12px] font-bold uppercase tracking-wider text-stone-600 dark:text-stone-300 text-[var(--admin-text-secondary,#4b5563)] !font-sans"
                      style={{
                        fontFamily:
                          "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                      }}
                    >
                      Activity & Events
                    </h3>
                  </div>

                  {timeline.length === 0 ? (
                    <div className="p-6 text-center rounded-[6px] bg-white dark:bg-[#211f1b] bg-[var(--admin-surface-muted,#fdfbf7)] border border-dashed border-stone-200 dark:border-stone-700 !font-sans">
                      <MaterialIcon
                        icon="history"
                        className="text-[28px] text-[var(--admin-text-tertiary)] mb-1 block"
                      />
                      <p className="text-[12px] font-semibold text-stone-600 dark:text-stone-300 !font-sans">
                        No recent activity
                      </p>
                      <p className="text-[11px] text-stone-500 dark:text-stone-400 !font-sans">
                        Customer logins, orders, and wallet events will be logged here.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3 pl-1 max-h-[280px] overflow-y-auto no-scrollbar">
                      {timeline.slice(0, 10).map((log, idx) => (
                        <div
                          key={idx}
                          className="relative pl-3.5 border-l-2 border-emerald-500/30 pb-1 !font-sans"
                        >
                          <div className="absolute w-2 h-2 rounded-full bg-emerald-600 -left-[5px] top-1.5 ring-2 ring-emerald-100" />
                          <p className="text-[12px] font-bold text-stone-900 dark:text-stone-100 capitalize !font-sans">
                            {log.title || log.action || log.type}
                          </p>
                          {log.description && (
                            <p className="text-[11px] font-medium text-stone-500 dark:text-stone-400 mt-0.5 line-clamp-2 !font-sans">
                              {log.description}
                            </p>
                          )}
                          <p className="text-[10px] font-bold text-stone-400 dark:text-stone-500 mt-1 !font-sans">
                            {new Date(log.timestamp || log.createdAt).toLocaleString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : null;
}
