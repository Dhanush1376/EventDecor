import { useEffect, useRef } from 'react';

export function LocationMarker({ position, setPosition, fetchAddressFromCoords }) {
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const callbacksRef = useRef({ setPosition, fetchAddressFromCoords });
  const initPosRef = useRef(position);

  useEffect(() => {
    callbacksRef.current = { setPosition, fetchAddressFromCoords };
  }, [setPosition, fetchAddressFromCoords]);

  useEffect(() => {
    const initMap = () => {
      if (!window.L || mapRef.current) return;

      const L = window.L;
      // Default Icon Fix for CDN
      const DefaultIcon = L.icon({
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
      });
      L.Marker.prototype.options.icon = DefaultIcon;

      const initialPos = initPosRef.current;
      const map = L.map('checkout-leaflet-map').setView([initialPos.lat, initialPos.lng], 13);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(map);

      const marker = L.marker([initialPos.lat, initialPos.lng], { draggable: true }).addTo(map);

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
      script.onload = () => initMap();
      document.head.appendChild(script);
    } else if (window.L) {
      initMap();
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (mapRef.current && markerRef.current) {
      mapRef.current.setView([position.lat, position.lng]);
      markerRef.current.setLatLng([position.lat, position.lng]);
    }
  }, [position.lat, position.lng]);

  return <div id="checkout-leaflet-map" style={{ width: '100%', height: '100%', zIndex: 1 }} />;
}
