import React from 'react';
import { m as motion } from 'framer-motion';

export function LogisticsStep({ formData, handleInputChange, handleNestedInputChange }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      className="space-y-8"
    >
      <div className="space-y-2">
        <h3 className="font-display text-[20px] md:text-[28px] text-black font-semibold">
          Logistics & Schedule Details
        </h3>
        <p className="font-body text-black/45 text-[12px] md:text-[13px]">
          Provide event timestamps and spatial specifications to verify structural clearances.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Event Title */}
        <div className="space-y-2">
          <label className="font-label text-[10px] uppercase tracking-wider text-black/50 font-bold block">
            Event Booking Title
          </label>
          <input
            type="text"
            placeholder="e.g. Dhanush's Traditional Vivaham"
            value={formData.title}
            onChange={(e) => handleInputChange('title', e.target.value)}
            className="w-full px-5 py-3 rounded-full border border-black/5 bg-[#fbf9f6] text-[13px] outline-none focus:border-primary/45 transition-colors"
            required
          />
        </div>

        {/* Event Date */}
        <div className="space-y-2">
          <label className="font-label text-[10px] uppercase tracking-wider text-black/50 font-bold block">
            Event Date
          </label>
          <input
            type="date"
            value={formData.date}
            onChange={(e) => handleInputChange('date', e.target.value)}
            className="w-full min-w-0 overflow-hidden px-5 py-3 rounded-full border border-black/5 bg-[#fbf9f6] text-[13px] outline-none focus:border-primary/45 transition-colors"
            required
          />
        </div>

        {/* Timing ranges */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <label className="font-label text-[10px] uppercase tracking-wider text-black/50 font-bold block">
              Starts At
            </label>
            <input
              type="text"
              placeholder="08:00 AM"
              value={formData.timing.start}
              onChange={(e) => handleNestedInputChange('timing', 'start', e.target.value)}
              className="w-full px-5 py-3 rounded-full border border-black/5 bg-[#fbf9f6] text-[13px] outline-none focus:border-primary/45 transition-colors"
            />
          </div>
          <div className="space-y-2">
            <label className="font-label text-[10px] uppercase tracking-wider text-black/50 font-bold block">
              Ends At
            </label>
            <input
              type="text"
              placeholder="10:00 PM"
              value={formData.timing.end}
              onChange={(e) => handleNestedInputChange('timing', 'end', e.target.value)}
              className="w-full px-5 py-3 rounded-full border border-black/5 bg-[#fbf9f6] text-[13px] outline-none focus:border-primary/45 transition-colors"
            />
          </div>
        </div>

        {/* Venue Address */}
        <div className="space-y-2 md:col-span-2">
          <label className="font-label text-[10px] uppercase tracking-wider text-black/50 font-bold block">
            Venue Address
          </label>
          <textarea
            placeholder="Enter the complete hotel, banquet hall, or estate destination address..."
            value={formData.venue.address}
            onChange={(e) => handleNestedInputChange('venue', 'address', e.target.value)}
            className="w-full px-5 py-3 rounded-2xl border border-black/5 bg-[#fbf9f6] text-[13px] outline-none focus:border-primary/45 transition-colors h-20 resize-none"
            required
          />
        </div>

        {/* Google Maps and Outdoor toggle */}
        <div className="space-y-2">
          <label className="font-label text-[10px] uppercase tracking-wider text-black/50 font-bold block">
            Google Maps Link (Optional)
          </label>
          <input
            type="url"
            placeholder="https://maps.google.com/..."
            value={formData.venue.googleMapsLink}
            onChange={(e) => handleNestedInputChange('venue', 'googleMapsLink', e.target.value)}
            className="w-full px-5 py-3 rounded-full border border-black/5 bg-[#fbf9f6] text-[13px] outline-none focus:border-primary/45 transition-colors"
          />
        </div>

        <div className="flex items-center gap-3 pt-6">
          <input
            type="checkbox"
            id="isOutdoor"
            checked={formData.venue.isOutdoor}
            onChange={(e) => handleNestedInputChange('venue', 'isOutdoor', e.target.checked)}
            className="w-5 h-5 accent-primary cursor-pointer"
          />
          <label
            htmlFor="isOutdoor"
            className="font-body text-[13px] text-black font-semibold cursor-pointer"
          >
            This is an Outdoor Open-Air Lawn Ceremony
          </label>
        </div>
      </div>
    </motion.div>
  );
}
