import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";

import { handleImageError } from "../utils/imageUtils";
import { useCheckout } from "./CheckoutProvider";


export default function CheckoutOrderSummaryStep() {
  const { activeStep, setActiveStep, activeSelectedAddress, activeItems, needByDate, setNeedByDate, isAddingNewAddress, settings, sendUpdatesToWhatsApp, setSendUpdatesToWhatsApp } = useCheckout();
  return (
    <>
      {/* Accordion Block 3: ORDER SUMMARY */}
      <motion.div
              layout
              className="bg-white border border-[#d0c5af]/40 rounded-lg overflow-hidden shadow-xs relative group"
            >


              {/* Header */}
              <motion.button
                whileTap={{
                  backgroundColor:
                    activeStep === 2
                      ? "var(--color-primary)"
                      : "var(--color-surface-container-low)",
                }}
                onClick={() => {
                  if (activeStep > 1) {
                    if (!activeSelectedAddress) {
                      toast.error("Please configure and select a delivery address first.");
                      return;
                    }
                    if (isAddingNewAddress) {
                      toast.error("Please save your new address or click cancel to proceed.");
                      return;
                    }
                    setActiveStep(2);
                  }
                }}
                aria-expanded={activeStep === 2}
                className={`w-full p-4 flex items-center justify-between cursor-pointer transition-colors ${
                  activeStep === 2
                    ? "bg-primary text-surface"
                    : "bg-surface-bright text-on-surface hover:bg-surface-container-low"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`w-5 h-5 font-bold text-xs rounded flex items-center justify-center transition-colors ${
                      activeStep === 2
                        ? "bg-surface text-primary"
                        : "bg-surface-container-low text-secondary"
                    }`}
                  >
                    3
                  </span>
                  <span
                    className={`text-xs font-bold uppercase tracking-wider transition-colors ${activeStep === 2 ? "text-surface" : "text-secondary"}`}
                  >
                    Order Summary
                  </span>
                  {activeStep > 2 && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="material-symbols-outlined text-base text-green-700 font-bold"
                    >
                      check
                    </motion.span>
                  )}
                </div>

                {activeStep > 2 && (
                  <span className="text-xs font-bold text-[var(--color-gold-dark)] hover:underline">
                    Change
                  </span>
                )}
              </motion.button>

              {/* Body */}
              <AnimatePresence mode="wait">
                {activeStep === 2 ? (
                  <motion.div
                    key="expanded-summary"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="p-4 sm:p-6 space-y-4 border-t border-[#f4f3f1] overflow-hidden relative"
                  >
                    {/* Line Items List - Premium Vertical Stack (Reverted from Horizontal Scroll) */}
                    <div className="space-y-3">
                      {activeItems.map((item) => (
                        <div
                          key={`summary-item-${item.id || item._id}`}
                          className="bg-[#fafafa] border border-outline-variant/35 rounded-2xl p-3 flex gap-4 relative select-none shadow-[0_2px_8px_rgba(0,0,0,0.02)]"
                        >
                          {/* Image Canvas */}
                          <div className="aspect-[4/5] w-[90px] rounded-xl overflow-hidden bg-[#FAF9F6] border border-black/5 relative shrink-0">
                            <img
                              onError={handleImageError}
                              src={item.imageSrc}
                              alt="Traditional wedding event decoration"
                              className="w-full h-full object-cover"
                              loading="lazy"
                              width={90}
                              height={112}
                            />
                            
                            {/* Quantity Indicator Overlap */}
                            <div className="absolute bottom-1.5 right-1.5 bg-black/75 backdrop-blur-xs text-white text-[9px] font-bold px-2 py-0.5 rounded-lg shadow-sm z-10 select-none">
                              Qty: {item.quantity}
                            </div>
                          </div>

                          {/* Details Metadata */}
                          <div className="pt-1 flex flex-col flex-1 text-xs min-w-0">
                            <span className="text-[9px] uppercase tracking-wider text-secondary font-bold truncate">
                              Seller: {item.seller || "Assured Craft Teams"}
                            </span>
                            <h4 className="font-bold text-[#1a1c1a] truncate leading-tight mt-0.5" title={item.title}>
                              {item.title}
                            </h4>

                            <div className="mt-2 flex items-baseline gap-1.5 flex-wrap">
                              <span className="font-bold text-xs text-[#1a1c1a]">
                                ₹{item.price.toLocaleString()}
                              </span>
                              {item.oldPrice > item.price && (
                                <span className="text-[10px] text-secondary line-through">
                                  ₹{item.oldPrice.toLocaleString()}
                                </span>
                              )}
                            </div>
                            
                            <span className="text-[9px] text-green-700 font-bold mt-1.5 block">
                              2 Offers Applied
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Order Tracking notification trigger checkbox */}
                    <div className="pt-4 border-t border-[#f4f3f1] flex flex-col gap-4">
                      <label className="flex items-start gap-2.5 text-xs select-none cursor-pointer">
                        <input
                          type="checkbox"
                          checked={sendUpdatesToWhatsApp}
                          onChange={(e) =>
                            setSendUpdatesToWhatsApp(e.target.checked)
                          }
                          className="mt-0.5 rounded text-[var(--color-gold-dark)] focus:ring-0 cursor-pointer transition-all"
                        />
                        <span className="text-secondary leading-normal">
                          Send dispatch alerts and scaper live credentials to
                          WhatsApp
                        </span>
                      </label>

                      <motion.button
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        type="button"
                        onClick={() => {
                          setActiveStep(3);
                        }}
                        className="w-full bg-[#fb641b] hover:bg-[#f2550a] text-white font-bold text-xs uppercase tracking-wider py-3.5 rounded shadow-xs transition-colors cursor-pointer text-center block"
                      >
                        Continue
                      </motion.button>
                    </div>
                  </motion.div>
                ) : (
                  /* Completed state snippet */
                  <motion.div
                    key="collapsed-summary"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="px-12 py-3 text-xs text-[#1a1c1a] border-t border-[#f4f3f1]"
                  >
                    <span>
                      {activeItems.length} handcrafted master decor selections
                      configured.
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
    </>
  );
}
