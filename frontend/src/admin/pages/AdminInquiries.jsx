import { m as motion } from 'framer-motion';
import { SkeletonDashboard } from '../components/AdminUIKit';
import { AdminCustomOrderConfig } from '../components/AdminCustomOrderConfig';
import { useEffect, useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { customOrderService } from '../../services/domainServices';
import { useAdmin } from '../context/AdminContext';
import toast from 'react-hot-toast';
import { getErrorMessage } from '../../utils/core/errorHelpers';

import { InquiriesMetrics } from '../components/inquiries/InquiriesMetrics';
import { InquiriesTable } from '../components/inquiries/InquiriesTable';
import { InquiryDetailDrawer } from '../components/inquiries/InquiryDetailDrawer';

const fadeUp = { hidden: { opacity: 0, y: 15 }, show: { opacity: 1, y: 0 } };

export function AdminInquiries({ hideHeader = false }) {
  const { searchQuery } = useAdmin();
  const queryClient = useQueryClient();

  // Workspace tabs: 'active' (Orders List), 'config' (Edit Form Options)
  const [currentWorkspace, setCurrentWorkspace] = useState('active');
  const [selectedOrder, setSelectedOrder] = useState(null);

  // ─── PAGINATION & FILTERS ───
  const [page, setPage] = useState(1);
  const limit = 999999;
  const [statusFilter, setStatusFilter] = useState('All');

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [searchQuery, statusFilter]);

  // ─── DYNAMIC FORM OPTIONS ───
  const [cmsConfig, setCmsConfig] = useState(null);

  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // ─── DATA FETCHING VIA REACT QUERY ───
  const {
    data: ordersData,
    isLoading: loading,
    refetch,
  } = useQuery({
    queryKey: ['adminCustomOrders', page, limit, statusFilter, searchQuery],
    queryFn: () =>
      customOrderService.adminGetAll({
        page,
        limit,
        status: statusFilter === 'All' ? undefined : statusFilter,
        search: searchQuery,
        archived: 'false',
      }),
    keepPreviousData: true,
  });

  const orders = useMemo(() => ordersData?.data?.items || ordersData?.items || [], [ordersData]);
  const totalPages = ordersData?.data?.totalPages || ordersData?.totalPages || 1;
  const totalItems = ordersData?.data?.total || ordersData?.total || 0;

  const { data: configRes } = useQuery({
    queryKey: ['adminCustomOrderConfig'],
    queryFn: () => customOrderService.getConfig(),
    onSuccess: (res) => setCmsConfig(res?.success ? res.data : res),
  });

  const handleUpdatePriority = async (id, newPriority) => {
    try {
      const res = await customOrderService.adminUpdatePriority(id, newPriority);
      if (res.success) {
        toast.success(`Priority set to ${newPriority.toUpperCase()}`);
        refetch(); // Invalidate or refetch current page
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
            className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 ${!hideHeader ? 'border-b border-[var(--admin-border)] pb-5' : ''}`}
          >
            {!hideHeader && (
              <div>
                <h2 className="text-[22px] font-bold text-[var(--admin-text-primary)] tracking-tight">
                  Custom Orders Manager
                </h2>
                <p className="text-[12px] text-[var(--admin-text-tertiary)] font-medium mt-0.5">
                  Manage custom customer requests, write quotations, chat with customers, and edit
                  storefront form options.
                </p>
              </div>
            )}

            <div
              className={`flex bg-[var(--admin-surface-muted)] p-0.5 rounded-[var(--admin-radius-lg)] border border-[var(--admin-border-subtle)] ${hideHeader ? 'self-end' : 'self-start sm:self-auto'}`}
            >
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
                orders={orders}
                statusFilter={statusFilter}
                setStatusFilter={setStatusFilter}
                setSelectedOrder={setSelectedOrder}
                handleUpdatePriority={handleUpdatePriority}
                page={page}
                setPage={setPage}
                totalPages={totalPages}
                totalItems={totalItems}
              />

              <InquiryDetailDrawer
                selectedOrder={selectedOrder}
                setSelectedOrder={setSelectedOrder}
                refetchOrders={refetch}
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
