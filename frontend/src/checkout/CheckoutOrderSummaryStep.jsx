import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { MandalaArtDecor } from "../components/ui/MandalaArtDecor";
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
              <MandalaArtDecor
                variant={1}
                size={300}
                className="absolute -top-10 -left-10 opacity-[0.02] group-hover:opacity-[0.05] transition-opacity pointer-events-none"
              />

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
                    {/* Need By Date Selector (Moved to Top for High Visibility) */}
                    <div className="bg-[#fff9e6] p-4 rounded-xl border border-[#ffe0b2] text-xs">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="material-symbols-outlined text-[var(--color-gold-dark)] text-sm">calendar_today</span>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-gold-dark)]">
                          Required Timeline Request *
                        </span>
                      </div>
                      <label htmlFor="need-by-date-input" className="block text-[11px] text-secondary leading-normal mb-2">
                        By when do you need this product? We recommend setting a date at least 5-7 days from today to ensure handcrafted perfection and smooth shipping delivery.
                      </label>
                      <input
                        id="need-by-date-input"
                        type="date"
                        min={new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]} // minimum tomorrow
                        value={needByDate}
                        onChange={(e) => setNeedByDate(e.target.value)}
                        className="w-full bg-white border border-[#ffe0b2] rounded p-2.5 text-xs outline-none focus:border-primary transition-colors font-sans text-on-surface"
                        required
                      />
                    </div>

                    {/* Line Items List */}
                    <div className="space-y-4 divide-y divide-[#f4f3f1]">
                      {activeItems.map((item) => (
                        <div
                          key={`summary-item-${item.id}`}
                          className="pt-4 first:pt-0 flex gap-4"
                        >
                          <img
                            onError={handleImageError}
                            src={item.imageSrc}
                            alt="Traditional wedding event decoration"
                            className="w-16 h-20 bg-[#f4f3f1] rounded object-cover flex-shrink-0"
                            loading="lazy"
                            width={64}
                            height={80}
                          />

                          <div className="flex-1 min-w-0 text-xs">
                            <h4 className="font-bold text-[#1a1c1a] line-clamp-1">
                              {item.title}
                            </h4>
                            <span className="text-[11px] text-[#685c57] block mt-0.5">
                              Seller: {item.seller || "Assured Craft Teams"}
                            </span>

                            <div className="flex items-baseline gap-2 mt-2">
                              <span className="font-bold text-sm text-[#1a1c1a]">
                                ₹{item.price.toLocaleString()}
                              </span>
                              {item.oldPrice > item.price && (
                                <span className="text-[11px] text-[#685c57] line-through">
                                  ₹{item.oldPrice.toLocaleString()}
                                </span>
                              )}
                              <span className="text-[10px] text-green-700 font-bold">
                                2 Offer Applied
                              </span>
                            </div>

                            <div className="mt-1 text-[11px] text-[#685c57]">
                              Quantity setup allocation:{" "}
                              <strong className="text-[#1a1c1a]">
                                {item.quantity}
                              </strong>
                            </div>
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
                          if (!needByDate) {
                            toast.error("Please select a Required Timeline Request date");
                            return;
                          }
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
