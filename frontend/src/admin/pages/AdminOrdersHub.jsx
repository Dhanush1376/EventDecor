import React from 'react';
import { m as motion, AnimatePresence } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import { stagger } from '../components/AdminUIKit';
import { AdminOrders } from './AdminOrders';
import { AdminInquiries } from './AdminInquiries';
import AdminReturnsHub from './returns/AdminReturnsHub';

export default function AdminOrdersHub() {
  const location = useLocation();
  const navigate = useNavigate();

  // Determine initial tab based on URL path/query
  const getInitialTab = () => {
    const path = location.pathname;

    if (path.includes('/custom')) return 'custom';
    if (path.includes('/returns')) return 'returns';
    return 'all'; // Default
  };

  const activeTab = getInitialTab();

  const handleTabChange = (tabId) => {
    const basePath = '/admin/orders';

    let newPath = basePath;
    let newSearch = '';

    if (tabId === 'custom') {
      newPath = `${basePath}/custom`;
    } else if (tabId === 'returns') {
      newPath = `${basePath}/returns`;
    }

    navigate({ pathname: newPath, search: newSearch });
  };

  const tabs = [
    { id: 'all', label: 'All Orders', icon: 'shopping_bag' },
    { id: 'custom', label: 'Custom Orders', icon: 'architecture' },
    { id: 'returns', label: 'Returns & Refunds', icon: 'keyboard_return' },
  ];

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={stagger}
      className="flex flex-col flex-1 space-y-6 h-[calc(100vh-80px)]"
    >
      <div className="flex-1 relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 flex flex-col"
          >
            {activeTab === 'all' && <AdminOrders />}
            {activeTab === 'custom' && <AdminInquiries />}
            {activeTab === 'returns' && <AdminReturnsHub />}
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
