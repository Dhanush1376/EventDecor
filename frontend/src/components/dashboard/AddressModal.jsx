import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDashboard } from '../../context/DashboardContext';
import { userService } from '../../services/domainServices';
import { MandalaElement } from '../ui/MandalaElement';
import toast from 'react-hot-toast';

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

      const map = L.map('dashboard-leaflet-map').setView([position.lat, position.lng], 13);
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

  return <div id="dashboard-leaflet-map" style={{ width: '100%', height: '100%', zIndex: 1 }} />;
}

export function AddressModal() {
  const {
    user,
    isAddressModalOpen,
    setIsAddressModalOpen,
    editingAddressId,
    addresses,
    refetchDashboardData,
  } = useDashboard();

  const [addressFormData, setAddressFormData] = useState(null);
  const [isAddressSaving, setIsAddressSaving] = useState(false);
  const [isDetectingLocation, _setIsDetectingLocation] = useState(false);

  useEffect(() => {
    if (isAddressModalOpen) {
      if (editingAddressId === 'new') {
        setAddressFormData({
          id: 'new',
          name: '',
          phone: '',
          alternatePhone: '',
          email: user?.email || '',
          pincode: '',
          locality: '',
          addressString: '',
          landmark: '',
          city: '',
          state: '',
          country: 'India',
          tag: 'Home',
          deliveryInstructions: '',
          latitude: null,
          longitude: null,
        });
      } else if (addresses) {
        const addr = addresses.find((a) => (a._id || a.id) === editingAddressId);
        if (addr) {
          setAddressFormData({
            id: addr._id || addr.id,
            name: addr.name || '',
            phone: addr.phone || '',
            alternatePhone: addr.alternatePhone || '',
            email: addr.email || user?.email || '',
            pincode: addr.pincode || '',
            locality: addr.locality || '',
            addressString: addr.addressString || '',
            landmark: addr.landmark || '',
            city: addr.city || '',
            state: addr.state || '',
            country: addr.country || 'India',
            tag: addr.tag || 'Home',
            deliveryInstructions: addr.deliveryInstructions || '',
            latitude: addr.latitude || null,
            longitude: addr.longitude || null,
          });
        }
      }
    } else {
      setAddressFormData(null);
    }
  }, [isAddressModalOpen, editingAddressId, addresses, user]);

  const handleAddressSave = async (e) => {
    e.preventDefault();

    if (!addressFormData.phone || addressFormData.phone.length < 10) {
      toast.error('Please enter a valid 10-digit mobile number');
      return;
    }
    if (!addressFormData.pincode || addressFormData.pincode.length !== 6) {
      toast.error('Please enter a valid 6-digit postal pincode');
      return;
    }

    const payload = {
      name: addressFormData.name,
      phone: addressFormData.phone,
      alternatePhone: addressFormData.alternatePhone || undefined,
      email: addressFormData.email || user?.email || undefined,
      pincode: addressFormData.pincode,
      locality: addressFormData.locality,
      addressString: addressFormData.addressString,
      landmark: addressFormData.landmark || undefined,
      city: addressFormData.city,
      state: addressFormData.state,
      country: addressFormData.country || 'India',
      tag: addressFormData.tag,
      deliveryInstructions: addressFormData.deliveryInstructions || undefined,
      latitude: addressFormData.latitude,
      longitude: addressFormData.longitude,
    };

    setIsAddressSaving(true);
    try {
      if (editingAddressId === 'new') {
        await userService.addAddress(payload);
        toast.success('New address added successfully!');
      } else {
        await userService.updateAddress(editingAddressId, payload);
        toast.success('Address modified successfully!');
      }
      await refetchDashboardData();
      setIsAddressModalOpen(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to store address information');
    } finally {
      setIsAddressSaving(false);
    }
  };

  const [mapPosition, setMapPosition] = useState({ lat: 20.5937, lng: 78.9629 }); // Default India

  useEffect(() => {
    if (addressFormData?.latitude && addressFormData?.longitude) {
      setMapPosition({ lat: addressFormData.latitude, lng: addressFormData.longitude });
    }
  }, [addressFormData?.latitude, addressFormData?.longitude]);

  if (!isAddressModalOpen || !addressFormData) return null;

  const fetchAddressFromCoords = async (lat, lng) => {
    try {
      toast.loading('Locating address...', { id: 'geocoding-dashboard' });
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'SiriArtsAndCrafts/1.0 (dashboard address autofill)',
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

        const streetParts = [];
        if (addr.house_number) streetParts.push(addr.house_number);
        if (addr.building) streetParts.push(addr.building);
        if (addr.road || addr.street) streetParts.push(addr.road || addr.street);
        if (addr.suburb) streetParts.push(addr.suburb);
        if (addr.neighbourhood) streetParts.push(addr.neighbourhood);
        const addressString =
          streetParts.length > 0
            ? streetParts.join(', ')
            : data.display_name?.split(',').slice(0, 3).join(',').trim() || '';

        const landmark =
          addr.amenity || addr.shop || addr.office || addr.tourism || addr.leisure || '';

        setAddressFormData((prev) => ({
          ...prev,
          pincode: newPincode.replace(/\s/g, ''),
          city: newCity,
          state: newState,
          locality: newLocality || prev.locality,
          addressString: addressString || prev.addressString,
          landmark: landmark || prev.landmark || newLocality || newCity,
          latitude: lat,
          longitude: lng,
        }));
        toast.success('Address auto-filled from map!', { id: 'geocoding-dashboard' });
      } else {
        toast.dismiss('geocoding-dashboard');
      }
    } catch (_err) {
      toast.error('Failed to auto-fill address from map', { id: 'geocoding-dashboard' });
    }
  };

  const handleFetchCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }

    toast.loading('Accessing device GPS location...', { id: 'gps-dashboard' });
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setMapPosition({ lat: latitude, lng: longitude });
        fetchAddressFromCoords(latitude, longitude);
        toast.success('Location found!', { id: 'gps-dashboard' });
      },
      (_err) => {
        toast.error('Could not access GPS', { id: 'gps-dashboard' });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-end justify-center lg:items-center p-0 lg:p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setIsAddressModalOpen(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
        />

        {/* Modal Container */}
        <motion.div
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="fixed bottom-0 left-0 right-0 lg:top-1/2 lg:left-1/2 lg:-translate-x-1/2 lg:-translate-y-1/2 lg:bottom-auto lg:max-w-2xl w-full bg-white rounded-t-lg lg:rounded-lg shadow-2xl z-[101] overflow-hidden max-h-[90vh] flex flex-col"
        >
          {/* Rotating Gold Mandala Overlay */}
          <div className="absolute inset-0 pointer-events-none select-none overflow-hidden opacity-[0.04] z-0">
            <MandalaElement
              size={320}
              duration={60}
              variant={3}
              opacity={1}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-primary"
            />
          </div>

          <div className="bg-surface-bright z-10 pt-5 pb-4 px-6 flex justify-between items-center border-b border-outline-variant/20 rounded-t-lg shrink-0 relative">
            <h3 className="font-display text-base text-on-surface uppercase tracking-wider font-bold">
              {editingAddressId === 'new' ? 'Add New Site Parameters' : 'Modify Site Parameters'}
            </h3>
            <button
              type="button"
              onClick={() => setIsAddressModalOpen(false)}
              className="w-8 h-8 min-h-0 rounded-full bg-surface-container flex items-center justify-center text-secondary hover:text-primary transition-colors cursor-pointer border-0"
            >
              <span className="material-symbols-outlined text-base">close</span>
            </button>
          </div>

          <div className="overflow-y-auto p-6 relative z-10 flex-1 pb-24">
            <form onSubmit={handleAddressSave} className="space-y-6">
              {/* Geolocation Section */}
              <div className="bg-surface-bright border border-outline-variant/40 rounded-lg p-5 shadow-xs">
                <div className="flex items-center justify-between pb-3 border-b border-outline-variant/15 mb-4">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-secondary flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-xs">pin_drop</span>
                    Location Coordinates
                  </span>
                  <button
                    type="button"
                    onClick={handleFetchCurrentLocation}
                    disabled={isDetectingLocation}
                    className="inline-flex items-center gap-1.5 text-[9px] text-primary font-bold uppercase tracking-widest bg-primary/5 hover:bg-primary/10 border border-primary/20 px-3.5 py-1.5 rounded-lg cursor-pointer transition-all disabled:opacity-50 shadow-xs"
                  >
                    <span className="material-symbols-outlined text-[12px] font-bold">
                      my_location
                    </span>
                    <span>Use Current Location</span>
                  </button>
                </div>

                <div className="w-full h-44 bg-surface-container-low rounded-lg mb-4 relative overflow-hidden border border-outline-variant/30 z-0">
                  <LocationMarker
                    position={mapPosition}
                    setPosition={setMapPosition}
                    fetchAddressFromCoords={fetchAddressFromCoords}
                  />
                </div>

                {addressFormData.latitude && addressFormData.longitude && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2 text-[10px] text-green-700 bg-green-50 border border-green-200 px-3 py-1.5 rounded-lg font-bold uppercase tracking-wider inline-flex"
                  >
                    <span className="material-symbols-outlined text-xs">share_location</span>
                    <span>
                      GPS Locked: {addressFormData.latitude.toFixed(6)},{' '}
                      {addressFormData.longitude.toFixed(6)}
                    </span>
                  </motion.div>
                )}
              </div>

              {/* Contact Information Section */}
              <div className="bg-surface-bright border border-outline-variant/40 rounded-lg p-5 shadow-xs">
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-secondary mb-4">
                  Contact Details
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="dashboard-address-name"
                      className="block text-[9px] uppercase font-bold text-secondary tracking-widest mb-1.5"
                    >
                      Receiver Full Name*
                    </label>
                    <input
                      id="dashboard-address-name"
                      type="text"
                      required
                      placeholder="Receiver full name"
                      className="w-full bg-surface-container-low border border-outline-variant/30 rounded-lg px-4 py-2.5 text-xs outline-none focus:border-primary transition-all font-semibold"
                      value={addressFormData.name}
                      onChange={(e) =>
                        setAddressFormData({
                          ...addressFormData,
                          name: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="dashboard-address-phone"
                      className="block text-[9px] uppercase font-bold text-secondary tracking-widest mb-1.5"
                    >
                      Contact Phone Number*
                    </label>
                    <input
                      id="dashboard-address-phone"
                      type="tel"
                      required
                      placeholder="10-digit number"
                      className="w-full bg-surface-container-low border border-outline-variant/30 rounded-lg px-4 py-2.5 text-xs outline-none focus:border-primary transition-all font-semibold"
                      value={addressFormData.phone}
                      onChange={(e) =>
                        setAddressFormData({
                          ...addressFormData,
                          phone: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="dashboard-address-alt-phone"
                      className="block text-[9px] uppercase font-bold text-secondary tracking-widest mb-1.5"
                    >
                      Alternate Phone Number
                    </label>
                    <input
                      id="dashboard-address-alt-phone"
                      type="tel"
                      placeholder="Optional alternate number"
                      className="w-full bg-surface-container-low border border-outline-variant/30 rounded-lg px-4 py-2.5 text-xs outline-none focus:border-primary transition-all font-semibold"
                      value={addressFormData.alternatePhone}
                      onChange={(e) =>
                        setAddressFormData({
                          ...addressFormData,
                          alternatePhone: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="dashboard-address-email"
                      className="block text-[9px] uppercase font-bold text-secondary tracking-widest mb-1.5"
                    >
                      Email Address
                    </label>
                    <input
                      id="dashboard-address-email"
                      type="email"
                      placeholder="Enter email address"
                      className="w-full bg-surface-container-low border border-outline-variant/30 rounded-lg px-4 py-2.5 text-xs outline-none focus:border-primary transition-all font-semibold"
                      value={addressFormData.email}
                      onChange={(e) =>
                        setAddressFormData({
                          ...addressFormData,
                          email: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
              </div>

              {/* Address Details Section */}
              <div className="bg-surface-bright border border-outline-variant/40 rounded-lg p-5 shadow-xs">
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-secondary mb-4">
                  Address Information
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="dashboard-address-pincode"
                      className="block text-[9px] uppercase font-bold text-secondary tracking-widest mb-1.5"
                    >
                      6-Digit Pincode*
                    </label>
                    <input
                      id="dashboard-address-pincode"
                      type="text"
                      required
                      placeholder="e.g. 560041"
                      className="w-full bg-surface-container-low border border-outline-variant/30 rounded-lg px-4 py-2.5 text-xs outline-none focus:border-primary transition-all font-semibold"
                      value={addressFormData.pincode}
                      onChange={(e) =>
                        setAddressFormData({
                          ...addressFormData,
                          pincode: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="dashboard-address-locality"
                      className="block text-[9px] uppercase font-bold text-secondary tracking-widest mb-1.5"
                    >
                      Locality / Sector*
                    </label>
                    <input
                      id="dashboard-address-locality"
                      type="text"
                      required
                      placeholder="e.g. Sector 4 / Jayanagar"
                      className="w-full bg-surface-container-low border border-outline-variant/30 rounded-lg px-4 py-2.5 text-xs outline-none focus:border-primary transition-all font-semibold"
                      value={addressFormData.locality}
                      onChange={(e) =>
                        setAddressFormData({
                          ...addressFormData,
                          locality: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label
                      htmlFor="dashboard-address-street"
                      className="block text-[9px] uppercase font-bold text-secondary tracking-widest mb-1.5"
                    >
                      Street Address & Building Details*
                    </label>
                    <textarea
                      id="dashboard-address-street"
                      required
                      placeholder="Flat, House no., Building, Apartment details"
                      className="w-full bg-surface-container-low border border-outline-variant/30 rounded-lg px-4 py-2.5 text-xs outline-none focus:border-primary transition-all min-h-[70px] font-semibold"
                      value={addressFormData.addressString}
                      onChange={(e) =>
                        setAddressFormData({
                          ...addressFormData,
                          addressString: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label
                      htmlFor="dashboard-address-landmark"
                      className="block text-[9px] uppercase font-bold text-secondary tracking-widest mb-1.5"
                    >
                      Landmark*
                    </label>
                    <input
                      id="dashboard-address-landmark"
                      type="text"
                      required
                      placeholder="e.g. Near LPU Gate 1"
                      className="w-full bg-surface-container-low border border-outline-variant/30 rounded-lg px-4 py-2.5 text-xs outline-none focus:border-primary transition-all font-semibold"
                      value={addressFormData.landmark}
                      onChange={(e) =>
                        setAddressFormData({
                          ...addressFormData,
                          landmark: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="dashboard-address-city"
                      className="block text-[9px] uppercase font-bold text-secondary tracking-widest mb-1.5"
                    >
                      City / District*
                    </label>
                    <input
                      id="dashboard-address-city"
                      type="text"
                      required
                      placeholder="City"
                      className="w-full bg-surface-container-low border border-outline-variant/30 rounded-lg px-4 py-2.5 text-xs outline-none focus:border-primary transition-all font-semibold"
                      value={addressFormData.city}
                      onChange={(e) =>
                        setAddressFormData({
                          ...addressFormData,
                          city: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="dashboard-address-state"
                      className="block text-[9px] uppercase font-bold text-secondary tracking-widest mb-1.5"
                    >
                      State*
                    </label>
                    <input
                      id="dashboard-address-state"
                      type="text"
                      required
                      placeholder="State"
                      className="w-full bg-surface-container-low border border-outline-variant/30 rounded-lg px-4 py-2.5 text-xs outline-none focus:border-primary transition-all font-semibold"
                      value={addressFormData.state}
                      onChange={(e) =>
                        setAddressFormData({
                          ...addressFormData,
                          state: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="dashboard-address-tag"
                      className="block text-[9px] uppercase font-bold text-secondary tracking-widest mb-1.5"
                    >
                      Destination Type
                    </label>
                    <select
                      id="dashboard-address-tag"
                      value={addressFormData.tag}
                      onChange={(e) =>
                        setAddressFormData({
                          ...addressFormData,
                          tag: e.target.value,
                        })
                      }
                      className="w-full bg-surface-container-low border border-outline-variant/30 rounded-lg px-3 py-2.5 text-xs outline-none focus:border-primary transition-all font-semibold cursor-pointer"
                    >
                      <option value="Home">Home</option>
                      <option value="Work">Work</option>
                      <option value="Venue">Venue</option>
                      <option value="Warehouse">Warehouse</option>
                    </select>
                  </div>
                </div>
              </div>
            </form>
          </div>

          {/* Sticky Action Footer */}
          <div className="bg-surface-bright border-t border-outline-variant/20 p-4 shadow-[0_-4px_10px_rgba(0,0,0,0.05)] mt-auto shrink-0 z-20 absolute bottom-0 left-0 right-0">
            <div className="w-full flex gap-4 max-w-lg mx-auto">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="button"
                onClick={() => setIsAddressModalOpen(false)}
                className="flex-1 bg-transparent text-on-surface font-bold uppercase tracking-widest text-[10px] py-3 rounded-full border border-outline-variant/40 hover:bg-surface-container-low transition-colors cursor-pointer"
              >
                Cancel
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                disabled={isAddressSaving}
                onClick={handleAddressSave}
                type="submit"
                className="flex-1 btn-primary py-3 rounded-full font-bold uppercase tracking-widest text-[10px] shadow-md flex justify-center items-center gap-1.5 disabled:opacity-75 cursor-pointer !text-white"
              >
                {isAddressSaving ? (
                  <div className="skeleton-box inline-block w-3 h-3 rounded-md animate-pulse" />
                ) : (
                  <>
                    <span className="material-symbols-outlined text-xs">save</span>
                    <span>{editingAddressId === 'new' ? 'Add Address' : 'Save Changes'}</span>
                  </>
                )}
              </motion.button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
