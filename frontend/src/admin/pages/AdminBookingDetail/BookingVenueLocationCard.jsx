import React, { useEffect, useRef } from 'react';
import toast from 'react-hot-toast';

export function BookingVenueLocationCard({
  booking,
  venueName,
  venueAddress,
  venueCity,
  venueState,
  venuePincode,
  venueLatitude,
  venueLongitude,
  venueIsOutdoor,
  venueGoogleMapsLink,
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerInstanceRef = useRef(null);

  const v = booking?.venue || {};
  const displayName = venueName || v.name || 'Venue Name Not Specified';
  const displayAddress = venueAddress || v.address || 'Full address not provided';
  const displayCity = venueCity || v.city || '';
  const displayState = venueState || v.state || '';
  const displayPincode = venuePincode || v.pincode || '';
  const lat = venueLatitude || v.latitude;
  const lng = venueLongitude || v.longitude;
  const isOutdoor = typeof venueIsOutdoor === 'boolean' ? venueIsOutdoor : Boolean(v.isOutdoor);

  const mapsQuery =
    venueGoogleMapsLink ||
    v.googleMapsLink ||
    (displayAddress && displayAddress !== 'Full address not provided'
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(displayAddress)}`
      : `https://www.google.com/maps/search/?api=1&query=${lat || 15.506},${lng || 80.049}`);

  const copyText = (text, label) => {
    if (text) {
      navigator.clipboard.writeText(text);
      toast.success(`${label} copied to clipboard!`);
    }
  };

  // Self-contained Leaflet initialization & lifecycle management
  useEffect(() => {
    let isMounted = true;

    const initLeafletMap = () => {
      if (!isMounted || !mapContainerRef.current) return;

      // Clean up previous instance on this container if any
      if (mapContainerRef.current._leaflet_id) {
        mapContainerRef.current._leaflet_id = null;
      }
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove();
        } catch (err) {}
        mapInstanceRef.current = null;
      }

      const numLat = Number(lat);
      const numLng = Number(lng);
      const validLat = !isNaN(numLat) && numLat !== 0 ? numLat : 15.506;
      const validLng = !isNaN(numLng) && numLng !== 0 ? numLng : 80.049;

      try {
        const map = window.L.map(mapContainerRef.current, {
          zoomControl: false,
          attributionControl: false,
          scrollWheelZoom: false,
        }).setView([validLat, validLng], 14);

        window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
        }).addTo(map);

        window.L.control.zoom({ position: 'bottomright' }).addTo(map);

        const goldIcon = window.L.divIcon({
          className: 'custom-leaflet-marker',
          html: `<div style="position:relative;width:34px;height:34px;display:flex;align-items:center;justify-content:center;">
                   <div style="position:absolute;width:34px;height:34px;background:rgba(180,83,9,0.3);border-radius:50%;"></div>
                   <span class="material-symbols-outlined" style="color:#b45309;font-size:30px;filter:drop-shadow(0 2px 5px rgba(0,0,0,0.3));z-index:10;">location_on</span>
                 </div>`,
          iconSize: [34, 34],
          iconAnchor: [17, 34],
        });

        const marker = window.L.marker([validLat, validLng], {
          icon: goldIcon,
          draggable: false,
        }).addTo(map);

        if (displayName && displayName !== 'Venue Name Not Specified') {
          marker.bindPopup(
            `<strong style="font-size:12px;">${displayName}</strong><br/><span style="font-size:11px;color:#555;">${displayAddress}</span>`,
          );
        }

        mapInstanceRef.current = map;
        markerInstanceRef.current = marker;

        // Invalidate size to guarantee OpenStreetMap tiles render properly
        setTimeout(() => {
          if (isMounted && mapInstanceRef.current) {
            mapInstanceRef.current.invalidateSize();
          }
        }, 250);
      } catch (e) {
        console.error('Leaflet init error:', e);
      }
    };

    // Ensure Leaflet CSS CDN is injected
    if (!document.getElementById('leaflet-css-cdn')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css-cdn';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    // Ensure Leaflet JS CDN is loaded
    if (!document.getElementById('leaflet-js-cdn')) {
      const script = document.createElement('script');
      script.id = 'leaflet-js-cdn';
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload = () => initLeafletMap();
      document.head.appendChild(script);
    } else if (window.L) {
      initLeafletMap();
    } else {
      const existingScript = document.getElementById('leaflet-js-cdn');
      if (existingScript) {
        existingScript.addEventListener('load', initLeafletMap);
      }
    }

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove();
        } catch (e) {}
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update map coordinates dynamically if lat/lng change
  useEffect(() => {
    if (mapInstanceRef.current && markerInstanceRef.current) {
      const numLat = Number(lat);
      const numLng = Number(lng);
      if (!isNaN(numLat) && numLat !== 0 && !isNaN(numLng) && numLng !== 0) {
        mapInstanceRef.current.setView([numLat, numLng], 14);
        markerInstanceRef.current.setLatLng([numLat, numLng]);
        setTimeout(() => {
          if (mapInstanceRef.current) {
            mapInstanceRef.current.invalidateSize();
          }
        }, 150);
      }
    }
  }, [lat, lng]);

  return (
    <div
      className="bg-[var(--admin-surface)] rounded-[4px] shadow-sm border border-[var(--admin-border)] overflow-hidden font-sans"
      style={{
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      {/* Header */}
      <div className="px-4 sm:px-5 py-3 sm:py-3.5 border-b border-[var(--admin-border-subtle)] bg-[var(--admin-bg-subtle)] flex items-center justify-between gap-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <span className="material-symbols-outlined text-[19px] text-[var(--admin-accent)] shrink-0">
            location_on
          </span>
          <h3 className="text-[13.5px] sm:text-[14px] font-bold text-[var(--admin-text-primary)] tracking-tight truncate whitespace-nowrap">
            Event Venue & Destination
          </h3>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <span
            className={`text-[10px] px-2 sm:px-2.5 py-0.5 rounded-[4px] font-bold uppercase tracking-wider border shadow-2xs whitespace-nowrap ${
              isOutdoor
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300'
                : 'bg-stone-100 text-stone-700 border-stone-200 dark:bg-stone-800 dark:text-stone-300'
            }`}
          >
            {isOutdoor ? 'Outdoor Setup' : 'Indoor Setup'}
          </span>

          <a
            href={mapsQuery}
            target="_blank"
            rel="noopener noreferrer"
            className="h-7 px-2.5 rounded-[4px] bg-amber-500/10 hover:bg-amber-500/20 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700/60 text-[11px] font-bold flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer whitespace-nowrap"
            title="View Location & Hall Photos on Google Maps"
          >
            <span className="material-symbols-outlined text-[14px] text-amber-700 dark:text-amber-400">
              map
            </span>
            <span className="hidden sm:inline">View Location & Hall Photos</span>
            <span className="sm:hidden">Maps & Photos</span>
            <span className="material-symbols-outlined text-[11px]">open_in_new</span>
          </a>
        </div>
      </div>

      {/* Main 2-Column Responsive Body */}
      <div className="p-4 sm:p-5 lg:p-6 grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6 items-stretch">
        {/* Left Column: Venue Details (Read-only) (7 cols on lg) */}
        <div className="lg:col-span-7 flex flex-col justify-between space-y-4">
          <div className="space-y-3.5">
            {/* Venue / Hall Name */}
            <div>
              <span className="text-[10px] font-bold text-[var(--admin-text-tertiary)] uppercase tracking-wider block mb-1">
                Venue Destination / Hall
              </span>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px] text-[var(--admin-accent)] shrink-0">
                  apartment
                </span>
                <h4 className="text-[15px] sm:text-[16px] font-bold text-[var(--admin-text-primary)] leading-tight">
                  {displayName}
                </h4>
              </div>
            </div>

            {/* Street Address & Landmark Card */}
            <div>
              <span className="text-[10px] font-bold text-[var(--admin-text-tertiary)] uppercase tracking-wider block mb-1">
                Street Address & Delivery Destination
              </span>
              <div className="p-3 bg-[var(--admin-surface-muted)] rounded-[4px] border border-[var(--admin-border-subtle)] shadow-2xs">
                <div className="flex items-start justify-between gap-2.5">
                  <div className="flex items-start gap-2 text-[12.5px] text-[var(--admin-text-primary)] leading-relaxed flex-1">
                    <span className="material-symbols-outlined text-[16px] text-stone-400 shrink-0 mt-0.5">
                      pin_drop
                    </span>
                    <p className="select-all font-medium">{displayAddress}</p>
                  </div>
                  {displayAddress && displayAddress !== 'Full address not provided' && (
                    <button
                      type="button"
                      onClick={() => copyText(displayAddress, 'Venue Address')}
                      className="text-[11px] font-semibold text-[var(--admin-text-tertiary)] hover:text-[var(--admin-text-primary)] cursor-pointer shrink-0 pt-0.5"
                      title="Copy Address"
                    >
                      Copy
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* City, State, Pincode Metric Grid */}
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="p-2.5 bg-[var(--admin-surface-muted)]/60 rounded-[4px] border border-[var(--admin-border-subtle)]">
                <span className="text-[10px] text-[var(--admin-text-tertiary)] uppercase font-semibold block">
                  City
                </span>
                <span className="text-[12.5px] font-bold text-[var(--admin-text-primary)] block mt-0.5 truncate">
                  {displayCity || '—'}
                </span>
              </div>

              <div className="p-2.5 bg-[var(--admin-surface-muted)]/60 rounded-[4px] border border-[var(--admin-border-subtle)]">
                <span className="text-[10px] text-[var(--admin-text-tertiary)] uppercase font-semibold block">
                  State
                </span>
                <span className="text-[12.5px] font-bold text-[var(--admin-text-primary)] block mt-0.5 truncate">
                  {displayState || '—'}
                </span>
              </div>

              <div className="p-2.5 bg-[var(--admin-surface-muted)]/60 rounded-[4px] border border-[var(--admin-border-subtle)]">
                <span className="text-[10px] text-[var(--admin-text-tertiary)] uppercase font-semibold block">
                  Pincode
                </span>
                <span className="text-[12.5px] font-mono font-bold text-[var(--admin-text-primary)] block mt-0.5 truncate">
                  {displayPincode || '—'}
                </span>
              </div>
            </div>

            {/* Coordinates & Environment Spec Strip */}
            <div className="pt-3 border-t border-[var(--admin-border-subtle)] flex flex-wrap items-center justify-between gap-2.5 text-xs">
              {lat && lng ? (
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1 font-mono text-[11.5px] text-[var(--admin-text-secondary)] bg-[var(--admin-surface-muted)] px-2 py-1 rounded-[4px] border border-[var(--admin-border-subtle)]">
                    <span className="material-symbols-outlined text-[13px] text-[var(--admin-accent)]">
                      near_me
                    </span>
                    {Number(lat).toFixed(6)}, {Number(lng).toFixed(6)}
                  </span>
                  <button
                    type="button"
                    onClick={() => copyText(`${lat}, ${lng}`, 'GPS Coordinates')}
                    className="text-[11px] text-[var(--admin-text-tertiary)] hover:text-[var(--admin-text-primary)] cursor-pointer"
                  >
                    Copy
                  </button>
                </div>
              ) : (
                <span className="text-[11.5px] text-[var(--admin-text-tertiary)] italic">
                  GPS coordinates not recorded
                </span>
              )}

              <span className="text-[11.5px] text-[var(--admin-text-secondary)] flex items-center gap-1 font-medium">
                <span className="material-symbols-outlined text-[15px] text-[var(--admin-accent)]">
                  {isOutdoor ? 'deck' : 'meeting_room'}
                </span>
                {isOutdoor
                  ? 'Outdoor Setting (Garden / Stage / Lawn)'
                  : 'Indoor Setting (Hall / Convention Center)'}
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: Interactive Destination Map (5 cols on lg) */}
        <div className="lg:col-span-5 flex flex-col space-y-1.5">
          <div className="flex items-center justify-between text-[11px] text-[var(--admin-text-secondary)]">
            <span className="font-bold uppercase tracking-wider flex items-center gap-1.5 text-[10.5px]">
              <span className="material-symbols-outlined text-[15px] text-[var(--admin-accent)]">
                my_location
              </span>
              Geolocated Destination
            </span>
            <span className="text-[10.5px] text-[var(--admin-text-tertiary)] font-medium">
              Interactive Map
            </span>
          </div>

          <div
            ref={mapContainerRef}
            className="w-full h-56 lg:h-full min-h-[220px] rounded-[4px] border border-[var(--admin-border)] bg-[var(--admin-surface-muted)] overflow-hidden shadow-inner relative z-0"
          />
        </div>
      </div>

      {/* Client Uploaded Reference & Inspiration Photos */}
      {booking?.inspirationImages && booking.inspirationImages.length > 0 && (
        <div className="px-4 sm:px-5 py-3.5 border-t border-[var(--admin-border-subtle)] bg-[var(--admin-surface-muted)]/20">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--admin-text-secondary)] flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[15px] text-[var(--admin-accent)]">
                collections
              </span>
              Client Uploaded Venue & Setup Photos ({booking.inspirationImages.length})
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2.5">
            {booking.inspirationImages.map((img, idx) => (
              <a
                key={idx}
                href={img}
                target="_blank"
                rel="noopener noreferrer"
                className="aspect-video rounded-[4px] border border-[var(--admin-border-subtle)] overflow-hidden bg-stone-100 dark:bg-stone-800 relative group cursor-pointer shadow-2xs"
                title="Click to view full image"
              >
                <img
                  src={img}
                  alt={`Venue Reference ${idx + 1}`}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs">
                  <span className="material-symbols-outlined text-[18px]">zoom_in</span>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Venue Visual Inspection & Google Reviews Bar */}
      <div className="px-4 sm:px-5 py-3 border-t border-[var(--admin-border-subtle)] bg-[var(--admin-surface-muted)]/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-[4px] bg-amber-500/10 border border-amber-300 dark:border-amber-700/50 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
            <span className="material-symbols-outlined text-[18px]">storefront</span>
          </div>
          <div>
            <h5 className="text-[12px] sm:text-[12.5px] font-bold text-[var(--admin-text-primary)] leading-tight">
              Venue Location & Hall Photos Inspection
            </h5>
            <p className="text-[10px] text-[var(--admin-text-tertiary)] mt-0.5 leading-normal">
              Open Google Maps to view crowd-sourced stage photos, hall interior, and customer
              reviews.
            </p>
          </div>
        </div>

        <a
          href={mapsQuery}
          target="_blank"
          rel="noopener noreferrer"
          className="h-8 px-3.5 rounded-[4px] bg-[var(--admin-accent)] hover:bg-[var(--admin-accent-hover)] text-white text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors shadow-xs cursor-pointer w-full sm:w-auto shrink-0 whitespace-nowrap"
          title="Open Google Maps to view venue location and all hall photos"
        >
          <span className="material-symbols-outlined text-[15px]">map</span>
          <span>View Location & Hall Photos</span>
          <span className="material-symbols-outlined text-[13px]">open_in_new</span>
        </a>
      </div>
    </div>
  );
}
export default BookingVenueLocationCard;
