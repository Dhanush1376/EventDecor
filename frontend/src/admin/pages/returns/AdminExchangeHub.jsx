import React, { useState, useEffect } from 'react';
import { m as motion } from 'framer-motion';
import { returnService } from '../../../services/api/returnService';
import toast from 'react-hot-toast';
import {
  PageHeader,
  EmptyState,
  SkeletonTable,
  fadeUp,
  stagger,
} from '../../components/AdminUIKit';

// Reusing same color styling logic as returns for consistency
const getStatusBadge = (status) => {
  switch (status) {
    case 'pending_stock':
      return 'bg-amber-100 text-amber-700 border-amber-200';
    case 'reserved':
      return 'bg-blue-100 text-blue-700 border-blue-200';
    case 'shipped':
      return 'bg-indigo-100 text-indigo-700 border-indigo-200';
    case 'delivered':
      return 'bg-green-100 text-green-700 border-green-200';
    default:
      return 'bg-gray-100 text-gray-700 border-gray-200';
  }
};
import { useReturnManagement } from '../../hooks/useReturnManagement';

export const AdminExchangeHub = ({ hideHeader = false }) => {
  const [exchanges, setExchanges] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchExchanges = async () => {
    try {
      setIsLoading(true);
      const res = await returnService.getAllExchanges();
      if (res.data?.success) {
        setExchanges(res.data.data.exchanges || res.data.data || []);
      }
    } catch (err) {
      toast.error('Failed to load exchanges');
    } finally {
      setIsLoading(false);
    }
  };

  const { dashboardStats, fetchDashboardStats } = useReturnManagement();

  useEffect(() => {
    fetchExchanges();
    fetchDashboardStats();
  }, []);

  const handleTransition = async (id, status) => {
    try {
      const { returnService: adminReturnService } =
        await import('../../../services/api/returnService');
      const res = await adminReturnService.transitionExchangeReplacement(id, { status });
      if (res.data?.success) {
        toast.success(`Exchange moved to ${status}`);
        fetchExchanges();
      }
    } catch (err) {
      toast.error('Transition failed');
    }
  };

  const filteredExchanges = exchanges.filter((ex) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      (ex.exchangeId || '').toLowerCase().includes(search) ||
      (ex.originalItem?.title || '').toLowerCase().includes(search) ||
      (ex.replacementItem?.title || '').toLowerCase().includes(search)
    );
  });

  const stats = dashboardStats?.stats || {};

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        {!hideHeader && (
          <PageHeader
            title="Exchange Hub"
            subtitle="Manage replacement fulfillments"
            icon="swap_horiz"
            iconColor="primary"
            mobileRow={false}
          />
        )}
        <SkeletonTable rows={5} cols={6} />
      </div>
    );
  }

  return (
    <motion.div initial="hidden" animate="show" variants={stagger} className="flex flex-col h-full">
      {!hideHeader && (
        <div className="shrink-0 pb-2">
          <PageHeader
            title="Exchange Hub"
            subtitle="Manage replacement fulfillments"
            icon="swap_horiz"
            iconColor="primary"
            mobileRow={false}
            headerAction={
              <div className="flex flex-col sm:flex-row items-stretch gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-64 shrink-0 bg-[var(--admin-surface-muted)] rounded-[4px] border border-[var(--admin-border)] flex items-center px-3">
                  <span className="material-symbols-outlined text-[18px] text-[var(--admin-text-tertiary)] shrink-0">
                    search
                  </span>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search exchanges..."
                    className="bg-transparent border-none outline-none w-full text-[13px] text-[var(--admin-text-primary)] placeholder-[var(--admin-text-tertiary)] font-medium px-2 h-10 sm:h-8"
                  />
                </div>
                <button
                  onClick={fetchExchanges}
                  className="admin-btn admin-btn-outline shrink-0 whitespace-nowrap hidden sm:flex"
                >
                  <span className="material-symbols-outlined text-[16px]">refresh</span>
                  Refresh
                </button>
              </div>
            }
          />
        </div>
      )}

      <div className="flex-1 overflow-y-auto scrollbar-hide space-y-6 pb-10 pr-1">
        <motion.div variants={fadeUp} className="admin-card overflow-hidden text-left relative p-0">
          <div className="absolute top-0 left-0 w-full h-[3px] bg-[var(--admin-border-strong)] z-10" />
          <div className="grid grid-cols-2 md:grid-cols-4 bg-[var(--admin-surface)]">
            <div className="p-5 space-y-1 border-r border-b md:border-b-0 border-[var(--admin-border-subtle)]">
              <span className="text-[10px] text-[var(--admin-text-tertiary)] font-bold uppercase tracking-wider">
                Pending Returns
              </span>
              <p className="text-[14px] font-bold text-[var(--admin-text-primary)]">
                {stats.pendingReturns || 0}
              </p>
              <span className="text-[10px] text-[var(--admin-text-secondary)] mt-1 block">
                Awaiting approval
              </span>
            </div>
            <div className="p-5 space-y-1 border-b md:border-b-0 md:border-r border-[var(--admin-border-subtle)]">
              <span className="text-[10px] text-[var(--admin-warning)] font-bold uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[var(--admin-warning)] animate-pulse" />
                Pending Pickups
              </span>
              <p className="text-[14px] font-bold text-[var(--admin-text-primary)]">
                {stats.pendingPickups || 0}
              </p>
              <span className="text-[10px] text-[var(--admin-text-secondary)] mt-1 block">
                Logistics scheduled
              </span>
            </div>
            <div className="p-5 space-y-1 border-r border-[var(--admin-border-subtle)]">
              <span className="text-[10px] text-[var(--admin-text-tertiary)] font-bold uppercase tracking-wider">
                Exchange Requests
              </span>
              <p className="text-[14px] font-bold text-[var(--admin-text-primary)]">
                {stats.exchangeRequests || 0}
              </p>
              <span className="text-[10px] text-[var(--admin-text-secondary)] mt-1 block">
                Product swaps
              </span>
            </div>
            <div className="p-5 space-y-1 bg-[var(--admin-danger)]/5 border-l-0">
              <span className="text-[10px] text-[var(--admin-danger)] font-bold uppercase tracking-wider">
                High Fraud Risk
              </span>
              <p className="text-[14px] font-bold text-[var(--admin-danger)]">
                {stats.fraudAlerts || 0}
              </p>
              <span className="text-[10px] text-[var(--admin-danger)] opacity-80 mt-1 block">
                Needs investigation
              </span>
            </div>
          </div>
        </motion.div>

        <motion.div variants={fadeUp} className="admin-card overflow-hidden text-left relative p-0">
          <div className="absolute top-0 left-0 w-full h-[3px] bg-[var(--admin-border-strong)] z-10" />

          <div className="overflow-x-auto custom-scrollbar">
            <table className="admin-table w-full min-w-[900px]">
              <thead>
                <tr>
                  <th className="w-10">
                    <input type="checkbox" className="admin-checkbox" disabled />
                  </th>
                  <th>Exchange ID</th>
                  <th className="w-1/3">Item Details</th>
                  <th>Difference</th>
                  <th>Status</th>
                  <th className="text-right pr-5">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredExchanges.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-16 text-center">
                      <EmptyState
                        icon={searchTerm ? 'search_off' : 'swap_horiz'}
                        title={searchTerm ? 'No Matches Found' : 'No Active Exchanges'}
                        description={
                          searchTerm
                            ? 'No exchanges match your search.'
                            : 'There are no active exchange requests right now.'
                        }
                      />
                    </td>
                  </tr>
                ) : (
                  filteredExchanges.map((ex) => (
                    <tr
                      key={ex._id}
                      className="group hover:bg-[var(--admin-surface-hover)] transition-colors"
                    >
                      <td className="pl-5">
                        <input type="checkbox" className="admin-checkbox" />
                      </td>
                      <td className="font-semibold text-[var(--admin-text-primary)]">
                        <div className="flex items-center gap-2 text-blue-600">
                          <span className="material-symbols-outlined text-[14px]">swap_horiz</span>
                          {ex.exchangeId || ex._id.substring(0, 8)}
                        </div>
                      </td>
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2 flex-1 bg-[var(--admin-surface-muted)] p-2 rounded border border-[var(--admin-border-subtle)]">
                            {ex.originalItem?.imageSrc && (
                              <img
                                src={ex.originalItem.imageSrc}
                                alt=""
                                className="w-8 h-8 object-cover rounded border border-[var(--admin-border)]"
                              />
                            )}
                            <div className="min-w-0">
                              <p className="text-[9px] font-bold text-[var(--admin-text-tertiary)] uppercase tracking-wider mb-0.5">
                                Returning
                              </p>
                              <p
                                className="text-[12px] font-bold text-[var(--admin-text-primary)] truncate"
                                title={ex.originalItem?.title}
                              >
                                {ex.originalItem?.title || 'Unknown Item'}
                              </p>
                            </div>
                          </div>

                          <span className="material-symbols-outlined text-[16px] text-[var(--admin-text-tertiary)] shrink-0">
                            arrow_forward
                          </span>

                          <div className="flex items-center gap-2 flex-1 bg-[var(--admin-surface-muted)] p-2 rounded border border-blue-500/20">
                            {ex.replacementItem?.imageSrc && (
                              <img
                                src={ex.replacementItem.imageSrc}
                                alt=""
                                className="w-8 h-8 object-cover rounded border border-[var(--admin-border)]"
                              />
                            )}
                            <div className="min-w-0">
                              <p className="text-[9px] font-bold text-blue-600 uppercase tracking-wider mb-0.5">
                                Replacement
                              </p>
                              <p
                                className="text-[12px] font-bold text-[var(--admin-text-primary)] truncate"
                                title={ex.replacementItem?.title}
                              >
                                {ex.replacementItem?.title || 'Unknown Item'}
                              </p>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="flex flex-col gap-1">
                          <span className="font-bold text-[var(--admin-text-primary)]">
                            ₹{ex.priceDifference || 0}
                          </span>
                          <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--admin-text-tertiary)] bg-[var(--admin-surface-muted)] px-1.5 py-0.5 rounded w-max">
                            {ex.paymentStatus?.replace(/_/g, ' ') || 'Pending'}
                          </span>
                        </div>
                      </td>
                      <td>
                        <span
                          className={`text-[10px] px-2 py-1 rounded font-bold uppercase tracking-wider border ${getStatusBadge(ex.replacementStatus)}`}
                        >
                          {ex.replacementStatus?.replace(/_/g, ' ') || 'Pending'}
                        </span>
                      </td>
                      <td className="text-right pr-5">
                        <div className="flex items-center justify-end gap-2">
                          {ex.replacementStatus === 'pending_stock' && (
                            <button
                              onClick={() => handleTransition(ex._id, 'reserved')}
                              className="admin-btn admin-btn-sm admin-btn-outline !text-amber-600 !border-amber-600 hover:!bg-amber-50"
                            >
                              <span className="material-symbols-outlined text-[14px]">
                                inventory_2
                              </span>
                              Reserve
                            </button>
                          )}
                          {ex.replacementStatus === 'reserved' && (
                            <button
                              onClick={() => handleTransition(ex._id, 'shipped')}
                              className="admin-btn admin-btn-sm admin-btn-primary"
                            >
                              <span className="material-symbols-outlined text-[14px]">
                                local_shipping
                              </span>
                              Ship
                            </button>
                          )}
                          {ex.replacementStatus === 'shipped' && (
                            <button
                              onClick={() => handleTransition(ex._id, 'delivered')}
                              className="admin-btn admin-btn-sm bg-green-600 text-white hover:bg-green-700 border-none"
                            >
                              <span className="material-symbols-outlined text-[14px]">
                                verified
                              </span>
                              Deliver
                            </button>
                          )}
                          {ex.replacementStatus === 'delivered' && (
                            <span className="text-[12px] font-bold text-green-600">Completed</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};
