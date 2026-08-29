import { Map, X, Search, MapPin, Store } from 'lucide-react';
import { m as motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';

import logger from '../../utils/core/logger';
import 'leaflet/dist/leaflet.css';

// Helper to check for Google Maps key
const getGoogleMapsApiKey = () => {
  return import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
};

export function LocationSelectorModal({
  isOpen,
  onClose,
  onLocationSelect,
  initialLocation,
  inline = false,
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [isMapLoading, setIsMapLoading] = useState(true);
  const [_isDetectingGPS, setIsDetectingGPS] = useState(false);

  // Auto-sync location in inline mode so the user doesn't have to click "Confirm Venue"
  useEffect(() => {
    if (inline && selectedLocation) {
      onLocationSelect(selectedLocation);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLocation, inline]);

  const mapInstanceRef = useRef(null);
  const markerInstanceRef = useRef(null);
  const resizeObserverRef = useRef(null);
  const mapContainerRef = useRef(null);
  const timeoutRef = useRef(null);
  const cardRef = useRef(null);

  // Auto-scroll to card when location is selected
  useEffect(() => {
    if (selectedLocation && cardRef.current && inline) {
      setTimeout(() => {
        cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
  }, [selectedLocation, inline]);

  // Default coordinate center (Ongole, Andhra Pradesh, India)
  const DEFAULT_LAT = 15.506;
  const DEFAULT_LNG = 80.049;

  // Initialize and load script dynamically
  useEffect(() => {
    if (!isOpen) return;

    const hasGoogleKey = !!getGoogleMapsApiKey();

    if (hasGoogleKey) {
      // Google Maps Engine Loader
      loadGoogleMapsEngine();
    } else {
      // Leaflet / OpenStreetMap Engine Fallback
      loadLeafletEngine();
    }

    return () => {
      // Clean up timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      // Clean up Leaflet map instance on close
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove();
        } catch (e) {
          logger.warn('Leaflet map cleanup error', e);
        }
        mapInstanceRef.current = null;
        markerInstanceRef.current = null;
      }
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
        resizeObserverRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Leaflet.js Dynamic Script Injector (Refactored to use local import)
  const loadLeafletEngine = () => {
    setIsMapLoading(true);

    // Inject Leaflet CSS CDN dynamically to ensure map layout styles apply immediately
    if (!document.getElementById('leaflet-cdn-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-cdn-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    // Delay initialization slightly to let the modal spring slide/fade-in animation complete
    // so Leaflet can accurately calculate the parent container size on mount.
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      initLeafletMap();
    }, 300);
  };

  const initLeafletMap = async () => {
    if (!isOpen) {
      setIsMapLoading(false);
      return;
    }

    // Use React ref for the DOM element
    let container = mapContainerRef.current;
    if (!container) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(initLeafletMap, 50);
      return;
    }

    // Clean up existing instance ref if present
    if (mapInstanceRef.current) {
      try {
        mapInstanceRef.current.remove();
      } catch (e) {
        logger.warn('Leaflet map instance remove warning', e);
      }
      mapInstanceRef.current = null;
      markerInstanceRef.current = null;
    }

    // Bulletproof: if the container is already initialized by Leaflet (has _leaflet_id)
    // we must manually nullify it to avoid the "already initialized" crash on rapid remounts
    if (container._leaflet_id) {
      container._leaflet_id = null;
    }

    // Bulletproof coordinate parsing to prevent Leaflet view crashes from invalid numeric values
    const parseCoord = (val, defaultVal) => {
      if (
        val === undefined ||
        val === null ||
        val === '' ||
        String(val) === 'null' ||
        String(val) === 'NaN'
      ) {
        return defaultVal;
      }
      const num = Number(val);
      return isNaN(num) ? defaultVal : num;
    };

    const lat = parseCoord(initialLocation?.latitude || selectedLocation?.latitude, DEFAULT_LAT);
    const lng = parseCoord(initialLocation?.longitude || selectedLocation?.longitude, DEFAULT_LNG);

    try {
      const L = await import('leaflet');
      // Initialize map instance
      const map = L.map(container, {
        zoomControl: false,
      }).setView([lat, lng], 13);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(map);

      // Add Zoom Control at bottom right
      L.control.zoom({ position: 'bottomright' }).addTo(map);

      // Custom Heritage Gold/Gold pin Icon using SVGs
      const goldIcon = L.divIcon({
        className: 'custom-leaflet-marker',
        html: `<div class="relative w-8 h-8 flex items-center justify-center">
                 <div class="absolute w-8 h-8 bg-primary/30 rounded-full animate-ping"></div>
                 <span class="material-symbols-outlined text-primary text-[32px] drop-shadow-lg z-10 animate-bounce">location_on</span>
               </div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 32],
      });

      // Place Marker
      const marker = L.marker([lat, lng], { icon: goldIcon, draggable: true }).addTo(map);
      markerInstanceRef.current = marker;
      mapInstanceRef.current = map;

      // Set up ResizeObserver to handle container size shifts (modal animation, etc.) dynamically
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
      }
      const ro = new ResizeObserver(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
        }
      });
      ro.observe(container);
      resizeObserverRef.current = ro;

      // Force immediate recalculation of container size
      map.invalidateSize();

      // Force recalculation of container size after the modal animation completes as a safety net
      setTimeout(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
        }
      }, 100);
      setTimeout(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
        }
      }, 300);
      setTimeout(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
        }
      }, 600);

      // Handle map clicks to relocate pin
      map.on('click', (e) => {
        const { lat: clickLat, lng: clickLng } = e.latlng;
        marker.setLatLng([clickLat, clickLng]);
        reverseGeocodeLeaflet(clickLat, clickLng);
      });

      // Handle drag ends to relocate pin
      marker.on('dragend', () => {
        const position = marker.getLatLng();
        reverseGeocodeLeaflet(position.lat, position.lng);
      });

      // If initial location has values, use them, otherwise keep clean empty state without prefilling default coords text
      if (initialLocation?.latitude && initialLocation?.longitude) {
        setSelectedLocation(initialLocation);
        setSearchQuery(initialLocation.name || initialLocation.address || '');
      } else {
        setSelectedLocation(null);
        setSearchQuery('');
      }

      setIsMapLoading(false);
    } catch (err) {
      logger.error('Leaflet initialization failed', err);
      toast.error('Failed to load map interface.');
      setIsMapLoading(false);
    }
  };

  // Reverse Geocoding with OSM Nominatim API
  const reverseGeocodeLeaflet = async (lat, lng) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`,
      );
      if (!response.ok) throw new Error('Network issue geocoding coordinates');
      const data = await response.json();

      const addr = data.address || {};
      const street = addr.road || addr.suburb || addr.neighbourhood || '';
      const city = addr.city || addr.town || addr.village || addr.county || '';
      const state = addr.state || '';
      const country = addr.country || '';
      const pincode = addr.postcode || '';
      const venueName = data.name || addr.amenity || addr.building || addr.shop || '';

      // Derive formatted address
      const formattedAddress =
        data.display_name ||
        `${venueName ? venueName + ', ' : ''}${street}, ${city}, ${state}, ${pincode}`;

      const locDetails = {
        name: venueName || street || 'Selected Landmark',
        address: formattedAddress,
        city: city,
        state: state,
        country: country,
        pincode: pincode,
        latitude: Number(lat),
        longitude: Number(lng),
        googleMapsLink: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(formattedAddress)}&query_place_id=${lat},${lng}`,
      };

      setSelectedLocation(locDetails);
      // Auto fill search bar
      setSearchQuery(venueName || street || formattedAddress);
    } catch (err) {
      logger.error('Reverse geocoding error', err);
    }
  };

  // Google Maps Engine (Safe Fallback Placeholder - will fallback automatically to OSM)
  const loadGoogleMapsEngine = () => {
    // If user has a valid key but we want OSM leaflet for standard testing,
    // we fallback cleanly here. Let's make sure it just uses OSM.
    loadLeafletEngine();
  };

  const searchTimeoutRef = useRef(null);

  // Address Search Autocomplete (OSM Nominatim)
  const handleSearchChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);

    if (query.trim().length < 1) {
      setSuggestions([]);
      return;
    }

    setIsLoadingSuggestions(true);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&addressdetails=1&countrycodes=in&limit=5`,
        );
        if (response.ok) {
          const data = await response.json();
          setSuggestions(
            data.map((item) => ({
              displayName: item.display_name,
              lat: Number(item.lat),
              lon: Number(item.lon),
              raw: item,
            })),
          );
        }
      } catch (err) {
        logger.error('Autocomplete fetching error', err);
      } finally {
        setIsLoadingSuggestions(false);
      }
    }, 600); // 600ms debounce
  };

  // Select search suggestion
  const handleSelectSuggestion = (item) => {
    setSearchQuery(item.displayName);
    setSuggestions([]);

    const lat = item.lat;
    const lng = item.lon;

    if (mapInstanceRef.current && markerInstanceRef.current) {
      mapInstanceRef.current.setView([lat, lng], 16);
      markerInstanceRef.current.setLatLng([lat, lng]);
    }

    const addr = item.raw.address || {};
    const street = addr.road || addr.suburb || addr.neighbourhood || '';
    const city = addr.city || addr.town || addr.village || addr.county || '';
    const state = addr.state || '';
    const country = addr.country || '';
    const pincode = addr.postcode || '';
    const venueName = item.raw.name || addr.amenity || addr.building || addr.shop || '';

    const locDetails = {
      name: venueName || street || 'Selected Location',
      address: item.displayName,
      city: city,
      state: state,
      country: country,
      pincode: pincode,
      latitude: lat,
      longitude: lng,
      googleMapsLink: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.displayName)}`,
    };

    setSelectedLocation(locDetails);
    toast.success(`Centered map on: ${locDetails.name}`);
  };

  // Fetch Device Current Location
  const _handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('GPS tracking is not supported by your browser.');
      return;
    }

    setIsDetectingGPS(true);
    const gpsId = toast.loading('Acquiring GPS coordinates...');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        toast.dismiss(gpsId);
        setIsDetectingGPS(false);
        toast.success('Current location geocoded successfully!');

        if (mapInstanceRef.current && markerInstanceRef.current) {
          mapInstanceRef.current.setView([lat, lng], 16);
          markerInstanceRef.current.setLatLng([lat, lng]);
        }
        reverseGeocodeLeaflet(lat, lng);
      },
      (error) => {
        toast.dismiss(gpsId);
        setIsDetectingGPS(false);
        logger.error('GPS permission error', error);

        switch (error.code) {
          case error.PERMISSION_DENIED:
            toast.error('GPS Access Denied! Please enable browser location permissions.');
            break;
          case error.POSITION_UNAVAILABLE:
            toast.error('Location details unavailable. Please drop a manual map pin.');
            break;
          case error.TIMEOUT:
            toast.error('Location tracking request timed out.');
            break;
          default:
            toast.error('Failed to acquire device coordinates.');
        }
      },
      { enableHighAccuracy: true, timeout: 8000 },
    );
  };

  const handleConfirmLocation = () => {
    if (!selectedLocation) {
      toast.error('Please drop a map pin or search for a location first.');
      return;
    }
    onLocationSelect(selectedLocation);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className={
            inline
              ? 'relative w-full flex-1 flex flex-col'
              : 'fixed inset-0 z-[999] flex items-center justify-center p-4'
          }
        >
          {/* Blur Overlay */}
          {!inline && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
            />
          )}

          {/* Modal Container */}
          <motion.div
            initial={inline ? false : { opacity: 0, scale: 0.9, y: 30 }}
            animate={inline ? false : { opacity: 1, scale: 1, y: 0 }}
            exit={inline ? false : { opacity: 0, scale: 0.9, y: 30 }}
            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            className={`relative bg-[#FCFAF6] border border-[#826237]/30 w-full font-body flex flex-col z-10 ${
              inline
                ? 'rounded-2xl'
                : 'max-w-2xl rounded-[2.5rem] shadow-2xl max-h-[90vh] overflow-hidden'
            }`}
          >
            {/* Elegant Header Banner */}
            {!inline && (
              <div className="bg-[#FAF6F0] px-6 py-5 border-b border-black/5 flex items-center justify-between relative">
                <div className="flex items-center gap-2">
                  <Map className="text-primary text-[24px]" strokeWidth={1.5} />
                  <div>
                    <h3 className="font-display text-lg text-black font-semibold">
                      Select Celebration Venue
                    </h3>
                    <p className="text-[10px] text-black/50 uppercase tracking-widest font-bold font-label">
                      Search or drop a pin on the map
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="w-9 h-9 min-h-0 rounded-full bg-white hover:bg-red-50 text-stone-500 hover:text-red-500 border border-black/5 flex items-center justify-center transition-all active:scale-95 cursor-pointer"
                >
                  <X className="text-[18px]" strokeWidth={1.5} />
                </button>
              </div>
            )}

            {/* Modal Body */}
            <div
              className={`p-6 space-y-4 flex flex-col ${inline ? '' : 'overflow-y-auto flex-1 min-h-[400px]'}`}
            >
              {/* Autocomplete Search Bar */}
              <div className="relative z-30 w-full">
                <Search
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-black/40 text-[18px]"
                  strokeWidth={1.5}
                />
                <input
                  type="text"
                  placeholder="Search traditional venues, halls, temples..."
                  value={searchQuery}
                  onChange={handleSearchChange}
                  className="w-full pl-11 pr-10 py-3 rounded-full border border-black/10 bg-white text-xs outline-none focus:border-primary font-medium shadow-sm transition-all"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setSuggestions([]);
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 min-h-0 rounded-full hover:bg-stone-100 flex items-center justify-center text-stone-400 hover:text-stone-700"
                  >
                    <X className="text-[14px]" strokeWidth={1.5} />
                  </button>
                )}

                {/* Autocomplete Suggestions Box */}
                <AnimatePresence>
                  {(suggestions.length > 0 || isLoadingSuggestions) && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute left-0 right-0 top-full mt-2 bg-white/95 backdrop-blur-md border border-[#826237]/20 rounded-2xl shadow-xl overflow-hidden max-h-56 overflow-y-auto z-[999] divide-y divide-black/5"
                    >
                      {isLoadingSuggestions && (
                        <div className="p-4 text-center text-xs text-black/40 flex items-center justify-center gap-2">
                          <div className="skeleton-box inline-block w-4 h-4 rounded-md" />
                          <span>Searching landmarks...</span>
                        </div>
                      )}
                      {suggestions.map((item, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleSelectSuggestion(item)}
                          className="w-full text-left px-5 py-3 hover:bg-stone-50 text-xs text-stone-700 leading-relaxed font-medium transition-colors flex items-start gap-2.5"
                        >
                          <MapPin
                            className="text-primary text-[16px] shrink-0 mt-0.5"
                            strokeWidth={1.5}
                          />
                          <span>{item.displayName}</span>
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Live Interactive Map Canvas */}
              <div className="relative flex-1 rounded-[2rem] overflow-hidden border border-[#826237]/20 bg-stone-100 shadow-inner h-[280px] min-h-[250px]">
                {isMapLoading && (
                  <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-20 flex flex-col items-center justify-center gap-3">
                    <div className="skeleton-box inline-block w-10 h-10 rounded-md" />
                    <span className="font-label text-[10px] uppercase tracking-widest text-primary font-bold">
                      Rendering Live Canvas...
                    </span>
                  </div>
                )}

                {/* Fallback Leaflet Element */}
                <div ref={mapContainerRef} className="absolute inset-0 w-full h-full z-10" />
              </div>

              {/* Location Card Metadata Visualizer */}
              {selectedLocation && (
                <motion.div
                  ref={cardRef}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-[#FAF6F0] p-4.5 rounded-[1.5rem] border border-[#826237]/20 flex flex-col sm:flex-row gap-3 items-start justify-between relative overflow-hidden"
                >
                  <div className="space-y-1 z-10 flex-1">
                    <span className="font-label text-[8px] uppercase tracking-widest text-[var(--color-gold-dark)] font-bold block mb-1">
                      Selected Destination Blueprint
                    </span>
                    <h4 className="text-sm font-semibold text-black leading-tight flex items-center gap-1.5">
                      <Store className="text-primary text-[18px]" strokeWidth={1.5} />
                      {selectedLocation.name}
                    </h4>
                    <p className="text-xs text-stone-600 font-light leading-relaxed max-w-md">
                      {selectedLocation.address}
                    </p>
                    <div className="flex flex-wrap gap-x-3 gap-y-1.5 pt-1.5 text-[10px] text-stone-500 font-semibold font-mono">
                      {selectedLocation.city && <span>City: {selectedLocation.city}</span>}
                      {selectedLocation.pincode && <span>Pincode: {selectedLocation.pincode}</span>}
                      <span>
                        GPS: {selectedLocation.latitude?.toFixed(5)},{' '}
                        {selectedLocation.longitude?.toFixed(5)}
                      </span>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Modal Footer Controls */}
            {!inline && (
              <div className="bg-[#FAF6F0] px-6 py-5 border-t border-black/5 flex flex-col sm:flex-row gap-3 items-center justify-between">
                <span className="text-[10px] text-stone-500 font-light leading-relaxed max-w-xs text-center sm:text-left">
                  Ensure coordinates map accurately. You can drag the gold heritage map marker pin
                  to tweak setup logistics!
                </span>
                <div className="flex gap-2 w-full sm:w-auto shrink-0 justify-end">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-5 py-3 rounded-full border border-black/10 bg-white hover:bg-stone-50 text-xs font-bold text-stone-600 transition-all active:scale-95 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmLocation}
                    disabled={!selectedLocation}
                    className="px-6 py-3 rounded-full bg-black text-white hover:bg-primary hover:text-black font-semibold text-xs transition-all active:scale-95 disabled:opacity-50 cursor-pointer shadow-lg"
                  >
                    Confirm Venue
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
