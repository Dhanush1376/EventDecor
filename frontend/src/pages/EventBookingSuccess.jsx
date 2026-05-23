import React, { useState, useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { SEO } from "../components/seo/SEO";
import { MandalaArtDecor } from "../components/ui/MandalaArtDecor";
import { bookingService } from "../services/domainServices";
import confetti from "canvas-confetti";
import toast from "react-hot-toast";

import logger from '../utils/logger';

export function EventBookingSuccess() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    // Only fire confetti once per session per booking
    const lockKey = `siri_arts_confetti_lock_${id}`;
    if (!sessionStorage.getItem(lockKey)) {
      const duration = 3000;
      const end = Date.now() + duration;

      const frame = () => {
        confetti({
          particleCount: 5,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: ['#735c00', '#C4A87C', '#FFD700', '#8B0000']
        });
        confetti({
          particleCount: 5,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: ['#735c00', '#C4A87C', '#FFD700', '#8B0000']
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      };
      frame();
      sessionStorage.setItem(lockKey, "fired");
    }
  }, [id]);

  useEffect(() => {
    const fetchBooking = async () => {
      try {
        const res = await bookingService.getById(id);
        if (res.success) {
          setBooking(res.data);
        } else {
          setError(res.message || "Failed to load booking details.");
        }
      } catch (err) {
        logger.error(err);
        setError("Error loading booking details.");
      } finally {
        setLoading(false);
      }
    };
    if (id) {
      fetchBooking();
    } else {
      navigate("/");
    }
  }, [id, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fcfbf9] flex items-center justify-center pt-24 font-body">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="min-h-screen bg-[#fcfbf9] flex items-center justify-center pt-24 font-body">
        <div className="text-center space-y-4">
          <span className="material-symbols-outlined text-6xl text-red-400">error</span>
          <h2 className="font-display text-2xl text-black">Booking Not Found</h2>
          <p className="text-black/50 text-sm max-w-sm mx-auto">{error || "We couldn't locate your booking confirmation."}</p>
          <Link to="/" className="inline-block mt-4 bg-primary text-white px-6 py-2.5 rounded-full font-label text-xs uppercase tracking-widest font-bold">
            Return Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#fcfbf9] min-h-screen pt-24 md:pt-32 pb-24 text-on-surface font-body relative overflow-hidden">
      <SEO title={`Booking Confirmed | Siri Arts`} description="Your luxury event setup has been reserved." />
      <MandalaArtDecor variant={1} size={400} className="absolute -top-32 -left-32 opacity-5 pointer-events-none" spinDuration={180} />
      <MandalaArtDecor variant={2} size={300} className="absolute -bottom-20 -right-20 opacity-5 pointer-events-none" spinDuration={220} />

      <div className="max-w-[700px] mx-auto px-4 sm:px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="bg-white rounded-[24px] md:rounded-[40px] shadow-2xl border border-black/5 p-8 md:p-12"
        >
          {/* Header */}
          <div className="text-center space-y-4 mb-10 pb-10 border-b border-black/5">
            <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="material-symbols-outlined text-[40px] text-green-600">check_circle</span>
            </div>
            <span className="font-label text-[10px] md:text-[11px] uppercase tracking-[0.4em] text-primary font-bold block">
              Reservation Confirmed
            </span>
            <h2 className="font-display text-3xl md:text-5xl text-black font-light tracking-tight">
              Thank You!
            </h2>
            <p className="font-body text-black/50 text-sm max-w-md mx-auto">
              Your luxury event setup for <strong className="text-black">{booking.title}</strong> has been successfully confirmed.
            </p>
          </div>

          {/* Booking Info Box */}
          <div className="bg-[#FAF9F6] rounded-[24px] p-6 mb-8 border border-[#C4A87C]/20">
            <h3 className="font-display text-lg text-black font-bold mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">receipt_long</span>
              Booking Details
            </h3>
            <div className="space-y-4 text-sm">
              <div className="flex justify-between items-center border-b border-black/5 pb-2">
                <span className="text-black/50">Booking ID</span>
                <span className="font-mono text-xs font-bold text-black">{booking.id || booking._id}</span>
              </div>
              <div className="flex justify-between items-center border-b border-black/5 pb-2">
                <span className="text-black/50">Ceremony Date</span>
                <span className="font-semibold text-black">{new Date(booking.date).toLocaleDateString('en-IN', { dateStyle: 'long' })}</span>
              </div>
              <div className="flex justify-between items-center border-b border-black/5 pb-2">
                <span className="text-black/50">Occasion Type</span>
                <span className="font-semibold text-black capitalize">{booking.eventType}</span>
              </div>
              <div className="flex justify-between items-center border-b border-black/5 pb-2">
                <span className="text-black/50">Total Estimate</span>
                <span className="font-semibold text-black">₹{(booking.totalPrice || 0).toLocaleString("en-IN")}</span>
              </div>
              <div className="flex justify-between items-center pt-2">
                <span className="text-black/50">Deposit Paid (50%)</span>
                <span className="font-display text-lg italic text-primary font-bold">₹{((booking.totalPrice || 0) * 0.5).toLocaleString("en-IN")}</span>
              </div>
            </div>
          </div>

          <div className="text-center space-y-2 mb-10">
             <span className="material-symbols-outlined text-primary text-[32px] opacity-20">verified_user</span>
             <p className="font-body text-xs text-black/40">Payment securely processed via Razorpay.</p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to={`/dashboard?tab=bookings`}
              className="bg-black text-white px-8 py-3.5 rounded-full font-label text-[10px] uppercase tracking-widest font-bold hover:bg-primary hover:scale-105 transition-all text-center"
            >
              Track in Dashboard
            </Link>
            <Link
              to="/"
              className="bg-primary/5 text-primary border border-primary/20 px-8 py-3.5 rounded-full font-label text-[10px] uppercase tracking-widest font-bold hover:bg-primary hover:text-white transition-all text-center"
            >
              Back to Home
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
