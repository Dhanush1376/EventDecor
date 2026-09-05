import AlertTriangle from 'lucide-react/dist/esm/icons/alert-triangle';
import { m as motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { LocationMarker } from './LocationMarker';
import { useScrollLock } from '../../../hooks/useScrollLock';

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
  useScrollLock(isAddingNewAddress);

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
            className="fixed bottom-0 left-0 right-0 lg:top-0 lg:bottom-0 lg:my-auto lg:h-fit lg:rounded-2xl lg:overflow-hidden z-[101] bg-surface-container-low rounded-t-2xl sm:rounded-t-3xl max-h-[90vh] w-full max-w-[800px] mx-auto shadow-2xl flex flex-col"
          >
            <div className="bg-surface-bright z-10 pt-5 pb-4 px-6 flex justify-between items-center border-b border-outline-variant/20 rounded-t-2xl sm:rounded-t-3xl lg:rounded-t-none shrink-0">
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
                  <div className="py-6 border-b border-outline-variant/20">
                    <h2 className="text-[9px] font-bold uppercase tracking-widest text-secondary flex items-center gap-1.5 mb-5">
                      <span className="material-symbols-outlined text-[12px]">person</span>
                      Contact Details
                    </h2>
                    <div className="flex flex-col gap-5">
                      <div className="grid grid-cols-2 gap-4">
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
                          <label className="form-label">Email Address</label>
                          <input
                            type="email"
                            placeholder="Enter email address"
                            value={newAddress.email}
                            onChange={(e) =>
                              setNewAddress({ ...newAddress, email: e.target.value })
                            }
                            className="form-field"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="form-label">Phone Number*</label>
                          <input
                            type="tel"
                            required
                            pattern="[0-9]{10}"
                            title="Please enter exactly 10 digits"
                            placeholder="10-digit mobile number"
                            value={newAddress.phone}
                            onChange={(e) =>
                              setNewAddress({ ...newAddress, phone: e.target.value })
                            }
                            className="form-field"
                          />
                        </div>
                        <div>
                          <label className="form-label">Alternate Number</label>
                          <input
                            type="tel"
                            pattern="[0-9]{10}"
                            title="Please enter exactly 10 digits if providing an alternate number"
                            placeholder="Optional alternate number"
                            value={newAddress.alternatePhone}
                            onChange={(e) =>
                              setNewAddress({ ...newAddress, alternatePhone: e.target.value })
                            }
                            className="form-field"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="py-6 border-b border-outline-variant/20">
                    <div className="flex items-center justify-between mb-5">
                      <h2 className="text-[9px] font-bold uppercase tracking-widest text-secondary flex items-center gap-1.5 m-0">
                        <span className="material-symbols-outlined text-[12px]">home</span>
                        Address Details
                      </h2>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          toast.loading('Finding you...', { id: 'gps' });
                          if (navigator.geolocation) {
                            const getPosition = (highAccuracy = true) => {
                              navigator.geolocation.getCurrentPosition(
                                (pos) => {
                                  const { latitude, longitude } = pos.coords;
                                  setMapPosition({ lat: latitude, lng: longitude });
                                  fetchAddressFromCoords(latitude, longitude);
                                  toast.success('Location found!', { id: 'gps' });
                                },
                                (err) => {
                                  if (
                                    highAccuracy &&
                                    (err.code === err.TIMEOUT ||
                                      err.code === err.POSITION_UNAVAILABLE)
                                  ) {
                                    toast.loading('Retrying with standard accuracy...', {
                                      id: 'gps',
                                    });
                                    getPosition(false);
                                  } else {
                                    let errorMsg = 'Could not access GPS';
                                    if (err.code === err.PERMISSION_DENIED) {
                                      errorMsg = window.isSecureContext
                                        ? 'Location permission denied. Please allow access.'
                                        : 'Location requires a secure connection (HTTPS).';
                                    } else if (err.code === err.TIMEOUT) {
                                      errorMsg = 'Location request timed out.';
                                    }
                                    toast.error(errorMsg, { id: 'gps' });
                                  }
                                },
                                {
                                  enableHighAccuracy: highAccuracy,
                                  timeout: highAccuracy ? 10000 : 20000,
                                  maximumAge: highAccuracy ? 0 : 60000,
                                },
                              );
                            };
                            getPosition(true);
                          } else {
                            toast.error('Geolocation not supported by this browser', {
                              id: 'gps',
                            });
                          }
                        }}
                        className="inline-flex items-center gap-1 text-[8px] text-white font-bold uppercase tracking-widest bg-[#1a1a1a] hover:bg-black px-2.5 py-1.5 rounded-full cursor-pointer transition-all shadow-sm"
                      >
                        <span className="material-symbols-outlined text-[10px] font-bold">
                          my_location
                        </span>
                        <span>Use Current Location</span>
                      </button>
                    </div>

                    <div className="w-full h-48 bg-surface-container-low rounded-lg mb-4 relative overflow-hidden border border-outline-variant/30 z-0">
                      <LocationMarker
                        position={mapPosition}
                        setPosition={setMapPosition}
                        fetchAddressFromCoords={fetchAddressFromCoords}
                      />
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

                    <div className="flex flex-col gap-5">
                      <div className="grid grid-cols-2 gap-4">
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
                                          postOffice.District ||
                                          postOffice.Block ||
                                          postOffice.Region,
                                        state: postOffice.State,
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
                      </div>

                      <div>
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

                      <div>
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

                      <div className="grid grid-cols-2 gap-4">
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
                            onChange={(e) =>
                              setNewAddress({ ...newAddress, state: e.target.value })
                            }
                            className="form-field uppercase"
                          />
                        </div>
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
                  className="flex-1 bg-[#282828] hover:bg-black text-white py-3 rounded-full font-bold uppercase tracking-widest text-[10px] shadow-md flex justify-center transition-colors disabled:opacity-70 cursor-pointer"
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
