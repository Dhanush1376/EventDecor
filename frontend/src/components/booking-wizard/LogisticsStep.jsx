import React, { useState, useEffect } from 'react';
import { m as motion } from 'framer-motion';
import api from '../../services/api';
import { MapPin, AlertCircle, CheckCircle2 } from 'lucide-react';

export function LogisticsStep({ formData, handleInputChange, handleNestedInputChange }) {
  const [locations, setLocations] = useState([]);
  const [loadingLocations, setLoadingLocations] = useState(true);
  const [serviceabilityError, setServiceabilityError] = useState(null);

  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const { data } = await api.get('/event-bookings/serviceability/locations');
        setLocations(data.data.filter((loc) => loc.enabled));
      } catch (err) {
        setServiceabilityError('Failed to load serviceable locations. Please try again later.');
      } finally {
        setLoadingLocations(false);
      }
    };
    fetchLocations();
  }, []);

  const handleStateChange = (e) => {
    const selectedState = e.target.value;
    handleNestedInputChange('venue', 'state', selectedState);
    if (selectedState) {
      setServiceabilityError(null);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      className="space-y-8"
    >
      <div className="space-y-2">
        <h3 className="font-display text-[20px] lg:text-[28px] text-black font-semibold">
          Logistics & Schedule Details
        </h3>
        <p className="font-body text-black/45 text-[12px] lg:text-[13px]">
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
            min={new Date().toISOString().split('T')[0]}
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

        <div className="col-span-1 md:col-span-2 border-t border-black/5 pt-6 mt-2">
          <h4 className="font-display text-[16px] font-semibold text-black mb-4 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary" /> Location Configuration
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="font-label text-[10px] uppercase tracking-wider text-black/50 font-bold block">
                Country
              </label>
              <input
                type="text"
                value="India"
                disabled
                className="w-full px-5 py-3 rounded-full border border-black/5 bg-black/5 text-[13px] outline-none text-black/60 font-medium cursor-not-allowed"
              />
            </div>

            <div className="space-y-2">
              <label className="font-label text-[10px] uppercase tracking-wider text-black/50 font-bold block">
                State / UT (Serviceable Locations) *
              </label>
              <select
                value={formData.venue.state || ''}
                onChange={handleStateChange}
                className="w-full px-5 py-3 rounded-full border border-black/5 bg-[#fbf9f6] text-[13px] outline-none focus:border-primary/45 transition-colors"
                required
              >
                <option value="" disabled>
                  Select State
                </option>
                {loadingLocations ? (
                  <option disabled>Loading locations...</option>
                ) : (
                  locations.map((loc) => (
                    <option key={loc.locationCode} value={loc.locationCode}>
                      {loc.locationName}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div className="space-y-2">
              <label className="font-label text-[10px] uppercase tracking-wider text-black/50 font-bold block">
                City / District *
              </label>
              <input
                type="text"
                placeholder="e.g. Hyderabad"
                value={formData.venue.city || ''}
                onChange={(e) => handleNestedInputChange('venue', 'city', e.target.value)}
                className="w-full px-5 py-3 rounded-full border border-black/5 bg-[#fbf9f6] text-[13px] outline-none focus:border-primary/45 transition-colors"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="font-label text-[10px] uppercase tracking-wider text-black/50 font-bold block">
                Pincode
              </label>
              <input
                type="text"
                placeholder="e.g. 500001"
                value={formData.venue.pincode || ''}
                onChange={(e) => handleNestedInputChange('venue', 'pincode', e.target.value)}
                className="w-full px-5 py-3 rounded-full border border-black/5 bg-[#fbf9f6] text-[13px] outline-none focus:border-primary/45 transition-colors"
              />
            </div>

            {/* Venue Address */}
            <div className="space-y-2 lg:col-span-2">
              <label className="font-label text-[10px] uppercase tracking-wider text-black/50 font-bold block">
                Complete Venue Address *
              </label>
              <textarea
                placeholder="Enter the complete hotel, banquet hall, or estate destination address..."
                value={formData.venue.address}
                onChange={(e) => handleNestedInputChange('venue', 'address', e.target.value)}
                className="w-full px-5 py-3 rounded-2xl border border-black/5 bg-[#fbf9f6] text-[13px] outline-none focus:border-primary/45 transition-colors h-20 resize-none"
                required
              />
            </div>
          </div>

          {serviceabilityError && (
            <div className="mt-4 p-4 rounded-xl bg-red-50 border border-red-100 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div>
                <h5 className="text-[13px] font-bold text-red-800">Location Unavailable</h5>
                <p className="text-[12px] text-red-700 mt-1">{serviceabilityError}</p>
              </div>
            </div>
          )}

          {formData.venue.state && !serviceabilityError && (
            <div className="mt-4 p-4 rounded-xl bg-green-50 border border-green-100 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
              <div>
                <h5 className="text-[13px] font-bold text-green-800">Service Available</h5>
                <p className="text-[12px] text-green-700 mt-1">
                  We provide decoration services in{' '}
                  {locations.find((l) => l.locationCode === formData.venue.state)?.locationName}.
                  Travel expenses will be calculated automatically at checkout based on exact
                  distance.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Google Maps and Outdoor toggle */}
        <div className="space-y-2 lg:col-span-2">
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

        <div className="flex items-center gap-3 pt-2 lg:col-span-2">
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
