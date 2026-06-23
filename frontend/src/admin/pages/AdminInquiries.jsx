import { m as motion } from 'framer-motion';
import { SkeletonDashboard } from '../components/AdminUIKit';
import { AdminCustomOrderConfig } from '../components/AdminCustomOrderConfig';
import { useEffect, useState, useMemo } from 'react';
import { customOrderService } from '../../services/domainServices';
import { useAdmin } from '../context/AdminContext';
import toast from 'react-hot-toast';
import logger from '../../utils/core/logger';
import { getErrorMessage } from '../../utils/core/errorHelpers';

import { InquiriesMetrics } from '../components/inquiries/InquiriesMetrics';
import { InquiriesTable } from '../components/inquiries/InquiriesTable';
import { InquiryDetailDrawer } from '../components/inquiries/InquiryDetailDrawer';
import { useAdminTableFilters } from '../hooks/useAdminTableFilters';

const fadeUp = { hidden: { opacity: 0, y: 15 }, show: { opacity: 1, y: 0 } };

export function AdminInquiries() {
  const { searchQuery } = useAdmin();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  // Workspace tabs: 'active' (Orders List), 'config' (Edit Form Options)
  const [currentWorkspace, setCurrentWorkspace] = useState('active');
  const [selectedOrder, setSelectedOrder] = useState(null);

  // ─── TABLE FILTERS ───
  const searchFields = ['customerName', 'customerEmail', 'occasion', 'productType', 'city', '_id'];
  const {
    statusFilter,
    setStatusFilter,
    filteredData: filteredOrders,
  } = useAdminTableFilters(orders, searchQuery, searchFields);

  // ─── DYNAMIC FORM OPTIONS ───
  const [cmsConfig, setCmsConfig] = useState(null);

  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Sync active lists and form options
  const fetchAdminWorkspaceData = async () => {
    setLoading(true);
    try {
      const res = await customOrderService.adminGetAll({ archived: 'false' });
      if (res.success) {
        setOrders(res.data?.items || res.data || []);
      } else {
        setOrders(res.items || res || []);
      }

      const configRes = await customOrderService.getConfig();
      if (configRes?.success) {
        setCmsConfig(configRes.data);
      } else {
        setCmsConfig(configRes);
      }
    } catch (err) {
      logger.error('AdminInquiries fetch error:', err);
      toast.error('Failed to load custom orders list: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(() => {
      fetchAdminWorkspaceData();
    }, 0);
    return () => clearTimeout(t);
  }, []);

  const handleUpdatePriority = async (id, newPriority) => {
    try {
      const res = await customOrderService.adminUpdatePriority(id, newPriority);
      if (res.success) {
        toast.success(`Priority set to ${newPriority.toUpperCase()}`);
        setOrders((prev) => prev.map((o) => (o._id === id ? res.data : o)));
        if (selectedOrder?._id === id) setSelectedOrder(res.data);
      }
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to change priority'));
    }
  };

  // ─── ANALYTICS SUMMARIES ───
  const stats = useMemo(() => {
    const total = orders.length;
    const pending = orders.filter((o) => o.status === 'Pending').length;
    const quotesSent = orders.filter((o) => o.status === 'Quote Sent').length;
    const approved = orders.filter((o) => o.status === 'Approved').length;
    const valuation = orders.reduce((sum, o) => sum + (o.quotation?.total || 0), 0);
    return { total, pending, quotesSent, approved, valuation };
  }, [orders]);

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={{ show: { transition: { staggerChildren: 0.05 } } }}
      className="max-w-[1440px] mx-auto space-y-6  text-[var(--admin-text-primary)]"
    >
      {loading ? (
        <SkeletonDashboard />
      ) : (
        <>
          {/* Page Header Area */}
          <motion.div
            variants={fadeUp}
            className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[var(--admin-border)] pb-5"
          >
            <div>
              <h2 className="text-[22px] font-bold text-[var(--admin-text-primary)] tracking-tight">
                Custom Orders Manager
              </h2>
              <p className="text-[12px] text-[var(--admin-text-tertiary)] font-medium mt-0.5">
                Manage custom customer requests, write quotations, chat with customers, and edit
                storefront form options.
              </p>
            </div>

            <div className="flex bg-[var(--admin-surface-muted)] p-0.5 rounded-[var(--admin-radius-lg)] border border-[var(--admin-border-subtle)] self-start sm:self-auto">
              <button
                onClick={() => setCurrentWorkspace('active')}
                className={`px-5 py-2.5 rounded-full text-[11px] font-bold uppercase tracking-wider cursor-pointer transition-all duration-300 ${
                  currentWorkspace === 'active'
                    ? 'bg-[var(--admin-surface)] text-[var(--admin-text-primary)] shadow-[var(--admin-shadow-xs)] border border-[var(--admin-border-subtle)]'
                    : 'text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)]'
                }`}
              >
                Orders List
              </button>
              <button
                onClick={() => setCurrentWorkspace('config')}
                className={`px-5 py-2.5 rounded-full text-[11px] font-bold uppercase tracking-wider cursor-pointer transition-all duration-300 ${
                  currentWorkspace === 'config'
                    ? 'bg-[var(--admin-surface)] text-[var(--admin-text-primary)] shadow-[var(--admin-shadow-xs)] border border-[var(--admin-border-subtle)]'
                    : 'text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)]'
                }`}
              >
                Edit Form Options
              </button>
            </div>
          </motion.div>

          {/* ─── WORKSPACE: PIPELINES RETAIN GRID ─── */}
          {currentWorkspace === 'active' && (
            <div className="space-y-6">
              <InquiriesMetrics stats={stats} />

              <InquiriesTable
                filteredOrders={filteredOrders}
                orders={orders}
                statusFilter={statusFilter}
                setStatusFilter={setStatusFilter}
                setSelectedOrder={setSelectedOrder}
                handleUpdatePriority={handleUpdatePriority}
              />

              <InquiryDetailDrawer
                selectedOrder={selectedOrder}
                setSelectedOrder={setSelectedOrder}
                setOrders={setOrders}
                isMobile={isMobile}
              />
            </div>
          )}

          {/* ─── WORKSPACE: STOREFRONT FORM CONFIG ─── */}
          {currentWorkspace === 'config' && (
            <AdminCustomOrderConfig cmsConfig={cmsConfig} setCmsConfig={setCmsConfig} />
          )}
        </>
      )}
    </motion.div>
  );
}
