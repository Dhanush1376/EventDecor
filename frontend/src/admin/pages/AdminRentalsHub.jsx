import React, { useEffect } from 'react';
import { m as motion } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import { PageHeader, stagger } from '../components/AdminUIKit';
import { AdminRentalOrders } from './AdminRentalOrders';

export default function AdminRentalsHub() {
  const location = useLocation();
  const navigate = useNavigate();

  // If someone navigates to /calendar or /due, redirect to /admin/rentals
  useEffect(() => {
    if (location.pathname.includes('/calendar') || location.pathname.includes('/due')) {
      navigate('/admin/rentals', { replace: true });
    }
  }, [location.pathname, navigate]);

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={stagger}
      className="flex flex-col flex-1 space-y-6 min-h-screen"
    >
      <div>
        <PageHeader
          title="Rentals Hub"
          subtitle="Track and manage active rental orders, security deposits, and items."
          icon="car_rental"
          iconColor="info"
        />
      </div>

      <div className="flex-1 relative pb-10">
        <AdminRentalOrders hideHeader={true} />
      </div>
    </motion.div>
  );
}

// Reused Premium Placeholder for uniformity
function PlaceholderView({ title, icon, desc, color, bg }) {
  return (
    <div className="admin-card p-12 flex flex-col items-center justify-center text-center h-[60vh] max-h-[600px]">
      <div
        className={`w-20 h-20 rounded-[var(--admin-radius-xl)] ${bg} ${color} flex items-center justify-center mb-6 shadow-inner`}
      >
        <span className="material-symbols-outlined text-[40px]">{icon}</span>
      </div>
      <h2 className="text-[20px] font-bold text-[var(--admin-text-primary)] tracking-tight">
        {title}
      </h2>
      <p className="text-[var(--admin-text-secondary)] mt-2 max-w-md font-medium">{desc}</p>

      <div className="mt-8 p-4 border border-dashed border-[var(--admin-border-strong)] rounded-xl bg-[var(--admin-bg-subtle)] text-[var(--admin-text-tertiary)] text-[13px] font-medium flex items-center gap-2">
        <span className="material-symbols-outlined text-[16px]">api</span>
        Integration Pending
      </div>
    </div>
  );
}
