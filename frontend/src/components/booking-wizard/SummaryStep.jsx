import React from 'react';
import { m as motion } from 'framer-motion';

export function SummaryStep({ formData, activePackage }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      className="space-y-8"
    >
      <div className="space-y-2">
        <h3 className="font-display text-[20px] md:text-[28px] text-black font-semibold">
          Review Your Event Summary
        </h3>
        <p className="font-body text-black/45 text-[12px] md:text-[13px]">
          Review your itemized package selection, logistics dates, and estimated initial milestone
          deposit.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        {/* Left: Summary */}
        <div className="space-y-4 bg-stone-50 rounded-[20px] p-6 border border-black/5">
          <h4 className="font-display text-base text-black font-bold border-b border-black/5 pb-2">
            Operational Scope
          </h4>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-black/45">Occasion Type:</span>
              <span className="text-black font-semibold capitalize">
                {formData.eventType === 'other'
                  ? formData.customOccasion || 'Other'
                  : formData.eventType}
              </span>
            </div>
            {activePackage && (
              <div className="flex justify-between">
                <span className="text-black/45">Curated Theme:</span>
                <span className="text-black font-semibold">{activePackage.title}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-black/45">Target Date:</span>
              <span className="text-black font-semibold">{formData.date || 'Not Selected'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-black/45">Target Timing:</span>
              <span className="text-black font-semibold">
                {formData.timing.start} - {formData.timing.end}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-black/45">Destination Address:</span>
              <span className="text-black font-semibold text-right truncate max-w-[180px]">
                {formData.venue.address || 'Not Entered'}
              </span>
            </div>
          </div>

          <h4 className="font-display text-base text-black font-bold border-b border-black/5 pt-4 pb-2">
            Customizations
          </h4>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-black/45">Floral Garlands:</span>
              <span className="text-black font-semibold text-right truncate max-w-[180px]">
                {formData.customization.floralPreference}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-black/45">Color Palette:</span>
              <span className="text-black font-semibold text-right truncate max-w-[180px]">
                {formData.customization.themeColor}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-black/45">Lighting Profile:</span>
              <span className="text-black font-semibold text-right truncate max-w-[180px]">
                {formData.customization.lightingPreference}
              </span>
            </div>
          </div>
        </div>

        {/* Right: Itemized pricing estimates */}
        <div className="space-y-6 bg-[#fcfbf9] rounded-[20px] p-6 border border-black/5">
          <h4 className="font-display text-base text-black font-bold border-b border-black/5 pb-2">
            Preliminary Estimate
          </h4>
          <div className="space-y-3 text-xs">
            <div className="flex justify-between">
              <span className="text-black/50">Decor Setup & Rental Fee:</span>
              <span className="text-black font-semibold">
                ₹
                {(formData.eventPackageId
                  ? activePackage
                    ? parseInt(activePackage.pricing.replace(/[^0-9]/g, '')) || 35000
                    : 35000
                  : 25000
                ).toLocaleString('en-IN')}
              </span>
            </div>
            {formData.selectedAddons?.map((addon) => (
              <div key={addon.name} className="flex justify-between">
                <span className="text-black/50">+ {addon.name}:</span>
                <span className="text-black font-semibold">
                  ₹{addon.price.toLocaleString('en-IN')}
                </span>
              </div>
            ))}
            <div className="flex justify-between">
              <span className="text-black/50">+ Transportation & Setup:</span>
              <span className="text-primary font-bold tracking-wider uppercase">
                Calculated after admin review
              </span>
            </div>

            <div className="border-t border-black/5 pt-4 flex justify-between items-end">
              <span className="font-display text-base text-black font-bold">
                Total Initial Price:
              </span>
              <span className="font-display text-xl text-black font-bold italic line-through opacity-50">
                ₹
                {(
                  (formData.eventPackageId
                    ? activePackage
                      ? parseInt(
                          activePackage.pricing?.replace(/[^0-9]/g, '') ||
                            activePackage.basePrice ||
                            35000,
                        )
                      : 35000
                    : 25000) + formData.selectedAddons?.reduce((acc, curr) => acc + curr.price, 0)
                ).toLocaleString('en-IN')}
              </span>
            </div>
            <div className="flex justify-between items-end mt-1">
              <span className="font-display text-sm text-primary font-bold">
                Advance Deposit to Reserve (50%):
              </span>
              <span className="font-display text-2xl text-primary font-bold italic">
                ₹
                {Math.round(
                  ((formData.eventPackageId
                    ? activePackage
                      ? parseInt(
                          activePackage.pricing?.replace(/[^0-9]/g, '') ||
                            activePackage.basePrice ||
                            35000,
                        )
                      : 35000
                    : 25000) +
                    formData.selectedAddons?.reduce((acc, curr) => acc + curr.price, 0)) *
                    0.5,
                ).toLocaleString('en-IN')}
              </span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
