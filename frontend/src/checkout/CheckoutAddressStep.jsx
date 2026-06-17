import { m as motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';

import { useCheckout } from './CheckoutProvider';

function LocationMarker({ position, setPosition, fetchAddressFromCoords }) {
  const mapRef = useRef(null);
  const markerRef = useRef(null);

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

      const map = L.map('checkout-leaflet-map').setView([position.lat, position.lng], 13);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(map);

      const marker = L.marker([position.lat, position.lng], { draggable: true }).addTo(map);

      marker.on('dragend', (e) => {
        const pos = e.target.getLatLng();
        setPosition({ lat: pos.lat, lng: pos.lng });
        fetchAddressFromCoords(pos.lat, pos.lng);
      });

      map.on('click', (e) => {
        marker.setLatLng(e.latlng);
        setPosition({ lat: e.latlng.lat, lng: e.latlng.lng });
        fetchAddressFromCoords(e.latlng.lat, e.latlng.lng);
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

export default function CheckoutAddressStep() {
  const {
    activeItems,
    hasRentalItems,
    setActiveStep,
    activeSelectedAddress,
    savedAddresses,
    selectedAddressId,
    setSelectedAddressId,
    isAddingNewAddress,
    setIsAddingNewAddress,
    isDetectingLocation,
    newAddress,
    setNewAddress,
    addressError,
    setAddressError,
    isProcessing,
    handleSaveNewAddress,
    handleFetchCurrentLocation,
    PINCODE_MAP,
    checkoutSteps,
  } = useCheckout();

  // Local state to toggle between Main View and Select List View
  const [isSelectingList, setIsSelectingList] = useState(false);

  const [mapPosition, setMapPosition] = useState({ lat: 20.5937, lng: 78.9629 }); // Default India

  useEffect(() => {
    if (newAddress?.latitude && newAddress?.longitude) {
      setMapPosition({ lat: newAddress.latitude, lng: newAddress.longitude });
    }
  }, [newAddress?.latitude, newAddress?.longitude]);

  const fetchAddressFromCoords = async (lat, lng) => {
    try {
      toast.loading('Locating address...', { id: 'geocoding' });
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'SiriArtsAndCrafts/1.0 (checkout address autofill)',
          },
        },
      );
      const data = await response.json();
      if (data && data.address) {
        const addr = data.address;

        const newPincode = addr.postcode || '';
        const newCity =
          addr.city || addr.town || addr.village || addr.county || addr.state_district || '';
        const newState = addr.state || '';
        const newLocality =
          addr.suburb || addr.neighbourhood || addr.road || addr.residential || '';
        const newLandmark = addr.amenity || addr.building || addr.shop || '';
        const newHouse = addr.house_number || addr.name || '';

        setNewAddress((prev) => ({
          ...prev,
          pincode: newPincode.replace(/\s/g, ''),
          city: newCity,
          state: newState,
          locality: newLocality || prev.locality,
          landmark: newLandmark || prev.landmark || newLocality || newCity,
          address: newHouse || prev.address,
          latitude: lat,
          longitude: lng,
        }));

        toast.success('Address auto-filled from map!', { id: 'geocoding' });
      } else {
        toast.dismiss('geocoding');
      }
    } catch (err) {
      toast.error('Failed to auto-fill address from map', { id: 'geocoding' });
    }
  };

  // Handle Edit Mode
  const handleEdit = (addr) => {
    setNewAddress({
      id: addr._id || addr.id,
      name: addr.name || '',
      phone: addr.phone || '',
      alternatePhone: addr.alternatePhone || '',
      email: addr.email || '',
      pincode: addr.pincode || '',
      locality: addr.locality || '',
      address: addr.addressString || addr.address || '',
      landmark: addr.landmark || '',
      city: addr.city || '',
      state: addr.state || '',
      country: addr.country || 'India',
      tag: addr.tag || addr.type || 'Home',
      deliveryInstructions: addr.deliveryInstructions || '',
      latitude: addr.latitude || null,
      longitude: addr.longitude || null,
    });
    setIsAddingNewAddress(true);
    setIsSelectingList(false);
  };

  const handleAddNew = () => {
    setNewAddress({
      name: '',
      phone: '',
      alternatePhone: '',
      email: '',
      pincode: '',
      locality: '',
      address: '',
      landmark: '',
      city: '',
      state: '',
      country: 'India',
      tag: 'Home',
      deliveryInstructions: '',
      latitude: null,
      longitude: null,
    });
    setIsAddingNewAddress(true);
    setIsSelectingList(false);
  };

  // Helper to get delivery estimate dates (e.g., +3 to +5 days)
  const getDeliveryEstimates = () => {
    const start = new Date();
    start.setDate(start.getDate() + 3);
    const end = new Date();
    end.setDate(end.getDate() + 5);

    const options = { day: 'numeric', month: 'short' };
    return `${start.toLocaleDateString('en-US', options)} - ${end.toLocaleDateString('en-US', options)}`;
  };

  const deliveryEstimates = getDeliveryEstimates();

  // ------------------------------------------
  // STATE 3: ADD/EDIT ADDRESS MODAL
  // ------------------------------------------
  const renderAddAddressModal = () => (
    <AnimatePresence>
      {isAddingNewAddress && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsAddingNewAddress(false)}
            className="fixed inset-0 bg-black/60 z-[100] backdrop-blur-sm cursor-pointer"
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed bottom-0 left-0 right-0 z-[101] bg-surface-container-low rounded-t-2xl sm:rounded-t-3xl max-h-[90vh] w-full max-w-[800px] mx-auto shadow-2xl flex flex-col"
          >
            <div className="bg-surface-bright z-10 pt-5 pb-4 px-6 flex justify-between items-center border-b border-outline-variant/20 rounded-t-2xl sm:rounded-t-3xl shrink-0">
              <h2 className="font-display text-base font-bold text-on-surface uppercase tracking-wider">
                {newAddress?.id ? 'Edit Address' : 'Add New Address'}
              </h2>
              <button
                type="button"
                onClick={() => setIsAddingNewAddress(false)}
                className="w-8 h-8 min-h-0 rounded-full bg-surface-container-low flex items-center justify-center border border-outline-variant/30 hover:bg-surface-container transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="overflow-y-auto p-4 sm:p-6 pb-28">
              <form id="address-form" onSubmit={handleSaveNewAddress}>
                <div className="space-y-4">
                  {addressError && (
                    <div className="p-3 bg-red-50 text-red-600 rounded text-[11px] font-semibold mb-2">
                      ⚠️ {addressError}
                    </div>
                  )}

                  {/* Contact Details Block */}
                  <div className="py-6 border-b border-outline-variant/20">
                    <h2 className="font-display text-sm font-extrabold text-on-surface uppercase tracking-wider mb-5">
                      Contact Details
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div>
                        <label
                          htmlFor="name"
                          className="block text-[9px] uppercase font-bold text-secondary tracking-widest mb-1.5 font-display"
                        >
                          Receiver Full Name*
                        </label>
                        <input
                          id="name"
                          type="text"
                          required
                          placeholder="Receiver full name"
                          value={newAddress.name}
                          onChange={(e) => setNewAddress({ ...newAddress, name: e.target.value })}
                          className="w-full bg-white border border-outline-variant/30 rounded-lg px-4 py-3 text-xs outline-none focus:border-primary transition-all font-semibold"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="phone"
                          className="block text-[9px] uppercase font-bold text-secondary tracking-widest mb-1.5 font-display"
                        >
                          Contact Phone Number*
                        </label>
                        <input
                          id="phone"
                          type="tel"
                          required
                          pattern="[0-9]{10}"
                          placeholder="10-digit mobile number"
                          value={newAddress.phone}
                          onChange={(e) => setNewAddress({ ...newAddress, phone: e.target.value })}
                          className="w-full bg-white border border-outline-variant/30 rounded-lg px-4 py-3 text-xs outline-none focus:border-primary transition-all font-semibold"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="alternatePhone"
                          className="block text-[9px] uppercase font-bold text-secondary tracking-widest mb-1.5 font-display"
                        >
                          Alternate Phone Number
                        </label>
                        <input
                          id="alternatePhone"
                          type="tel"
                          placeholder="Optional alternate number"
                          value={newAddress.alternatePhone}
                          onChange={(e) => setNewAddress({ ...newAddress, alternatePhone: e.target.value })}
                          className="w-full bg-white border border-outline-variant/30 rounded-lg px-4 py-3 text-xs outline-none focus:border-primary transition-all font-semibold"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="email"
                          className="block text-[9px] uppercase font-bold text-secondary tracking-widest mb-1.5 font-display"
                        >
                          Email Address
                        </label>
                        <input
                          id="email"
                          type="email"
                          placeholder="Enter email address"
                          value={newAddress.email}
                          onChange={(e) => setNewAddress({ ...newAddress, email: e.target.value })}
                          className="w-full bg-white border border-outline-variant/30 rounded-lg px-4 py-3 text-xs outline-none focus:border-primary transition-all font-semibold"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Address Block */}
                  <div className="py-6 border-b border-outline-variant/20">
                    <h2 className="font-display text-sm font-extrabold text-on-surface uppercase tracking-wider mb-5">
                      Address Details
                    </h2>

                    <div className="w-full h-48 bg-surface-container-low rounded-lg mb-4 relative overflow-hidden border border-outline-variant/30 z-0">
                      <LocationMarker
                        position={mapPosition}
                        setPosition={setMapPosition}
                        fetchAddressFromCoords={fetchAddressFromCoords}
                      />
                      <div className="absolute top-2 right-2 z-[1000]">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            toast.loading('Finding you...', { id: 'gps' });
                            if (navigator.geolocation) {
                              navigator.geolocation.getCurrentPosition(
                                (pos) => {
                                  const { latitude, longitude } = pos.coords;
                                  setMapPosition({ lat: latitude, lng: longitude });
                                  fetchAddressFromCoords(latitude, longitude);
                                  toast.success('Location found!', { id: 'gps' });
                                },
                                (err) => {
                                  toast.error('Could not access GPS', { id: 'gps' });
                                },
                                { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
                              );
                            } else {
                              toast.error('Geolocation not supported by this browser', {
                                id: 'gps',
                              });
                            }
                          }}
                          className="bg-white p-2 rounded shadow flex items-center justify-center text-primary hover:bg-gray-50 transition-colors"
                          title="Locate Me"
                        >
                          <span className="material-symbols-outlined text-[18px]">my_location</span>
                        </button>
                      </div>
                    </div>

                    {newAddress.latitude && newAddress.longitude && (
                      <motion.div
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-4 flex items-center gap-2 text-[10px] text-green-700 bg-green-50 border border-green-200 px-3 py-1.5 rounded-lg font-bold uppercase tracking-wider inline-flex"
                      >
                        <span className="material-symbols-outlined text-xs">share_location</span>
                        <span>
                          GPS Locked: {newAddress.latitude.toFixed(6)},{' '}
                          {newAddress.longitude.toFixed(6)}
                        </span>
                      </motion.div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div>
                        <label
                          htmlFor="pincode"
                          className="block text-[9px] uppercase font-bold text-secondary tracking-widest mb-1.5 font-display"
                        >
                          6-Digit Pincode*
                        </label>
                        <input
                          id="pincode"
                          type="tel"
                          required
                          maxLength={6}
                          placeholder="e.g. 560041"
                          value={newAddress.pincode}
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                            const updated = { ...newAddress, pincode: val };
                            if (val.length === 6 && PINCODE_MAP[val]) {
                              updated.city = PINCODE_MAP[val].city;
                              updated.state = PINCODE_MAP[val].state;
                            }
                            setNewAddress(updated);
                          }}
                          className="w-full bg-white border border-outline-variant/30 rounded-lg px-4 py-3 text-xs outline-none focus:border-primary transition-all font-semibold"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="locality"
                          className="block text-[9px] uppercase font-bold text-secondary tracking-widest mb-1.5 font-display"
                        >
                          Locality / Sector*
                        </label>
                        <input
                          id="locality"
                          type="text"
                          required
                          placeholder="e.g. Sector 4 / Jayanagar"
                          value={newAddress.locality}
                          onChange={(e) =>
                            setNewAddress({ ...newAddress, locality: e.target.value })
                          }
                          className="w-full bg-white border border-outline-variant/30 rounded-lg px-4 py-3 text-xs outline-none focus:border-primary transition-all font-semibold"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label
                          htmlFor="address"
                          className="block text-[9px] uppercase font-bold text-secondary tracking-widest mb-1.5 font-display"
                        >
                          Street Address & Building Details*
                        </label>
                        <textarea
                          id="address"
                          required
                          placeholder="Flat, House no., Building, Apartment details"
                          value={newAddress.address}
                          onChange={(e) =>
                            setNewAddress({ ...newAddress, address: e.target.value })
                          }
                          className="w-full bg-white border border-outline-variant/30 rounded-lg px-4 py-3 text-xs outline-none focus:border-primary transition-all min-h-[70px] font-semibold"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label
                          htmlFor="landmark"
                          className="block text-[9px] uppercase font-bold text-secondary tracking-widest mb-1.5 font-display"
                        >
                          Landmark
                        </label>
                        <input
                          id="landmark"
                          type="text"
                          placeholder="e.g. Near Apollo Hospital"
                          value={newAddress.landmark}
                          onChange={(e) =>
                            setNewAddress({ ...newAddress, landmark: e.target.value })
                          }
                          className="w-full bg-white border border-outline-variant/30 rounded-lg px-4 py-3 text-xs outline-none focus:border-primary transition-all font-semibold"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="city"
                          className="block text-[9px] uppercase font-bold text-secondary tracking-widest mb-1.5 font-display"
                        >
                          City / District*
                        </label>
                        <input
                          id="city"
                          type="text"
                          required
                          placeholder="City"
                          value={newAddress.city}
                          onChange={(e) => setNewAddress({ ...newAddress, city: e.target.value })}
                          className="w-full bg-white border border-outline-variant/30 rounded-lg px-4 py-3 text-xs outline-none focus:border-primary transition-all font-semibold"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="state"
                          className="block text-[9px] uppercase font-bold text-secondary tracking-widest mb-1.5 font-display"
                        >
                          State*
                        </label>
                        <input
                          id="state"
                          type="text"
                          required
                          placeholder="State"
                          value={newAddress.state}
                          onChange={(e) => setNewAddress({ ...newAddress, state: e.target.value })}
                          className="w-full bg-white border border-outline-variant/30 rounded-lg px-4 py-3 text-xs outline-none focus:border-primary transition-all font-semibold uppercase"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Destination and Options Block */}
                  <div className="py-6">
                    <h2 className="font-display text-sm font-extrabold text-on-surface uppercase tracking-wider mb-5">
                      Destination & Options
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-4">
                      <div>
                        <label
                          htmlFor="tag"
                          className="block text-[9px] uppercase font-bold text-secondary tracking-widest mb-1.5 font-display"
                        >
                          Destination Type
                        </label>
                        <select
                          id="tag"
                          value={newAddress.tag}
                          onChange={(e) => setNewAddress({ ...newAddress, tag: e.target.value })}
                          className="w-full bg-white border border-outline-variant/30 rounded-lg px-3 py-3 text-xs outline-none focus:border-primary transition-all font-semibold cursor-pointer"
                        >
                          <option value="Home">Home</option>
                          <option value="Work">Work</option>
                          <option value="Venue">Venue</option>
                          <option value="Warehouse">Warehouse</option>
                        </select>
                      </div>
                    </div>

                    <div className="sm:col-span-2 mb-4">
                      <label
                        htmlFor="deliveryInstructions"
                        className="block text-[9px] uppercase font-bold text-secondary tracking-widest mb-1.5 font-display"
                      >
                        Delivery Instructions
                      </label>
                      <textarea
                        id="deliveryInstructions"
                        placeholder="E.g. Leave with security, call before delivery"
                        value={newAddress.deliveryInstructions}
                        onChange={(e) => setNewAddress({ ...newAddress, deliveryInstructions: e.target.value })}
                        className="w-full bg-white border border-outline-variant/30 rounded-lg px-4 py-3 text-xs outline-none focus:border-primary transition-all min-h-[70px] font-semibold"
                      />
                    </div>

                    <label className="flex items-center gap-2 cursor-pointer mt-2 select-none">
                      <input
                        type="checkbox"
                        checked={newAddress.isDefault || false}
                        onChange={(e) => setNewAddress({ ...newAddress, isDefault: e.target.checked })}
                        className="w-4 h-4 rounded border-outline-variant/40 text-primary focus:ring-primary cursor-pointer"
                      />
                      <span className="text-[12px] text-on-surface">
                        Make this as my default address
                      </span>
                    </label>
                  </div>
                </div>
              </form>
            </div>

            <div className="bg-surface-bright border-t border-outline-variant/20 p-4 shadow-[0_-4px_10px_rgba(0,0,0,0.05)] mt-auto shrink-0 z-20 absolute bottom-0 left-0 right-0">
              <div className="w-full flex gap-4">
                <button
                  type="button"
                  onClick={() => setIsAddingNewAddress(false)}
                  className="flex-1 bg-transparent text-on-surface font-bold uppercase tracking-widest text-[10px] py-3 rounded-full border border-outline-variant/40 hover:bg-surface-container-low transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  form="address-form"
                  type="submit"
                  disabled={isProcessing}
                  className="flex-1 btn-primary py-3 rounded-full font-bold uppercase tracking-widest text-[10px] shadow-md flex justify-center disabled:opacity-70 cursor-pointer !text-white"
                >
                  {isProcessing ? 'Saving...' : 'Save Address'}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  // ------------------------------------------
  // STATE 2: SELECT ADDRESS LIST (Screenshot 3)
  // ------------------------------------------
  if (isSelectingList) {
    return (
      <>
        <div className="bg-surface-bright pb-24">
          <div className="p-4 max-w-2xl mx-auto flex items-center justify-between border-b border-outline-variant/15 mb-2">
            <h2 className="font-semibold text-sm text-on-surface tracking-wide">Saved Addresses</h2>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleAddNew}
              className="w-6 h-6 p-0 min-h-0 rounded-full border border-primary/50 text-primary bg-transparent flex items-center justify-center cursor-pointer hover:bg-primary hover:text-surface transition-all shrink-0"
              title="Add New Address"
            >
              <span className="material-symbols-outlined text-[12px] font-bold">add</span>
            </motion.button>
          </div>

          <div className="divide-y divide-outline-variant/20">
            {savedAddresses.map((addr) => {
              const addrId = addr._id || addr.id;
              const isSelected = selectedAddressId === addrId;
              return (
                <div key={addrId} className="p-4">
                  <div className="flex gap-3">
                    <div
                      className="pt-1 cursor-pointer"
                      onClick={() => setSelectedAddressId(addrId)}
                    >
                      <div
                        className={`w-4 h-4 rounded-full border-[1.5px] flex items-center justify-center ${isSelected ? 'border-primary' : 'border-outline-variant'}`}
                      >
                        {isSelected && <div className="w-2 h-2 rounded-full bg-primary"></div>}
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[13px] font-bold text-on-surface">{addr.name}</span>
                        {addr.tag && (
                          <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 border border-primary text-primary rounded-full">
                            {addr.tag}
                          </span>
                        )}
                      </div>
                      <p className="text-[12px] text-secondary leading-relaxed mb-1">
                        {addr.addressString || addr.address}, {addr.locality}, {addr.city},{' '}
                        {addr.state} {addr.pincode}
                      </p>
                      <p className="text-[12px] text-secondary">
                        Mobile: <span className="font-bold text-on-surface">{addr.phone}</span>
                      </p>

                      {isSelected && (
                        <div className="flex gap-3 mt-4">
                          <button className="px-6 py-2 border border-outline-variant rounded text-[11px] font-bold text-on-surface uppercase tracking-wider">
                            Remove
                          </button>
                          <button
                            onClick={() => handleEdit(addr)}
                            className="px-6 py-2 border border-outline-variant rounded text-[11px] font-bold text-on-surface uppercase tracking-wider"
                          >
                            Edit
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Sticky Action Footer */}
          <div className="fixed bottom-0 left-0 right-0 bg-surface-bright border-t border-outline-variant/20 p-4 shadow-lg z-40 flex justify-center">
            <div className="max-w-[1240px] w-full mx-auto">
              <button
                onClick={() => setIsSelectingList(false)}
                className="w-full btn-primary py-3 rounded-full text-[10px] font-bold uppercase tracking-widest shadow-sm transition-colors text-center !text-white"
              >
                Confirm Address
              </button>
            </div>
          </div>
        </div>
        {renderAddAddressModal()}
      </>
    );
  }

  // ------------------------------------------
  // STATE 1: MAIN DELIVERY VIEW (Screenshot 1)
  // ------------------------------------------
  return (
    <>
      <div className="bg-surface-container-low -mt-2">
        {/* Selected Address Block */}
        <div className="bg-surface-bright border border-outline-variant/40 rounded-lg p-6 shadow-xs mb-4">
          {activeSelectedAddress ? (
            <div className="relative">
              {/* Change button absolute-positioned at top-right corner to prevent layout squeezing */}
              <button
                onClick={() => setIsSelectingList(true)}
                className="absolute top-0 right-0 text-[12px] font-bold text-primary uppercase tracking-wide cursor-pointer py-1 px-2 hover:opacity-85 transition-opacity"
              >
                Change
              </button>

              {/* Title row with Name and badges, padded on right to avoid the Change button */}
              <div className="pr-16 mb-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[15px] font-extrabold text-on-surface capitalize">
                    {activeSelectedAddress.name}
                  </span>
                  <span className="text-[10px] text-secondary/80 font-medium bg-surface-container-low px-1.5 py-0.5 rounded">
                    Default
                  </span>
                  {activeSelectedAddress.tag && (
                    <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 border border-primary text-primary rounded-full">
                      {activeSelectedAddress.tag}
                    </span>
                  )}
                </div>
              </div>

              {/* Address details with premium line-height */}
              <p className="text-[13px] text-on-surface/85 leading-relaxed w-[85%]">
                {activeSelectedAddress.addressString || activeSelectedAddress.address}
                <br />
                {activeSelectedAddress.locality}
                <br />
                {activeSelectedAddress.city}, {activeSelectedAddress.state}{' '}
                {activeSelectedAddress.pincode}
              </p>

              {/* Mobile details row with top border and icon */}
              <div className="mt-4 pt-3 border-t border-outline-variant/30 text-[13px] flex items-center gap-1.5 text-secondary">
                <span className="material-symbols-outlined text-[15px] text-primary">phone</span>
                <span>Mobile:</span>
                <span className="font-extrabold text-on-surface">
                  {activeSelectedAddress.phone}
                </span>
              </div>

              {hasRentalItems && (
                <div className="mt-4 p-3 bg-green-50 text-green-800 rounded border border-green-100 flex items-start gap-2">
                  <span className="material-symbols-outlined text-[16px] mt-0.5">verified</span>
                  <div>
                    <p className="text-[12px] font-bold">Rental Availability Check</p>
                    <p className="text-[11px] mt-1">✓ Rentals are available at your pincode.</p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center text-center py-6">
              <span className="material-symbols-outlined text-[44px] text-outline-variant mb-2 select-none">
                location_off
              </span>
              <p className="text-[14px] font-bold text-on-surface mb-1">
                No Delivery Address Found
              </p>
              <p className="text-[12px] text-secondary mb-4 max-w-xs leading-normal">
                Please add at least one delivery address to continue.
              </p>
              <button
                type="button"
                onClick={handleAddNew}
                className="btn-primary py-2.5 px-6 rounded-full text-[10px] font-bold uppercase tracking-widest shadow-sm hover:opacity-90 transition-opacity cursor-pointer"
              >
                Add Address
              </button>
            </div>
          )}
        </div>

        {/* Delivery Estimates Block */}
        <div className="bg-surface-bright border border-outline-variant/40 rounded-lg p-6 shadow-xs flex flex-col gap-4 mt-4">
          <h2 className="text-[10px] font-label font-bold text-on-surface uppercase tracking-widest mb-2">
            Delivery Estimates
          </h2>
          {activeItems.map((item) => (
            <div key={item.id} className="flex items-center gap-4">
              <div className="w-12 h-14 bg-surface-container-low rounded overflow-hidden flex-shrink-0">
                <img src={item.imageSrc} alt={item.title} className="w-full h-full object-cover" />
              </div>
              <div className="text-[13px] text-on-surface">
                Delivery between <span className="font-extrabold">{deliveryEstimates}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Sticky Action Footer */}
        <div className="fixed bottom-0 left-0 right-0 bg-surface-bright border-t border-outline-variant/20 p-4 shadow-lg z-40 flex justify-center">
          <div className="max-w-[1240px] w-full mx-auto">
            <button
              onClick={() => {
                if (!activeSelectedAddress) {
                  toast.error('Please add and select a delivery address first.');
                  return;
                }
                const nextIndex = checkoutSteps.indexOf('ADDRESS') + 1;
                setActiveStep(nextIndex);
              }}
              disabled={!activeSelectedAddress}
              className={`w-full py-3 rounded-full text-[10px] font-bold uppercase tracking-widest shadow-sm transition-colors text-center cursor-pointer ${
                !activeSelectedAddress
                  ? 'bg-outline-variant text-on-surface/40 opacity-50 cursor-not-allowed'
                  : 'btn-primary !text-white'
              }`}
            >
              Continue to{' '}
              {checkoutSteps[checkoutSteps.indexOf('ADDRESS') + 1] === 'VERIFY'
                ? 'Verification'
                : checkoutSteps[checkoutSteps.indexOf('ADDRESS') + 1] === 'CUSTOMIZATION'
                  ? 'Note'
                  : 'Payment'}
            </button>
          </div>
        </div>
      </div>
      {renderAddAddressModal()}
    </>
  );
}
