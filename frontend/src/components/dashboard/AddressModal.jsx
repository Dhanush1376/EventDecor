import { X, Save } from 'lucide-react';
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useDashboard } from '../../context/DashboardContext';
import { userService } from '../../services/domainServices';
import { MandalaElement } from '../ui/MandalaElement';
import { useAddressManagement } from '../../hooks/useAddressManagement';
import { useScrollLock } from '../../hooks/useScrollLock';
import { AddressFormFields } from './AddressFormFields';

export function AddressModal() {
  const [mounted, setMounted] = useState(false);
  const [maxModalHeight, setMaxModalHeight] = useState('90vh');
  const formContainerRef = useRef(null);

  useEffect(() => {
    setMounted(true);
  }, []);

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

  useScrollLock(isAddressModalOpen && !!addressFormData);

  // Dynamic visualViewport tracker for mobile virtual keyboard resizing
  useEffect(() => {
    if (!isAddressModalOpen || typeof window === 'undefined') return;

    const vv = window.visualViewport;
    if (!vv) return;

    const updateHeight = () => {
      const isMobile = window.innerWidth < 1024;
      if (isMobile) {
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
  }, [isAddressModalOpen]);

  // Smoothly scroll focused field into visible viewport when keyboard opens
  const handleFocusCapture = (e) => {
    const target = e.target;
    if (!target) return;
    const tag = target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
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

  if (!mounted || !isAddressModalOpen || !addressFormData) return null;

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] pointer-events-none">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setIsAddressModalOpen(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] pointer-events-auto"
        />

        {/* Modal Container */}
        <motion.div
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          style={{ maxHeight: maxModalHeight }}
          className="fixed bottom-0 left-0 right-0 lg:top-1/2 lg:left-1/2 lg:-translate-x-1/2 lg:-translate-y-1/2 lg:bottom-auto lg:max-w-2xl w-full flex flex-col z-[101] pointer-events-auto"
        >
          <div
            style={{ maxHeight: maxModalHeight }}
            className="w-full bg-white rounded-t-lg lg:rounded-lg shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)] overflow-hidden flex flex-col"
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

            {/* Modal Header */}
            <div className="bg-surface-bright z-10 pt-5 pb-4 px-6 flex justify-between items-center border-b border-outline-variant/20 rounded-t-lg shrink-0 relative">
              <h3 className="text-[11px] font-extrabold text-on-surface uppercase tracking-widest">
                {editingAddressId === 'new' ? 'Add New Site Parameters' : 'Modify Site Parameters'}
              </h3>
              <button
                type="button"
                onClick={() => setIsAddressModalOpen(false)}
                className="w-8 h-8 min-h-0 rounded-full bg-surface-container flex items-center justify-center text-secondary hover:text-primary transition-colors cursor-pointer border-0"
              >
                <X className="text-base" strokeWidth={1.5} />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <div
              ref={formContainerRef}
              onFocusCapture={handleFocusCapture}
              className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-6 relative z-10 pb-6"
            >
              <form id="dashboard-address-form" onSubmit={handleAddressSave} className="space-y-6">
                {/* Geolocation Section */}
                <div className="py-5 border-b border-outline-variant/20">
                  <div className="flex items-center justify-between mb-5">
                    <span className="text-[9px] font-bold uppercase tracking-widest text-secondary flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[12px]">pin_drop</span>
                      Location Coordinates
                    </span>
                    <button
                      type="button"
                      onClick={handleFetchCurrentLocation}
                      disabled={isDetectingLocation}
                      className="inline-flex items-center gap-1 text-[8px] text-primary font-bold uppercase tracking-widest bg-primary/5 hover:bg-primary/10 px-2.5 py-1 rounded-full cursor-pointer transition-all disabled:opacity-50"
                    >
                      <span className="material-symbols-outlined text-[10px] font-bold">
                        my_location
                      </span>
                      <span>{isDetectingLocation ? 'Detecting...' : 'Use Current Location'}</span>
                    </button>
                  </div>

                  {addressFormData.latitude && addressFormData.longitude && (
                    <motion.div
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-2 text-[10px] text-green-700 bg-green-50/50 px-3 py-1.5 rounded-lg font-bold uppercase tracking-wider inline-flex"
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

            {/* Non-Overlapping Action Footer */}
            <div className="bg-surface-bright border-t border-outline-variant/20 p-4 pb-[calc(1rem+var(--safe-area-bottom))] lg:pb-4 shadow-[0_-4px_10px_rgba(0,0,0,0.05)] shrink-0 z-20">
              <div className="w-full flex gap-4 max-w-lg mx-auto">
                <button
                  type="button"
                  onClick={() => setIsAddressModalOpen(false)}
                  className="flex-1 bg-surface-bright text-secondary py-3 rounded-[32px] font-bold uppercase tracking-widest text-[10px] shadow-sm border border-outline-variant/30 flex justify-center items-center cursor-pointer hover:bg-surface transition-colors"
                >
                  Cancel
                </button>
                <button
                  form="dashboard-address-form"
                  disabled={isAddressSaving}
                  onClick={handleAddressSave}
                  type="submit"
                  className="flex-1 bg-[#2A2927] hover:bg-black text-white px-6 py-3 rounded-[32px] font-bold uppercase tracking-widest text-[10px] inline-flex items-center justify-center gap-2 shadow-lg transition-all border-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isAddressSaving ? (
                    <div className="skeleton-box inline-block w-4 h-4 rounded-md animate-pulse" />
                  ) : (
                    <>
                      <Save className="text-[16px]" strokeWidth={1.5} />
                      <span>{editingAddressId === 'new' ? 'ADD ADDRESS' : 'SAVE CHANGES'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body,
  );
}
