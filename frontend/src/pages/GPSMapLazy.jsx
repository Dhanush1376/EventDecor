import { useState, useEffect, useRef } from 'react';
import logger from '../utils/logger';

// Dynamic GPS Map Component using Leaflet (Lazy Loaded on Viewport Intersect)
const GPSMap = ({ address }) => {
  const wrapperRef = useRef(null);
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const leafletRef = useRef(null);

  const [coords, setCoords] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [inView, setInView] = useState(false);
  const [leafletLoaded, setLeafletLoaded] = useState(false);

  // 1. Intersection Observer to trigger loading
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' },
    );
    if (wrapperRef.current) observer.observe(wrapperRef.current);
    return () => observer.disconnect();
  }, []);

  // 2. Dynamic Import of Leaflet when in view
  useEffect(() => {
    if (inView && !leafletLoaded) {
      Promise.all([import('leaflet'), import('leaflet/dist/leaflet.css')])
        .then(([leafletModule]) => {
          const L = leafletModule.default || leafletModule;

          // Fix Leaflet default marker icon resolution in Vite builds
          delete L.Icon.Default.prototype._getIconUrl;
          L.Icon.Default.mergeOptions({
            iconRetinaUrl:
              'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
            iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
            shadowUrl:
              'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
          });

          leafletRef.current = L;
          setLeafletLoaded(true);
        })
        .catch((err) => {
          logger.error('Failed to dynamically load leaflet: ', err);
        });
    }
  }, [inView, leafletLoaded]);

  // 3. Resolve Coordinates (Only need to do this when we start loading or inView, but doing it inView is better)
  useEffect(() => {
    if (!inView) return;

    let isMounted = true;
    setIsLoading(true);

    const resolveCoords = async () => {
      if (!address) {
        if (isMounted) {
          setCoords([31.224, 75.7708]); // Default to Phagwara
          setIsLoading(false);
        }
        return;
      }

      if (address.latitude && address.longitude) {
        const lat = parseFloat(address.latitude);
        const lng = parseFloat(address.longitude);
        if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
          if (isMounted) {
            setCoords([lat, lng]);
            setIsLoading(false);
          }
          return;
        }
      }

      // Try geocoding using Nominatim
      try {
        const queryParts = [];
        if (address.city) queryParts.push(address.city);
        if (address.state) queryParts.push(address.state);
        if (address.pincode) queryParts.push(address.pincode);
        queryParts.push('India');

        const query = encodeURIComponent(queryParts.join(', '));
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=1`,
        );
        if (res.ok) {
          const data = await res.json();
          if (data && data.length > 0) {
            const lat = parseFloat(data[0].lat);
            const lng = parseFloat(data[0].lon);
            if (!isNaN(lat) && !isNaN(lng)) {
              if (isMounted) {
                setCoords([lat, lng]);
                setIsLoading(false);
              }
              return;
            }
          }
        }
      } catch (err) {
        logger.error('Error geocoding address: ', err);
      }

      // Fallbacks
      if (isMounted) {
        const lowerCity = (address.city || '').toLowerCase();
        const lowerState = (address.state || '').toLowerCase();
        if (lowerCity.includes('phagwara') || lowerState.includes('punjab')) {
          setCoords([31.224, 75.7708]);
        } else if (lowerCity.includes('ongole') || lowerState.includes('andhra')) {
          setCoords([15.5057, 80.0499]);
        } else if (lowerCity.includes('delhi')) {
          setCoords([28.6139, 77.209]);
        } else if (lowerCity.includes('mumbai') || lowerState.includes('maharashtra')) {
          setCoords([19.076, 72.8777]);
        } else if (
          lowerCity.includes('bangalore') ||
          lowerCity.includes('bengaluru') ||
          lowerState.includes('karnataka')
        ) {
          setCoords([12.9716, 77.5946]);
        } else {
          setCoords([31.224, 75.7708]); // Default Phagwara
        }
        setIsLoading(false);
      }
    };

    resolveCoords();

    return () => {
      isMounted = false;
    };
  }, [address, inView]);

  // 4. Initialize Map when leaflet and coords are ready
  useEffect(() => {
    if (isLoading || !coords || !leafletLoaded || !mapContainerRef.current) return;

    const L = leafletRef.current;
    if (!L) return;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    try {
      const map = L.map(mapContainerRef.current, {
        center: coords,
        zoom: 13,
        zoomControl: false,
        attributionControl: false,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
      }).addTo(map);

      const goldMarkerIcon = L.divIcon({
        html: `
          <div class="flex flex-col items-center">
            <svg class="w-8 h-8 text-[#8c7335] drop-shadow-md filter drop-shadow-[0_4px_6px_rgba(140,115,53,0.4)]" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
            </svg>
            <div class="w-2.5 h-1 bg-black/20 rounded-full blur-[1px] -mt-0.5" />
          </div>
        `,
        className: 'custom-gold-marker',
        iconSize: [32, 42],
        iconAnchor: [16, 42],
      });

      L.marker(coords, { icon: goldMarkerIcon }).addTo(map);

      mapInstanceRef.current = map;
    } catch (err) {
      logger.error('Leaflet initialization failed: ', err);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [isLoading, coords, leafletLoaded]);

  return (
    <div
      ref={wrapperRef}
      className="w-full h-full z-0 rounded-lg overflow-hidden min-h-[200px] relative"
    >
      {(!inView || isLoading || !leafletLoaded) && (
        <div className="absolute inset-0 bg-slate-50 flex items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <div className="w-6 h-6 border-2 border-[#8c7335] border-t-transparent rounded-full animate-spin" />
            <span className="text-[9px] text-[#8c7335] font-bold uppercase tracking-wider">
              {inView && !leafletLoaded ? 'Loading Map Engine...' : 'Syncing GPS...'}
            </span>
          </div>
        </div>
      )}
      <div ref={mapContainerRef} className="w-full h-full" />
    </div>
  );
};

export default GPSMap;
