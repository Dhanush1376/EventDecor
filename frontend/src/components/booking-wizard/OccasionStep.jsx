import React from 'react';
import { m as motion } from 'framer-motion';
import { EVENT_TYPES } from '../../config/constants';
import toast from 'react-hot-toast';

export function OccasionStep({
  formData,
  handleEventTypeSelect,
  handleInputChange,
  setCurrentStep,
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      className="space-y-8"
    >
      <div className="space-y-2">
        <h3 className="font-display text-[20px] md:text-[28px] text-black font-semibold">
          Select Your Occasion
        </h3>
        <p className="font-body text-black/45 text-[12px] md:text-[13px]">
          Select the classification of your milestone celebration to load specialized structural
          presets.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {EVENT_TYPES.map((type) => (
          <div
            key={type.id}
            onClick={() => handleEventTypeSelect(type.id)}
            className={`p-6 rounded-[20px] border text-left cursor-pointer transition-all duration-300 group flex items-start gap-4 ${
              formData.eventType === type.id
                ? 'bg-primary/5 border-primary/40 shadow-md'
                : 'border-black/5 hover:border-black/20 hover:bg-[#FAF9F6]'
            }`}
          >
            <div
              className={`w-12 h-12 rounded-[14px] flex items-center justify-center shrink-0 transition-colors ${
                formData.eventType === type.id
                  ? 'bg-primary text-white'
                  : 'bg-primary/5 text-primary group-hover:bg-primary group-hover:text-white'
              }`}
            >
              <span className="material-symbols-outlined text-[22px]">{type.icon}</span>
            </div>
            <div className="space-y-1">
              <h4 className="font-display text-[16px] text-black font-bold group-hover:text-primary transition-colors">
                {type.label}
              </h4>
              <p className="font-body text-black/40 text-[11px] leading-relaxed font-light">
                {type.desc}
              </p>
            </div>
          </div>
        ))}
      </div>

      {formData.eventType === 'other' && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="bg-primary/5 border border-primary/20 rounded-[20px] p-6 space-y-4"
        >
          <div className="space-y-1">
            <label className="font-label text-[10px] uppercase tracking-wider text-primary font-bold block">
              Specify Your Custom Occasion
            </label>
            <p className="font-body text-black/45 text-[11px]">
              Type the classification of your custom celebration (e.g. Housewarming, Baby Shower,
              Corporate Seminar, Anniversary Gala).
            </p>
          </div>
          <div className="flex gap-3">
            <input
              type="text"
              placeholder="e.g. Housewarming Ceremony"
              value={formData.customOccasion || ''}
              onChange={(e) => handleInputChange('customOccasion', e.target.value)}
              className="flex-1 px-5 py-3 rounded-full border border-black/5 bg-white text-[13px] outline-none focus:border-primary/45 transition-colors"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && formData.customOccasion?.trim()) {
                  setCurrentStep(2);
                }
              }}
            />
            <button
              type="button"
              onClick={() => {
                if (!formData.customOccasion?.trim()) {
                  toast.error('Please enter your custom occasion name.');
                  return;
                }
                setCurrentStep(2);
              }}
              className="bg-primary text-white px-6 py-3 rounded-full font-label text-[10px] uppercase tracking-widest font-bold shadow-md shadow-primary/20 hover:scale-105 active:scale-[0.98] transition-all"
            >
              Proceed
            </button>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
