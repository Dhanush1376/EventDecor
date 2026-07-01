import React, { useEffect, useState } from 'react';
import { m as motion } from 'framer-motion';
import { useReturnManagement } from '../../hooks/useReturnManagement';
import {
  PageHeader,
  StatusBadge,
  EmptyState,
  SkeletonTable,
  SkeletonList,
  FilterBar,
  StatCard,
  fadeUp,
  stagger,
} from '../../components/AdminUIKit';

const AdminPickupManagement = () => {
  const { pickupList, fetchPickupList, pickupStats, fetchPickupStats, loading, error } =
    useReturnManagement();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  useEffect(() => {
    const timer = setTimeout(() => {
      let filterParams = { search: searchTerm };
      if (statusFilter !== 'All') {
        filterParams.status = statusFilter;
      }
      fetchPickupList(filterParams);
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchPickupList, searchTerm, statusFilter]);

  useEffect(() => {
    fetchPickupStats();
  }, [fetchPickupStats]);

  if (error) {
    return (
      <EmptyState
        icon="error_outline"
        title="Failed to load pickups"
        description={error}
        action={
          <button className="admin-btn admin-btn-primary" onClick={() => fetchPickupList()}>
            Try Again
          </button>
        }
      />
    );
  }

  const { pickups = [], performance = [] } = pickupList || {};

  return (
    <motion.div initial="hidden" animate="show" variants={stagger} className="space-y-6">
      <PageHeader
        title="Pickup Management"
        subtitle="Track reverse logistics, courier assignments, and SLA performance"
        icon="local_shipping"
        iconColor="warning"
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          label="Total Scheduled"
          value={(pickupStats?.pending || 0) + (pickupStats?.assigned || 0)}
          icon="calendar_today"
          domainColor="info"
        />
        <StatCard
          label="In Transit"
          value={pickupStats?.inTransit || 0}
          icon="local_shipping"
          domainColor="warning"
        />
        <StatCard
          label="Completed"
          value={pickupStats?.completed || 0}
          icon="check_circle"
          domainColor="success"
        />
        <StatCard
          label="Failed"
          value={pickupStats?.failed || 0}
          icon="error"
          domainColor="danger"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start">
        <div className="md:col-span-3 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <FilterBar
              filters={['All', 'pending', 'assigned', 'in_transit', 'picked_up', 'failed']}
              value={statusFilter}
              onChange={setStatusFilter}
            />
            <div className="w-full sm:max-w-[250px] relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[var(--admin-text-tertiary)] text-[18px]">
                search
              </span>
              <input
                type="text"
                className="admin-input !pl-10 py-2 w-full text-[12px]"
                placeholder="Search Waybill, Return ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <motion.div variants={fadeUp} className="admin-card">
            {loading && pickups.length === 0 ? (
              <>
                <div className="hidden md:block">
                  <SkeletonTable
                    cols={6}
                    rows={5}
                    className="border-0 shadow-none bg-transparent"
                  />
                </div>
                <div className="md:hidden">
                  <SkeletonList items={5} className="border-0 shadow-none bg-transparent" />
                </div>
              </>
            ) : pickups.length === 0 ? (
              <div className="p-10">
                <EmptyState icon="local_shipping" title="No pickups found" />
              </div>
            ) : (
              <>
                <div className="hidden md:block overflow-x-auto">
                  <table className="admin-table w-full min-w-[700px]">
                    <thead>
                      <tr>
                        <th className="pl-5">Return ID</th>
                        <th>Customer & Address</th>
                        <th>Time Slot</th>
                        <th>Partner/Driver</th>
                        <th>Status</th>
                        <th className="text-right pr-5">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pickups.map((req) => (
                        <tr key={req._id}>
                          <td className="pl-5">
                            <div className="font-semibold text-[var(--admin-text-primary)]">
                              {req.returnId}
                            </div>
                          </td>
                          <td>
                            <div className="font-semibold text-[var(--admin-text-primary)]">
                              {req.userId?.name}
                            </div>
                            <div
                              className="text-[12px] text-[var(--admin-text-secondary)] line-clamp-2 max-w-[200px]"
                              title={`${req.pickup?.address?.addressLine1}, ${req.pickup?.address?.city}`}
                            >
                              {req.pickup?.address?.addressLine1}, {req.pickup?.address?.city}
                            </div>
                          </td>
                          <td>
                            <div className="text-[13px] font-medium text-[var(--admin-text-primary)]">
                              {req.pickup?.scheduledDate
                                ? new Date(req.pickup.scheduledDate).toLocaleDateString()
                                : 'N/A'}
                            </div>
                          </td>
                          <td>
                            {req.pickup?.partner ? (
                              <>
                                <div className="font-semibold text-[var(--admin-text-primary)] uppercase tracking-wider text-[12px]">
                                  {req.pickup.partner}
                                </div>
                                <div className="font-medium text-[var(--admin-text-secondary)] text-[12px]">
                                  {req.pickup.trackingId || 'No tracking'}
                                </div>
                              </>
                            ) : (
                              <div className="text-[12px] font-medium text-[var(--admin-domain-warning)]">
                                Unassigned
                              </div>
                            )}
                          </td>
                          <td>
                            <StatusBadge status={req.pickup?.status || 'pending'} />
                          </td>
                          <td className="text-right pr-5">
                            {req.pickup?.partner ? (
                              <button className="admin-btn admin-btn-sm admin-btn-outline">
                                Track
                              </button>
                            ) : (
                              <button className="admin-btn admin-btn-sm admin-btn-primary">
                                Assign
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex md:hidden flex-col gap-3 p-3 bg-[var(--admin-bg-subtle)]">
                  {pickups.map((req) => (
                    <div
                      key={req._id}
                      className="bg-[var(--admin-surface)] rounded-[var(--admin-radius-lg)] p-4 shadow-sm border border-[var(--admin-border)] flex flex-col gap-3"
                    >
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <span className="font-bold text-[var(--admin-text-primary)] text-[14px]">
                            {req.returnId}
                          </span>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[11px] font-medium text-[var(--admin-text-secondary)] block">
                              {req.userId?.name}
                            </span>
                          </div>
                        </div>
                        <StatusBadge
                          status={req.pickup?.status || 'pending'}
                          className="border-none px-2 py-1 text-[10px]"
                        />
                      </div>

                      <div className="pt-2 pb-2 border-y border-[var(--admin-border-subtle)]">
                        <p className="text-[12px] text-[var(--admin-text-primary)] line-clamp-2 mb-1">
                          {req.pickup?.address?.addressLine1}, {req.pickup?.address?.city}
                        </p>
                        <div className="text-[11px] text-[var(--admin-text-secondary)]">
                          {req.pickup?.partner
                            ? `${req.pickup.partner} - ${req.pickup.trackingId || 'No tracking'}`
                            : 'Unassigned'}
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[11px] font-medium text-[var(--admin-text-secondary)]">
                          {req.pickup?.scheduledDate
                            ? new Date(req.pickup.scheduledDate).toLocaleDateString()
                            : 'N/A'}
                        </span>
                        {req.pickup?.partner ? (
                          <button className="admin-btn admin-btn-sm admin-btn-outline">
                            Track
                          </button>
                        ) : (
                          <button className="admin-btn admin-btn-sm admin-btn-primary">
                            Assign
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </motion.div>
        </div>

        <div className="md:col-span-1 space-y-4">
          <motion.div variants={fadeUp} className="admin-card overflow-hidden">
            <div className="p-4 border-b border-[var(--admin-border-subtle)]">
              <h3 className="text-[14px] font-bold text-[var(--admin-text-primary)]">
                Courier SLA (Last 30 Days)
              </h3>
            </div>
            <div className="p-4 space-y-4">
              {performance?.length > 0 ? (
                performance.map((perf, i) => (
                  <div key={i}>
                    <div className="flex justify-between text-[12px] mb-1.5">
                      <span className="font-semibold text-[var(--admin-text-primary)] uppercase tracking-wider">
                        {perf.partner}
                      </span>
                      <span
                        className={`font-bold ${perf.rate < 90 ? 'text-[var(--admin-domain-warning)]' : 'text-[var(--admin-domain-success)]'}`}
                      >
                        {perf.rate}%
                      </span>
                    </div>
                    <div className="w-full bg-[var(--admin-surface-muted)] rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-1.5 rounded-full ${perf.rate < 90 ? 'bg-[var(--admin-domain-warning)]' : 'bg-[var(--admin-domain-success)]'}`}
                        style={{ width: `${perf.rate}%` }}
                      />
                    </div>
                    <div className="text-[10px] text-[var(--admin-text-tertiary)] mt-1 font-semibold uppercase tracking-wider">
                      On-time pickup rate
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-[12px] text-[var(--admin-text-tertiary)] text-center py-4">
                  No performance data available
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
};

export default AdminPickupManagement;
