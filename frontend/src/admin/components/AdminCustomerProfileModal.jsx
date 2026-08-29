import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { customerIntelligenceService, orderService } from '../../services/domainServices';
import { formatCurrency } from './AdminUIKit';
import { EXTERNAL_URLS } from '../../config/constants';

import { useNavigate } from 'react-router-dom';

// A simple icon helper
const MaterialIcon = ({ icon, className = '' }) => (
  <span className={`material-symbols-outlined ${className}`}>{icon}</span>
);

export default function AdminCustomerProfileModal({ customer, onClose }) {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [timeline, setTimeline] = useState([]);
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

        const [ordersRes, timelineRes] = await Promise.all([
          orderService.getAll({ user: customer._id }),
          customerIntelligenceService.getCustomerTimeline(customer._id, {
            skip: 0,
            limit: 500,
            filter: 'all',
          }),
        ]);

        const fetchedOrders = ordersRes?.data?.data || ordersRes?.data || [];
        setOrders(Array.isArray(fetchedOrders) ? fetchedOrders : []);

        const fetchedTimeline = timelineRes?.data?.timeline || [];
        setTimeline(Array.isArray(fetchedTimeline) ? fetchedTimeline : []);
      } catch (err) {
        console.error('Failed to fetch customer profile data', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [customer]);

  if (!customer) return null;

  const initials = customer.name
    ?.split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

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
        className="relative w-full max-w-2xl bg-[var(--admin-bg)] rounded-t-2xl sm:rounded-md shadow-2xl overflow-hidden flex flex-col max-h-[85vh] sm:max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-[var(--admin-border-subtle)] bg-[var(--admin-surface)]">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-md bg-[var(--admin-bg-subtle)] border border-[var(--admin-border-subtle)] flex items-center justify-center shrink-0 shadow-sm">
              <span className="text-lg font-bold text-[var(--admin-text-primary)]">{initials}</span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-[var(--admin-text-primary)] tracking-tight">
                {customer.name}
              </h2>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="text-[12px] font-bold uppercase tracking-wider text-[var(--admin-text-tertiary)]">
                  {customer.city || 'Unknown City'}
                </span>
                <span className="text-[var(--admin-border)]">•</span>
                <span className="text-[12px] font-bold uppercase tracking-wider text-[var(--admin-text-tertiary)]">
                  Joined {new Date(customer.createdAt).toLocaleDateString()}
                </span>
                {customer.segment && (
                  <>
                    <span className="text-[var(--admin-border)]">•</span>
                    <span className="admin-badge h-5 px-2 font-bold text-[10px] bg-[var(--admin-surface-muted)] text-[var(--admin-text-secondary)] border-none">
                      {customer.segment}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-[var(--admin-surface-muted)] text-[var(--admin-text-secondary)] transition-colors cursor-pointer"
          >
            <MaterialIcon icon="close" className="text-[20px]" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {/* Quick Contact & Actions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <a
              href={`mailto:${customer.email}`}
              className="admin-card p-4 flex flex-col hover:border-[var(--admin-border-strong)] transition-colors"
            >
              <div className="flex items-center gap-2 text-[var(--admin-text-secondary)] mb-1">
                <MaterialIcon icon="mail" className="text-[16px]" />
                <span className="text-[11px] font-bold uppercase tracking-wider">
                  Email Address
                </span>
              </div>
              <span className="text-[14px] font-bold text-[var(--admin-text-primary)] truncate">
                {customer.email}
              </span>
            </a>
            <a
              href={`${EXTERNAL_URLS.WHATSAPP_BASE}/${customer.phone?.replace(/[^0-9]/g, '') || ''}`}
              target="_blank"
              rel="noopener noreferrer"
              className="admin-card p-4 flex flex-col hover:border-[var(--admin-border-strong)] transition-colors"
            >
              <div className="flex items-center gap-2 text-[var(--admin-success)] mb-1">
                <MaterialIcon icon="chat" className="text-[16px]" />
                <span className="text-[11px] font-bold uppercase tracking-wider">WhatsApp</span>
              </div>
              <span className="text-[14px] font-bold text-[var(--admin-text-primary)]">
                {customer.phone || 'N/A'}
              </span>
            </a>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <span className="material-symbols-outlined animate-spin text-[24px] text-[var(--admin-text-tertiary)]">
                sync
              </span>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Order History */}
              <div className="space-y-4">
                <h3 className="text-[14px] font-bold uppercase tracking-wider text-[var(--admin-text-secondary)] border-b border-[var(--admin-border-subtle)] pb-2">
                  Recent Orders
                </h3>
                {orders.length === 0 ? (
                  <p className="text-[13px] font-medium text-[var(--admin-text-tertiary)]">
                    No orders placed yet.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {orders.slice(0, 5).map((order) => (
                      <div
                        key={order._id}
                        onClick={() => {
                          onClose();
                          navigate('/admin/orders');
                        }}
                        className="flex items-center justify-between p-3 bg-[var(--admin-surface-muted)] rounded-md border border-[var(--admin-border-subtle)] hover:border-[var(--admin-border-strong)] cursor-pointer transition-colors active:scale-[0.98]"
                      >
                        <div>
                          <p className="text-[13px] font-bold text-[var(--admin-text-primary)]">
                            {order.orderId || order._id.slice(-6).toUpperCase()}
                          </p>
                          <p className="text-[11px] font-medium text-[var(--admin-text-tertiary)] mt-0.5">
                            {new Date(order.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-[13px] font-bold text-[var(--admin-text-primary)]">
                            {formatCurrency(order.totalAmount || order.total || 0)}
                          </p>
                          <span className="text-[10px] font-bold uppercase text-[var(--admin-text-secondary)]">
                            {order.orderStatus || 'Pending'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Activity Timeline */}
              <div className="space-y-4">
                <h3 className="text-[14px] font-bold uppercase tracking-wider text-[var(--admin-text-secondary)] border-b border-[var(--admin-border-subtle)] pb-2">
                  Account Logs
                </h3>
                {timeline.length === 0 ? (
                  <p className="text-[13px] font-medium text-[var(--admin-text-tertiary)]">
                    No recent activity.
                  </p>
                ) : (
                  <div className="space-y-4 pl-1">
                    {timeline.map((log, idx) => (
                      <div
                        key={idx}
                        className="relative pl-4 border-l-2 border-[var(--admin-border-subtle)] pb-2"
                      >
                        <div className="absolute w-2 h-2 rounded-full bg-[var(--admin-border-strong)] -left-[5px] top-1.5" />
                        <p className="text-[12px] font-bold text-[var(--admin-text-primary)] capitalize">
                          {log.title || log.action || log.type}
                        </p>

                        {log.description && (
                          <p className="text-[11px] font-medium text-[var(--admin-text-tertiary)] mt-0.5 whitespace-pre-wrap">
                            {log.description}
                          </p>
                        )}

                        {log.details && Object.keys(log.details).length > 0 && (
                          <div className="mt-2 bg-[var(--admin-surface)] border border-[var(--admin-border-subtle)] p-2 rounded-md">
                            {Object.entries(log.details).map(([k, v]) => (
                              <div key={k} className="text-[10px] break-words">
                                <span className="font-bold text-[var(--admin-text-secondary)]">
                                  {k.replace(/([A-Z])/g, ' $1').toUpperCase()}:{' '}
                                </span>
                                <span className="text-[var(--admin-text-tertiary)] font-medium">
                                  {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}

                        <p className="text-[10px] font-bold text-[var(--admin-text-secondary)] mt-1.5">
                          {new Date(log.timestamp || log.createdAt).toLocaleString('en-IN')}
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
