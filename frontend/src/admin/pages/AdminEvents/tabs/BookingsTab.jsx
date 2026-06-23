import { m as motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  StatusBadge,
  SkeletonDashboard,
  EmptyState,
  formatCurrency,
  fadeUp,
} from '../../../components/AdminUIKit';

export function BookingsTab({ bookings, loadingBookings }) {
  const navigate = useNavigate();

  return (
    <motion.div
      key="bookings"
      initial="hidden"
      animate="show"
      variants={fadeUp}
      className="admin-card overflow-hidden"
    >
      {loadingBookings ? (
        <SkeletonDashboard />
      ) : bookings.length === 0 ? (
        <div className="py-16 flex justify-center bg-[var(--admin-surface)]">
          <EmptyState
            icon="event_busy"
            title="No Bookings Yet"
            description="Active event setups and consultations will appear here."
          />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="admin-table w-full min-w-[800px]">
            <thead>
              <tr>
                <th>Customer Details</th>
                <th>Event Type</th>
                <th>Date & Venue</th>
                <th>Total Price</th>
                <th>Booking Status</th>
                <th className="text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((b) => (
                <tr
                  key={b._id || b.id}
                  className="admin-table-row-clickable"
                  onClick={() => navigate(`/admin/events/${b._id || b.id}`)}
                >
                  <td>
                    <div className="space-y-0.5">
                      <span className="text-[12px] font-bold text-[var(--admin-text-primary)] block">
                        {b.user?.name || 'Anonymous Client'}
                      </span>
                      <span className="text-[11px] text-[var(--admin-text-tertiary)] block">
                        {b.user?.phone || 'No contact'}
                      </span>
                    </div>
                  </td>
                  <td>
                    <div className="space-y-1">
                      <span className="admin-badge admin-badge-neutral text-[9px] uppercase font-bold">
                        {b.eventType}
                      </span>
                      <h4 className="text-[12px] font-bold text-[var(--admin-text-primary)] truncate max-w-[150px]">
                        {b.title}
                      </h4>
                    </div>
                  </td>
                  <td>
                    <div className="space-y-0.5">
                      <span className="text-[12px] font-bold text-[var(--admin-text-primary)] block">
                        {new Date(b.date).toLocaleDateString('en-IN', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                      <span className="text-[11px] text-[var(--admin-text-tertiary)] truncate max-w-[180px] block">
                        {b.venue?.address}
                      </span>
                    </div>
                  </td>
                  <td>
                    <div className="space-y-0.5">
                      <span className="text-[12px] font-bold text-[var(--admin-text-primary)] block">
                        {formatCurrency(b.pricing?.totalPrice)}
                      </span>
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider ${b.pricing?.paymentStatus === 'paid' ? 'text-[var(--admin-success)]' : 'text-[var(--admin-warning)]'}`}
                      >
                        {b.pricing?.paymentStatus}
                      </span>
                    </div>
                  </td>
                  <td>
                    <StatusBadge status={b.status.replace('_', '')} />
                  </td>
                  <td className="text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/admin/events/${b._id || b.id}`);
                      }}
                      className="admin-btn admin-btn-outline h-8 min-h-0 text-[10px] px-3 py-0"
                    >
                      Manage
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </motion.div>
  );
}
