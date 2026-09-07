import { useState, useEffect, useRef } from 'react';
import AlertTriangle from 'lucide-react/dist/esm/icons/alert-triangle';
import { m as motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { useScrollLock } from '../../../hooks/useScrollLock';
import { sanitizePhoneNumber } from '../../../utils/phoneUtils';
import { detectAndResolveAddress } from '../../../utils/locationService';

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
  useScrollLock(isAddingNewAddress);

  const formContainerRef = useRef(null);
  const [maxModalHeight, setMaxModalHeight] = useState('90vh');
  const [isInternalLocating, setIsInternalLocating] = useState(false);

  // Dynamic visualViewport tracker for mobile virtual keyboard resizing
  useEffect(() => {
    if (!isAddingNewAddress || typeof window === 'undefined') return;

    const vv = window.visualViewport;
    if (!vv) return;

    const updateHeight = () => {
      const isMobile = window.innerWidth < 1024;
      if (isMobile) {
        // Dynamically clamp modal height so the entire modal and footer fit within the visual viewport
        const availableHeight = vv.height;
        const targetHeight = Math.max(260, Math.floor(availableHeight * 0.94));
        setMaxModalHeight(`${targetHeight}px`);
      } else {
        setMaxModalHeight('90vh');
      }
    };

    updateHeight();
    vv.addEventListener('resize', updateHeight);
    vv.addEventListener('scroll', updateHeight);

    return () => {
      vv.removeEventListener('resize', updateHeight);
      vv.removeEventListener('scroll', updateHeight);
    };
  }, [isAddingNewAddress]);

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

  const handleLocationClick = async (e) => {
    e.preventDefault();
    if (typeof handleAutofillLocation === 'function') {
      await handleAutofillLocation();
      return;
    }

    try {
      setIsInternalLocating(true);
      toast.loading('Detecting your location...', { id: 'gps' });
      const res = await detectAndResolveAddress();
      if (res.success && res.data) {
        const d = res.data;
        if (d.latitude && d.longitude) {
          setMapPosition({ lat: d.latitude, lng: d.longitude });
        }
        setNewAddress((prev) => ({
          ...prev,
          latitude: d.latitude ?? prev.latitude,
          longitude: d.longitude ?? prev.longitude,
          pincode: d.pincode || prev.pincode,
          city: d.city || prev.city,
          state: d.state || prev.state,
          locality: d.locality || prev.locality,
          address: d.address || prev.address,
          landmark: d.landmark || prev.landmark,
        }));
        const msg =
          res.source === 'gps'
            ? 'Location auto-filled from GPS!'
            : 'Location detected from network!';
        toast.success(msg, { id: 'gps' });
      } else {
        toast.error(res.error || 'Could not detect location. Please fill manually.', { id: 'gps' });
      }
    } catch {
      toast.error('Location detection failed. Please fill manually.', { id: 'gps' });
    } finally {
      setIsInternalLocating(false);
    }
  };

  const isLocating = isResolvingLocation || isInternalLocating;

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
            style={{ maxHeight: maxModalHeight }}
            className="fixed bottom-0 left-0 right-0 lg:top-0 lg:bottom-0 lg:my-auto lg:h-fit lg:rounded-2xl lg:overflow-hidden z-[101] bg-surface-container-low rounded-t-2xl sm:rounded-t-3xl w-full max-w-[800px] mx-auto shadow-2xl flex flex-col"
          >
            {/* Modal Header */}
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

            {/* Scrollable Form Body */}
            <div
              ref={formContainerRef}
              onFocusCapture={handleFocusCapture}
              className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-6 pb-6"
            >
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
                      <div className="grid grid-cols-2 gap-4">
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

                  <div className="py-6 border-b border-outline-variant/20">
                    <div className="flex items-center justify-between mb-5">
                      <h2 className="text-[9px] font-bold uppercase tracking-widest text-secondary flex items-center gap-1.5 m-0">
                        <span className="material-symbols-outlined text-[12px]">home</span>
                        Address Details
                      </h2>
                      <button
                        type="button"
                        disabled={isLocating}
                        onClick={handleLocationClick}
                        className="inline-flex items-center gap-1 text-[8px] text-white font-bold uppercase tracking-widest bg-[#1a1a1a] hover:bg-black px-2.5 py-1.5 rounded-full cursor-pointer transition-all shadow-sm disabled:opacity-50"
                      >
                        <span className="material-symbols-outlined text-[10px] font-bold">
                          my_location
                        </span>
                        <span>{isLocating ? 'Locating...' : 'Use Current Location'}</span>
                      </button>
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
                            setNewAddress((prev) => ({ ...prev, landmark: e.target.value }))
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

                    <div className="sm:col-span-2 mb-4">
                      <label className="form-label">Delivery Instructions</label>
                      <textarea
                        placeholder="E.g. Leave with security, call before delivery"
                        value={newAddress.deliveryInstructions}
                        onChange={(e) =>
                          setNewAddress((prev) => ({
                            ...prev,
                            deliveryInstructions: e.target.value,
                          }))
                        }
                        className="form-field min-h-[70px]"
                      />
                    </div>

                    <label className="flex items-center gap-2 cursor-pointer mt-2 select-none">
                      <input
                        type="checkbox"
                        checked={newAddress.isDefault || false}
                        onChange={(e) =>
                          setNewAddress((prev) => ({ ...prev, isDefault: e.target.checked }))
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

            {/* Modal Footer: Non-overlapping, pinned at bottom of modal flex container */}
            <div className="bg-surface-bright border-t border-outline-variant/20 p-4 shadow-[0_-4px_10px_rgba(0,0,0,0.05)] shrink-0 z-20">
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
