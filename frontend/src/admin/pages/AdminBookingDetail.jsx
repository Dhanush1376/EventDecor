import React from "react";
import { motion } from "framer-motion";
import { useParams, useNavigate } from "react-router-dom";
import { useAdmin } from "../context/AdminContext";
import {
  StatusBadge,
  fadeUp,
  stagger,
} from "../components/AdminUIKit";

const statusIcons = {
  Confirmed: "thumb_up",
  Pending: "schedule",
  Processing: "sync",
  Cancelled: "cancel",
};

export function AdminBookingDetail() {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const { eventBookings, updateBookingStatus } = useAdmin();
  const booking = eventBookings.find((b) => b.id === bookingId);

  if (!booking) {
    return (
      <div className="py-24 text-center flex flex-col items-center justify-center">
        <span className="material-symbols-outlined text-[48px] text-[var(--admin-text-tertiary)] mb-4">
          event
        </span>
        <p className="text-[16px] font-bold text-[var(--admin-text-primary)] mb-4">Booking not found</p>
        <button
          onClick={() => navigate("/admin/events")}
          className="admin-btn h-10 px-6"
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
      variants={stagger}
      className="space-y-6"
    >
      <motion.div variants={fadeUp} className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/admin/events")}
            className="admin-btn-icon w-10 h-10 min-h-0 bg-[var(--admin-surface)] hover:bg-[var(--admin-surface-muted)] text-[var(--admin-text-primary)] border border-[var(--admin-border)]"
          >
            <span className="material-symbols-outlined text-[20px]">
              arrow_back
            </span>
          </button>
          <div>
            <h2 className="text-[20px] font-bold text-[var(--admin-text-primary)] leading-none mb-1.5">
              {booking.eventType}
            </h2>
            <div className="flex items-center gap-2">
              <span className="text-[12px] text-[var(--admin-text-secondary)] font-bold uppercase tracking-wider">{booking.id}</span>
              <span className="text-[var(--admin-text-tertiary)]">•</span>
              <span className="text-[12px] text-[var(--admin-text-secondary)] font-medium">{booking.date}</span>
            </div>
          </div>
        </div>
        <StatusBadge status={booking.status} />
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
        <div className="space-y-6">
          {/* Status */}
          <motion.div
            variants={fadeUp}
            className="admin-card p-6"
          >
            <h2 className="text-[14px] font-bold text-[var(--admin-text-primary)] mb-4">
              Update Status
            </h2>
            <div className="flex flex-wrap gap-2">
              {["Pending", "Processing", "Confirmed", "Cancelled"].map((s) => (
                <button
                  key={s}
                  onClick={() => updateBookingStatus(booking.id, s)}
                  className={`flex items-center gap-1.5 px-4 py-2.5 rounded-[var(--admin-radius-lg)] text-[12px] font-bold cursor-pointer transition-all border ${
                    booking.status === s
                      ? "bg-[var(--admin-accent)] border-[var(--admin-accent)] text-white shadow-sm"
                      : "bg-[var(--admin-surface)] border-[var(--admin-border-subtle)] text-[var(--admin-text-secondary)] hover:border-[var(--admin-border-strong)] hover:text-[var(--admin-text-primary)]"
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">{statusIcons[s]}</span>
                  {s}
                </button>
              ))}
            </div>
          </motion.div>

          {/* Event Details */}
          <motion.div
            variants={fadeUp}
            className="admin-card p-6"
          >
            <h2 className="text-[14px] font-bold text-[var(--admin-text-primary)] mb-5">
              Event Details
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                {
                  icon: "event",
                  label: "Event Type",
                  value: booking.eventType,
                },
                { icon: "calendar_today", label: "Date", value: booking.date },
                { icon: "location_on", label: "Venue", value: booking.venue },
                {
                  icon: "payments",
                  label: "Amount",
                  value: `₹${booking.amount.toLocaleString()}`,
                },
                {
                  icon: "credit_card",
                  label: "Payment Status",
                  value: booking.payment,
                },
                {
                  icon: "groups",
                  label: "Assigned Staff",
                  value: booking.staff.join(", ") || "Not assigned yet",
                },
              ].map((f, i) => (
                <div key={i} className="bg-[var(--admin-surface-muted)] rounded-[var(--admin-radius-lg)] p-4 border border-[var(--admin-border-subtle)]">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="material-symbols-outlined text-[16px] text-[var(--admin-text-tertiary)]">
                      {f.icon}
                    </span>
                    <span className="text-[10px] font-bold text-[var(--admin-text-tertiary)] uppercase tracking-wider">
                      {f.label}
                    </span>
                  </div>
                  <p className="text-[14px] font-bold text-[var(--admin-text-primary)] leading-tight">
                    {f.value}
                  </p>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Notes */}
          <motion.div
            variants={fadeUp}
            className="admin-card p-6"
          >
            <h2 className="text-[14px] font-bold text-[var(--admin-text-primary)] mb-4">
              Notes & Requirements
            </h2>
            <div className="bg-[#fffbeb] rounded-[var(--admin-radius-lg)] p-5 border border-[#fde68a]">
              <p className="text-[13px] text-[#92400e] leading-relaxed font-medium">
                {booking.notes}
              </p>
            </div>
            <textarea
              rows={3}
              placeholder="Add internal notes..."
              className="admin-textarea mt-4"
            />
            <div className="flex justify-end mt-4">
              <button className="admin-btn admin-btn-primary h-9">Save Notes</button>
            </div>
          </motion.div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <motion.div
            variants={fadeUp}
            className="admin-card p-6"
          >
            <h2 className="text-[14px] font-bold text-[var(--admin-text-primary)] mb-5">
              Customer
            </h2>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-[var(--admin-radius-md)] bg-[var(--admin-bg-subtle)] flex items-center justify-center border border-[var(--admin-border)] shrink-0">
                <span className="text-[14px] font-bold text-[var(--admin-text-primary)]">
                  {booking.customer
                    .split(" ")
                    .filter(Boolean)
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()}
                </span>
              </div>
              <p className="text-[14px] font-bold text-[var(--admin-text-primary)]">
                {booking.customer}
              </p>
            </div>
          </motion.div>

          <motion.div
            variants={fadeUp}
            className="bg-[var(--admin-surface-muted)] rounded-[var(--admin-radius-xl)] border border-[var(--admin-border)] p-6 flex flex-col items-center justify-center text-center"
          >
            <span className="material-symbols-outlined text-[28px] text-[var(--admin-text-secondary)] mb-2">
              payments
            </span>
            <p className="text-[24px] font-bold text-[var(--admin-text-primary)] font-mono leading-none">
              ₹{booking.amount.toLocaleString()}
            </p>
            <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--admin-text-tertiary)] mt-2">{booking.payment}</p>
          </motion.div>

          <motion.div variants={fadeUp} className="space-y-3">
            <button className="admin-btn admin-btn-outline w-full h-11 border-[var(--admin-border-strong)] text-[var(--admin-text-primary)] hover:bg-[var(--admin-surface-muted)]">
              <span className="material-symbols-outlined text-[16px]">
                person_add
              </span>
              Assign Staff
            </button>
            <button className="admin-btn admin-btn-outline w-full h-11 border-[var(--admin-border-strong)] text-[var(--admin-text-primary)] hover:bg-[var(--admin-surface-muted)]">
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
