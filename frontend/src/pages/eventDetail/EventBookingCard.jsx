import React from 'react';
import { useNavigate } from 'react-router-dom';

export function EventBookingCard({
  event,
  toggleItem,
  isWishlisted,
  setIsDrawerOpen,
  reserveButtonRef,
}) {
  const navigate = useNavigate();

  return (
    <div className="md:col-span-5 lg:col-span-5 flex flex-col gap-6">
      {/* Custom Design Consultation Card */}
      <div className="p-6 rounded-3xl bg-[#2A2825] text-white relative overflow-hidden shadow-lg border border-white/5">
        <div className="relative z-10 flex flex-col items-center text-center gap-5">
          <div>
            <h4 className="font-headline-sm mb-1 text-[#C4A87C] font-normal tracking-wide">
              Need a Custom Theme?
            </h4>
            <p className="font-body-sm text-white/90 font-medium">
              Personalize this setup to perfectly match your vision.
            </p>
          </div>
          <div className="flex flex-row gap-2 w-full">
            <button
              onClick={() => navigate(`/custom-orders?event=${event._id || event.id}`)}
              className="bg-white text-black flex-1 px-2 py-2.5 rounded-full font-label-sm text-[10px] uppercase tracking-[0.15em] hover:bg-stone-200 transition-all whitespace-nowrap font-bold shadow-sm flex items-center justify-center"
            >
              Customize
            </button>
            <button
              onClick={() => {
                if (!event) return;
                const num = '919866006648';
                const link = `${window.location.origin}/events/${event._id || event.id}`;
                const msg = encodeURIComponent(
                  `Hello, I'm interested in this event setup and would like to chat about it.\\n\\nLink: ${link}`,
                );
                window.open(`https://wa.me/${num}?text=${msg}`, '_blank');
              }}
              className="bg-transparent border border-white/30 flex-1 text-white px-2 py-2.5 rounded-full font-label-sm text-[10px] uppercase tracking-[0.15em] hover:bg-white/10 transition-all whitespace-nowrap font-bold flex items-center justify-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[14px]">chat</span>
              WhatsApp
            </button>
          </div>
        </div>
      </div>

      {/* 2. Premium Reservation & Saving Card */}
      <div className="bg-white/80 backdrop-blur-md rounded-[2rem] border border-black/10 p-6 lg:p-8 space-y-6 shadow-[0_15px_40px_rgba(115,92,0,0.02)]">
        <div className="flex items-center gap-2 pb-3 border-b border-black/5">
          <span className="material-symbols-outlined text-black text-[18px]">calendar_today</span>
          <span className="font-label text-[10px] uppercase tracking-widest text-black font-bold">
            Reservation Crate
          </span>
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <span className="font-label text-[8px] uppercase tracking-widest text-black/50 font-bold block">
              Starting Package Price
            </span>
            <div className="flex items-baseline gap-2">
              <span className="font-display text-[28px] lg:text-[32px] text-black font-medium">
                ₹{(event.basePrice || event.rentalPrice || 35000).toLocaleString('en-IN')}
              </span>
              <span className="text-stone-400 text-xs font-light">/ Setup</span>
            </div>
          </div>

          <p className="font-body text-black/60 text-[13px] leading-relaxed font-light">
            Plan your dream celebration setup. Add custom florals, verify venue logistics, specify
            date & environment using our guided customization tool.
          </p>

          <div className="bg-stone-50 p-4 rounded-2xl border border-black/10 space-y-2.5">
            <div className="flex items-center gap-2 text-[11px] font-semibold text-stone-700">
              <span className="material-symbols-outlined text-black text-[16px]">
                local_shipping
              </span>
              <span>Free Setup, Logistics & Teardown</span>
            </div>
            <div className="flex items-center gap-2 text-[11px] font-semibold text-stone-700">
              <span className="material-symbols-outlined text-black text-[16px]">verified</span>
              <span>100% Refundable Deposit up to 14 days prior</span>
            </div>
          </div>

          <div className="flex flex-row gap-3 pt-2">
            <button
              ref={reserveButtonRef}
              onClick={() => setIsDrawerOpen(true)}
              className="flex-1 bg-black text-white hover:bg-stone-900 hover:text-white py-3 px-6 rounded-full font-label text-[10px] uppercase tracking-widest font-bold transition-all active:scale-95 shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>Book</span>
              <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            </button>
            <button
              onClick={() => toggleItem({ ...event, image: event.image })}
              className={`flex-1 py-3 px-6 rounded-full font-label text-[10px] uppercase tracking-widest font-bold transition-all active:scale-95 border flex items-center justify-center gap-1.5 cursor-pointer ${
                isWishlisted(event._id || event.id)
                  ? 'bg-rose-50 border-rose-200 text-rose-600 hover:bg-rose-100'
                  : 'bg-white border-black/10 text-stone-700 hover:bg-stone-50'
              }`}
            >
              <span className="material-symbols-outlined text-[14px]">
                {isWishlisted(event._id || event.id) ? 'favorite' : 'favorite_border'}
              </span>
              <span>{isWishlisted(event._id || event.id) ? 'Saved' : 'Save'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
