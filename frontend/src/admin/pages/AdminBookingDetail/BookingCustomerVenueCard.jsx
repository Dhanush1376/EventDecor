import React from 'react';
import toast from 'react-hot-toast';

export function BookingCustomerVenueCard({
  booking,
  venueName,
  setVenueName,
  venueAddress,
  setVenueAddress,
  venueCity,
  setVenueCity,
  venueState,
  setVenueState,
  venuePincode,
  setVenuePincode,
  venueLatitude,
  venueLongitude,
  venueIsOutdoor,
  setVenueIsOutdoor,
  venueGoogleMapsLink,
  onCoordInputChange,
}) {
  const customer = booking.user || {};
  const customerName = customer.name || 'Valued Customer';
  const customerEmail = customer.email || 'No email provided';
  const customerPhone = customer.phone || 'No phone provided';

  const copyText = (text, label) => {
    if (text && text !== 'No phone provided' && text !== 'No email provided') {
      navigator.clipboard.writeText(text);
      toast.success(`${label} copied!`);
    }
  };

  const mapsQuery =
    venueGoogleMapsLink ||
    (venueAddress
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(venueAddress)}`
      : `https://www.google.com/maps/search/?api=1&query=${venueLatitude || 15.506},${venueLongitude || 80.049}`);

  return (
    <div
      className="bg-[var(--admin-surface)] rounded-[4px] shadow-sm border border-[var(--admin-border-subtle)] overflow-hidden font-sans"
      style={{
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      {/* Header */}
      <div className="px-4 sm:px-5 py-3.5 sm:py-4 border-b border-[var(--admin-border-subtle)] bg-[var(--admin-bg-subtle)] flex items-center justify-between">
        <h3 className="text-[14px] font-bold text-[var(--admin-text-primary)] flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px] text-[var(--admin-accent)]">
            location_on
          </span>
          Customer & Venue
        </h3>
        <span
          className={`text-[10px] px-2 py-0.5 rounded-[4px] font-bold uppercase tracking-wider border shadow-2xs ${
            venueIsOutdoor
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300'
              : 'bg-stone-100 text-stone-700 border-stone-200 dark:bg-stone-800 dark:text-stone-300'
          }`}
        >
          {venueIsOutdoor ? 'Outdoor' : 'Indoor'}
        </span>
      </div>

      <div className="p-4 sm:p-5 space-y-4">
        {/* Customer Profile Row */}
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[20px]">person</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-bold text-[var(--admin-text-primary)] truncate">
              {customerName}
            </p>
            <div className="text-[12px] text-[var(--admin-text-secondary)] mt-1 flex flex-col gap-1">
              <div className="flex items-center justify-between group">
                <span className="flex items-center gap-1.5 truncate">
                  <span className="material-symbols-outlined text-[14px] text-stone-400">
                    phone
                  </span>
                  {customerPhone}
                </span>
                {customerPhone && customerPhone !== 'No phone provided' && (
                  <button
                    type="button"
                    onClick={() => copyText(customerPhone, 'Phone number')}
                    className="text-[10px] text-[var(--admin-text-tertiary)] hover:text-[var(--admin-text-primary)] cursor-pointer"
                  >
                    Copy
                  </button>
                )}
              </div>

              <div className="flex items-center justify-between group">
                <span className="flex items-center gap-1.5 truncate">
                  <span className="material-symbols-outlined text-[14px] text-stone-400">mail</span>
                  {customerEmail}
                </span>
                {customerEmail && customerEmail !== 'No email provided' && (
                  <button
                    type="button"
                    onClick={() => copyText(customerEmail, 'Email address')}
                    className="text-[10px] text-[var(--admin-text-tertiary)] hover:text-[var(--admin-text-primary)] cursor-pointer"
                  >
                    Copy
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Venue Information Block */}
        <div className="pt-3 border-t border-[var(--admin-border-subtle)] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[var(--admin-text-secondary)] uppercase tracking-wider">
              Venue Destination
            </span>
            <label className="flex items-center gap-1.5 text-[11px] font-medium text-[var(--admin-text-secondary)] cursor-pointer">
              <input
                type="checkbox"
                checked={venueIsOutdoor}
                onChange={(e) => setVenueIsOutdoor(e.target.checked)}
                className="rounded text-[var(--admin-accent)]"
              />
              <span>Outdoor Setup</span>
            </label>
          </div>

          <div className="space-y-1.5 text-xs">
            <input
              type="text"
              placeholder="Venue Name (e.g. Royal Palace Hall)"
              value={venueName}
              onChange={(e) => setVenueName(e.target.value)}
              className="w-full h-8 px-2.5 rounded-[4px] border border-[var(--admin-border)] bg-white dark:bg-[#1a1815] text-[12.5px] font-bold text-[var(--admin-text-primary)] outline-none focus:border-[var(--admin-accent)] shadow-2xs"
            />
            <textarea
              rows={2}
              placeholder="Full Street Address & Landmark"
              value={venueAddress}
              onChange={(e) => setVenueAddress(e.target.value)}
              className="w-full p-2 rounded-[4px] border border-[var(--admin-border)] bg-white dark:bg-[#1a1815] text-[12px] text-[var(--admin-text-primary)] outline-none focus:border-[var(--admin-accent)] shadow-2xs resize-none"
            />

            <div className="grid grid-cols-3 gap-1.5">
              <input
                type="text"
                placeholder="City"
                value={venueCity}
                onChange={(e) => setVenueCity(e.target.value)}
                className="h-7 px-2 rounded-[4px] border border-[var(--admin-border)] bg-white dark:bg-[#1a1815] text-[11.5px] outline-none"
              />
              <input
                type="text"
                placeholder="State"
                value={venueState}
                onChange={(e) => setVenueState(e.target.value)}
                className="h-7 px-2 rounded-[4px] border border-[var(--admin-border)] bg-white dark:bg-[#1a1815] text-[11.5px] outline-none"
              />
              <input
                type="text"
                placeholder="Pincode"
                value={venuePincode}
                onChange={(e) => setVenuePincode(e.target.value)}
                className="h-7 px-2 rounded-[4px] border border-[var(--admin-border)] bg-white dark:bg-[#1a1815] text-[11.5px] outline-none font-mono"
              />
            </div>
          </div>
        </div>

        {/* Embedded Leaflet Map Preview */}
        <div className="pt-2 border-t border-[var(--admin-border-subtle)] space-y-2">
          <div className="flex items-center justify-between text-[11px] text-[var(--admin-text-tertiary)]">
            <span className="font-bold uppercase tracking-wider">Geolocated Map Pin</span>
            <span>Drag pin or click map to update</span>
          </div>

          <div
            id="admin-leaflet-map"
            className="w-full h-44 rounded-[4px] border border-[var(--admin-border)] bg-[var(--admin-surface-muted)] overflow-hidden shadow-inner relative z-0"
          />

          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="text-[10px] text-[var(--admin-text-tertiary)] block mb-0.5">
                Latitude
              </span>
              <input
                type="text"
                value={venueLatitude}
                onChange={(e) => onCoordInputChange('lat', e.target.value)}
                className="w-full h-7 px-2 text-[11px] font-mono rounded-[4px] border border-[var(--admin-border)] bg-white dark:bg-[#1a1815]"
              />
            </div>
            <div>
              <span className="text-[10px] text-[var(--admin-text-tertiary)] block mb-0.5">
                Longitude
              </span>
              <input
                type="text"
                value={venueLongitude}
                onChange={(e) => onCoordInputChange('lng', e.target.value)}
                className="w-full h-7 px-2 text-[11px] font-mono rounded-[4px] border border-[var(--admin-border)] bg-white dark:bg-[#1a1815]"
              />
            </div>
          </div>
        </div>

        {/* Open in Google Maps Action Button (Matches OrderShipping) */}
        <div className="pt-1">
          <a
            href={mapsQuery}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full h-9 flex items-center justify-center rounded-[4px] bg-[var(--admin-surface)] text-[var(--admin-text-primary)] hover:bg-[var(--admin-bg-subtle)] transition-colors border border-[var(--admin-border)] shadow-sm font-bold text-[12px] cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px] mr-1.5 text-[var(--admin-accent)]">
              map
            </span>
            Open in Google Maps
          </a>
        </div>
      </div>
    </div>
  );
}
