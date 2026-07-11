import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const AutomationCategoryGroup = ({ category, count, children }) => {
  const [isOpen, setIsOpen] = useState(true);

  const getCategoryDetails = (cat) => {
    switch (cat) {
      case 'order':
        return { icon: 'shopping_bag', label: 'Order Processing', color: 'text-blue-500' };
      case 'payment':
        return { icon: 'payments', label: 'Payments & Billing', color: 'text-green-500' };
      case 'inventory':
        return { icon: 'inventory_2', label: 'Inventory Alerts', color: 'text-orange-500' };
      case 'booking':
        return { icon: 'event', label: 'Event Bookings', color: 'text-purple-500' };
      case 'engagement':
        return { icon: 'campaign', label: 'Customer Engagement', color: 'text-pink-500' };
      case 'system':
        return { icon: 'settings_system_daydream', label: 'System Alerts', color: 'text-gray-500' };
      case 'summary':
        return { icon: 'summarize', label: 'Scheduled Summaries', color: 'text-teal-500' };
      default:
        return { icon: 'folder', label: cat, color: 'text-gray-500' };
    }
  };

  const details = getCategoryDetails(category);

  return (
    <div className="mb-4">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between p-4 bg-white border border-[var(--admin-border)] hover:bg-[var(--admin-bg-subtle)] transition-colors ${isOpen ? 'rounded-t-xl' : 'rounded-xl shadow-sm'}`}
      >
        <div className="flex items-center gap-3">
          <span className={`material-symbols-outlined ${details.color}`}>{details.icon}</span>
          <span className="font-semibold text-[15px] text-[var(--admin-text-primary)]">
            {details.label}
          </span>
          <span className="px-2 py-0.5 rounded-full bg-[var(--admin-surface-muted)] text-[var(--admin-text-secondary)] text-[12px] font-medium">
            {count}
          </span>
        </div>
        <span
          className={`material-symbols-outlined text-[var(--admin-text-tertiary)] transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
        >
          expand_more
        </span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AutomationCategoryGroup;
