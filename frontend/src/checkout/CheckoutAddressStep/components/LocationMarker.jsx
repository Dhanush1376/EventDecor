import { useEffect, useRef } from 'react';

export function LocationMarker({ position, setPosition, fetchAddressFromCoords }) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const callbacksRef = useRef({ setPosition, fetchAddressFromCoords });

  useEffect(() => {
    callbacksRef.current = { setPosition, fetchAddressFromCoords };
  }, [setPosition, fetchAddressFromCoords]);

  useEffect(() => {
    let isCancelled = false;

    const initMap = () => {
      if (!window.L || mapRef.current || !mapContainerRef.current || isCancelled) return;

      const L = window.L;
      const DefaultIcon = L.icon({
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
      });
      L.Marker.prototype.options.icon = DefaultIcon;

      const safeLat = typeof position?.lat === 'number' ? position.lat : 20.5937;
      const safeLng = typeof position?.lng === 'number' ? position.lng : 78.9629;
      const zoom = position?.lat && position?.lng ? 15 : 5;

      const map = L.map(mapContainerRef.current).setView([safeLat, safeLng], zoom);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map);

      const marker = L.marker([safeLat, safeLng], { draggable: true }).addTo(map);

      marker.on('dragend', (e) => {
        const pos = e.target.getLatLng();
        callbacksRef.current.setPosition({ lat: pos.lat, lng: pos.lng });
        callbacksRef.current.fetchAddressFromCoords(pos.lat, pos.lng);
      });

      map.on('click', (e) => {
        marker.setLatLng(e.latlng);
        callbacksRef.current.setPosition({ lat: e.latlng.lat, lng: e.latlng.lng });
        callbacksRef.current.fetchAddressFromCoords(e.latlng.lat, e.latlng.lng);
      });

      mapRef.current = map;
      markerRef.current = marker;

      // Invalidate size once container transition is completed
      setTimeout(() => {
        if (mapRef.current) {
          mapRef.current.invalidateSize();
        }
      }, 300);
    };

    if (!document.getElementById('leaflet-css-cdn')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css-cdn';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    if (!document.getElementById('leaflet-js-cdn')) {
      const script = document.createElement('script');
      script.id = 'leaflet-js-cdn';
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload = () => {
        if (!isCancelled) initMap();
      };
      document.head.appendChild(script);
    } else if (window.L) {
      initMap();
    }

    return () => {
      isCancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (
      mapRef.current &&
      markerRef.current &&
      typeof position?.lat === 'number' &&
      typeof position?.lng === 'number'
    ) {
      mapRef.current.setView([position.lat, position.lng], 15);
      markerRef.current.setLatLng([position.lat, position.lng]);
      setTimeout(() => {
        if (mapRef.current) mapRef.current.invalidateSize();
      }, 200);
    }
  }, [position?.lat, position?.lng]);

  return (
    <div
      ref={mapContainerRef}
      className="w-full h-full relative z-0 select-none"
      style={{ minHeight: '180px' }}
    />
  );
}
