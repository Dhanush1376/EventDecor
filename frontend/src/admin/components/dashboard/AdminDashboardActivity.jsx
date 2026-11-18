import { m as motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { fadeUp } from '../AdminUIKit';

export function AdminDashboardActivity({
  quickActions,
  dynamicRecentActivity,
  products,
  outOfStock,
  lowStockProducts,
}) {
  const navigate = useNavigate();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Quick Actions */}
      <motion.div
        variants={fadeUp}
        className="admin-card p-4 sm:p-5 !rounded-[4px] border border-[var(--admin-border)] shadow-xs flex flex-col justify-between"
      >
        <div className="mb-4 pb-3 border-b border-[var(--admin-border-subtle)] flex items-center justify-between">
          <div>
            <h3 className="text-[13.5px] sm:text-[14px] font-bold text-[var(--admin-text-primary)]">
              Quick Operations
            </h3>
            <p className="text-[11px] text-[var(--admin-text-tertiary)] mt-0.5">
              Direct access to operational hubs
            </p>
          </div>
          <span className="material-symbols-outlined text-[18px] text-[var(--admin-text-tertiary)]">
            bolt
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          {quickActions.map((a, i) => (
            <motion.button
              key={i}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate(a.path)}
              className="flex items-center gap-2.5 p-3 rounded-[4px] border border-[var(--admin-border-subtle)] hover:border-[var(--admin-border-strong)] hover:bg-[var(--admin-surface-hover)] cursor-pointer transition-all text-left bg-[var(--admin-surface)] group"
            >
              <div
                className="w-8 h-8 rounded-[4px] flex items-center justify-center shrink-0 transition-colors"
                style={{ backgroundColor: `${a.color}15`, color: a.color }}
              >
                <span className="material-symbols-outlined text-[17px] group-hover:scale-110 transition-transform">
                  {a.icon}
                </span>
              </div>
              <span className="text-[11.5px] font-bold text-[var(--admin-text-secondary)] group-hover:text-[var(--admin-text-primary)] transition-colors leading-tight">
                {a.label}
              </span>
            </motion.button>
          ))}
        </div>
      </motion.div>

      {/* Recent Activity */}
      <motion.div
        variants={fadeUp}
        className="admin-card p-4 sm:p-5 !rounded-[4px] border border-[var(--admin-border)] shadow-xs flex flex-col"
      >
        <div className="mb-4 pb-3 border-b border-[var(--admin-border-subtle)] flex items-center justify-between">
          <div>
            <h3 className="text-[13.5px] sm:text-[14px] font-bold text-[var(--admin-text-primary)]">
              Recent Stream
            </h3>
            <p className="text-[11px] text-[var(--admin-text-tertiary)] mt-0.5">
              Live updates across store actions
            </p>
          </div>
          <button
            onClick={() => navigate('/admin/analytics/operations')}
            className="text-[11px] font-bold text-[var(--admin-accent)] hover:underline cursor-pointer min-h-0"
          >
            Live Feed
          </button>
        </div>

        {dynamicRecentActivity.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center bg-[var(--admin-surface-muted)] rounded-[4px] border border-dashed border-[var(--admin-border)] p-6 text-center">
            <span className="material-symbols-outlined text-[28px] text-[var(--admin-text-tertiary)] mb-2">
              history
            </span>
            <span className="text-[11px] uppercase font-bold text-[var(--admin-text-secondary)] tracking-wider">
              No Recent Activity
            </span>
          </div>
        ) : (
          <div className="relative pl-1 space-y-3.5">
            {dynamicRecentActivity.slice(0, 5).map((a, i) => (
              <div key={i} className="flex items-start gap-2.5 group">
                <div className="w-7 h-7 rounded-[4px] bg-[var(--admin-surface-muted)] border border-[var(--admin-border)] flex items-center justify-center shrink-0 text-[var(--admin-text-secondary)] transition-colors group-hover:border-[var(--admin-border-strong)] mt-0.5">
                  <span className="material-symbols-outlined text-[14px]">{a.icon}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11.5px] text-[var(--admin-text-primary)] font-medium leading-tight line-clamp-2">
                    {a.text}
                  </p>
                  <span className="inline-flex items-center gap-1 text-[9.5px] text-[var(--admin-text-tertiary)] mt-0.5 font-medium">
                    {a.time}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Fulfillment Status */}
      <motion.div
        variants={fadeUp}
        className="admin-card p-4 sm:p-5 !rounded-[4px] border border-[var(--admin-border)] shadow-xs flex flex-col justify-between"
      >
        <div className="mb-4 pb-3 border-b border-[var(--admin-border-subtle)] flex items-center justify-between">
          <div>
            <h3 className="text-[13.5px] sm:text-[14px] font-bold text-[var(--admin-text-primary)]">
              Fulfillment Status
            </h3>
            <p className="text-[11px] text-[var(--admin-text-tertiary)] mt-0.5">
              Made-to-order catalog model
            </p>
          </div>
          <button
            onClick={() => navigate('/admin/products')}
            className="text-[11px] font-bold text-[var(--admin-accent)] hover:underline cursor-pointer min-h-0"
          >
            Manage
          </button>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center bg-amber-500/5 rounded-[4px] border border-amber-500/20 p-5 text-center">
          <div className="w-9 h-9 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center mb-2">
            <span className="material-symbols-outlined text-[20px] font-bold">palette</span>
          </div>
          <span className="text-[11px] uppercase font-bold tracking-wider text-amber-700 dark:text-amber-400">
            Made to Order
          </span>
          <p className="text-[11px] text-amber-600/90 dark:text-amber-400/90 mt-1 font-medium max-w-[220px]">
            All catalog pieces are customizable and crafted on demand. No inventory restrictions
            apply.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
