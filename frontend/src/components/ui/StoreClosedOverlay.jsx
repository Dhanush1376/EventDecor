import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, User, X, Mail, Phone } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useConfig } from '../../context/ConfigContext';
import { useNavigate } from 'react-router-dom';
import { SiriLogo } from './SiriLogo';

export function StoreClosedOverlay({ isOpen, onClose }) {
  const { openAuthModal, isAuthenticated, user } = useAuth();
  const { storeSettings } = useConfig();
  const navigate = useNavigate();

  const contactPhone =
    storeSettings?.contact?.phone || storeSettings?.contact?.whatsappNumber || '+91 98660 06648';
  const whatsappNumber =
    storeSettings?.contact?.whatsappNumber || storeSettings?.contact?.phone || '+91 98660 06648';
  const cleanPhone = whatsappNumber.replace(/[^0-9]/g, '');
  const cleanCallPhone = contactPhone.replace(/[^0-9+]/g, '');
  const supportEmail = storeSettings?.general?.supportEmail || 'support@siriartsandcrafts.com';

  const handleExplore = () => {
    onClose();
    navigate('/collections');
  };

  const handleSignIn = () => {
    onClose();
    openAuthModal();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="store-closed-page"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="fixed inset-0 z-[9990] bg-black/70 backdrop-blur-2xl flex flex-col justify-between items-center p-6 sm:p-10 md:p-12 overflow-y-auto"
        >
          {/* Top Bar with Brand Logo and Exit Button */}
          <div className="w-full max-w-4xl flex items-center justify-between shrink-0">
            <SiriLogo size="42px" variant="white" />
            <button
              onClick={onClose}
              aria-label="Close notice"
              className="p-2.5 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-6 h-6" strokeWidth={1.5} />
            </button>
          </div>

          {/* Main Hero Content - Freed Entirely on Screen */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 15 }}
            transition={{ duration: 0.45, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
            className="max-w-xl w-full mx-auto my-auto flex flex-col items-center text-center py-6 sm:py-8"
          >
            {/* Playfair Display Title in Crisp White */}
            <h1 className="font-display text-3xl sm:text-4xl md:text-5xl text-white font-normal leading-[1.15] tracking-tight mb-4">
              Store is Temporarily Closed
            </h1>

            {/* Delicate White Divider */}
            <div className="w-20 h-[1.5px] bg-gradient-to-r from-transparent via-white/40 to-transparent mx-auto mb-5" />

            {/* Polite Notice in Soft Clean White */}
            <p className="font-body text-white/85 text-sm sm:text-base md:text-[17px] leading-relaxed max-w-lg mx-auto font-light">
              Our store is temporarily closed and orders cannot be placed at this time. You can
              freely view our complete collection as a guest.
            </p>

            {/* White Themed Actions with Generous Breathing Room */}
            <div className="w-full max-w-sm flex flex-col items-center gap-3.5 mt-8 sm:mt-10 mb-8">
              {/* Primary Luxury White Button */}
              <button
                onClick={handleExplore}
                className="group relative w-full sm:w-auto sm:min-w-[260px] py-3.5 px-6 sm:px-8 rounded-full bg-white hover:bg-white/95 text-[#111] text-xs sm:text-sm font-semibold tracking-[0.16em] uppercase shadow-[0_4px_24px_rgba(0,0,0,0.35)] hover:shadow-[0_6px_28px_rgba(255,255,255,0.18)] active:scale-[0.98] transition-all duration-300 flex items-center justify-center gap-2.5 cursor-pointer border border-white"
              >
                <span>View Our Collection</span>
                <ArrowRight
                  className="w-4 h-4 text-[#111] transition-transform duration-300 group-hover:translate-x-1"
                  strokeWidth={2.2}
                />
              </button>

              {/* Secondary Sign-In for Guests */}
              {!isAuthenticated && (
                <button
                  onClick={handleSignIn}
                  className="w-full sm:w-auto sm:min-w-[260px] py-3 px-6 rounded-full border border-white/30 hover:border-white/70 bg-white/10 hover:bg-white/15 text-white/90 hover:text-white text-xs sm:text-sm font-medium tracking-wide backdrop-blur-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <User className="w-4 h-4 text-white/80" />
                  <span>Sign In to Your Account</span>
                </button>
              )}
            </div>
          </motion.div>

          {/* Bottom Inquiries Bar in White Theme */}
          <div className="w-full max-w-xl text-center pt-6 border-t border-white/15 shrink-0">
            <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.22em] text-white/60 mb-3">
              Need Assistance or Inquiries?
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2.5 sm:gap-3 text-xs sm:text-sm">
              <a
                href={`tel:${cleanCallPhone}`}
                className="inline-flex items-center gap-2 px-4 py-2 sm:px-5 sm:py-2.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white transition-all backdrop-blur-md font-medium active:scale-95"
              >
                <Phone className="w-3.5 h-3.5 text-white" />
                <span>Call</span>
              </a>

              <a
                href={`https://wa.me/${cleanPhone}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 sm:px-5 sm:py-2.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white transition-all backdrop-blur-md font-medium active:scale-95"
              >
                <svg
                  viewBox="0 0 24 24"
                  width="15"
                  height="15"
                  stroke="currentColor"
                  strokeWidth="2"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-white"
                >
                  <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                </svg>
                <span>WhatsApp</span>
              </a>

              <a
                href={`mailto:${supportEmail}`}
                className="inline-flex items-center gap-2 px-4 py-2 sm:px-5 sm:py-2.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white transition-all backdrop-blur-md font-medium active:scale-95"
              >
                <Mail className="w-4 h-4 text-white" />
                <span>Email Support</span>
              </a>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
