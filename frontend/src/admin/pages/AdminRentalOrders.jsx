import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import rentalService from '../../services/rentalService';
import {
  PageHeader,
  FilterBar,
  StatusBadge,
  formatCurrency,
  fadeUp,
  stagger,
  SkeletonTable,
  EmptyState,
} from '../components/AdminUIKit';

const slideDrawer = {
  hidden: { x: '100%', opacity: 0 },
  show: { x: 0, opacity: 1 },
  exit: { x: '100%', opacity: 0 },
};

const allStatuses = [
  'pending',
  'active_rental',
  'late_return',
  'returned',
  'completed',
  'cancelled',
];

export function AdminRentalOrders() {
  const navigate = useNavigate();
  const [rentals, setRentals] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');

  const [selectedRental, setSelectedRental] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  useEffect(() => {
    fetchRentals();
  }, []);

  const fetchRentals = async () => {
    setDataLoading(true);
    try {
      const res = await rentalService.adminGetAll();
      if (res.success) {
        setRentals(res.data);
      } else {
        toast.error('Failed to load rental orders');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error loading rentals');
    } finally {
      setDataLoading(false);
    }
  };

  const updateRentalStatus = async (id, status) => {
    try {
      const res = await rentalService.adminUpdateStatus(id, status);
      if (res.success) {
        toast.success(`Rental status updated to ${status}`);
        fetchRentals();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update status');
    }
  };

  const filteredRentals = useMemo(() => {
    return rentals.filter((r) => {
      const matchStatus = filterStatus === 'All' || r.status === filterStatus;
      const q = searchQuery.toLowerCase();
      const matchSearch =
        !searchQuery ||
        r._id.toLowerCase().includes(q) ||
        (r.userId?.name || r.user?.name || '').toLowerCase().includes(q) ||
        r.productTitle?.toLowerCase().includes(q);
      return matchStatus && matchSearch;
    });
  }, [rentals, filterStatus, searchQuery]);

  const statusCounts = useMemo(() => {
    const counts = { All: rentals.length };
    allStatuses.forEach((s) => (counts[s] = rentals.filter((r) => r.status === s).length));
    return counts;
  }, [rentals]);

  const openRentalDrawer = (rental) => {
    setSelectedRental(rental);
    setIsDrawerOpen(true);
  };

  return (
    <motion.div initial="hidden" animate="show" variants={stagger} className="space-y-6">
      <PageHeader
        title="Rental Orders"
        subtitle={`${rentals.length} active rentals`}
        icon="inventory_2"
        iconColor="info"
        mobileRow={true}
      />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="w-full sm:max-w-md">
          <FilterBar
            filters={['All', ...allStatuses]}
            value={filterStatus}
            onChange={setFilterStatus}
            counts={statusCounts}
          />
        </div>
        <div className="w-full sm:max-w-xs relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[var(--admin-text-tertiary)] text-[18px]">
            search
          </span>
          <input
            type="text"
            placeholder="Search rentals..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="admin-input pl-10 py-2 w-full text-[12px]"
          />
        </div>
      </div>

      <AnimatePresence mode="wait">
        {dataLoading ? (
          <motion.div key="loading" initial="hidden" animate="show" exit="hidden" variants={fadeUp}>
            <SkeletonTable rows={10} cols={8} />
          </motion.div>
        ) : (
          <motion.div
            key="table"
            initial="hidden"
            animate="show"
            exit="hidden"
            variants={fadeUp}
            className="admin-card"
          >
            <div className="overflow-x-auto">
              <table className="admin-table w-full min-w-[900px]">
                <thead>
                  <tr>
                    <th>Rental ID</th>
                    <th>Customer</th>
                    <th>Product</th>
                    <th>Rental Period</th>
                    <th>Deposit</th>
                    <th>Total</th>
                    <th>Status</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRentals.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-16 text-center">
                        <EmptyState
                          icon="inventory_2"
                          title="No Rentals Found"
                          description="No rentals match the criteria."
                        />
                      </td>
                    </tr>
                  ) : (
                    filteredRentals.map((r) => {
                      return (
                        <tr
                          key={r._id}
                          className="admin-table-row-clickable group"
                          onClick={() => openRentalDrawer(r)}
                        >
                          <td className="font-semibold text-[var(--admin-text-primary)]">
                            #{r._id.substring(r._id.length - 8).toUpperCase()}
                          </td>
                          <td>
                            <div className="flex flex-col">
                              <span className="font-semibold text-[var(--admin-text-primary)]">
                                {r.userId?.name || r.user?.name || 'Guest'}
                              </span>
                            </div>
                          </td>
                          <td className="max-w-[200px] truncate text-[var(--admin-text-secondary)] font-medium">
                            {r.productTitle}
                          </td>
                          <td className="text-[11px] text-[var(--admin-text-secondary)]">
                            {new Date(r.rentalStartDate).toLocaleDateString()} -{' '}
                            {new Date(r.rentalEndDate).toLocaleDateString()}
                          </td>
                          <td className="font-bold text-[var(--admin-success)]">
                            {formatCurrency(r.securityDeposit)}
                            <span
                              className={`block text-[9px] uppercase mt-0.5 ${r.depositStatus === 'refunded' ? 'text-green-600' : 'text-amber-600'}`}
                            >
                              {r.depositStatus || 'held'}
                            </span>
                          </td>
                          <td className="font-bold text-[var(--admin-text-primary)]">
                            {formatCurrency(r.totalAmount)}
                          </td>
                          <td>
                            <span
                              className={`px-2 py-1 rounded text-[10px] uppercase font-bold tracking-wider ${
                                r.status === 'active_rental'
                                  ? 'bg-indigo-100 text-indigo-700'
                                  : r.status === 'late_return'
                                    ? 'bg-red-100 text-red-700'
                                    : r.status === 'returned' || r.status === 'completed'
                                      ? 'bg-green-100 text-green-700'
                                      : 'bg-amber-100 text-amber-700'
                              }`}
                            >
                              {r.status.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="text-right" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => openRentalDrawer(r)}
                              className="admin-btn-icon text-[var(--admin-text-tertiary)] hover:text-[var(--admin-text-primary)]"
                            >
                              <span className="material-symbols-outlined text-[16px]">
                                visibility
                              </span>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isDrawerOpen && selectedRental && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDrawerOpen(false)}
              className="fixed inset-0 z-[999] cursor-pointer"
              style={{ background: 'var(--admin-surface-overlay)', backdropFilter: 'blur(4px)' }}
            />

            <motion.aside
              initial="hidden"
              animate="show"
              exit="exit"
              variants={slideDrawer}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed right-0 top-0 h-screen w-full sm:w-[450px] z-[1000] shadow-[var(--admin-shadow-2xl)] flex flex-col bg-[var(--admin-surface)] border-l border-[var(--admin-border)]"
            >
              <div className="px-6 py-5 border-b border-[var(--admin-border-subtle)] flex items-center justify-between shrink-0 text-left bg-[var(--admin-bg-subtle)]">
                <div>
                  <h3 className="text-[14px] font-bold text-[var(--admin-text-primary)]">
                    Rental Details
                  </h3>
                  <p className="text-[11px] text-[var(--admin-text-tertiary)] mt-1">
                    #{selectedRental._id.toUpperCase()}
                  </p>
                </div>
                <button onClick={() => setIsDrawerOpen(false)} className="admin-btn-icon">
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6 text-left custom-scrollbar">
                <div className="admin-card p-5 space-y-4">
                  <div>
                    <p className="text-[10px] font-bold text-[var(--admin-text-tertiary)] uppercase tracking-wider">
                      Product
                    </p>
                    <h4 className="text-[14px] font-bold text-[var(--admin-text-primary)] mt-1">
                      {selectedRental.productTitle}
                    </h4>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-[12px] pt-4 border-t border-[var(--admin-border-subtle)]">
                    <div>
                      <p className="text-[var(--admin-text-tertiary)] font-medium mb-0.5 text-[10px] uppercase">
                        Start Date
                      </p>
                      <p className="font-semibold text-[var(--admin-text-primary)]">
                        {new Date(selectedRental.rentalStartDate).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-[var(--admin-text-tertiary)] font-medium mb-0.5 text-[10px] uppercase">
                        End Date
                      </p>
                      <p className="font-semibold text-[var(--admin-text-primary)]">
                        {new Date(selectedRental.rentalEndDate).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-[var(--admin-text-tertiary)] font-medium mb-0.5 text-[10px] uppercase">
                        Total Cost
                      </p>
                      <p className="font-semibold text-[var(--admin-text-primary)]">
                        {formatCurrency(selectedRental.totalAmount)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[var(--admin-text-tertiary)] font-medium mb-0.5 text-[10px] uppercase">
                        Deposit Held
                      </p>
                      <p className="font-semibold text-[var(--admin-success)]">
                        {formatCurrency(selectedRental.securityDeposit)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-[11px] font-bold uppercase text-[var(--admin-text-secondary)]">
                    Update Status
                  </p>
                  <select
                    value={selectedRental.status}
                    onChange={(e) => {
                      updateRentalStatus(selectedRental._id, e.target.value);
                      setSelectedRental({ ...selectedRental, status: e.target.value });
                    }}
                    className="admin-input w-full uppercase text-[11px] font-bold"
                  >
                    {allStatuses.map((s) => (
                      <option key={s} value={s}>
                        {s.replace('_', ' ')}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
