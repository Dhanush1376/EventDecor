import React from"react";
import { motion } from"framer-motion";
import { useParams, useNavigate } from"react-router-dom";
import { useAdmin } from"../context/AdminContext";

const fadeUp = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };
const statusColors = {
  Confirmed:"text-emerald-600 bg-emerald-50 border-emerald-200",
  Pending:"text-amber-600 bg-amber-50 border-amber-200",
  Processing:"text-black bg-slate-100 border-slate-300",
  Cancelled:"text-red-600 bg-red-50 border-red-200",
};

export function AdminBookingDetail() {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const { eventBookings, updateBookingStatus } = useAdmin();
  const booking = eventBookings.find((b) => b.id === bookingId);

  if (!booking) {
    return (
      <div className="max-w-[900px] mx-auto py-20 text-center">
        <span className="material-symbols-outlined text-[64px] text-outline-variant">
          event
        </span>
        <p className="text-[16px] text-outline mt-4">Booking not found</p>
        <button
          onClick={() => navigate("/admin/events")}
          className="btn-minimal group"
        >
          Back to Bookings
        </button>
      </div>
    );
  }

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={{ show: { transition: { staggerChildren: 0.05 } } }}
      className="max-w-[1000px] mx-auto space-y-6"
    >
      <motion.div variants={fadeUp} className="flex items-center gap-4">
        <button
          onClick={() => navigate("/admin/events")}
          className="w-10 h-10 rounded-xl bg-white border border-surface-container-highest/60 flex items-center justify-center text-outline hover:text-black hover:border-slate-900-container/30 cursor-pointer transition-all hover:shadow-sm active:scale-95"
        >
          <span className="material-symbols-outlined text-[20px]">
            arrow_back
          </span>
        </button>
        <div className="flex-1">
          <h2 className="text-[24px] font-bold text-on-surface">
            {booking.eventType}
          </h2>
          <p className="text-[13px] text-outline">
            Booking {booking.id} · {booking.date}
          </p>
        </div>
        <span
          className={`px-3 py-1.5 rounded-xl text-[12px] font-bold border ${statusColors[booking.status]}`}
        >
          {booking.status}
        </span>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
        <div className="space-y-6">
          {/* Status */}
          <motion.div
            variants={fadeUp}
            className="bg-white rounded-2xl border border-surface-container-highest/60 p-6"
          >
            <h2 className="text-[15px] font-bold text-on-surface mb-4">
              Update Status
            </h2>
            <div className="flex flex-wrap gap-2">
              {["Pending","Processing","Confirmed","Cancelled"].map((s) => (
                <button
                  key={s}
                  onClick={() => updateBookingStatus(booking.id, s)}
                  className={`flex items-center gap-1.5 px-4 py-2.5 rounded-2xl text-[12px] font-bold cursor-pointer transition-all border-2 active:scale-[0.96] ${booking.status === s ? statusColors[s] +" shadow-sm" :"border-surface-container-highest/60 text-outline hover:border-slate-900-container/30 hover:text-black"}`}
                >
                  {s}
                </button>
              ))}
            </div>
          </motion.div>

          {/* Event Details */}
          <motion.div
            variants={fadeUp}
            className="bg-white rounded-2xl border border-surface-container-highest/60 p-6"
          >
            <h2 className="text-[15px] font-bold text-on-surface mb-4">
              Event Details
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                {
                  icon:"event",
                  label:"Event Type",
                  value: booking.eventType,
                },
                { icon:"calendar_today", label:"Date", value: booking.date },
                { icon:"location_on", label:"Venue", value: booking.venue },
                {
                  icon:"payments",
                  label:"Amount",
                  value: `₹${booking.amount.toLocaleString()}`,
                },
                {
                  icon:"credit_card",
                  label:"Payment Status",
                  value: booking.payment,
                },
                {
                  icon:"groups",
                  label:"Assigned Staff",
                  value: booking.staff.join(",") ||"Not assigned yet",
                },
              ].map((f, i) => (
                <div key={i} className="bg-surface rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="material-symbols-outlined text-[16px] text-slate-800">
                      {f.icon}
                    </span>
                    <span className="text-[11px] font-semibold text-outline uppercase tracking-wider">
                      {f.label}
                    </span>
                  </div>
                  <p className="text-[14px] font-semibold text-on-surface">
                    {f.value}
                  </p>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Notes */}
          <motion.div
            variants={fadeUp}
            className="bg-white rounded-2xl border border-surface-container-highest/60 p-6"
          >
            <h2 className="text-[15px] font-bold text-on-surface mb-3">
              Notes & Requirements
            </h2>
            <div className="bg-surface rounded-xl p-4">
              <p className="text-[13px] text-on-surface-variant leading-relaxed">
                {booking.notes}
              </p>
            </div>
            <textarea
              rows={3}
              placeholder="Add internal notes..."
              className="w-full mt-4 bg-surface-container-low rounded-xl px-4 py-3 text-[13px] outline-none border border-transparent focus:border-slate-900-container/40 focus:bg-white focus:shadow-sm transition-all resize-none placeholder:text-outline-variant"
            />
            <button className="btn-minimal group">Save Notes</button>
          </motion.div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <motion.div
            variants={fadeUp}
            className="bg-white rounded-2xl border border-surface-container-highest/60 p-5"
          >
            <h2 className="text-[15px] font-bold text-on-surface mb-4">
              Customer
            </h2>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary-container/20 to-primary/10 flex items-center justify-center">
                <span className="text-[14px] font-bold text-black">
                  {booking.customer
                    .split("")
                    .map((n) => n[0])
                    .join("")}
                </span>
              </div>
              <p className="text-[14px] font-bold text-on-surface">
                {booking.customer}
              </p>
            </div>
          </motion.div>

          <motion.div
            variants={fadeUp}
            className="bg-gradient-to-br from-primary-container/10 to-primary/5 rounded-2xl border border-slate-200 p-5 text-center"
          >
            <span className="material-symbols-outlined text-[28px] text-slate-800">
              payments
            </span>
            <p className="text-[24px] font-bold text-black mt-2">
              ₹{booking.amount.toLocaleString()}
            </p>
            <p className="text-[12px] text-outline mt-1">{booking.payment}</p>
          </motion.div>

          <motion.div variants={fadeUp} className="space-y-3">
            <button className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-surface-container-highest/60 text-black rounded-2xl text-[12px] font-bold hover:border-slate-900-container/30 hover:bg-surface cursor-pointer transition-all active:scale-[0.98]">
              <span className="material-symbols-outlined text-[16px]">
                person_add
              </span>
              Assign Staff
            </button>
            <button className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-surface-container-highest/60 text-black rounded-2xl text-[12px] font-bold hover:border-slate-900-container/30 hover:bg-surface cursor-pointer transition-all active:scale-[0.98]">
              <span className="material-symbols-outlined text-[16px]">
                receipt
              </span>
              Generate Invoice
            </button>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
