import { AlertTriangle } from 'lucide-react';
import { m as motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
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
}) {
  return (
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
              <h2 className="text-[11px] font-extrabold text-on-surface uppercase tracking-widest">
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
                    <div className="flex items-start gap-3 p-3 bg-red-50 text-red-600 rounded text-[11px] mb-2">
                      <AlertTriangle
                        className="w-5 h-5 shrink-0 text-red-600 mt-0.5"
                        aria-hidden="true"
                      />
                      <span className="font-semibold flex-1">{addressError}</span>
                    </div>
                  )}

                  <div className="py-6 border-b border-outline-variant/20">
                    <h2 className="text-[9px] font-bold uppercase tracking-widest text-secondary flex items-center gap-1.5 mb-5">
                      <span className="material-symbols-outlined text-[12px]">person</span>
                      Contact Details
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div>
                        <label className="form-label">Receiver Full Name*</label>
                        <input
                          type="text"
                          required
                          placeholder="Receiver full name"
                          value={newAddress.name}
                          onChange={(e) => setNewAddress({ ...newAddress, name: e.target.value })}
                          className="form-field"
                        />
                      </div>
                      <div>
                        <label className="form-label">Contact Phone Number*</label>
                        <input
                          type="tel"
                          required
                          pattern="[0-9]{10}"
                          placeholder="10-digit mobile number"
                          value={newAddress.phone}
                          onChange={(e) => setNewAddress({ ...newAddress, phone: e.target.value })}
                          className="form-field"
                        />
                      </div>
                      <div>
                        <label className="form-label">Alternate Phone Number</label>
                        <input
                          type="tel"
                          placeholder="Optional alternate number"
                          value={newAddress.alternatePhone}
                          onChange={(e) =>
                            setNewAddress({ ...newAddress, alternatePhone: e.target.value })
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
                          onChange={(e) => setNewAddress({ ...newAddress, email: e.target.value })}
                          className="form-field"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="py-6 border-b border-outline-variant/20">
                    <h2 className="text-[9px] font-bold uppercase tracking-widest text-secondary flex items-center gap-1.5 mb-5">
                      <span className="material-symbols-outlined text-[12px]">home</span>
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
                                (_err) => {
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
                        <label className="form-label">6-Digit Pincode*</label>
                        <input
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
                            setNewAddress({ ...newAddress, locality: e.target.value })
                          }
                          className="form-field"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="form-label">Street Address & Building Details*</label>
                        <textarea
                          required
                          placeholder="Flat, House no., Building, Apartment details"
                          value={newAddress.address}
                          onChange={(e) =>
                            setNewAddress({ ...newAddress, address: e.target.value })
                          }
                          className="form-field min-h-[70px]"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="form-label">Landmark</label>
                        <input
                          type="text"
                          placeholder="e.g. Near Apollo Hospital"
                          value={newAddress.landmark}
                          onChange={(e) =>
                            setNewAddress({ ...newAddress, landmark: e.target.value })
                          }
                          className="form-field"
                        />
                      </div>

                      <div>
                        <label className="form-label">City / District*</label>
                        <input
                          type="text"
                          required
                          placeholder="City"
                          value={newAddress.city}
                          onChange={(e) => setNewAddress({ ...newAddress, city: e.target.value })}
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
                          onChange={(e) => setNewAddress({ ...newAddress, state: e.target.value })}
                          className="form-field uppercase"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="py-6">
                    <h2 className="text-[9px] font-bold uppercase tracking-widest text-secondary flex items-center gap-1.5 mb-5">
                      <span className="material-symbols-outlined text-[12px]">local_shipping</span>
                      Destination & Options
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-4">
                      <div>
                        <label className="form-label">Destination Type</label>
                        <select
                          value={newAddress.tag}
                          onChange={(e) => setNewAddress({ ...newAddress, tag: e.target.value })}
                          className="form-field cursor-pointer"
                        >
                          <option value="Home">Home</option>
                          <option value="Work">Work</option>
                          <option value="Venue">Venue</option>
                          <option value="Warehouse">Warehouse</option>
                        </select>
                      </div>
                    </div>

                    <div className="sm:col-span-2 mb-4">
                      <label className="form-label">Delivery Instructions</label>
                      <textarea
                        placeholder="E.g. Leave with security, call before delivery"
                        value={newAddress.deliveryInstructions}
                        onChange={(e) =>
                          setNewAddress({ ...newAddress, deliveryInstructions: e.target.value })
                        }
                        className="form-field min-h-[70px]"
                      />
                    </div>

                    <label className="flex items-center gap-2 cursor-pointer mt-2 select-none">
                      <input
                        type="checkbox"
                        checked={newAddress.isDefault || false}
                        onChange={(e) =>
                          setNewAddress({ ...newAddress, isDefault: e.target.checked })
                        }
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
}
