import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Crisp, self-contained SVG marker icon that never breaks or fails on external CDN assets
const createCustomMarkerIcon = () =>
  L.divIcon({
    className: 'custom-location-marker-pin',
    html: `
      <div style="display:flex;flex-direction:column;align-items:center;cursor:grab;filter:drop-shadow(0 3px 6px rgba(0,0,0,0.35));transform:translate(-50%,-100%);">
        <div style="position:relative;width:34px;height:42px;display:flex;align-items:center;justify-content:center;">
          <svg width="34" height="42" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2C7.58 2 4 5.58 4 10C4 15.25 12 22 12 22C12 22 20 15.25 20 10C20 5.58 16.42 2 12 2Z" fill="#b45309" stroke="#ffffff" stroke-width="1.5" stroke-linejoin="round"/>
            <circle cx="12" cy="10" r="3.5" fill="#ffffff"/>
          </svg>
        </div>
        <div style="width:14px;height:4px;background:rgba(0,0,0,0.25);border-radius:50%;filter:blur(1px);margin-top:-2px;"></div>
      </div>
    `,
    iconSize: [34, 42],
    iconAnchor: [17, 42],
  });

export function LocationMarker({ position, setPosition, fetchAddressFromCoords }) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const callbacksRef = useRef({ setPosition, fetchAddressFromCoords });

  useEffect(() => {
    callbacksRef.current = { setPosition, fetchAddressFromCoords };
  }, [setPosition, fetchAddressFromCoords]);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Clean up any stale leaflet ID on the container
    if (mapContainerRef.current._leaflet_id) {
      delete mapContainerRef.current._leaflet_id;
    }
    if (mapRef.current) {
      try {
        mapRef.current.remove();
      } catch (e) {
        // ignore
      }
      mapRef.current = null;
      markerRef.current = null;
    }

    const hasValidPos =
      typeof position?.lat === 'number' &&
      typeof position?.lng === 'number' &&
      !isNaN(position.lat) &&
      !isNaN(position.lng) &&
      position.lat !== 0;

    const safeLat = hasValidPos ? position.lat : 20.5937;
    const safeLng = hasValidPos ? position.lng : 78.9629;
    const initialZoom = hasValidPos ? 15 : 5;

    let map = null;
    let ro = null;

    try {
      map = L.map(mapContainerRef.current, {
        zoomControl: true,
        scrollWheelZoom: true,
        attributionControl: false,
      }).setView([safeLat, safeLng], initialZoom);

      // OpenStreetMap standard tiles (reliable, global fast CDN, permitted in CSP)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        subdomains: ['a', 'b', 'c'],
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(map);

      const customIcon = createCustomMarkerIcon();
      const marker = L.marker([safeLat, safeLng], {
        icon: customIcon,
        draggable: true,
      }).addTo(map);

      marker.on('dragend', (e) => {
        const pos = e.target.getLatLng();
        callbacksRef.current.setPosition?.({ lat: pos.lat, lng: pos.lng });
        callbacksRef.current.fetchAddressFromCoords?.(pos.lat, pos.lng);
      });

      map.on('click', (e) => {
        marker.setLatLng(e.latlng);
        callbacksRef.current.setPosition?.({ lat: e.latlng.lat, lng: e.latlng.lng });
        callbacksRef.current.fetchAddressFromCoords?.(e.latlng.lat, e.latlng.lng);
      });

      mapRef.current = map;
      markerRef.current = marker;

      // Force invalidation to avoid blank grey tiles inside modal/animation transitions
      map.invalidateSize();
      const t1 = setTimeout(() => map?.invalidateSize(), 80);
      const t2 = setTimeout(() => map?.invalidateSize(), 250);
      const t3 = setTimeout(() => map?.invalidateSize(), 500);

      if (window.ResizeObserver && mapContainerRef.current) {
        ro = new ResizeObserver(() => {
          if (mapRef.current) {
            mapRef.current.invalidateSize();
          }
        });
        ro.observe(mapContainerRef.current);
      }

      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
        if (ro) {
          ro.disconnect();
        }
        if (mapRef.current) {
          try {
            mapRef.current.remove();
          } catch (e) {
            // ignore
          }
          mapRef.current = null;
          markerRef.current = null;
        }
      };
    } catch (err) {
      console.error('Failed to initialize Leaflet map in LocationMarker:', err);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync marker and center when position updates from outside
  useEffect(() => {
    if (
      mapRef.current &&
      markerRef.current &&
      typeof position?.lat === 'number' &&
      typeof position?.lng === 'number' &&
      !isNaN(position.lat) &&
      !isNaN(position.lng) &&
      position.lat !== 0
    ) {
      const currentPos = markerRef.current.getLatLng();
      const diff =
        Math.abs(currentPos.lat - position.lat) + Math.abs(currentPos.lng - position.lng);
      if (diff > 0.00001) {
        mapRef.current.setView(
          [position.lat, position.lng],
          Math.max(mapRef.current.getZoom(), 15),
        );
        markerRef.current.setLatLng([position.lat, position.lng]);
        mapRef.current.invalidateSize();
      }
    }
  }, [position?.lat, position?.lng]);

  return (
    <div
      ref={mapContainerRef}
      className="w-full h-full relative z-0 select-none"
      style={{ minHeight: '176px', width: '100%' }}
    />
  );
}
