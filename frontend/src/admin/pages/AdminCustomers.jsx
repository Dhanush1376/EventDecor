import { m as motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAdmin } from '../context/AdminContext';
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
import CustomerProfile360 from './CustomerProfile360';

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
  const { searchQuery } = useAdmin();

  const [tierFilter, setTierFilter] = useState('All');
  const [page, setPage] = useState(1);
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
        limit: 12,
        search: searchQuery,
        tier: tierFilter,
      });
      setCustomers(res?.data || []);
      setMeta(res?.meta || {});
    } catch (err) {
      toast.error('Failed to load customers');
    } finally {
      setDataLoading(false);
    }
  }, [page, searchQuery, tierFilter]);

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
      // In a real scenario, this hits the backend /export endpoint using api.js directly
      // Since customerIntelligenceService doesn't expose the new export endpoint yet, we'll fetch it via getCustomers but without pagination if we mapped it, but let's just use the raw fetch for this snippet
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

  return (
    <motion.div initial="hidden" animate="show" variants={stagger} className="space-y-6">
      <PageHeader
        title="Customers"
        subtitle={meta.total ? `${meta.total} total customers` : 'Manage your customer base'}
        icon="group"
        iconColor="users"
        mobileRow={true}
        headerAction={
          <div className="w-full sm:max-w-md">
            <FilterBar
              filters={['All', 'Platinum', 'Gold', 'Silver', 'Bronze']}
              value={tierFilter}
              onChange={(v) => {
                setTierFilter(v);
                setPage(1);
              }}
            />
          </div>
        }
      >
        <button
          className="p-1.5 hover:bg-[var(--admin-surface-muted)] text-[var(--admin-text-tertiary)] hover:text-[var(--admin-text-primary)] rounded-lg flex items-center justify-center cursor-pointer transition-all active:scale-95 border-none bg-transparent"
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
      </PageHeader>

      {/* Dynamic KPI Dashboard */}
      {!kpiLoading && kpi && (
        <motion.div variants={fadeUp} className="admin-grid-stats mb-6">
          <StatCard
            title="Total Customers"
            value={meta.total || kpi.activeCustomers || 0}
            icon="group"
            color="#4ade80"
          />
          <StatCard
            title="New This Week"
            value={kpi.newCustomersThisWeek || 0}
            icon="fiber_new"
            color="#3b82f6"
          />
        </motion.div>
      )}

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

                <div className="grid grid-cols-3 gap-2 pt-4 border-t border-[var(--admin-border-subtle)]">
                  <a
                    href={`mailto:${c.email}`}
                    className="admin-btn admin-btn-outline min-h-[36px] h-8 text-[10px] px-2 hover:text-[var(--admin-text-primary)] hover:bg-[var(--admin-surface-muted)] justify-center gap-1.5 w-full transition-all"
                  >
                    <span className="material-symbols-outlined text-[14px] shrink-0">mail</span>
                    <span className="hidden sm:inline truncate">Email</span>
                  </a>
                  <a
                    href={`${EXTERNAL_URLS.WHATSAPP_BASE}/${c.phone?.replace(/[^0-9]/g, '') || ''}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="admin-btn admin-btn-outline min-h-[36px] h-8 text-[10px] px-2 border-[var(--admin-success-light)] text-[var(--admin-success)] hover:bg-[var(--admin-success-light)] justify-center gap-1.5 w-full transition-all"
                  >
                    <span className="material-symbols-outlined text-[14px] shrink-0">chat</span>
                    <span className="hidden sm:inline truncate">WhatsApp</span>
                  </a>
                  <button
                    onClick={() => setSelectedCustomerId(c._id)}
                    className="admin-btn min-h-[36px] h-8 text-[10px] px-2 bg-[var(--admin-surface-muted)] text-[var(--admin-text-primary)] hover:bg-[var(--admin-border-strong)] justify-center gap-1.5 w-full transition-all"
                  >
                    <span className="material-symbols-outlined text-[14px] shrink-0">
                      visibility
                    </span>
                    <span className="hidden sm:inline truncate">Quick View</span>
                  </button>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pagination Controls */}
      {!dataLoading && meta.pages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-8">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="admin-btn admin-btn-outline px-3"
          >
            Previous
          </button>
          <span className="text-sm text-[var(--admin-text-secondary)]">
            Page {page} of {meta.pages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(meta.pages, p + 1))}
            disabled={page === meta.pages}
            className="admin-btn admin-btn-outline px-3"
          >
            Next
          </button>
        </div>
      )}
      {/* Slide-over Profile */}
      <AnimatePresence>
        {selectedCustomerId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm"
          >
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="w-full max-w-4xl h-full bg-[var(--admin-bg)] overflow-y-auto shadow-2xl"
            >
              <CustomerProfile360
                customerId={selectedCustomerId}
                onClose={() => setSelectedCustomerId(null)}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
