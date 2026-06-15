import { motion, AnimatePresence } from 'framer-motion';
import { useDashboard } from '../../context/DashboardContext';
import { MandalaElement } from '../ui/MandalaElement';

export function AddressModal() {
  const {
    isAddressModalOpen,
    setIsAddressModalOpen,
    editingAddressId,
    addressFormData,
    setAddressFormData,
    isAddressSaving,
    isDetectingLocation,
    handleAddressSave,
    handleUseCurrentLocation,
  } = useDashboard();

  if (!isAddressModalOpen || !addressFormData) return null;

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
          className="fixed bottom-0 left-0 right-0 lg:top-1/2 lg:left-1/2 lg:-translate-x-1/2 lg:-translate-y-1/2 lg:bottom-auto lg:max-w-lg w-full bg-white rounded-t-lg lg:rounded-lg shadow-2xl z-[101] overflow-hidden"
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

          <div className="p-6 relative z-10">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-display text-lg text-on-surface uppercase tracking-wider">
                {editingAddressId === 'new' ? 'Add New Site Parameters' : 'Modify Site Parameters'}
              </h3>
              <button
                type="button"
                onClick={() => setIsAddressModalOpen(false)}
                className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-secondary hover:text-primary transition-colors cursor-pointer border-0"
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>

            <form onSubmit={handleAddressSave} className="space-y-4">
              {/* Premium GPS Geotargeting Action */}
              <div className="flex items-center justify-between pb-2 border-b border-outline-variant/15">
                <span className="text-[9px] font-bold uppercase tracking-widest text-secondary flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-xs">pin_drop</span>
                  Location Coordinates
                </span>
                <button
                  type="button"
                  onClick={handleUseCurrentLocation}
                  disabled={isDetectingLocation}
                  className="inline-flex items-center gap-1.5 text-[9px] text-primary font-bold uppercase tracking-widest bg-primary/5 hover:bg-primary/10 border border-primary/20 px-3.5 py-1.5 rounded-lg cursor-pointer transition-all disabled:opacity-50 shadow-xs"
                >
                  {isDetectingLocation ? (
                    <>
                      <div className="skeleton-box inline-block w-3 h-3 rounded-md" />
                      <span>Locating...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[12px] font-bold">
                        my_location
                      </span>
                      <span>Use Current Location</span>
                    </>
                  )}
                </button>
              </div>

              {/* Render Geolocation Pill Badge */}
              {addressFormData.latitude && addressFormData.longitude && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 text-[10px] text-green-700 bg-green-50 border border-green-200 px-3 py-1.5 rounded-lg font-bold uppercase tracking-wider"
                >
                  <span className="material-symbols-outlined text-xs">share_location</span>
                  <span>
                    GPS Locked: {addressFormData.latitude.toFixed(6)},{' '}
                    {addressFormData.longitude.toFixed(6)}
                  </span>
                </motion.div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="dashboard-address-name"
                    className="block text-[9px] uppercase font-bold text-secondary tracking-widest mb-1"
                  >
                    Receiver Full Name
                  </label>
                  <input
                    id="dashboard-address-name"
                    type="text"
                    required
                    autoComplete="name"
                    placeholder="John Doe"
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
                    className="block text-[9px] uppercase font-bold text-secondary tracking-widest mb-1"
                  >
                    Contact Phone Number
                  </label>
                  <input
                    id="dashboard-address-phone"
                    type="tel"
                    required
                    autoComplete="tel"
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
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="dashboard-address-pincode"
                    className="block text-[9px] uppercase font-bold text-secondary tracking-widest mb-1"
                  >
                    6-Digit Pincode
                  </label>
                  <input
                    id="dashboard-address-pincode"
                    type="text"
                    required
                    autoComplete="postal-code"
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
                    className="block text-[9px] uppercase font-bold text-secondary tracking-widest mb-1"
                  >
                    Locality / Sector
                  </label>
                  <input
                    id="dashboard-address-locality"
                    type="text"
                    required
                    autoComplete="address-level3"
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
              </div>

              <div>
                <label
                  htmlFor="dashboard-address-street"
                  className="block text-[9px] uppercase font-bold text-secondary tracking-widest mb-1"
                >
                  Street Address & Building Details
                </label>
                <textarea
                  id="dashboard-address-street"
                  required
                  autoComplete="street-address"
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

              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-1">
                  <label
                    htmlFor="dashboard-address-city"
                    className="block text-[9px] uppercase font-bold text-secondary tracking-widest mb-1"
                  >
                    City / District
                  </label>
                  <input
                    id="dashboard-address-city"
                    type="text"
                    required
                    autoComplete="address-level2"
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
                <div className="col-span-1">
                  <label
                    htmlFor="dashboard-address-state"
                    className="block text-[9px] uppercase font-bold text-secondary tracking-widest mb-1"
                  >
                    State
                  </label>
                  <input
                    id="dashboard-address-state"
                    type="text"
                    required
                    autoComplete="address-level1"
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
                <div className="col-span-1">
                  <label className="block text-[9px] uppercase font-bold text-secondary tracking-widest mb-1">
                    Destination Type
                  </label>
                  <select
                    value={addressFormData.tag}
                    onChange={(e) =>
                      setAddressFormData({
                        ...addressFormData,
                        tag: e.target.value,
                      })
                    }
                    className="w-full bg-surface-container-low border border-outline-variant/30 rounded-lg px-2 py-2.5 text-xs outline-none focus:border-primary transition-all font-semibold cursor-pointer"
                  >
                    <option value="Home">Home</option>
                    <option value="Work">Work</option>
                    <option value="Venue">Venue</option>
                    <option value="Warehouse">Warehouse</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-4 pt-4">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  disabled={isAddressSaving}
                  type="submit"
                  className="flex-1 btn-primary py-3 rounded-full font-bold uppercase tracking-widest text-[10px] cursor-pointer inline-flex items-center justify-center gap-1.5"
                >
                  {isAddressSaving ? (
                    <div className="skeleton-box inline-block w-3 h-3 rounded-md" />
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-xs">save</span>
                      <span>{editingAddressId === 'new' ? 'Add Address' : 'Save Changes'}</span>
                    </>
                  )}
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="button"
                  onClick={() => setIsAddressModalOpen(false)}
                  className="flex-1 btn-outline py-3 rounded-full font-bold uppercase tracking-widest text-[10px] cursor-pointer"
                >
                  Cancel
                </motion.button>
              </div>
            </form>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
