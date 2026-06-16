/* eslint-disable unused-imports/no-unused-imports */
import React, { useState, useEffect } from 'react';
import { m as motion } from 'framer-motion';
export function Wishlist() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="bg-surface min-h-screen pt-24 pb-32 font-body text-on-surface"
    >
      <WishlistView isEmbedded={false} />
    </motion.div>
  );
}
