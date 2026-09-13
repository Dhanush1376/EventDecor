import { useState, useEffect, useRef } from 'react';
import AlertTriangle from 'lucide-react/dist/esm/icons/alert-triangle';
import { m as motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { createPortal } from 'react-dom';
import { useMobileDrawerEngine, DrawerDragHandle } from '../../../components/ui/drawer';
import { sanitizePhoneNumber } from '../../../utils/phoneUtils';
import {
  detectAndResolveAddress,
  searchLocations,
  reverseGeocodeCoords,
} from '../../../utils/locationService';
import { LocationMarker } from './LocationMarker';

export function AddAddressModal({
  isAddingNewAddress,
  setIsAddingNewAddress,
  newAddress,
  setNewAddress,
  addressError,
  isProcessing,
  handleSaveNewAddress,
  PINCODE_MAP,
  mapPosition,
  setMapPosition,
  fetchAddressFromCoords,
  handleAutofillLocation,
  isResolvingLocation,
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const { isMobile, dragProps, sheetTransition } = useMobileDrawerEngine({
    isOpen: isAddingNewAddress,
    onClose: () => setIsAddingNewAddress(false),
  });

  const formContainerRef = useRef(null);
  const searchContainerRef = useRef(null);
  const searchDebounceRef = useRef(null);
  const [isInternalLocating, setIsInternalLocating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [locationSuggestions, setLocationSuggestions] = useState([]);
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);
  const [showMap, setShowMap] = useState(false);

  // Close search suggestions on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setLocationSuggestions([]);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Smoothly scroll focused input into clear visible area when mobile keyboard opens
  const handleFocusCapture = (e) => {
    const target = e.target;
    if (!target) return;
    const tag = target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
      // Allow mobile virtual keyboard animation (~250-300ms) to finish
      setTimeout(() => {
        if (!target || !formContainerRef.current) return;
        const targetRect = target.getBoundingClientRect();
        const containerRect = formContainerRef.current.getBoundingClientRect();

        const isObscured =
          targetRect.bottom > containerRect.bottom - 20 ||
          targetRect.top < containerRect.top + 20 ||
          (window.visualViewport && targetRect.bottom > window.visualViewport.height - 50);

        if (isObscured) {
          target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 300);
    }
  };

  const handleLocationSearchChange = (e) => {
    const q = e.target.value;
    setSearchQuery(q);

    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);

    if (!q || q.trim().length < 2) {
      setLocationSuggestions([]);
      setIsSearchingLocation(false);
      return;
    }

    setIsSearchingLocation(true);
    searchDebounceRef.current = setTimeout(async () => {
      try {
        const results = await searchLocations(q.trim(), {
          latitude: mapPosition?.lat || newAddress?.latitude,
          longitude: mapPosition?.lng || newAddress?.longitude,
        });
        setLocationSuggestions(results || []);
      } catch {
        setLocationSuggestions([]);
      } finally {
        setIsSearchingLocation(false);
      }
    }, 300);
  };

  const handleSelectSuggestion = async (item) => {
    const addr = item.address || {};
    const lat = item.lat;
    const lng = item.lon;

    if (lat && lng && typeof setMapPosition === 'function') {
      setMapPosition({ lat, lng });
      setShowMap(true);
    }

    const street = addr.road || addr.street || '';
    const building = addr.building || (item.name && item.name !== street ? item.name : '');
    const locality = addr.locality || addr.district || addr.suburb || '';
    const city = addr.city || addr.town || addr.village || '';
    const state = addr.state || '';
    const pincode = (addr.pincode || '').replace(/\D/g, '').slice(0, 6);
    const landmark =
      addr.landmark || (building ? `Near ${building}` : item.name ? `Near ${item.name}` : '');
    const fullAddress =
      [building, street, locality].filter(Boolean).join(', ') || item.displayName || '';

    setNewAddress((prev) => ({
      ...prev,
      latitude: lat ?? prev.latitude,
      longitude: lng ?? prev.longitude,
      pincode: pincode || prev.pincode,
      city: city || prev.city,
      state: state || prev.state,
      locality: locality || prev.locality,
      landmark: landmark || prev.landmark,
      address: fullAddress || prev.address,
    }));

    setSearchQuery(item.name || item.displayName || '');
    setLocationSuggestions([]);
    toast.success(`Location selected: ${item.name || 'Auto-filled'}!`, { id: 'search-loc' });

    // Deep-enrich via reverse geocoding if lat & lng are available
    if (lat && lng) {
      try {
        const enriched = await reverseGeocodeCoords(lat, lng);
        if (enriched.success && enriched.data) {
          const d = enriched.data;
          setNewAddress((prev) => ({
            ...prev,
            pincode: d.pincode || prev.pincode,
            city: d.city || prev.city,
            state: d.state || prev.state,
            locality: d.locality || prev.locality,
            landmark: d.landmark || prev.landmark,
            address: d.address || prev.address,
          }));
        }
      } catch {}
    }
  };

  const handleLocationClick = async (e) => {
    e.preventDefault();
    if (typeof handleAutofillLocation === 'function') {
      await handleAutofillLocation();
      setShowMap(true);
      return;
    }

    try {
      setIsInternalLocating(true);
      toast.loading('Acquiring pinpoint GPS location...', { id: 'gps' });
      const res = await detectAndResolveAddress();
      if (res.success && res.data) {
        const d = res.data;
        if (d.latitude && d.longitude && typeof setMapPosition === 'function') {
          setMapPosition({ lat: d.latitude, lng: d.longitude });
          setShowMap(true);
        }
        const resolvedAddressLine =
          d.address || [d.locality, d.landmark, d.city].filter(Boolean).join(', ');
        setNewAddress((prev) => ({
          ...prev,
          latitude: d.latitude ?? prev.latitude,
          longitude: d.longitude ?? prev.longitude,
          pincode: d.pincode || prev.pincode,
          city: d.city || prev.city,
          state: d.state || prev.state,
          locality: d.locality || prev.locality,
          address: res.isPinpoint
            ? resolvedAddressLine || prev.address
            : prev.address || resolvedAddressLine,
          landmark: d.landmark || prev.landmark,
        }));

        if (res.isPinpoint && res.source === 'gps') {
          const accText = res.accuracy ? ` (~${Math.round(res.accuracy)}m)` : '';
          toast.success(`Exact pinpoint GPS locked${accText}!`, { id: 'gps' });
        } else if (res.isApproximate) {
          toast(
            'Approximate region detected from network. Please drag the pin on the map to your exact spot!',
            { id: 'gps', duration: 5000 },
          );
        } else {
          toast.success('Location locked!', { id: 'gps' });
        }
      } else {
        toast.error(res.error || 'Could not detect location. Please fill manually.', {
          id: 'gps',
          duration: 5000,
        });
      }
    } catch {
      toast.error('Location detection failed. Please fill manually.', { id: 'gps' });
    } finally {
      setIsInternalLocating(false);
    }
  };

  const isLocating = isResolvingLocation || isInternalLocating;

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {isAddingNewAddress && (
        <div className="fixed inset-0 z-[100] flex items-end lg:items-center justify-center p-0 lg:p-4 pointer-events-none">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsAddingNewAddress(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm pointer-events-auto cursor-pointer"
          />
          <motion.div
            initial={{ opacity: 0, scale: isMobile ? 1 : 0.95, y: isMobile ? '100%' : 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: isMobile ? 1 : 0.95, y: isMobile ? '100%' : 16 }}
            transition={sheetTransition}
            {...dragProps}
            className="pointer-events-auto relative z-10 bg-surface-bright dark:bg-surface-container-low rounded-t-3xl lg:rounded-2xl w-full max-w-[760px] max-h-[92dvh] lg:max-h-[90vh] shadow-2xl flex flex-col overflow-hidden border border-outline-variant/20 modern-sans-headings font-body"
          >
            {isMobile && (
              <DrawerDragHandle
                onClick={() => setIsAddingNewAddress(false)}
                className="pt-2 pb-0.5"
              />
            )}

            {/* Modal Header */}
            <div className="bg-surface-bright z-10 pt-1.5 pb-2.5 sm:py-3.5 px-4 sm:px-6 flex justify-between items-center border-b border-outline-variant/20 shrink-0">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] sm:text-[20px] text-primary">
                  add_location_alt
                </span>
                <h2
                  className="font-sans text-[12px] sm:text-[13px] font-bold text-on-surface uppercase tracking-wider"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  {newAddress?.id ? 'Edit Address' : 'Add New Address'}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsAddingNewAddress(false)}
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-surface-container-low hover:bg-surface-container flex items-center justify-center border border-outline-variant/30 text-secondary hover:text-on-surface transition-all cursor-pointer"
                aria-label="Close modal"
              >
                <span className="material-symbols-outlined text-[16px] sm:text-[18px]">close</span>
              </button>
            </div>

            {/* Scrollable Form Body */}
            <div
              ref={formContainerRef}
              onFocusCapture={handleFocusCapture}
              className="flex-1 min-h-0 overflow-y-auto overscroll-contain touch-pan-y p-4 sm:p-6 pb-6"
            >
              <form id="address-form" onSubmit={handleSaveNewAddress}>
                <div className="space-y-4">
                  {/* Contact Details */}
                  <div className="pb-5 border-b border-outline-variant/20">
                    <h2
                      className="font-sans text-[11px] font-bold uppercase tracking-wider text-secondary flex items-center gap-1.5 mb-4"
                      style={{ fontFamily: 'var(--font-body)' }}
                    >
                      <span className="material-symbols-outlined text-[14px] text-primary">
                        person
                      </span>
                      Contact Details
                    </h2>
                    <div className="flex flex-col gap-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
                        <div>
                          <label className="form-label">Receiver Full Name*</label>
                          <input
                            type="text"
                            required
                            placeholder="Receiver full name"
                            value={newAddress.name}
                            onChange={(e) =>
                              setNewAddress((prev) => ({ ...prev, name: e.target.value }))
                            }
                            className="form-field"
                          />
                        </div>
                        <div>
                          <label className="form-label">Email Address</label>
                          <input
                            type="email"
                            placeholder="Enter email address"
                            value={newAddress.email}
                            onChange={(e) =>
                              setNewAddress((prev) => ({ ...prev, email: e.target.value }))
                            }
                            className="form-field"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
                        <div>
                          <label className="form-label">Phone Number*</label>
                          <input
                            type="tel"
                            required
                            inputMode="numeric"
                            maxLength={10}
                            placeholder="10-digit mobile number"
                            value={newAddress.phone}
                            onChange={(e) => {
                              const cleaned = sanitizePhoneNumber(e.target.value);
                              setNewAddress((prev) => ({ ...prev, phone: cleaned }));
                            }}
                            onPaste={(e) => {
                              const pasted = e.clipboardData?.getData('text');
                              if (pasted) {
                                e.preventDefault();
                                const cleaned = sanitizePhoneNumber(pasted);
                                setNewAddress((prev) => ({ ...prev, phone: cleaned }));
                              }
                            }}
                            className="form-field"
                          />
                        </div>
                        <div>
                          <label className="form-label">Alternate Number</label>
                          <input
                            type="tel"
                            inputMode="numeric"
                            maxLength={10}
                            placeholder="Optional alternate number"
                            value={newAddress.alternatePhone}
                            onChange={(e) => {
                              const cleaned = sanitizePhoneNumber(e.target.value);
                              setNewAddress((prev) => ({ ...prev, alternatePhone: cleaned }));
                            }}
                            onPaste={(e) => {
                              const pasted = e.clipboardData?.getData('text');
                              if (pasted) {
                                e.preventDefault();
                                const cleaned = sanitizePhoneNumber(pasted);
                                setNewAddress((prev) => ({ ...prev, alternatePhone: cleaned }));
                              }
                            }}
                            className="form-field"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Address Details */}
                  <div className="py-2 border-b border-outline-variant/20">
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <h2
                        className="font-sans text-[11.5px] font-bold uppercase tracking-wider text-secondary flex items-center gap-1.5 m-0"
                        style={{ fontFamily: 'var(--font-body)' }}
                      >
                        <span className="material-symbols-outlined text-[15px] text-primary">
                          pin_drop
                        </span>
                        Address & Location
                      </h2>
                      <span className="text-[9.5px] font-bold tracking-wider uppercase bg-primary/10 text-primary px-2.5 py-0.5 rounded-full border border-primary/20">
                        All India
                      </span>
                    </div>

                    {/* Quick Action Toolbar */}
                    <div className="grid grid-cols-2 gap-2.5 mb-3.5">
                      <button
                        type="button"
                        onClick={() => setShowMap((prev) => !prev)}
                        className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-[11px] font-bold tracking-wide transition-all cursor-pointer ${
                          showMap
                            ? 'bg-primary/10 border-primary text-primary shadow-xs'
                            : 'bg-surface hover:bg-surface-container-low border-outline-variant/30 text-on-surface'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[15px] text-primary">
                          {showMap ? 'layers_clear' : 'map'}
                        </span>
                        <span>{showMap ? 'Hide Map' : 'Adjust on Map'}</span>
                      </button>
                      <button
                        type="button"
                        disabled={isLocating}
                        onClick={handleLocationClick}
                        className="flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-neutral-900 hover:bg-black text-white text-[11px] font-bold tracking-wide transition-all shadow-xs disabled:opacity-50 cursor-pointer active:scale-[0.98]"
                      >
                        <span
                          className={`material-symbols-outlined text-[15px] ${
                            isLocating ? 'animate-spin' : 'text-primary'
                          }`}
                        >
                          {isLocating ? 'progress_activity' : 'my_location'}
                        </span>
                        <span>{isLocating ? 'Locating...' : 'Use Current GPS'}</span>
                      </button>
                    </div>

                    {/* Google Maps-Style Location Search Bar */}
                    <div ref={searchContainerRef} className="relative mb-4">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10.5px] font-bold uppercase tracking-wider text-secondary flex items-center gap-1">
                          <span className="material-symbols-outlined text-[13px] text-primary">
                            search
                          </span>
                          Search Location (India)
                        </span>
                        {isSearchingLocation ? (
                          <span className="text-[10px] text-primary animate-pulse font-semibold flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping" />
                            Searching India places...
                          </span>
                        ) : (
                          <span className="text-[10px] text-on-surface-variant/70 font-medium">
                            Auto-fills address form
                          </span>
                        )}
                      </div>

                      <div className="relative flex items-center bg-surface border border-outline-variant/40 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 rounded-xl transition-all shadow-2xs">
                        <span className="material-symbols-outlined text-[18px] text-primary/80 pl-3 shrink-0 pointer-events-none">
                          search
                        </span>
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={handleLocationSearchChange}
                          placeholder="Search area, landmark, colony, PG, road, or 6-digit pincode..."
                          className="w-full py-2.5 px-2.5 text-[12px] sm:text-[13px] bg-transparent outline-none text-on-surface placeholder:text-on-surface-variant/50 font-medium"
                        />
                        {searchQuery && (
                          <button
                            type="button"
                            onClick={() => {
                              setSearchQuery('');
                              setLocationSuggestions([]);
                            }}
                            className="p-2 text-on-surface-variant/60 hover:text-on-surface cursor-pointer shrink-0"
                            aria-label="Clear search"
                          >
                            <span className="material-symbols-outlined text-[16px]">cancel</span>
                          </button>
                        )}
                      </div>

                      {/* Dropdown suggestions */}
                      {locationSuggestions.length > 0 && (
                        <div className="absolute left-0 right-0 top-full mt-1.5 bg-surface-bright rounded-xl shadow-2xl border border-outline-variant/30 overflow-hidden z-30 max-h-64 overflow-y-auto divide-y divide-outline-variant/10">
                          {locationSuggestions.map((item, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => handleSelectSuggestion(item)}
                              className="w-full text-left px-3.5 py-2.5 hover:bg-primary/5 flex items-start gap-2.5 transition-colors cursor-pointer group"
                            >
                              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary mt-0.5 shrink-0 group-hover:bg-primary group-hover:text-white transition-colors">
                                <span className="material-symbols-outlined text-[14px]">
                                  location_on
                                </span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <p className="text-[11.5px] font-bold text-on-surface truncate">
                                    {item.name || 'Selected Location'}
                                  </p>
                                  {item.address?.landmark && (
                                    <span className="text-[9px] bg-amber-500/10 text-amber-700 dark:text-amber-400 font-semibold px-1.5 py-0.2 rounded-md">
                                      {item.address.landmark}
                                    </span>
                                  )}
                                </div>
                                <p className="text-[10px] text-on-surface-variant/80 truncate mt-0.5">
                                  {item.displayName}
                                </p>
                              </div>
                            </button>
                          ))}
                          <div className="px-3.5 py-1.5 bg-surface-container-lowest text-[9px] text-on-surface-variant/60 flex items-center justify-between font-medium">
                            <span>Showing locations in India</span>
                            <span className="flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                              OSM & Postal Registry
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Interactive Leaflet Map for fine-tuning location pin */}
                    {(showMap || (newAddress.latitude && newAddress.longitude)) && (
                      <div className="mb-4">
                        <div className="w-full h-44 bg-surface-container-low rounded-xl overflow-hidden border border-outline-variant/30 relative shadow-inner">
                          <LocationMarker
                            position={mapPosition}
                            setPosition={setMapPosition}
                            fetchAddressFromCoords={fetchAddressFromCoords}
                          />
                        </div>
                        <p className="text-[9px] text-on-surface-variant/70 mt-1 flex items-center gap-1">
                          <span className="material-symbols-outlined text-[11px]">info</span>
                          Drag marker or tap on map to auto-update address and coordinates.
                        </p>
                      </div>
                    )}

                    {newAddress.latitude && newAddress.longitude && (
                      <motion.div
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-4 flex items-center gap-2 text-[10px] text-green-700 bg-green-50 border border-green-200 px-3 py-1.5 rounded-lg font-bold uppercase tracking-wider inline-flex"
                      >
                        <span className="material-symbols-outlined text-xs">share_location</span>
                        <span>
                          GPS Locked: {Number(newAddress.latitude).toFixed(5)},{' '}
                          {Number(newAddress.longitude).toFixed(5)}
                        </span>
                      </motion.div>
                    )}

                    <div className="flex flex-col gap-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
                        <div>
                          <label className="form-label">6-Digit Pincode*</label>
                          <input
                            type="tel"
                            required
                            inputMode="numeric"
                            maxLength={6}
                            placeholder="e.g. 560041"
                            value={newAddress.pincode}
                            onChange={(e) => {
                              const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                              setNewAddress((prev) => ({ ...prev, pincode: val }));
                              if (val.length === 6) {
                                toast.loading('Looking up pincode...', { id: 'pincode' });
                                fetch(`https://api.postalpincode.in/pincode/${val}`)
                                  .then((res) => res.json())
                                  .then((data) => {
                                    if (data && data[0] && data[0].Status === 'Success') {
                                      const postOffice = data[0].PostOffice[0];
                                      setNewAddress((prev) => ({
                                        ...prev,
                                        city:
                                          prev.city ||
                                          postOffice.District ||
                                          postOffice.Block ||
                                          postOffice.Region,
                                        state: prev.state || postOffice.State,
                                      }));
                                      toast.success('City & state auto-filled!', { id: 'pincode' });
                                    } else {
                                      toast.dismiss('pincode');
                                    }
                                  })
                                  .catch(() => {
                                    toast.dismiss('pincode');
                                  });
                              }
                            }}
                            className="form-field"
                          />
                        </div>

                        <div>
                          <label className="form-label">Locality / Sector*</label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. Sector 4 / Jayanagar"
                            value={newAddress.locality}
                            onChange={(e) =>
                              setNewAddress((prev) => ({ ...prev, locality: e.target.value }))
                            }
                            className="form-field"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="form-label">Street Address & Building Details*</label>
                        <textarea
                          required
                          placeholder="Flat, House no., Building, Apartment details"
                          value={newAddress.address}
                          onChange={(e) =>
                            setNewAddress((prev) => ({ ...prev, address: e.target.value }))
                          }
                          className="form-field min-h-[75px] resize-none"
                        />
                      </div>

                      <div>
                        <label className="form-label">Landmark (Optional)</label>
                        <input
                          type="text"
                          placeholder="e.g. Near Apollo Hospital"
                          value={newAddress.landmark}
                          onChange={(e) =>
                            setNewAddress((prev) => ({ ...prev, landmark: e.target.value }))
                          }
                          className="form-field"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
                        <div>
                          <label className="form-label">City / District*</label>
                          <input
                            type="text"
                            required
                            placeholder="City"
                            value={newAddress.city}
                            onChange={(e) =>
                              setNewAddress((prev) => ({ ...prev, city: e.target.value }))
                            }
                            className="form-field"
                          />
                        </div>

                        <div>
                          <label className="form-label">State*</label>
                          <input
                            type="text"
                            required
                            placeholder="State"
                            value={newAddress.state}
                            onChange={(e) =>
                              setNewAddress((prev) => ({ ...prev, state: e.target.value }))
                            }
                            className="form-field uppercase"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Destination & Options */}
                  <div className="pt-2 pb-4">
                    <h2
                      className="font-sans text-[11px] font-bold uppercase tracking-wider text-secondary flex items-center gap-1.5 mb-4"
                      style={{ fontFamily: 'var(--font-body)' }}
                    >
                      <span className="material-symbols-outlined text-[14px] text-primary">
                        local_shipping
                      </span>
                      Destination & Options
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="form-label">Destination Type</label>
                        <select
                          value={newAddress.tag}
                          onChange={(e) =>
                            setNewAddress((prev) => ({ ...prev, tag: e.target.value }))
                          }
                          className="form-field cursor-pointer"
                        >
                          <option value="Home">Home</option>
                          <option value="Work">Work</option>
                          <option value="Venue">Venue</option>
                          <option value="Warehouse">Warehouse</option>
                        </select>
                      </div>
                    </div>

                    <div className="mb-4">
                      <label className="form-label">Delivery Instructions (Optional)</label>
                      <textarea
                        placeholder="E.g. Leave with security, call before delivery"
                        value={newAddress.deliveryInstructions}
                        onChange={(e) =>
                          setNewAddress((prev) => ({
                            ...prev,
                            deliveryInstructions: e.target.value,
                          }))
                        }
                        className="form-field min-h-[70px] resize-none"
                      />
                    </div>

                    <label className="flex items-center gap-2.5 cursor-pointer mt-2 select-none">
                      <input
                        type="checkbox"
                        checked={newAddress.isDefault || false}
                        onChange={(e) =>
                          setNewAddress((prev) => ({ ...prev, isDefault: e.target.checked }))
                        }
                        className="w-4 h-4 rounded border-outline-variant/40 text-primary focus:ring-primary cursor-pointer"
                      />
                      <span className="text-[12px] text-on-surface font-medium">
                        Make this as my default address
                      </span>
                    </label>
                  </div>
                </div>
              </form>
            </div>

            {/* Modal Footer: Non-overlapping, pinned at bottom of modal flex container */}
            <div
              className="bg-surface-bright border-t border-outline-variant/20 p-4 shadow-[0_-4px_10px_rgba(0,0,0,0.05)] shrink-0 z-20"
              style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))' }}
            >
              {addressError && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-start gap-3 p-3 bg-red-50 text-red-600 rounded-xl text-[11px] mb-3 shadow-sm border border-red-100"
                >
                  <AlertTriangle
                    className="w-4 h-4 shrink-0 text-red-600 mt-0.5"
                    aria-hidden="true"
                  />
                  <span className="font-bold flex-1 leading-snug">{addressError}</span>
                </motion.div>
              )}
              <div className="w-full flex gap-3 sm:gap-4">
                <button
                  type="button"
                  onClick={() => setIsAddingNewAddress(false)}
                  className="flex-1 bg-surface-container-low hover:bg-surface-container text-on-surface font-bold uppercase tracking-widest text-[11px] py-3 rounded-xl border border-outline-variant/30 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  form="address-form"
                  type="submit"
                  disabled={isProcessing}
                  className="flex-1 bg-neutral-900 hover:bg-black text-white py-3 rounded-xl font-bold uppercase tracking-widest text-[11px] shadow-md hover:shadow-lg flex items-center justify-center gap-2 transition-all disabled:opacity-70 cursor-pointer active:scale-[0.99]"
                >
                  {isProcessing ? (
                    <>
                      <span className="material-symbols-outlined text-[14px] animate-spin">
                        progress_activity
                      </span>
                      <span>Saving...</span>
                    </>
                  ) : (
                    'Save Address'
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
