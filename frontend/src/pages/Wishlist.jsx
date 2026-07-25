/* eslint-disable unused-imports/no-unused-imports */
import React, { useState, useEffect } from 'react';
import { m as motion } from 'framer-motion';
import { WishlistView } from '../components/wishlist/WishlistView';
import { MandalaArtDecor } from '../components/ui/MandalaArtDecor';

export function Wishlist() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="bg-surface min-h-screen pt-[60px] pb-32 font-body text-on-surface relative overflow-hidden"
    >
      <MandalaArtDecor
        variant={3}
        size={450}
        opacity={0.02}
        className="-top-24 -right-24 absolute opacity-[0.02] z-0 pointer-events-none"
        spinDuration={240}
      />
      <div className="relative z-10">
        <WishlistView isEmbedded={false} />
      </div>
    </motion.div>
  );
}
