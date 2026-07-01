import React from 'react';
import { m as motion } from 'framer-motion';
import { OptimizedImage } from '../ui/OptimizedImage';

export function DesignStep({
  formData,
  packages,
  loading,
  hasCategoryPackages,
  handlePackageSelect,
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      className="space-y-8"
    >
      <div className="space-y-2">
        <h3 className="font-display text-[20px] lg:text-[28px] text-black font-semibold">
          Select Event Design
        </h3>
        <p className="font-body text-black/45 text-[12px] lg:text-[13px]">
          Select an existing package to load designs, or select "Custom Setup" below.
        </p>
      </div>

      {loading ? (
        <div className="h-48 flex items-center justify-center">
          <div className="skeleton-box inline-block w-10 h-10 rounded-md" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Custom Preset */}
          <div
            onClick={() => handlePackageSelect('')}
            className={`p-6 rounded-[24px] border text-left cursor-pointer transition-all flex flex-col justify-between h-56 ${
              hasCategoryPackages ? '' : 'lg:col-span-2'
            } ${
              !formData.eventPackageId
                ? 'bg-primary/5 border-primary/40 shadow-lg'
                : 'border-black/5 hover:border-black/15 bg-stone-50'
            }`}
          >
            <div>
              <span className="bg-stone-200 text-stone-700 px-2 py-0.5 rounded-full font-label text-[8px] uppercase tracking-widest font-bold">
                Custom Blueprint
              </span>
              <h4 className="font-display text-[18px] text-black font-bold mt-3">
                Bespoke Architectural Custom Setup
              </h4>
              <p className="font-body text-black/40 text-[11px] leading-relaxed mt-2 font-light">
                Collaborate directly with our design artisans to build a completely unique visual
                space from scratch.
              </p>
            </div>
            <span className="font-label text-[10px] text-primary uppercase font-bold tracking-widest">
              Map custom layout →
            </span>
          </div>

          {/* Filtered masteries */}
          {packages
            .filter((p) => p.category?.toLowerCase() === formData.eventType)
            .slice(0, 3)
            .map((pkg) => (
              <div
                key={pkg._id || pkg.id}
                onClick={() => handlePackageSelect(pkg._id || pkg.id)}
                className={`p-4 rounded-[24px] border text-left cursor-pointer transition-all flex gap-4 items-center ${
                  formData.eventPackageId === (pkg._id || pkg.id)
                    ? 'bg-primary/5 border-primary/40 shadow-lg'
                    : 'border-black/5 hover:border-black/15'
                }`}
              >
                <div className="w-20 h-24 rounded-[16px] overflow-hidden shrink-0">
                  <OptimizedImage
                    src={pkg.image}
                    className="w-full h-full object-cover"
                    alt={pkg.title}
                  />
                </div>
                <div className="space-y-1.5 flex-1 min-w-0">
                  <span className="font-label text-[8px] text-primary uppercase tracking-widest font-bold block">
                    {pkg.style}
                  </span>
                  <h4 className="font-display text-[15px] text-black font-bold truncate leading-tight">
                    {pkg.title}
                  </h4>
                  <p className="font-body text-black/40 text-[10px] leading-tight truncate">
                    {pkg.decorCount || 'Curated Inclusions'}
                  </p>
                  <span className="font-display text-[13px] text-black italic block pt-1 font-semibold">
                    {pkg.pricing}
                  </span>
                </div>
              </div>
            ))}
        </div>
      )}
    </motion.div>
  );
}
