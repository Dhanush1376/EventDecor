import React from 'react';
import { m as motion, AnimatePresence } from 'framer-motion';
import { EVENT_TYPES } from '../../config/constants';
import { LocationSelectorModal } from '../../components/ui/LocationSelectorModal';

export function EventCustomizerDrawer({ event, bookingForm }) {
  const { state, actions } = bookingForm;

  return (
    <AnimatePresence>
      {state.isDrawerOpen && (
        <motion.div
          key="overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => actions.setIsDrawerOpen(false)}
          className="fixed inset-0 z-[999] bg-black/60 backdrop-blur-sm"
        />
      )}
      {state.isDrawerOpen && (
        <motion.div
          key="drawer"
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 220 }}
          className="fixed bottom-0 left-0 right-0 lg:left-1/2 lg:-translate-x-1/2 lg:w-[600px] z-[1000] bg-[#FCFAF6] border-t border-black/10 rounded-t-[2.5rem] shadow-[0_-10px_40px_rgba(0,0,0,0.15)] flex flex-col max-h-[85vh] lg:max-h-[90vh]"
        >
          <div className="bg-[#FAF6F0] px-6 py-4 border-b border-black/5 flex items-center justify-between shrink-0 relative rounded-t-[2.5rem]">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-black text-[20px]">tune</span>
              <div>
                <h3 className="font-display text-sm lg:text-base text-black font-semibold">
                  Customize Your Order
                </h3>
                <p className="text-[9px] text-black/50 uppercase tracking-widest font-bold font-label">
                  Step {state.customizerStep} of 4
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-1 mr-4">
                {[1, 2, 3, 4].map((stepNum) => (
                  <div
                    key={stepNum}
                    className={`w-4 h-4 rounded-full flex items-center justify-center font-display text-[8px] font-bold ${
                      state.customizerStep === stepNum
                        ? 'bg-black text-white'
                        : state.customizerStep > stepNum
                          ? 'bg-black text-white'
                          : 'bg-stone-200 text-stone-400'
                    }`}
                  >
                    {state.customizerStep > stepNum ? '✓' : stepNum}
                  </div>
                ))}
              </div>
              <button
                onClick={() => actions.setIsDrawerOpen(false)}
                className="w-8 h-8 rounded-full bg-white hover:bg-stone-100 text-stone-500 border border-black/5 flex items-center justify-center transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            </div>
          </div>

          <div className="p-6 lg:p-8 overflow-y-auto flex-1 space-y-6">
            {/* STEP 1: Occasion */}
            {state.customizerStep === 1 && (
              <div className="space-y-4 pt-2">
                <div className="space-y-1.5">
                  <label className="font-label text-[8px] uppercase tracking-widest text-black/50 font-bold block">
                    Select Your Occasion *
                  </label>
                  <select
                    value={state.eventType}
                    onChange={(e) => actions.setEventType(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-full border border-black/10 bg-white text-xs outline-none focus:border-black font-medium"
                  >
                    {EVENT_TYPES.map((type) => (
                      <option key={type.id} value={type.id}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                {state.eventType === 'other' && (
                  <div className="space-y-1.5 bg-black/5 p-4 rounded-2xl border border-black/10">
                    <label className="font-label text-[8px] uppercase tracking-widest text-black font-bold block">
                      Specify Custom Occasion *
                    </label>
                    <input
                      type="text"
                      value={state.customOccasion}
                      onChange={(e) => actions.setCustomOccasion(e.target.value)}
                      className="w-full px-4 py-2 rounded-full border border-black/10 bg-white text-xs outline-none focus:border-black font-medium"
                    />
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="font-label text-[8px] uppercase tracking-widest text-black/50 font-bold block">
                      Ceremony Date *
                    </label>
                    <input
                      type="date"
                      value={state.bookingDate}
                      onChange={(e) => actions.setBookingDate(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-full border border-black/10 bg-white text-xs outline-none focus:border-black font-medium"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-label text-[8px] uppercase tracking-widest text-black/50 font-bold block">
                      Rental Days
                    </label>
                    <select
                      value={state.rentalDurationDays}
                      onChange={(e) => actions.setRentalDurationDays(Number(e.target.value))}
                      className="w-full px-4 py-2.5 rounded-full border border-black/10 bg-white text-xs outline-none focus:border-black font-medium"
                    >
                      <option value={1}>1 Day Setup</option>
                      <option value={2}>2 Days Setup</option>
                      <option value={3}>3 Days Setup</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="font-label text-[9px] uppercase tracking-widest text-black/45 font-bold block">
                    Setup Environment
                  </label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => actions.setIsOutdoor(false)}
                      className={`flex-1 py-2 px-3 rounded-full font-semibold text-[11px] ${!state.isOutdoor ? 'bg-black text-white' : 'bg-stone-50 text-stone-600 border border-black/10'}`}
                    >
                      Indoor
                    </button>
                    <button
                      onClick={() => actions.setIsOutdoor(true)}
                      className={`flex-1 py-2 px-3 rounded-full font-semibold text-[11px] ${state.isOutdoor ? 'bg-black text-white' : 'bg-stone-50 text-stone-600 border border-black/10'}`}
                    >
                      Outdoor
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: Timings */}
            {state.customizerStep === 2 && (
              <div className="space-y-4 pt-2">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="font-label text-[8px] uppercase tracking-widest text-black/50 font-bold block">
                      Start Time
                    </label>
                    <select
                      value={state.startTime}
                      onChange={(e) => actions.setStartTime(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-full border border-black/10 bg-white text-xs outline-none focus:border-black font-medium"
                    >
                      <option value="06:00 AM">06:00 AM</option>
                      <option value="09:00 AM">09:00 AM</option>
                      <option value="12:00 PM">12:00 PM</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="font-label text-[8px] uppercase tracking-widest text-black/50 font-bold block">
                      End Time
                    </label>
                    <select
                      value={state.endTime}
                      onChange={(e) => actions.setEndTime(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-full border border-black/10 bg-white text-xs outline-none focus:border-black font-medium"
                    >
                      <option value="01:00 PM">01:00 PM</option>
                      <option value="05:00 PM">05:00 PM</option>
                      <option value="09:00 PM">09:00 PM</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="font-label text-[9px] uppercase tracking-widest text-black/45 font-bold block">
                    Placement Destination
                  </label>
                  <select
                    value={state.placementPreference}
                    onChange={(e) => actions.setPlacementPreference(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-full border border-black/10 bg-white text-xs outline-none focus:border-black font-medium"
                  >
                    <option value="Side-Stage Showcase Corner">Side-Stage Showcase Corner</option>
                    <option value="Entrance Presentation Desk">Entrance Presentation Desk</option>
                  </select>
                </div>
              </div>
            )}

            {/* STEP 3: Venue */}
            {state.customizerStep === 3 && (
              <div className="space-y-4 pt-2 flex-1 flex flex-col min-h-[400px]">
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      actions.setIsLocationModalOpen(true);
                      actions.setIsManualLocationInput(false);
                    }}
                    className={`flex-1 py-2.5 rounded-full font-semibold text-xs ${!state.isManualLocationInput ? 'bg-black text-white' : 'bg-stone-50 text-stone-600 border border-black/10'}`}
                  >
                    Choose on Map
                  </button>
                  <button
                    onClick={() => {
                      actions.setIsLocationModalOpen(false);
                      actions.setIsManualLocationInput(true);
                    }}
                    className={`flex-1 py-2.5 rounded-full font-semibold text-xs ${state.isManualLocationInput ? 'bg-black text-white' : 'bg-stone-50 text-stone-600 border border-black/10'}`}
                  >
                    Add Manually
                  </button>
                </div>

                {!state.isManualLocationInput ? (
                  <LocationSelectorModal
                    inline={true}
                    isOpen={true}
                    onClose={() => {}}
                    onLocationSelect={(loc) => {
                      actions.setVenueDetails(loc);
                    }}
                    initialLocation={state.venueDetails}
                  />
                ) : (
                  <div className="bg-[#FAF6F0] p-4 rounded-2xl border border-black/10 space-y-3">
                    <input
                      type="text"
                      placeholder="Venue Name"
                      value={state.manualVenueName}
                      onChange={(e) => {
                        actions.setManualVenueName(e.target.value);
                        actions.handleManualFieldChange('name', e.target.value);
                      }}
                      className="w-full px-4 py-2 rounded-full border border-black/10 text-xs"
                    />
                    <input
                      type="text"
                      placeholder="Full Address"
                      value={state.manualAddress}
                      onChange={(e) => {
                        actions.setManualAddress(e.target.value);
                        actions.handleManualFieldChange('address', e.target.value);
                      }}
                      className="w-full px-4 py-2 rounded-full border border-black/10 text-xs"
                    />
                    <div className="grid grid-cols-3 gap-2">
                      <input
                        type="text"
                        placeholder="City"
                        value={state.manualCity}
                        onChange={(e) => {
                          actions.setManualCity(e.target.value);
                          actions.handleManualFieldChange('city', e.target.value);
                        }}
                        className="w-full px-3 py-2 rounded-full border border-black/10 text-xs"
                      />
                      <input
                        type="text"
                        placeholder="State"
                        value={state.manualState}
                        onChange={(e) => {
                          actions.setManualState(e.target.value);
                          actions.handleManualFieldChange('state', e.target.value);
                        }}
                        className="w-full px-3 py-2 rounded-full border border-black/10 text-xs"
                      />
                      <input
                        type="text"
                        placeholder="Pincode"
                        value={state.manualPincode}
                        onChange={(e) => {
                          actions.setManualPincode(e.target.value);
                          actions.handleManualFieldChange('pincode', e.target.value);
                        }}
                        className="w-full px-3 py-2 rounded-full border border-black/10 text-xs"
                      />
                    </div>
                  </div>
                )}

                {state.venueDetails && !state.isManualLocationInput && (
                  <div className="bg-[#FAF6F0] p-4 rounded-2xl border border-black/10 text-xs font-semibold">
                    {state.venueDetails.name} <br /> {state.venueDetails.address}
                  </div>
                )}

                <textarea
                  placeholder="Arrangement Notes..."
                  value={state.customNote}
                  onChange={(e) => actions.setCustomNote(e.target.value)}
                  className="w-full p-4 rounded-2xl border border-black/10 bg-stone-50/20 text-xs h-20 resize-none focus:border-black outline-none"
                />
              </div>
            )}

            {/* STEP 4: Review */}
            {state.customizerStep === 4 && (
              <div className="space-y-4 pt-2">
                <div className="bg-stone-50 p-4 rounded-2xl border border-black/5 space-y-3">
                  <span className="font-label text-[9px] uppercase tracking-widest text-black/40 font-bold block">
                    Booking Summary
                  </span>
                  <div className="grid grid-cols-2 gap-y-2.5 gap-x-2 text-[11px] font-semibold text-stone-700">
                    <div>
                      <span className="text-[9px] uppercase tracking-wider text-black/35 font-bold block">
                        Date
                      </span>
                      <span className="text-black">{state.bookingDate}</span>
                    </div>
                    <div>
                      <span className="text-[9px] uppercase tracking-wider text-black/35 font-bold block">
                        Duration
                      </span>
                      <span className="text-black">{state.rentalDurationDays} Days</span>
                    </div>
                  </div>
                </div>
                <div className="bg-[#FAF6F0] p-4 rounded-2xl border border-black/10 relative overflow-hidden space-y-3 text-xs">
                  <div className="flex justify-between items-center text-stone-600">
                    <span>Base Package</span>
                    <span>₹{(event?.basePrice || 35000).toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between items-center font-bold text-black border-t border-black/5 pt-2 text-[14px]">
                    <span>Total Price</span>
                    <span>₹{actions.calculateLivePrice().toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="p-4 lg:p-6 bg-white border-t border-black/5 shrink-0 flex gap-3 z-10 rounded-b-[2.5rem]">
            {state.customizerStep > 1 && (
              <button
                onClick={() => actions.setCustomizerStep(state.customizerStep - 1)}
                className="flex-1 border border-black/10 py-3 rounded-full text-xs font-bold"
              >
                Back
              </button>
            )}
            {state.customizerStep < 4 ? (
              <button
                onClick={() => actions.setCustomizerStep(state.customizerStep + 1)}
                className="flex-[2] bg-black text-white py-3 rounded-full text-xs font-bold"
              >
                Next Step
              </button>
            ) : (
              <button
                onClick={actions.handleBookRental}
                className="flex-[2] bg-black text-white hover:bg-stone-900 transition-all active:scale-95 shadow-md py-3 rounded-full text-xs font-bold cursor-pointer"
              >
                Pay Advance to Book
              </button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
