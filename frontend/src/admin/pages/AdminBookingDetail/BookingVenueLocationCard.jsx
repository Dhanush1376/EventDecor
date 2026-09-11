import React, { useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

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
  const resizeObserverRef = useRef(null);

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
    if (!mapContainerRef.current) return;

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
      const map = L.map(mapContainerRef.current, {
        zoomControl: false,
        attributionControl: false,
        scrollWheelZoom: false,
      }).setView([validLat, validLng], 14);

      // CartoDB Voyager tiles (crisp, beautiful, reliable, fast)
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
        subdomains: 'abcd',
        maxZoom: 20,
      }).addTo(map);

      L.control.zoom({ position: 'bottomright' }).addTo(map);

      const goldIcon = L.divIcon({
        className: 'custom-leaflet-marker',
        html: `<div style="position:relative;width:34px;height:34px;display:flex;align-items:center;justify-content:center;">
                 <div style="position:absolute;width:34px;height:34px;background:rgba(180,83,9,0.3);border-radius:50%;"></div>
                 <span class="material-symbols-outlined" style="color:#b45309;font-size:30px;filter:drop-shadow(0 2px 5px rgba(0,0,0,0.3));z-index:10;">location_on</span>
               </div>`,
        iconSize: [34, 34],
        iconAnchor: [17, 34],
      });

      const marker = L.marker([validLat, validLng], {
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

      // Invalidate size to guarantee tiles render properly
      map.invalidateSize();
      setTimeout(() => {
        if (isMounted && mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
        }
      }, 100);
      setTimeout(() => {
        if (isMounted && mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
        }
      }, 300);

      if (window.ResizeObserver && mapContainerRef.current) {
        const ro = new ResizeObserver(() => {
          if (mapInstanceRef.current) {
            mapInstanceRef.current.invalidateSize();
          }
        });
        ro.observe(mapContainerRef.current);
        resizeObserverRef.current = ro;
      }
    } catch (e) {
      console.error('Leaflet init error:', e);
    }

    return () => {
      isMounted = false;
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
        resizeObserverRef.current = null;
      }
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
            Venue & Location
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
            {isOutdoor ? 'Outdoor' : 'Indoor'}
          </span>

          <a
            href={mapsQuery}
            target="_blank"
            rel="noopener noreferrer"
            className="h-7 px-2.5 rounded-[4px] bg-amber-500/10 hover:bg-amber-500/20 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700/60 text-[11px] font-bold flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer whitespace-nowrap"
            title="Open venue in Google Maps"
          >
            <span className="material-symbols-outlined text-[14px] text-amber-700 dark:text-amber-400">
              map
            </span>
            <span className="hidden sm:inline">Open in Maps</span>
            <span className="sm:hidden">Maps</span>
            <span className="material-symbols-outlined text-[11px]">open_in_new</span>
          </a>
        </div>
      </div>

      {/* Main 2-Column Responsive Body */}
      <div className="p-4 sm:p-5 lg:p-6 grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6 items-stretch">
        {/* Left Column: Venue Details (Read-only) (7 cols on lg) */}
        <div className="lg:col-span-7 flex flex-col justify-between space-y-3.5">
          <div className="space-y-3">
            {/* Venue / Hall Name */}
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px] text-[var(--admin-accent)] shrink-0">
                apartment
              </span>
              <h4 className="text-[15px] sm:text-[16px] font-bold text-[var(--admin-text-primary)] leading-tight">
                {displayName}
              </h4>
            </div>

            {/* Street Address Card */}
            <div className="p-3 bg-[var(--admin-surface-muted)] rounded-[4px] border border-[var(--admin-border-subtle)]">
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
                    className="text-[10.5px] font-semibold text-[var(--admin-text-tertiary)] hover:text-[var(--admin-accent)] cursor-pointer shrink-0 pt-0.5 flex items-center gap-1"
                    title="Copy Address"
                  >
                    <span className="material-symbols-outlined text-[13px]">content_copy</span>
                    <span>Copy</span>
                  </button>
                )}
              </div>
            </div>

            {/* Chips & Badges Strip: City, State, Pincode, Coordinates, Setup */}
            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
              {displayCity && (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-[4px] bg-[var(--admin-surface-muted)] text-[var(--admin-text-secondary)] border border-[var(--admin-border-subtle)]">
                  <span className="material-symbols-outlined text-[13px] text-stone-400">
                    location_city
                  </span>
                  {displayCity}
                </span>
              )}
              {displayState && (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-[4px] bg-[var(--admin-surface-muted)] text-[var(--admin-text-secondary)] border border-[var(--admin-border-subtle)]">
                  <span className="material-symbols-outlined text-[13px] text-stone-400">flag</span>
                  {displayState}
                </span>
              )}
              {displayPincode && (
                <span className="inline-flex items-center gap-1 text-[11px] font-mono font-medium px-2 py-0.5 rounded-[4px] bg-[var(--admin-surface-muted)] text-[var(--admin-text-secondary)] border border-[var(--admin-border-subtle)]">
                  <span className="material-symbols-outlined text-[13px] text-stone-400">tag</span>
                  {displayPincode}
                </span>
              )}
              {lat && lng && (
                <button
                  type="button"
                  onClick={() => copyText(`${lat}, ${lng}`, 'GPS Coordinates')}
                  className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-[4px] bg-[var(--admin-surface-muted)] hover:bg-[var(--admin-surface)] text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)] border border-[var(--admin-border-subtle)] transition-colors cursor-pointer"
                  title="Click to copy GPS coordinates"
                >
                  <span className="material-symbols-outlined text-[13px] text-[var(--admin-accent)]">
                    near_me
                  </span>
                  <span>
                    {Number(lat).toFixed(4)}, {Number(lng).toFixed(4)}
                  </span>
                  <span className="material-symbols-outlined text-[11px] text-stone-400">
                    content_copy
                  </span>
                </button>
              )}
              <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-[4px] bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700">
                <span className="material-symbols-outlined text-[13px] text-stone-500">
                  {isOutdoor ? 'deck' : 'meeting_room'}
                </span>
                <span>{isOutdoor ? 'Outdoor' : 'Indoor'}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: Interactive Destination Map (5 cols on lg) */}
        <div className="lg:col-span-5 flex flex-col space-y-1.5">
          <div className="flex items-center justify-between text-[11px] text-[var(--admin-text-secondary)]">
            <span className="font-bold uppercase tracking-wider flex items-center gap-1 text-[10px] text-[var(--admin-text-tertiary)]">
              <span className="material-symbols-outlined text-[14px] text-[var(--admin-accent)]">
                map
              </span>
              Map View
            </span>
          </div>

          <div
            ref={mapContainerRef}
            className="w-full h-52 lg:h-full min-h-[190px] rounded-[4px] border border-[var(--admin-border)] bg-[var(--admin-surface-muted)] overflow-hidden shadow-inner relative z-0"
          />
        </div>
      </div>

      {/* Client Uploaded Reference & Inspiration Photos */}
      {booking?.inspirationImages && booking.inspirationImages.length > 0 && (
        <div className="px-4 sm:px-5 py-3 border-t border-[var(--admin-border-subtle)] bg-[var(--admin-surface-muted)]/20">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[15px] text-[var(--admin-accent)]">
                collections
              </span>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--admin-text-secondary)]">
                Venue Photos
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-[var(--admin-surface-muted)] text-[var(--admin-text-tertiary)] border border-[var(--admin-border-subtle)]">
                {booking.inspirationImages.length}
              </span>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
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
    </div>
  );
}
export default BookingVenueLocationCard;
