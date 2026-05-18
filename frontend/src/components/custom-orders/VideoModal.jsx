import React from "react";
import { motion, AnimatePresence } from "framer-motion";

export function VideoModal({ video, onClose }) {
  if (!video) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 md:p-12">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/90 backdrop-blur-md"
        />
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="relative w-full max-w-5xl aspect-video bg-surface-container rounded-3xl overflow-hidden shadow-2xl border border-white/10"
        >
          <div className="absolute top-6 right-6 z-10">
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md text-white hover:bg-white/20 transition-all flex items-center justify-center cursor-pointer"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          <div className="w-full h-full relative group">
            <img
              src={video.thumb}
              alt={video.title}
              className="w-full h-full object-cover opacity-60"
            />
            <div className="absolute inset-0 flex flex-col items-center justify-center space-y-6 text-center px-10">
              <div className="w-20 h-20 rounded-full bg-primary/90 flex items-center justify-center shadow-luxury animate-pulse">
                <span className="material-symbols-outlined text-[40px] text-surface pl-1">
                  play_arrow
                </span>
              </div>
              <div>
                <h3 className="font-display text-[28px] md:text-[36px] text-surface mb-2">
                  {video.title}
                </h3>
                <p className="font-label-sm text-[12px] uppercase tracking-[0.4em] text-surface/60 font-bold">
                  Simulated Cinematic Playback | {video.duration}
                </p>
              </div>
              <p className="font-body text-[14px] text-surface/40 max-w-md font-light italic">
                In a production environment, this would initialize the
                Vimeo/YouTube API player for the specific archive reel.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
