import React, { useState, useEffect } from 'react';
import { m as motion, AnimatePresence } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import { PageHeader, stagger } from '../components/AdminUIKit';
import { AdminOrders } from './AdminOrders';
import { AdminInquiries } from './AdminInquiries';

export default function AdminOrdersHub() {
  const location = useLocation();
  const navigate = useNavigate();

  // Determine initial tab based on URL path/query
  const getInitialTab = () => {
    const path = location.pathname;
    const search = location.search;

    if (path.includes('/custom')) return 'custom';
    if (search.includes('type=purchase')) return 'purchase';
    return 'all'; // Default
  };

  const activeTab = getInitialTab();

  const handleTabChange = (tabId) => {
    const basePath = '/admin/orders';

    let newPath = basePath;
    let newSearch = '';

    if (tabId === 'purchase') {
      newSearch = '?type=purchase';
    } else if (tabId === 'custom') {
      newPath = `${basePath}/custom`;
    }

    navigate({ pathname: newPath, search: newSearch });
  };

  const tabs = [
    { id: 'all', label: 'All Orders', icon: 'shopping_bag' },
    { id: 'purchase', label: 'Purchase Orders', icon: 'shopping_cart' },
    { id: 'custom', label: 'Custom Orders', icon: 'architecture' },
  ];

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={stagger}
      className="flex flex-col flex-1 space-y-6 h-[calc(100vh-80px)]"
    >
      <div>
        <PageHeader
          title="Orders Hub"
          subtitle="Manage standard sales, purchase orders, and custom architectural requests."
          icon="shopping_bag"
          iconColor="orders"
        />

        {/* Smart Filter Tabs */}
        <div className="flex border-b border-[var(--admin-border-subtle)] overflow-x-auto no-scrollbar mt-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`flex items-center gap-2 px-6 py-4 font-semibold text-[14px] border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-[var(--admin-accent)] text-[var(--admin-accent)]'
                  : 'border-transparent text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)] hover:border-[var(--admin-border-strong)]'
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto relative pb-10 custom-scrollbar">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0"
          >
            {activeTab === 'all' && <AdminOrders hideHeader={true} />}
            {activeTab === 'purchase' && <AdminOrders hideHeader={true} />}
            {activeTab === 'custom' && <AdminInquiries hideHeader={true} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
