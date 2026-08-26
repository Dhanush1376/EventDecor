import React from 'react';
import { m as motion, AnimatePresence } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import { PageHeader, stagger } from '../components/AdminUIKit';
import { AdminRentalOrders } from './AdminRentalOrders';
import { AdminRentalCalendar } from './AdminRentalCalendar';

export default function AdminRentalsHub() {
  const location = useLocation();
  const navigate = useNavigate();

  // Determine initial tab based on URL path
  const getInitialTab = () => {
    const path = location.pathname;
    if (path.includes('/calendar')) return 'calendar';
    if (path.includes('/due')) return 'due';
    return 'active'; // Default
  };

  const activeTab = getInitialTab();

  const handleTabChange = (tabId) => {
    const basePath = '/admin/rentals';
    const newPath =
      tabId === 'active'
        ? basePath
        : tabId === 'calendar'
          ? `${basePath}/calendar`
          : `${basePath}/due`;

    navigate(newPath);
  };

  const tabs = [
    { id: 'active', label: 'Active Rentals', icon: 'car_rental' },
    { id: 'calendar', label: 'Rental Calendar', icon: 'calendar_month' },
    { id: 'due', label: 'Due Returns', icon: 'assignment_return' },
  ];

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
          subtitle="Track rental inventory, calendar availability, and due returns."
          icon="car_rental"
          iconColor="info"
        >
          {/* Sleek Modern Tabs (Moved inside PageHeader to appear on the right) */}
          <div className="flex items-center gap-1 p-1 bg-[var(--admin-surface-muted)] rounded-md border border-[var(--admin-border-subtle)] shadow-sm shrink-0 w-full sm:w-auto overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`relative flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 sm:px-3 py-2 sm:py-1.5 rounded text-[12px] font-bold tracking-wide transition-all duration-300 whitespace-nowrap ${
                    isActive
                      ? 'bg-white text-[var(--admin-text-primary)] shadow-sm border border-[var(--admin-border-subtle)]'
                      : 'text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)] hover:bg-black/5 border border-transparent'
                  }`}
                >
                  <span
                    className={`material-symbols-outlined text-[16px] transition-colors duration-300 ${
                      isActive ? 'text-[var(--admin-accent)]' : 'text-[var(--admin-text-tertiary)]'
                    }`}
                  >
                    {tab.icon}
                  </span>
                  {tab.label}
                </button>
              );
            })}
          </div>
        </PageHeader>
      </div>

      <div className="flex-1 relative pb-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="w-full"
          >
            {activeTab === 'active' && <AdminRentalOrders hideHeader={true} />}
            {activeTab === 'calendar' && <AdminRentalCalendar hideHeader={true} />}
            {activeTab === 'due' && (
              <AdminRentalOrders hideHeader={true} initialFilter="late_return" />
            )}
          </motion.div>
        </AnimatePresence>
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
