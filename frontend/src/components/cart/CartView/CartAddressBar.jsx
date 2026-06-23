import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';

export function CartAddressBar({
  isAddressDropdownOpen,
  setIsAddressDropdownOpen,
  activeAddress,
  addresses,
  setDefaultAddress,
}) {
  return (
    <div
      className={`w-full bg-[#fbf9f6] border-b border-black/10 relative hover:bg-[#f6f2ea] transition-colors ${isAddressDropdownOpen ? 'z-50' : 'z-30'}`}
    >
      <div className="max-w-[1240px] mx-auto px-4 sm:px-8 relative">
        <div
          onClick={() => setIsAddressDropdownOpen(!isAddressDropdownOpen)}
          className="flex items-center justify-between py-3 cursor-pointer select-none"
        >
          <div className="flex items-center gap-2 min-w-0">
            <span className="material-symbols-outlined text-[18px] text-primary">location_on</span>
            <span className="text-[11px] md:text-xs text-[#1a1817] font-semibold truncate leading-none">
              {activeAddress
                ? `${activeAddress.name} - ${activeAddress.addressString || activeAddress.address}, ${activeAddress.locality || ''}, ${activeAddress.city}`
                : 'Add a delivery address'}
            </span>
          </div>
          <span className="material-symbols-outlined text-[18px] text-black/40">
            {isAddressDropdownOpen ? 'expand_less' : 'expand_more'}
          </span>
        </div>

        <AnimatePresence>
          {isAddressDropdownOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-full left-4 right-4 mt-1 bg-white border border-black/10 rounded-2xl shadow-xl z-50 p-3 max-h-60 overflow-y-auto"
            >
              <div className="text-[9px] uppercase tracking-wider font-bold text-black/40 px-2.5 pb-2 mb-1 border-b border-black/5">
                Select Destination
              </div>
              {addresses && addresses.length > 0 ? (
                addresses.map((addr) => (
                  <div
                    key={addr._id || addr.id}
                    onClick={() => {
                      setDefaultAddress(addr._id || addr.id);
                      setIsAddressDropdownOpen(false);
                    }}
                    className={`p-2.5 rounded-xl text-[11px] cursor-pointer hover:bg-neutral-50 transition-colors flex items-start gap-2 ${addr.isDefault ? 'bg-primary/5 text-primary font-bold' : 'text-black/70'}`}
                  >
                    <span className="material-symbols-outlined text-[14px] mt-0.5">
                      {addr.isDefault ? 'radio_button_checked' : 'radio_button_unchecked'}
                    </span>
                    <div className="min-w-0">
                      <div className="font-bold">
                        {addr.name} ({addr.tag})
                      </div>
                      <div className="truncate text-black/50 text-[10px]">
                        {addr.addressString || addr.address}, {addr.locality}, {addr.city}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-2.5 rounded-xl text-[11px] text-black/50 text-center">
                  No other addresses saved.
                </div>
              )}
              <div className="mt-2 pt-2 border-t border-black/5 flex justify-end">
                <Link
                  to="/dashboard?tab=addresses"
                  className="text-[10px] font-bold text-primary uppercase tracking-widest hover:underline flex items-center gap-1"
                >
                  Manage Addresses
                  <span className="material-symbols-outlined text-[12px]">arrow_forward</span>
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
