import { m as motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAdmin } from '../context/AdminContext';
import { useConfirm } from '../../context/ConfirmProvider';
import { customerIntelligenceService } from '../../services/domainServices';
import {
  PageHeader,
  EmptyState,
  FilterBar,
  formatCurrency,
  fadeUp,
  stagger,
  SkeletonCard,
} from '../components/AdminUIKit';
import { formatDistanceToNow } from 'date-fns';
import { EXTERNAL_URLS } from '../../config/constants';
import { getAccessToken } from '../../services/api';
import { getApiRootUrl } from '../../config/apiConfig';
import { acquireAdminSocket, releaseAdminSocket } from '../services/adminSocket';
import AdminCustomerProfileModal from '../components/AdminCustomerProfileModal';

import { WhatsAppIcon } from '../../components/ui/WhatsAppIcon';

const StatCard = ({ title, value, icon, color }) => (
  <div className="bg-[var(--admin-surface)] p-5 rounded-xl border border-[var(--admin-border)] shadow-sm flex items-center justify-between">
    <div>
      <p className="text-sm font-medium text-[var(--admin-text-secondary)]">{title}</p>
      <p className="text-2xl font-bold text-[var(--admin-text-primary)] mt-1">{value}</p>
    </div>
    <div
      className="w-10 h-10 rounded-lg flex items-center justify-center"
      style={{
        background: `color-mix(in srgb, ${color} 10%, transparent)`,
        color: color,
      }}
    >
      <span className="material-symbols-outlined text-[20px]">{icon}</span>
    </div>
  </div>
);

export function AdminCustomers() {
  const navigate = useNavigate();
  const { searchQuery, setSearchQuery } = useAdmin();
  const confirm = useConfirm();

  const [tierFilter, setTierFilter] = useState('All');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);

  const [customers, setCustomers] = useState([]);
  const [meta, setMeta] = useState({});
  const [dataLoading, setDataLoading] = useState(true);

  const [kpi, setKpi] = useState(null);
  const [kpiLoading, setKpiLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  const fetchCustomers = useCallback(async () => {
    setDataLoading(true);
    try {
      const res = await customerIntelligenceService.getCustomers({
        page,
        limit: pageSize,
        search: searchQuery,
        tier: tierFilter === 'All' ? undefined : tierFilter,
      });
      setCustomers(res?.data || []);
      setMeta(res?.meta || {});
    } catch (err) {
      toast.error('Failed to load customers');
    } finally {
      setDataLoading(false);
    }
  }, [page, pageSize, searchQuery, tierFilter]);

  const fetchKpis = useCallback(async () => {
    setKpiLoading(true);
    try {
      const res = await customerIntelligenceService.getOverview();
      setKpi(res?.snapshot?.metrics || null);
    } catch (err) {
      console.error('KPI fetch error:', err);
    } finally {
      setKpiLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  useEffect(() => {
    fetchKpis();
  }, [fetchKpis]);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) return;

    const socket = acquireAdminSocket();

    const onCustomerUpdated = () => {
      fetchCustomers();
      fetchKpis();
    };
    const onOrderUpdate = () => {
      fetchCustomers();
      fetchKpis();
    };

    socket.on('customer_updated', onCustomerUpdated);
    socket.on('order_update', onOrderUpdate);

    return () => {
      socket.off('customer_updated', onCustomerUpdated);
      socket.off('order_update', onOrderUpdate);
      releaseAdminSocket();
    };
  }, [fetchCustomers, fetchKpis]);

  const handleExport = async () => {
    if (isExporting) return;
    setIsExporting(true);
    try {
      const token = getAccessToken();
      const res = await fetch(
        `${getApiRootUrl()}/customer-intelligence/customers/export?search=${searchQuery}&tier=${tierFilter}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      const data = await res.json();

      if (data.success && data.data) {
        const headers = 'Name,Email,Phone,Orders,Spent,Tier,Joined\n';
        const rows = data.data
          .map(
            (c) =>
              `"${c.Name}","${c.Email}","${c.Phone}",${c.Orders},${c.Spent},"${c.Tier}","${c.Joined}"`,
          )
          .join('\n');

        const blob = new Blob([headers + rows], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute(
          'download',
          `EventDecor_Customers_${new Date().toISOString().slice(0, 10)}.csv`,
        );
        link.click();
        toast.success('Customers export completed');
      }
    } catch (err) {
      toast.error('Export failed');
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteCustomer = async (customerToDelete) => {
    if (!customerToDelete?._id) return;

    const confirmed = await confirm({
      title: 'Move Customer to Recycle Bin?',
      message: `Are you sure you want to move "${customerToDelete.name || 'this customer'}" to the recycle bin? Customer access will be revoked, and their record will be safely held in the Recycle Bin for 30 days where it can be restored or permanently removed.`,
      confirmText: 'Move to Recycle Bin',
      cancelText: 'Cancel',
      type: 'danger',
    });

    if (!confirmed) return;

    try {
      await customerIntelligenceService.deleteCustomer(
        customerToDelete._id,
        'Moved to recycle bin from Customers dashboard',
      );
      toast.success(`"${customerToDelete.name || 'Customer'}" moved to Recycle Bin`);
      if (selectedCustomerId === customerToDelete._id) {
        setSelectedCustomerId(null);
      }
      fetchCustomers();
      fetchKpis();
    } catch (err) {
      console.error('Failed to soft delete customer:', err);
      toast.error(err?.response?.data?.message || 'Failed to move customer to recycle bin');
    }
  };

  return (
    <motion.div initial="hidden" animate="show" variants={stagger} className="space-y-6">
      <PageHeader
        title="Customers"
        badge={meta.total || customers.length || 0}
        subtitle="Manage your customer base"
        icon="group"
        iconColor="users"
        headerAction={
          <div className="flex flex-col sm:flex-row items-stretch gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64 shrink-0 bg-[var(--admin-surface-muted)] rounded-md border border-[var(--admin-border)] flex items-center px-3">
              <span className="material-symbols-outlined text-[18px] text-[var(--admin-text-tertiary)] shrink-0">
                search
              </span>
              <input
                type="text"
                placeholder="Search customers..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                className="bg-transparent border-none outline-none w-full text-[13px] text-[var(--admin-text-primary)] placeholder-[var(--admin-text-tertiary)] font-medium px-2 h-10 sm:h-8"
              />
            </div>
            <div className="flex items-stretch gap-2 w-full sm:w-auto overflow-hidden">
              <FilterBar
                filters={['All', 'Platinum', 'Gold', 'Silver', 'Bronze']}
                value={tierFilter}
                onChange={(v) => {
                  setTierFilter(v);
                  setPage(1);
                }}
                className="flex-1 min-w-0"
              />
              <button
                className="w-10 bg-[var(--admin-surface-muted)] hover:bg-[var(--admin-border-subtle)] text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)] rounded-md flex items-center justify-center cursor-pointer transition-all active:scale-95 border border-[var(--admin-border)] shrink-0"
                title="Export Customers"
                onClick={handleExport}
                disabled={isExporting}
              >
                <span
                  className={`material-symbols-outlined text-[18px] ${isExporting ? 'animate-spin' : ''}`}
                >
                  {isExporting ? 'sync' : 'download'}
                </span>
              </button>
            </div>
          </div>
        }
      />

      <AnimatePresence mode="wait">
        {dataLoading ? (
          <motion.div
            key="loading"
            initial="hidden"
            animate="show"
            exit="hidden"
            variants={stagger}
            className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5"
          >
            {[...Array(6)].map((_, i) => (
              <SkeletonCard key={i} className="h-[280px]" />
            ))}
          </motion.div>
        ) : customers.length === 0 ? (
          <motion.div
            key="empty"
            initial="hidden"
            animate="show"
            exit="hidden"
            variants={fadeUp}
            className="admin-card py-16 flex justify-center"
          >
            <EmptyState
              icon={searchQuery || tierFilter !== 'All' ? 'search_off' : 'group'}
              title={searchQuery || tierFilter !== 'All' ? 'No Matches Found' : 'No Customers Yet'}
              description={
                searchQuery || tierFilter !== 'All'
                  ? 'No customers match the search or filter criteria.'
                  : 'When customers create accounts or place orders, they will appear here.'
              }
              action={
                searchQuery || tierFilter !== 'All' ? (
                  <button
                    onClick={() => {
                      setTierFilter('All');
                      setPage(1);
                    }}
                    className="admin-btn admin-btn-outline"
                  >
                    Clear Filters
                  </button>
                ) : (
                  <button
                    onClick={() => window.location.reload()}
                    className="admin-btn admin-btn-outline"
                  >
                    <span className="material-symbols-outlined text-[16px]">refresh</span>
                    Refresh Page
                  </button>
                )
              }
            />
          </motion.div>
        ) : (
          <motion.div
            key="grid"
            initial="hidden"
            animate="show"
            exit="hidden"
            variants={stagger}
            className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5"
          >
            {customers.map((c) => (
              <motion.div
                key={c._id}
                variants={fadeUp}
                className="admin-card p-6 group hover:border-[var(--admin-border-strong)] hover:shadow-[var(--admin-shadow-md)] transition-all duration-300"
              >
                <div className="flex items-start justify-between gap-3 mb-5">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-12 h-12 rounded-[var(--admin-radius-lg)] bg-[var(--admin-bg-subtle)] border border-[var(--admin-border-subtle)] flex items-center justify-center shrink-0 group-hover:border-[var(--admin-accent)] group-hover:text-[var(--admin-accent)] transition-colors">
                      <span className="text-[14px] font-bold text-[var(--admin-text-primary)] group-hover:text-[var(--admin-accent)]">
                        {c.name
                          ?.split(' ')
                          .filter(Boolean)
                          .map((n) => n[0])
                          .join('')
                          .slice(0, 2)
                          .toUpperCase()}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[14px] font-bold text-[var(--admin-text-primary)] leading-tight truncate">
                        {c.name}
                      </p>
                      <p className="text-[11px] text-[var(--admin-text-tertiary)] font-medium uppercase tracking-wider mt-0.5">
                        {c.city || 'Unknown'}
                      </p>
                      {c.lastLogin && (
                        <p className="text-[10px] text-[var(--admin-text-secondary)] mt-1 flex items-center gap-1">
                          <span className="material-symbols-outlined text-[12px]">schedule</span>
                          Active {formatDistanceToNow(new Date(c.lastLogin), { addSuffix: true })}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <span
                      className={`admin-badge h-5 px-2 font-bold text-[8px] border-none shadow-sm ${
                        c.segment === 'VIP'
                          ? 'bg-[var(--admin-text-primary)] text-white'
                          : c.segment === 'New'
                            ? 'bg-[var(--admin-success-light)] text-[var(--admin-success)]'
                            : 'bg-[var(--admin-surface-muted)] text-[var(--admin-text-secondary)]'
                      }`}
                    >
                      {c.segment}
                    </span>
                    <span
                      className={`admin-badge h-5 px-2 font-bold text-[8px] shadow-sm ${
                        c.loyaltyTier === 'Platinum'
                          ? 'bg-[#f0f9ff] text-[#0284c7] border-[#bae6fd]'
                          : c.loyaltyTier === 'Gold'
                            ? 'bg-[var(--admin-surface-muted)] text-[var(--admin-text-primary)] border-[var(--admin-border-strong)]'
                            : c.loyaltyTier === 'Silver'
                              ? 'bg-[#f8fafc] text-[var(--admin-text-secondary)] border-[#e2e8f0]'
                              : 'bg-[#fffbeb] text-[#d97706] border-[#fde68a]'
                      }`}
                    >
                      {c.loyaltyTier || 'Bronze'}
                    </span>

                    <div className="mt-1 flex flex-col items-end gap-1 text-[11px] text-[var(--admin-text-secondary)] font-semibold">
                      <span className="flex items-center gap-1 shrink-0 whitespace-nowrap">
                        <span className="material-symbols-outlined text-[13px] text-emerald-600 shrink-0">
                          account_balance_wallet
                        </span>
                        <span className="whitespace-nowrap">
                          {formatCurrency(c.walletBalance || 0)}
                        </span>
                      </span>
                      <span className="flex items-center gap-1 shrink-0 whitespace-nowrap">
                        <span className="material-symbols-outlined text-[13px] text-amber-500 shrink-0">
                          stars
                        </span>
                        <span className="whitespace-nowrap">{c.siriCoins || 0} Coins</span>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 mb-5 p-3 bg-[var(--admin-surface-muted)] rounded-[var(--admin-radius-lg)] border border-[var(--admin-border-subtle)]">
                  <div className="text-center">
                    <p className="text-[14px] font-bold text-[var(--admin-text-primary)]">
                      {c.orders || 0}
                    </p>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--admin-text-tertiary)] mt-0.5">
                      Orders
                    </p>
                  </div>
                  <div className="text-center border-l border-r border-[var(--admin-border)]">
                    <p className="text-[14px] font-bold text-[var(--admin-accent)]">
                      {c.totalSpent >= 1000
                        ? `₹${(c.totalSpent / 1000).toFixed(1)}K`
                        : `₹${c.totalSpent || 0}`}
                    </p>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--admin-text-tertiary)] mt-0.5">
                      Spent
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-[12px] font-bold text-[var(--admin-text-primary)] mt-0.5">
                      {c.health}
                    </p>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--admin-text-tertiary)] mt-0.5">
                      Health
                    </p>
                  </div>
                </div>

                <div className="pt-4 border-t border-[var(--admin-border-subtle)] space-y-2">
                  <button
                    onClick={() => setSelectedCustomerId(c._id)}
                    className="admin-btn w-full min-h-[36px] h-9 text-[12px] font-semibold bg-[var(--admin-surface-muted)] text-[var(--admin-text-primary)] hover:bg-[var(--admin-border-strong)] justify-center gap-2 transition-all cursor-pointer rounded-lg"
                  >
                    <span className="material-symbols-outlined text-[16px] shrink-0">
                      visibility
                    </span>
                    <span>Quick View</span>
                  </button>

                  <div className="grid grid-cols-3 gap-2">
                    <a
                      href={`mailto:${c.email}`}
                      style={{ paddingLeft: '6px', paddingRight: '6px' }}
                      className="admin-btn admin-btn-outline min-h-[32px] h-8 text-[11px] font-medium hover:text-[var(--admin-text-primary)] hover:bg-[var(--admin-surface-muted)] justify-center gap-1.5 w-full transition-all cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[14px] shrink-0">mail</span>
                      <span className="truncate">Email</span>
                    </a>
                    <a
                      href={`${EXTERNAL_URLS.WHATSAPP_BASE}/${c.phone?.replace(/[^0-9]/g, '') || ''}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ paddingLeft: '6px', paddingRight: '6px' }}
                      className="admin-btn admin-btn-outline min-h-[32px] h-8 text-[11px] font-medium border-[var(--admin-success-light)] text-[var(--admin-success)] hover:bg-[var(--admin-success-light)] justify-center gap-1.5 w-full transition-all cursor-pointer"
                    >
                      <WhatsAppIcon className="w-[13px] h-[13px] shrink-0" />
                      <span className="truncate">WhatsApp</span>
                    </a>
                    <button
                      onClick={() => handleDeleteCustomer(c)}
                      style={{ paddingLeft: '6px', paddingRight: '6px' }}
                      className="admin-btn admin-btn-outline min-h-[32px] h-8 text-[11px] font-medium border-red-200 dark:border-red-900/50 text-red-600 hover:text-white hover:bg-red-600 hover:border-red-600 justify-center gap-1.5 w-full transition-all cursor-pointer"
                      title="Move Customer to Recycle Bin"
                    >
                      <span className="material-symbols-outlined text-[14px] shrink-0">delete</span>
                      <span className="truncate">Delete</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pagination Controls */}
      {!dataLoading && (meta.pages > 1 || customers.length > 0) && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-8 pt-4 border-t border-[var(--admin-border-subtle)]">
          <div className="text-xs text-[var(--admin-text-secondary)]">
            Showing{' '}
            <span className="font-semibold text-[var(--admin-text-primary)]">
              {customers.length}
            </span>{' '}
            of{' '}
            <span className="font-semibold text-[var(--admin-text-primary)]">
              {meta.total || customers.length}
            </span>{' '}
            customers
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs text-[var(--admin-text-secondary)]">
              <span>Per page:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className="bg-[var(--admin-surface-muted)] border border-[var(--admin-border)] rounded px-2 py-1 text-xs font-semibold text-[var(--admin-text-primary)] outline-none cursor-pointer"
              >
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>

            {meta.pages > 1 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="admin-btn admin-btn-outline px-3 h-8 text-xs disabled:opacity-50 cursor-pointer"
                >
                  Previous
                </button>
                <span className="text-xs font-medium text-[var(--admin-text-secondary)] px-1">
                  Page {page} of {meta.pages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(meta.pages, p + 1))}
                  disabled={page === meta.pages}
                  className="admin-btn admin-btn-outline px-3 h-8 text-xs disabled:opacity-50 cursor-pointer"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      {/* Slide-over Profile */}
      <AnimatePresence>
        {selectedCustomerId && (
          <AdminCustomerProfileModal
            customer={customers.find((c) => c._id === selectedCustomerId)}
            onClose={() => setSelectedCustomerId(null)}
            onDelete={handleDeleteCustomer}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
