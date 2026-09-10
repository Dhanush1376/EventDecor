import React, { useState } from 'react';

export function BookingPackageCard({ booking }) {
  const [showLargeImage, setShowLargeImage] = useState(false);
  const eventPackage = booking.eventPackage || null;
  const heroImage = eventPackage?.image || booking.inspirationImages?.[0] || null;

  const eventDateFormatted = booking.date
    ? new Date(booking.date).toLocaleDateString('en-IN', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : 'Date not specified';

  const rentalFee = Number(booking.pricing?.rentalFee || 0);
  const setupTransport =
    Number(booking.pricing?.setupCharges || 0) + Number(booking.pricing?.transportationCost || 0);
  const addOns = Number(booking.pricing?.addOnCharges || 0);
  const subtotal = rentalFee + setupTransport + addOns;

  return (
    <div
      className="bg-[var(--admin-surface)] rounded-[4px] shadow-sm border border-[var(--admin-border)] overflow-hidden font-sans"
      style={{
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      {/* Header (Matches OrderItems) */}
      <div className="px-3 sm:px-5 py-3 sm:py-4 border-b border-[var(--admin-border-subtle)] bg-[var(--admin-bg-subtle)] flex items-center justify-between">
        <h3 className="text-[14px] font-bold text-[var(--admin-text-primary)] flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px] text-[var(--admin-accent)]">
            celebration
          </span>
          Booked Package & Experience
        </h3>
        <span className="text-[11px] font-bold text-[var(--admin-text-secondary)] bg-[var(--admin-surface-muted)] px-2.5 py-0.5 rounded-[4px] border border-[var(--admin-border-subtle)]">
          1 Experience Package
        </span>
      </div>

      {/* Main Item Row (Matches OrderItems item row layout) */}
      <div className="p-3 sm:p-5 flex flex-col md:flex-row gap-4 sm:gap-5 hover:bg-[var(--admin-surface-muted)]/40 transition-colors group">
        {/* Left: Thumbnail Preview */}
        {heroImage ? (
          <div
            onClick={() => setShowLargeImage(!showLargeImage)}
            className="w-full md:w-32 h-36 md:h-32 rounded-[4px] bg-stone-100 dark:bg-stone-800 border border-[var(--admin-border)] shrink-0 overflow-hidden relative shadow-2xs cursor-pointer group/img"
            title="Click to toggle expanded view"
          >
            <img
              src={heroImage}
              alt="Event Package"
              className="w-full h-full object-cover transition-transform duration-500 group-hover/img:scale-105"
            />
            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center text-white text-[11px] font-bold">
              <span className="material-symbols-outlined text-[20px]">zoom_in</span>
            </div>
            <div className="absolute top-0 right-0 bg-[var(--admin-accent)] text-white text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-bl-[4px]">
              {booking.eventType || 'Event'}
            </div>
          </div>
        ) : (
          <div className="w-full md:w-32 h-32 rounded-[4px] bg-stone-100 dark:bg-stone-800 border border-[var(--admin-border)] flex items-center justify-center text-stone-400 shrink-0">
            <span className="material-symbols-outlined text-[32px]">celebration</span>
          </div>
        )}

        {/* Middle: Details */}
        <div className="flex-1 flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-[15px] sm:text-[16px] font-bold text-[var(--admin-text-primary)] leading-tight group-hover:text-[var(--admin-accent)] transition-colors">
                {eventPackage?.title || booking.title || 'Divine Celebration Altar Booking'}
              </h4>
              {booking.eventType && (
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-[4px] bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/50">
                  {booking.eventType}
                </span>
              )}
            </div>

            {/* Schedule Pills */}
            <div className="flex flex-wrap items-center gap-3 mt-2 text-[12px] text-[var(--admin-text-secondary)]">
              <span className="flex items-center gap-1 font-medium bg-[var(--admin-surface-muted)] px-2 py-1 rounded-[4px] border border-[var(--admin-border-subtle)]">
                <span className="material-symbols-outlined text-[15px] text-[var(--admin-accent)]">
                  calendar_month
                </span>
                {eventDateFormatted}
              </span>

              <span className="flex items-center gap-1 font-medium bg-[var(--admin-surface-muted)] px-2 py-1 rounded-[4px] border border-[var(--admin-border-subtle)]">
                <span className="material-symbols-outlined text-[15px] text-[var(--admin-accent)]">
                  schedule
                </span>
                {booking.timing?.start || '08:00 AM'} - {booking.timing?.end || '02:00 PM'}
              </span>

              {eventPackage?._id && (
                <button
                  type="button"
                  onClick={() => window.open(`/events/${eventPackage._id}`, '_blank')}
                  className="text-[11px] font-bold text-[var(--admin-accent)] hover:underline flex items-center gap-1 cursor-pointer ml-auto"
                >
                  <span>View Package Showcase</span>
                  <span className="material-symbols-outlined text-[13px]">open_in_new</span>
                </button>
              )}
            </div>
          </div>

          {/* Metric Columns (Matches OrderItems bottom metrics) */}
          <div className="flex flex-wrap items-end justify-between gap-3 pt-3 border-t border-[var(--admin-border-subtle)]">
            <div className="flex items-center text-[12.5px] divide-x divide-[var(--admin-border-subtle)]">
              {setupTransport > 0 && (
                <div className="flex flex-col pr-4">
                  <span className="text-[10px] uppercase font-bold text-[var(--admin-text-tertiary)] tracking-wider">
                    Setup & Transport
                  </span>
                  <span className="font-bold text-[var(--admin-text-secondary)] font-mono mt-0.5">
                    ₹{setupTransport.toLocaleString('en-IN')}
                  </span>
                </div>
              )}

              {addOns > 0 && (
                <div className="flex flex-col px-4">
                  <span className="text-[10px] uppercase font-bold text-[var(--admin-text-tertiary)] tracking-wider">
                    Add-Ons
                  </span>
                  <span className="font-bold text-[var(--admin-text-secondary)] font-mono mt-0.5">
                    ₹{addOns.toLocaleString('en-IN')}
                  </span>
                </div>
              )}
            </div>

            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-[var(--admin-text-tertiary)] tracking-wider block mb-0.5">
                Subtotal
              </span>
              <span className="text-[16px] font-black text-[var(--admin-text-primary)] font-mono">
                ₹{subtotal.toLocaleString('en-IN')}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Expandable Full Panoramic Banner */}
      {showLargeImage && heroImage && (
        <div className="p-3 sm:p-4 bg-[var(--admin-surface-muted)] border-t border-[var(--admin-border-subtle)] animate-fadeIn">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[11px] font-bold text-[var(--admin-text-secondary)] uppercase tracking-wider">
              Expanded Package Setup View
            </span>
            <button
              type="button"
              onClick={() => setShowLargeImage(false)}
              className="text-[11px] text-[var(--admin-text-tertiary)] hover:text-[var(--admin-text-primary)] cursor-pointer"
            >
              Collapse Image
            </button>
          </div>
          <div className="rounded-[4px] overflow-hidden border border-[var(--admin-border)] max-h-72">
            <img
              src={heroImage}
              alt="Expanded Event Showcase"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      )}

      {/* Customer Requests Footer (Clean quote box) */}
      {booking.customization?.additionalRequests && (
        <div className="px-3 py-3 sm:px-5 sm:py-3.5 bg-[var(--admin-bg-subtle)] border-t border-[var(--admin-border-subtle)]">
          <div className="flex items-start gap-2 text-xs">
            <span className="material-symbols-outlined text-[16px] text-amber-600 dark:text-amber-400 mt-0.5 shrink-0">
              draw
            </span>
            <div className="min-w-0">
              <span className="font-bold text-[11px] text-[var(--admin-text-primary)] uppercase tracking-wider block">
                Customer Arrangement Requests:
              </span>
              <p className="text-[12.5px] text-[var(--admin-text-secondary)] mt-0.5 leading-relaxed">
                {booking.customization.additionalRequests}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
