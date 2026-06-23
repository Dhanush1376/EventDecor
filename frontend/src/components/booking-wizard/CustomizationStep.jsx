import React from 'react';
import { m as motion } from 'framer-motion';
import { ADDON_PROPS } from '../../config/constants';

export function CustomizationStep({ formData, handleNestedInputChange, handleAddonChange }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      className="space-y-8"
    >
      <div className="space-y-2">
        <h3 className="font-display text-[20px] md:text-[28px] text-black font-semibold">
          Extra Decorations & Setup Options
        </h3>
        <p className="font-body text-black/45 text-[12px] md:text-[13px]">
          Define color swatches and lighting profiles or add standalone prop rentals.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Theme Colors */}
        <div className="space-y-2">
          <label className="font-label text-[10px] uppercase tracking-wider text-black/50 font-bold block">
            Color Palette Preference
          </label>
          <input
            type="text"
            value={formData.customization.themeColor}
            onChange={(e) => handleNestedInputChange('customization', 'themeColor', e.target.value)}
            className="w-full px-5 py-3 rounded-full border border-black/5 bg-[#fbf9f6] text-[13px] outline-none focus:border-primary/45 transition-colors"
          />
        </div>

        {/* Floral preferences */}
        <div className="space-y-2">
          <label className="font-label text-[10px] uppercase tracking-wider text-black/50 font-bold block">
            Floral Garlands Preference
          </label>
          <input
            type="text"
            value={formData.customization.floralPreference}
            onChange={(e) =>
              handleNestedInputChange('customization', 'floralPreference', e.target.value)
            }
            className="w-full px-5 py-3 rounded-full border border-black/5 bg-[#fbf9f6] text-[13px] outline-none focus:border-primary/45 transition-colors"
          />
        </div>

        {/* Lighting profile */}
        <div className="space-y-2">
          <label className="font-label text-[10px] uppercase tracking-wider text-black/50 font-bold block">
            Lighting Profile
          </label>
          <input
            type="text"
            value={formData.customization.lightingPreference}
            onChange={(e) =>
              handleNestedInputChange('customization', 'lightingPreference', e.target.value)
            }
            className="w-full px-5 py-3 rounded-full border border-black/5 bg-[#fbf9f6] text-[13px] outline-none focus:border-primary/45 transition-colors"
          />
        </div>

        {/* Stage dimensions */}
        <div className="space-y-2">
          <label className="font-label text-[10px] uppercase tracking-wider text-black/50 font-bold block">
            Stage Size Dimensions
          </label>
          <input
            type="text"
            value={formData.customization.stageSize}
            onChange={(e) => handleNestedInputChange('customization', 'stageSize', e.target.value)}
            className="w-full px-5 py-3 rounded-full border border-black/5 bg-[#fbf9f6] text-[13px] outline-none focus:border-primary/45 transition-colors"
          />
        </div>

        {/* Add-ons Checklist */}
        <div className="md:col-span-2 space-y-4 pt-4 border-t border-black/5">
          <label className="font-label text-[10px] uppercase tracking-wider text-black/50 font-bold block">
            Add-on Visual Prop Rentals
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {ADDON_PROPS.map((addon) => {
              const isChecked = formData.selectedAddons?.some((a) => a.name === addon.name);
              return (
                <div
                  key={addon.name}
                  onClick={() => handleAddonChange(addon.name, addon.price, !isChecked)}
                  className={`p-4 rounded-xl border text-left cursor-pointer transition-all ${
                    isChecked
                      ? 'bg-primary/5 border-primary/30'
                      : 'border-black/5 hover:border-black/10'
                  }`}
                >
                  <div className="flex justify-between items-start gap-2">
                    <span className="font-body text-[12px] text-black font-bold leading-tight">
                      {addon.name}
                    </span>
                    <input
                      type="checkbox"
                      checked={isChecked}
                      readOnly
                      className="accent-primary w-4 h-4 shrink-0"
                    />
                  </div>
                  <span className="font-display text-xs text-black/50 block mt-2 font-semibold">
                    + ₹{addon.price.toLocaleString('en-IN')}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
