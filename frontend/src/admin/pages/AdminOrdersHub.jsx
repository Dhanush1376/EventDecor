import React from 'react';
import { m as motion } from 'framer-motion';
import { Navigate, useLocation } from 'react-router-dom';
import { stagger } from '../components/AdminUIKit';
import { AdminOrders } from './AdminOrders';

export default function AdminOrdersHub() {
  const location = useLocation();

  // Returns & exchanges are requested by customers on WhatsApp and handled manually.
  if (location.pathname.includes('/returns')) return <Navigate to="/admin/orders" replace />;

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={stagger}
      className="flex flex-col flex-1 space-y-6 h-[calc(100vh-80px)]"
    >
      <div className="flex-1 relative">
        <div className="absolute inset-0 flex flex-col">
          <AdminOrders />
        </div>
      </div>
    </motion.div>
  );
}
