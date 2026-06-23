import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDashboard } from '../../context/DashboardContext';
import { userService } from '../../services/domainServices';
import { MandalaElement } from '../ui/MandalaElement';
import { useAddressManagement } from '../../hooks/useAddressManagement';
import { MapLocationPicker } from './MapLocationPicker';
import { AddressFormFields } from './AddressFormFields';

export function AddressModal() {
  const {
    user,
    isAddressModalOpen,
    setIsAddressModalOpen,
    editingAddressId,
    addresses,
    refetchDashboardData,
  } = useDashboard();

  const {
    addressFormData,
    setAddressFormData,
    isAddressSaving,
    isDetectingLocation,
    mapPosition,
    setMapPosition,
    handleAddressSave,
    fetchAddressFromCoords,
    handleFetchCurrentLocation,
  } = useAddressManagement({
    user,
    editingAddressId,
    addresses,
    userService,
    refetchDashboardData,
    setIsAddressModalOpen,
  });

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
                  <MapLocationPicker
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

              <AddressFormFields
                addressFormData={addressFormData}
                setAddressFormData={setAddressFormData}
              />
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
