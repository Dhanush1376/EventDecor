import React, { useState, useEffect } from 'react';
import api from '../../services/api';

export default function OrderTimeline({ orderId }) {
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orderId) return;

    const fetchTimeline = async () => {
      try {
        setLoading(true);
        // We need an endpoint in the backend for this: /api/v1/orders/:id/timeline
        const res = await api.get(`/orders/${orderId}/timeline`);
        if (res.data.success) {
          setTimeline(res.data.data);
        }
      } catch (err) {
        console.error('Failed to load timeline', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTimeline();
  }, [orderId]);

  if (loading) return <div className="p-4 text-center">Loading timeline...</div>;
  if (!timeline.length)
    return (
      <div className="p-4 text-center text-[var(--admin-text-tertiary)]">
        No timeline events found.
      </div>
    );

  return (
    <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-[var(--admin-border)] before:to-transparent">
      {timeline.map((event, idx) => (
        <div
          key={event._id || idx}
          className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active"
        >
          {/* Icon */}
          <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-[var(--admin-surface)] bg-blue-100 text-blue-500 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
            <span className="material-symbols-outlined text-sm">
              {event.domain === 'order'
                ? 'shopping_bag'
                : event.domain === 'payment'
                  ? 'payments'
                  : event.domain === 'inventory'
                    ? 'inventory'
                    : 'warehouse'}
            </span>
          </div>

          {/* Card */}
          <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-[var(--admin-border-subtle)] bg-[var(--admin-bg-subtle)] shadow-sm">
            <div className="flex items-center justify-between mb-1">
              <span className="font-semibold text-sm text-[var(--admin-text-primary)] capitalize">
                {event.eventType || event.status || event.action}
              </span>
              <time className="text-xs text-[var(--admin-text-tertiary)] font-mono">
                {new Date(event.timestamp).toLocaleString()}
              </time>
            </div>
            <div className="text-[13px] text-[var(--admin-text-secondary)]">
              {event.performedBy && (
                <p>
                  <strong>By:</strong> {event.performedBy}
                </p>
              )}
              {event.quantity && (
                <p>
                  <strong>Qty:</strong> {event.quantity}
                </p>
              )}
              {event.reason && (
                <p>
                  <strong>Reason:</strong> {event.reason}
                </p>
              )}
              {event.amount && (
                <p>
                  <strong>Amount:</strong> ₹{event.amount}
                </p>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
