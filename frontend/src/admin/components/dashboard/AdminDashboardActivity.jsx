import { m as motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { handleImageError } from '../../../utils/media/imageUtils';
import { formatCurrency, fadeUp } from '../AdminUIKit';

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

      {/* Inventory Alerts */}
      <motion.div
        variants={fadeUp}
        className="admin-card p-4 sm:p-5 !rounded-[4px] border border-[var(--admin-border)] shadow-xs flex flex-col"
      >
        <div className="mb-4 pb-3 border-b border-[var(--admin-border-subtle)] flex items-center justify-between">
          <div>
            <h3 className="text-[13.5px] sm:text-[14px] font-bold text-[var(--admin-text-primary)]">
              Inventory Status
            </h3>
            <p className="text-[11px] text-[var(--admin-text-tertiary)] mt-0.5">
              Stock thresholds & catalog health
            </p>
          </div>
          <button
            onClick={() => navigate('/admin/inventory')}
            className="text-[11px] font-bold text-[var(--admin-accent)] hover:underline cursor-pointer min-h-0"
          >
            Manage
          </button>
        </div>

        {outOfStock === 0 &&
        lowStockProducts === 0 &&
        products.filter((p) => p.stock <= 5).length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center bg-emerald-500/5 rounded-[4px] border border-emerald-500/20 p-5 text-center">
            <div className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center mb-2">
              <span className="material-symbols-outlined text-[18px] font-bold">check_circle</span>
            </div>
            <span className="text-[11px] uppercase font-bold tracking-wider text-emerald-700 dark:text-emerald-400">
              Stock Levels Healthy
            </span>
            <p className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80 mt-0.5 font-medium">
              All catalog pieces are available
            </p>
          </div>
        ) : (
          <div className="flex-1 overflow-hidden flex flex-col space-y-2.5">
            {outOfStock > 0 && (
              <div className="flex items-center gap-2.5 p-2.5 rounded-[4px] bg-rose-500/10 border border-rose-500/20">
                <span className="material-symbols-outlined text-[16px] text-rose-600 dark:text-rose-400 shrink-0">
                  error
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[11.5px] font-bold text-rose-700 dark:text-rose-300 leading-tight">
                    {outOfStock} Product{outOfStock > 1 ? 's' : ''} Depleted
                  </p>
                  <p className="text-[9.5px] text-rose-600/80 dark:text-rose-400/80">
                    Needs immediate restocking
                  </p>
                </div>
              </div>
            )}

            <div className="space-y-1.5 mt-1">
              {products
                .filter((p) => p.stock <= 5)
                .slice(0, 3)
                .map((p, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-2 rounded-[4px] border border-[var(--admin-border-subtle)] hover:bg-[var(--admin-surface-hover)] transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <img
                        onError={handleImageError}
                        src={p.image}
                        alt={p.name}
                        className="w-7 h-7 rounded-[3px] object-cover border border-[var(--admin-border)] shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <span className="text-[11.5px] text-[var(--admin-text-primary)] font-bold truncate block">
                          {p.name}
                        </span>
                        <span className="text-[9.5px] text-[var(--admin-text-tertiary)] block truncate font-mono">
                          {formatCurrency(p.price)}
                        </span>
                      </div>
                    </div>
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded-[3px] shrink-0 ml-2 font-mono ${
                        p.stock === 0
                          ? 'bg-rose-500/10 text-rose-600 border border-rose-500/20'
                          : 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                      }`}
                    >
                      {p.stock === 0 ? 'OUT' : `${p.stock} LEFT`}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
