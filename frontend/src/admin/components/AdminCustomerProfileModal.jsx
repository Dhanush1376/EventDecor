import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { customerIntelligenceService, orderService } from '../../services/domainServices';
import { formatCurrency } from './AdminUIKit';
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
    const handleResize = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        if (!customer?._id) return;

        const [ordersRes, timelineRes, profile360Data] = await Promise.all([
          orderService.getAll({ user: customer._id }).catch(() => ({ data: [] })),
          customerIntelligenceService
            .getCustomerTimeline(customer._id, {
              skip: 0,
              limit: 50,
              filter: 'all',
            })
            .catch(() => ({ data: { timeline: [] } })),
          customerIntelligenceService.getCustomer360(customer._id).catch(() => null),
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

  if (!customer) return null;

  const initials =
    customer.name
      ?.split(' ')
      .filter(Boolean)
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'CU';

  // Resolved financial & identity stats
  const totalSpent = profile360?.overview?.totalSpent ?? customer.totalSpent ?? 0;
  const walletBalance = profile360?.identity?.walletBalance ?? customer.walletBalance ?? 0;
  const siriCoins = profile360?.identity?.siriCoins ?? customer.siriCoins ?? 0;
  const loyaltyTier = profile360?.identity?.loyaltyTier ?? customer.loyaltyTier ?? 'Bronze';
  const totalOrders = profile360?.overview?.totalOrders ?? orders.length ?? customer.orders ?? 0;
  const phone = profile360?.identity?.phone || customer.phone || '';
  const email = profile360?.identity?.email || customer.email || '';
  const isVerified = profile360?.identity?.isVerified ?? customer.isVerified ?? false;

  const addresses = profile360?.addresses || customer.addresses || [];
  const primaryAddress = addresses.find((a) => a.isDefault) || addresses[0] || null;
  const validCity =
    primaryAddress?.city ||
    (customer.city && !['unknown', 'unknown city'].includes(customer.city.toLowerCase())
      ? customer.city
      : null);

  const formattedJoinDate = customer.createdAt
    ? new Date(customer.createdAt).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : 'Recent';

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-6">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: isMobile ? 1 : 0.95, y: isMobile ? '100%' : 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: isMobile ? 1 : 0.95, y: isMobile ? '100%' : 20 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="relative w-full max-w-2xl bg-[var(--admin-bg)] rounded-t-2xl sm:rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] sm:max-h-[90vh] border border-[var(--admin-border-subtle)]"
      >
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-[var(--admin-border-subtle)] bg-[var(--admin-surface)]">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-500/15 to-primary/15 border border-[var(--admin-border)] flex items-center justify-center shrink-0 shadow-xs">
              <span className="text-lg font-black text-[var(--admin-text-primary)] tracking-wide">
                {initials}
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-bold text-[var(--admin-text-primary)] tracking-tight">
                  {customer.name}
                </h2>
                {isVerified && (
                  <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
                    <MaterialIcon icon="verified" className="text-[12px]" />
                    Verified
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 mt-1 flex-wrap text-[11px] font-semibold text-[var(--admin-text-tertiary)]">
                {validCity && (
                  <>
                    <span className="flex items-center gap-0.5 text-[var(--admin-text-secondary)]">
                      <MaterialIcon icon="location_on" className="text-[13px] text-red-500" />
                      {validCity}
                    </span>
                    <span>•</span>
                  </>
                )}
                <span>Joined {formattedJoinDate}</span>
                <span>•</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] uppercase font-bold bg-amber-50 text-amber-800 border border-amber-200/60">
                  {loyaltyTier} Tier
                </span>
                {customer.segment && customer.segment !== 'New' && (
                  <>
                    <span>•</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[var(--admin-surface-muted)] text-[var(--admin-text-secondary)]">
                      {customer.segment}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onDelete && (
              <button
                onClick={() => onDelete(customer)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg text-red-600 hover:text-white hover:bg-red-600 border border-red-200 dark:border-red-900/50 hover:border-red-600 transition-all cursor-pointer shadow-xs"
                title="Move Customer to Recycle Bin"
              >
                <MaterialIcon icon="delete" className="text-[16px]" />
                <span className="hidden sm:inline">Move to Recycle Bin</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--admin-surface-muted)] text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)] transition-colors cursor-pointer"
              title="Close"
            >
              <MaterialIcon icon="close" className="text-[20px]" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Top KPI Metrics: Amount Spent & Wallet Balance */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Total Spent Card */}
            <div className="p-3.5 bg-gradient-to-br from-emerald-50/70 to-emerald-100/30 rounded-xl border border-emerald-200/60 flex flex-col justify-between shadow-3xs">
              <div className="flex items-center justify-between gap-1 text-emerald-800 mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider">Total Spent</span>
                <MaterialIcon icon="payments" className="text-[18px] text-emerald-700" />
              </div>
              <p className="text-[18px] sm:text-[20px] font-black text-emerald-950 tracking-tight">
                {formatCurrency(totalSpent)}
              </p>
              <span className="text-[10px] font-medium text-emerald-700/80 mt-0.5">
                Lifetime value
              </span>
            </div>

            {/* Wallet Balance Card */}
            <div className="p-3.5 bg-gradient-to-br from-indigo-50/70 to-indigo-100/30 rounded-xl border border-indigo-200/60 flex flex-col justify-between shadow-3xs">
              <div className="flex items-center justify-between gap-1 text-indigo-800 mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider">
                  Wallet Balance
                </span>
                <MaterialIcon
                  icon="account_balance_wallet"
                  className="text-[18px] text-indigo-700"
                />
              </div>
              <p className="text-[18px] sm:text-[20px] font-black text-indigo-950 tracking-tight">
                {formatCurrency(walletBalance)}
              </p>
              <span className="text-[10px] font-medium text-indigo-700/80 mt-0.5">
                {siriCoins > 0 ? `+ ${siriCoins} Siri Coins` : 'Store credits'}
              </span>
            </div>

            {/* Total Orders Card */}
            <div className="p-3.5 bg-[var(--admin-surface-muted)] rounded-xl border border-[var(--admin-border-subtle)] flex flex-col justify-between shadow-3xs">
              <div className="flex items-center justify-between gap-1 text-[var(--admin-text-secondary)] mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider">Orders</span>
                <MaterialIcon icon="shopping_bag" className="text-[18px] text-amber-600" />
              </div>
              <p className="text-[18px] sm:text-[20px] font-black text-[var(--admin-text-primary)] tracking-tight">
                {totalOrders}
              </p>
              <span className="text-[10px] font-medium text-[var(--admin-text-tertiary)] mt-0.5">
                Total purchases
              </span>
            </div>

            {/* Loyalty Tier Card */}
            <div className="p-3.5 bg-[var(--admin-surface-muted)] rounded-xl border border-[var(--admin-border-subtle)] flex flex-col justify-between shadow-3xs">
              <div className="flex items-center justify-between gap-1 text-[var(--admin-text-secondary)] mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider">Tier</span>
                <MaterialIcon icon="stars" className="text-[18px] text-amber-500" />
              </div>
              <p className="text-[18px] sm:text-[20px] font-black text-[var(--admin-text-primary)] tracking-tight">
                {loyaltyTier}
              </p>
              <span className="text-[10px] font-medium text-[var(--admin-text-tertiary)] mt-0.5">
                Loyalty status
              </span>
            </div>
          </div>

          {/* Quick Contact & Essential Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Email Card */}
            <a
              href={`mailto:${email}`}
              className="admin-card p-3.5 flex items-start gap-3 hover:border-[var(--admin-border-strong)] transition-all group"
            >
              <div className="w-9 h-9 rounded-lg bg-[var(--admin-surface-muted)] flex items-center justify-center shrink-0 text-[var(--admin-text-secondary)] group-hover:text-primary transition-colors">
                <MaterialIcon icon="mail" className="text-[18px]" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--admin-text-tertiary)]">
                  Email Address
                </p>
                <p className="text-[13px] font-semibold text-[var(--admin-text-primary)] truncate mt-0.5">
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
                className="admin-card p-3.5 flex items-start gap-3 hover:border-emerald-500/50 hover:bg-emerald-50/20 transition-all group"
              >
                <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <MaterialIcon icon="chat" className="text-[18px]" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                      Phone & WhatsApp
                    </p>
                    <span className="text-[10px] font-bold text-emerald-700 flex items-center gap-0.5">
                      Chat <MaterialIcon icon="open_in_new" className="text-[11px]" />
                    </span>
                  </div>
                  <p className="text-[13px] font-bold text-[var(--admin-text-primary)] mt-0.5">
                    {phone}
                  </p>
                </div>
              </a>
            ) : (
              <div className="admin-card p-3.5 flex items-start gap-3 opacity-60">
                <div className="w-9 h-9 rounded-lg bg-[var(--admin-surface-muted)] flex items-center justify-center shrink-0 text-[var(--admin-text-tertiary)]">
                  <MaterialIcon icon="phone_disabled" className="text-[18px]" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--admin-text-tertiary)]">
                    Phone & WhatsApp
                  </p>
                  <p className="text-[13px] font-medium text-[var(--admin-text-tertiary)] mt-0.5">
                    Not provided
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Primary Saved Delivery Address */}
          {primaryAddress && (
            <div className="admin-card p-4 flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-stone-100 flex items-center justify-center shrink-0 text-stone-600 mt-0.5">
                <MaterialIcon icon="home_pin" className="text-[18px]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--admin-text-tertiary)]">
                    Delivery Address
                  </p>
                  {primaryAddress.isDefault && (
                    <span className="text-[9px] font-bold bg-stone-200 text-stone-700 px-1.5 py-0.2 rounded">
                      Default
                    </span>
                  )}
                </div>
                <p className="text-[12.5px] text-[var(--admin-text-primary)] font-medium mt-1 leading-snug">
                  {[
                    primaryAddress.street,
                    primaryAddress.city,
                    primaryAddress.state,
                    primaryAddress.pincode,
                  ]
                    .filter(Boolean)
                    .join(', ')}
                </p>
              </div>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-10">
              <span className="material-symbols-outlined animate-spin text-[24px] text-[var(--admin-text-tertiary)]">
                sync
              </span>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Order History */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-[var(--admin-border-subtle)] pb-2">
                  <h3 className="text-[12px] font-bold uppercase tracking-wider text-[var(--admin-text-secondary)]">
                    Recent Orders ({orders.length})
                  </h3>
                </div>

                {orders.length === 0 ? (
                  <div className="p-6 text-center rounded-xl bg-[var(--admin-surface-muted)] border border-dashed border-[var(--admin-border)]">
                    <MaterialIcon
                      icon="inventory_2"
                      className="text-[28px] text-[var(--admin-text-tertiary)] mb-1 block"
                    />
                    <p className="text-[12px] font-semibold text-[var(--admin-text-secondary)]">
                      No orders placed yet
                    </p>
                    <p className="text-[11px] text-[var(--admin-text-tertiary)]">
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
                          navigate('/admin/orders');
                        }}
                        className="flex items-center justify-between p-3 bg-[var(--admin-surface-muted)] rounded-xl border border-[var(--admin-border-subtle)] hover:border-emerald-500/50 hover:bg-emerald-50/10 cursor-pointer transition-all active:scale-[0.99] group shadow-3xs"
                      >
                        <div>
                          <p className="text-[12.5px] font-bold text-[var(--admin-text-primary)] group-hover:text-emerald-700 transition-colors">
                            {order.orderId || order._id.slice(-6).toUpperCase()}
                          </p>
                          <p className="text-[11px] font-medium text-[var(--admin-text-tertiary)] mt-0.5">
                            {new Date(order.createdAt).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-[13px] font-bold text-[var(--admin-text-primary)]">
                            {formatCurrency(order.totalAmount || order.total || 0)}
                          </p>
                          <span
                            className={`inline-block text-[9px] font-bold uppercase px-1.5 py-0.5 rounded mt-0.5 ${
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
                <div className="flex items-center justify-between border-b border-[var(--admin-border-subtle)] pb-2">
                  <h3 className="text-[12px] font-bold uppercase tracking-wider text-[var(--admin-text-secondary)]">
                    Activity & Events
                  </h3>
                </div>

                {timeline.length === 0 ? (
                  <div className="p-6 text-center rounded-xl bg-[var(--admin-surface-muted)] border border-dashed border-[var(--admin-border)]">
                    <MaterialIcon
                      icon="history"
                      className="text-[28px] text-[var(--admin-text-tertiary)] mb-1 block"
                    />
                    <p className="text-[12px] font-semibold text-[var(--admin-text-secondary)]">
                      No recent activity
                    </p>
                    <p className="text-[11px] text-[var(--admin-text-tertiary)]">
                      Customer logins, orders, and wallet events will be logged here.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3 pl-1 max-h-[280px] overflow-y-auto no-scrollbar">
                    {timeline.slice(0, 10).map((log, idx) => (
                      <div
                        key={idx}
                        className="relative pl-3.5 border-l-2 border-emerald-500/30 pb-1"
                      >
                        <div className="absolute w-2 h-2 rounded-full bg-emerald-600 -left-[5px] top-1.5 ring-2 ring-emerald-100" />
                        <p className="text-[12px] font-bold text-[var(--admin-text-primary)] capitalize">
                          {log.title || log.action || log.type}
                        </p>
                        {log.description && (
                          <p className="text-[11px] font-medium text-[var(--admin-text-tertiary)] mt-0.5 line-clamp-2">
                            {log.description}
                          </p>
                        )}
                        <p className="text-[10px] font-bold text-[var(--admin-text-tertiary)] mt-1">
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
          )}
        </div>
      </motion.div>
    </div>
  );
}
