import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";

import { handleImageError } from "../utils/imageUtils";
import { useCheckout } from "./CheckoutProvider";


export default function CheckoutAddressStep() {
  const { activeStep, setActiveStep, activeSelectedAddress, savedAddresses, setSavedAddresses, selectedAddressId, setSelectedAddressId, isAddingNewAddress, setIsAddingNewAddress, isDetectingLocation, newAddress, setNewAddress, sendUpdatesToWhatsApp, setSendUpdatesToWhatsApp, addressError, setAddressError, isProcessing, handleSaveNewAddress, handleFetchCurrentLocation, PINCODE_MAP, user } = useCheckout();
  return (
    <>
      {/* Accordion Block 2: DELIVERY ADDRESS */}
      <motion.div
              layout
              className="bg-surface-bright border border-outline-variant/40 rounded-lg overflow-hidden shadow-xs relative group"
            >


              {/* Accordion Header */}
              <motion.button
                whileTap={{
                  backgroundColor:
                    activeStep === 1
                      ? "var(--color-primary)"
                      : "var(--color-surface-container-low)",
                }}
                onClick={() => setActiveStep(1)}
                aria-expanded={activeStep === 1}
                className={`w-full p-4 flex items-center justify-between cursor-pointer transition-colors ${
                  activeStep === 1
                    ? "bg-primary text-surface"
                    : "bg-surface-bright text-on-surface hover:bg-surface-container-low"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`w-5 h-5 font-bold text-xs rounded flex items-center justify-center transition-colors ${
                      activeStep === 1
                        ? "bg-surface text-primary"
                        : "bg-surface-container-low text-secondary"
                    }`}
                  >
                    2
                  </span>
                  <span
                    className={`text-xs font-bold uppercase tracking-wider transition-colors ${activeStep === 1 ? "text-surface" : "text-secondary"}`}
                  >
                    Delivery Address
                  </span>
                  {activeStep > 1 && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="material-symbols-outlined text-base text-green-700 font-bold"
                    >
                      check
                    </motion.span>
                  )}
                </div>

                {activeStep > 1 && (
                  <span className="text-xs font-bold text-primary hover:underline">
                    Change
                  </span>
                )}
              </motion.button>

              {/* Accordion Content with liquid layout motion */}
              <AnimatePresence mode="wait">
                {activeStep === 1 ? (
                  <motion.div
                    key="expanded-addr"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="p-4 sm:p-6 space-y-4 overflow-hidden relative"
                  >


                    {/* Render Saved Address Selection Radio stack */}
                    <div className="space-y-3">
                      {savedAddresses.map((addr) => {
                        const addrId = addr._id || addr.id;
                        return (
                          <motion.label
                            layout
                            whileHover={{
                              scale: selectedAddressId === addrId ? 1 : 1.005,
                            }}
                            key={addrId}
                            className={`block p-4 rounded-lg border cursor-pointer transition-all relative ${
                              selectedAddressId === addrId
                                ? "bg-surface-bright border-primary ring-1 ring-primary"
                                : "bg-white border-outline-variant/50 hover:border-outline-variant"
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <input
                                type="radio"
                                name="delivery-address-radio"
                                checked={selectedAddressId === addrId}
                                onChange={() => {
                                  setSelectedAddressId(addrId);
                                  setIsAddingNewAddress(false);
                                }}
                                className="mt-1 text-primary focus:ring-0 cursor-pointer transition-all"
                              />
                              <div className="flex-1 min-w-0 text-xs">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-bold text-on-surface text-[10px] sm:text-xs">
                                    {addr.name}
                                  </span>
                                  <span className="bg-surface-container-low text-secondary text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                                    {addr.type}
                                  </span>
                                  <span className="font-bold text-on-surface ml-2 text-[10px] sm:text-xs">
                                    {addr.phone}
                                  </span>
                                </div>
                                <p className="text-secondary leading-relaxed">
                                  {addr.address}, {addr.locality}, {addr.city},{" "}
                                  {addr.state} -{" "}
                                  <span className="font-bold text-on-surface">
                                    {addr.pincode}
                                  </span>
                                </p>

                                {/* Active CTA inside active radial item */}
                                <AnimatePresence>
                                  {selectedAddressId === addrId &&
                                    !isAddingNewAddress && (
                                      <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: "auto" }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="mt-4 pt-3 border-t border-surface-container-low overflow-hidden"
                                      >
                                        <motion.button
                                          whileHover={{ scale: 1.02 }}
                                          whileTap={{ scale: 0.98 }}
                                          type="button"
                                          onClick={() => {
                                            if (!selectedAddressId) {
                                              toast.error("Please select a delivery address first.");
                                              return;
                                            }
                                            if (isAddingNewAddress) {
                                              toast.error("Please save your new address or click cancel to proceed.");
                                              return;
                                            }
                                            setActiveStep(2);
                                          }}
                                          className="bg-primary hover:bg-primary-hover text-surface font-bold text-xs uppercase tracking-wider px-6 py-2.5 rounded shadow-xs transition-colors cursor-pointer"
                                        >
                                          Deliver Here
                                        </motion.button>
                                      </motion.div>
                                    )}
                                </AnimatePresence>
                              </div>
                            </div>
                          </motion.label>
                        );
                      })}
                    </div>

                    {/* Add New Address Form Expansion toggle */}
                    <AnimatePresence mode="wait">
                      {!isAddingNewAddress ? (
                        <motion.button
                          key="btn-add-new"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          whileHover={{ scale: 1.005 }}
                          whileTap={{ scale: 0.995 }}
                          type="button"
                          onClick={() => setIsAddingNewAddress(true)}
                          className="w-full py-3 border border-dashed border-outline-variant text-primary font-bold text-xs uppercase tracking-wider rounded-lg hover:bg-surface-bright transition-colors text-left px-4 flex items-center gap-2 cursor-pointer block"
                        >
                          <span className="material-symbols-outlined text-base">
                            add
                          </span>
                          Add a new address
                        </motion.button>
                      ) : (
                        <motion.form
                          key="form-add-new"
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.25 }}
                          onSubmit={handleSaveNewAddress}
                          className="mt-6 pt-4 border-t border-outline-variant/40 space-y-4 overflow-hidden block"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                            <span className="text-xs font-bold uppercase tracking-wider text-primary">
                              Enter New Address Information
                            </span>
                            <motion.button
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              type="button"
                              onClick={handleFetchCurrentLocation}
                              disabled={isDetectingLocation}
                              className="inline-flex items-center justify-center gap-2 bg-primary/10 hover:bg-primary/20 text-primary font-bold text-xs uppercase tracking-wider px-4 py-2 rounded-lg border border-primary/20 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <span className={`material-symbols-outlined text-base ${isDetectingLocation ? 'animate-spin' : ''}`}>
                                {isDetectingLocation ? 'sync' : 'my_location'}
                              </span>
                              {isDetectingLocation ? 'Detecting Location...' : 'Use Current Location'}
                            </motion.button>
                          </div>
                          {addressError && (
                            <div className="p-3 bg-red-50 text-red-600 rounded text-[11px] font-semibold mb-4">
                              ⚠️ {addressError}
                            </div>
                          )}

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label
                                htmlFor="checkout-name"
                                className="block text-[10px] uppercase font-bold text-secondary mb-1"
                              >
                                Name
                              </label>
                              <input
                                id="checkout-name"
                                type="text"
                                required
                                autoComplete="name"
                                placeholder="Your full name"
                                value={newAddress.name}
                                onChange={(e) =>
                                  setNewAddress({
                                    ...newAddress,
                                    name: e.target.value,
                                  })
                                }
                                className="w-full bg-white border border-outline-variant rounded p-2 text-xs outline-none focus:border-primary transition-colors"
                              />
                            </div>
                            <div>
                              <label
                                htmlFor="checkout-phone"
                                className="block text-[10px] uppercase font-bold text-secondary mb-1"
                              >
                                10-digit Mobile Number
                              </label>
                              <input
                                id="checkout-phone"
                                type="tel"
                                required
                                autoComplete="tel"
                                placeholder="9876543210"
                                pattern="[0-9]{10}"
                                value={newAddress.phone}
                                onChange={(e) =>
                                  setNewAddress({
                                    ...newAddress,
                                    phone: e.target.value,
                                  })
                                }
                                className="w-full bg-white border border-outline-variant rounded p-2 text-xs outline-none focus:border-primary transition-colors"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label
                                htmlFor="checkout-alternate-phone"
                                className="block text-[10px] uppercase font-bold text-secondary mb-1"
                              >
                                Alternate Mobile Number (Optional)
                              </label>
                              <input
                                id="checkout-alternate-phone"
                                type="tel"
                                autoComplete="tel"
                                placeholder="Alternate mobile"
                                pattern="[0-9]{10}"
                                value={newAddress.alternatePhone}
                                onChange={(e) =>
                                  setNewAddress({
                                    ...newAddress,
                                    alternatePhone: e.target.value,
                                  })
                                }
                                className="w-full bg-white border border-outline-variant rounded p-2 text-xs outline-none focus:border-primary transition-colors"
                              />
                            </div>
                            <div>
                              <label
                                htmlFor="checkout-email"
                                className="block text-[10px] uppercase font-bold text-secondary mb-1"
                              >
                                Email Address *
                              </label>
                              <input
                                id="checkout-email"
                                type="email"
                                required
                                autoComplete="email"
                                placeholder="Email address"
                                value={newAddress.email}
                                onChange={(e) =>
                                  setNewAddress({
                                    ...newAddress,
                                    email: e.target.value,
                                  })
                                }
                                className="w-full bg-white border border-outline-variant rounded p-2 text-xs outline-none focus:border-primary transition-colors"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label
                                htmlFor="checkout-pincode"
                                className="block text-[10px] uppercase font-bold text-secondary mb-1"
                              >
                                Pincode
                              </label>
                              <input
                                id="checkout-pincode"
                                type="tel"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                required
                                autoComplete="postal-code"
                                placeholder="6-digit Pincode"
                                value={newAddress.pincode}
                                onChange={(e) => {
                                  const val = e.target.value
                                    .replace(/\D/g, "")
                                    .slice(0, 6);
                                  const updated = {
                                    ...newAddress,
                                    pincode: val,
                                  };
                                  // Auto-fill logic
                                  if (val.length === 6) {
                                    if (PINCODE_MAP[val]) {
                                      updated.city = PINCODE_MAP[val].city;
                                      updated.state = PINCODE_MAP[val].state;
                                    } else {
                                      // Real API Lookup with a 3-second timeout safeguard
                                      const controller = new AbortController();
                                      const timeoutId = setTimeout(() => controller.abort(), 3000);
                                      
                                      fetch(
                                        `https://api.postalpincode.in/pincode/${val}`,
                                        { signal: controller.signal }
                                      )
                                        .then((res) => res.json())
                                        .then((data) => {
                                          clearTimeout(timeoutId);
                                          if (
                                            data &&
                                            data[0] &&
                                            data[0].Status === "Success" &&
                                            data[0].PostOffice
                                          ) {
                                            const po = data[0].PostOffice[0];
                                            setNewAddress((prev) => ({
                                              ...prev,
                                              city: po.District,
                                              state: po.State,
                                            }));
                                          }
                                        })
                                        .catch((err) => {
                                          clearTimeout(timeoutId);
                                          logger.warn(
                                            "Pincode API Safeguard Triggered (Using manual entry fallback):",
                                            err
                                          );
                                        });
                                    }
                                  }
                                  setNewAddress(updated);
                                }}
                                className="w-full bg-white border border-outline-variant rounded p-2 text-xs outline-none focus:border-primary transition-colors"
                              />
                            </div>
                            <div>
                              <label
                                htmlFor="checkout-locality"
                                className="block text-[10px] uppercase font-bold text-secondary mb-1"
                              >
                                Locality / Town
                              </label>
                              <input
                                id="checkout-locality"
                                type="text"
                                required
                                autoComplete="address-level3"
                                placeholder="Locality"
                                value={newAddress.locality}
                                onChange={(e) =>
                                  setNewAddress({
                                    ...newAddress,
                                    locality: e.target.value,
                                  })
                                }
                                className="w-full bg-white border border-outline-variant rounded p-2 text-xs outline-none focus:border-primary transition-colors"
                              />
                            </div>
                          </div>

                          <div>
                            <label
                              htmlFor="checkout-address"
                              className="block text-[10px] uppercase font-bold text-secondary mb-1"
                            >
                              Address (Area and Street) *
                            </label>
                            <textarea
                              id="checkout-address"
                              rows="2"
                              required
                              autoComplete="street-address"
                              placeholder="House No, Building, Street, Area"
                              value={newAddress.address}
                              onChange={(e) =>
                                setNewAddress({
                                  ...newAddress,
                                  address: e.target.value,
                                })
                              }
                              className="w-full bg-white border border-outline-variant rounded p-2 text-xs outline-none focus:border-primary transition-colors"
                            />
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label
                                htmlFor="checkout-landmark"
                                className="block text-[10px] uppercase font-bold text-secondary mb-1"
                              >
                                Landmark *
                              </label>
                              <input
                                id="checkout-landmark"
                                type="text"
                                required
                                autoComplete="address-line2"
                                placeholder="E.g., near Appollo hospital"
                                value={newAddress.landmark}
                                onChange={(e) =>
                                  setNewAddress({
                                    ...newAddress,
                                    landmark: e.target.value,
                                  })
                                }
                                className="w-full bg-white border border-outline-variant rounded p-2 text-xs outline-none focus:border-primary transition-colors"
                              />
                            </div>
                            <div>
                              <label
                                htmlFor="checkout-country"
                                className="block text-[10px] uppercase font-bold text-secondary mb-1"
                              >
                                Country *
                              </label>
                              <input
                                id="checkout-country"
                                type="text"
                                required
                                autoComplete="country-name"
                                placeholder="Country name"
                                value={newAddress.country}
                                onChange={(e) =>
                                  setNewAddress({
                                    ...newAddress,
                                    country: e.target.value,
                                  })
                                }
                                className="w-full bg-white border border-outline-variant rounded p-2 text-xs outline-none focus:border-primary transition-colors"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label
                                htmlFor="checkout-city"
                                className="block text-[10px] uppercase font-bold text-secondary mb-1"
                              >
                                City / District
                              </label>
                              <input
                                id="checkout-city"
                                type="text"
                                required
                                autoComplete="address-level2"
                                placeholder="City"
                                value={newAddress.city}
                                onChange={(e) =>
                                  setNewAddress({
                                    ...newAddress,
                                    city: e.target.value,
                                  })
                                }
                                className="w-full bg-white border border-outline-variant rounded p-2 text-xs outline-none focus:border-primary transition-colors"
                              />
                            </div>
                            <div>
                              <label
                                htmlFor="checkout-state"
                                className="block text-[10px] uppercase font-bold text-secondary mb-1"
                              >
                                State
                              </label>
                              <input
                                id="checkout-state"
                                type="text"
                                required
                                autoComplete="address-level1"
                                placeholder="State"
                                value={newAddress.state}
                                onChange={(e) =>
                                  setNewAddress({
                                    ...newAddress,
                                    state: e.target.value,
                                  })
                                }
                                className="w-full bg-white border border-outline-variant rounded p-2 text-xs outline-none focus:border-primary transition-colors"
                              />
                            </div>
                          </div>

                          <div>
                            <label
                              htmlFor="checkout-instructions"
                              className="block text-[10px] uppercase font-bold text-secondary mb-1"
                            >
                              Delivery Instructions / Gate Codes (Optional)
                            </label>
                            <textarea
                              id="checkout-instructions"
                              rows="1"
                              placeholder="E.g. drop at security desk, call before coming"
                              value={newAddress.deliveryInstructions}
                              onChange={(e) =>
                                setNewAddress({
                                  ...newAddress,
                                  deliveryInstructions: e.target.value,
                                })
                              }
                              className="w-full bg-white border border-outline-variant rounded p-2 text-xs outline-none focus:border-primary transition-colors"
                            />
                          </div>

                          {/* Address Type configuration selectors */}
                          <div>
                            <label className="block text-[10px] uppercase font-bold text-secondary mb-1">
                              Address Type *
                            </label>
                            <div className="flex items-center gap-4 mt-1">
                              <label className="flex items-center gap-1.5 text-xs cursor-pointer select-none">
                                <input
                                  type="radio"
                                  name="addr-type-tag"
                                  checked={newAddress.type === "Home"}
                                  onChange={() =>
                                    setNewAddress({
                                      ...newAddress,
                                      type: "Home",
                                    })
                                  }
                                  className="text-primary focus:ring-0 cursor-pointer transition-all"
                                />
                                <span>Home (All day delivery)</span>
                              </label>
                              <label className="flex items-center gap-1.5 text-xs cursor-pointer select-none">
                                <input
                                  type="radio"
                                  name="addr-type-tag"
                                  checked={newAddress.type === "Work"}
                                  onChange={() =>
                                    setNewAddress({
                                      ...newAddress,
                                      type: "Work",
                                    })
                                  }
                                  className="text-primary focus:ring-0 cursor-pointer transition-all"
                                />
                                <span>
                                  Work (Delivery between 10 AM - 5 PM)
                                </span>
                              </label>
                            </div>
                          </div>

                          <div className="flex gap-3 pt-3">
                            <motion.button
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              type="submit"
                              className="bg-primary hover:bg-primary-hover text-surface font-bold text-xs uppercase tracking-wider px-6 py-2.5 rounded shadow-xs transition-colors cursor-pointer"
                            >
                              Save and Deliver Here
                            </motion.button>
                            <motion.button
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              type="button"
                              onClick={() => setIsAddingNewAddress(false)}
                              className="text-[#685c57] font-bold text-xs uppercase tracking-wider px-4 py-2.5 hover:underline cursor-pointer"
                            >
                              Cancel
                            </motion.button>
                          </div>
                        </motion.form>
                      )}
                    </AnimatePresence>
                  </motion.div>
                ) : (
                  /* Completed summary banner snippet */
                  <motion.div
                    key="collapsed-addr"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="px-12 py-3 text-xs text-[#1a1c1a] border-t border-[#f4f3f1] flex justify-between items-center"
                  >
                    <div className="line-clamp-1">
                      <span className="font-bold">
                        {activeSelectedAddress.name}
                      </span>{" "}
                      — {activeSelectedAddress.address},{" "}
                      {activeSelectedAddress.locality},{" "}
                      {activeSelectedAddress.city} -{" "}
                      <span className="font-bold">
                        {activeSelectedAddress.pincode}
                      </span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
    </>
  );
}
