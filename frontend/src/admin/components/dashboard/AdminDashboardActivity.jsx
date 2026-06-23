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
    <div className="admin-grid-content">
      {/* Quick Actions */}
      <motion.div variants={fadeUp} className="admin-card p-4 sm:p-6">
        <h3 className="text-[14px] font-semibold text-[var(--admin-text-primary)] mb-5">
          Quick Actions
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {quickActions.map((a, i) => (
            <motion.button
              key={i}
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate(a.path)}
              className="flex items-center sm:flex-col sm:justify-center gap-3 sm:gap-2.5 p-3 sm:p-4 rounded-[var(--admin-radius-lg)] border border-[var(--admin-border)] hover:border-[var(--admin-border-strong)] hover:bg-[var(--admin-surface-hover)] hover:shadow-[var(--admin-shadow-sm)] cursor-pointer transition-all group min-h-[56px] sm:min-h-0 w-full text-left sm:text-center bg-[var(--admin-surface)]"
            >
              <div
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-[var(--admin-radius-md)] flex items-center justify-center shrink-0 transition-colors"
                style={{ backgroundColor: `${a.color}12`, color: a.color }}
              >
                <span className="material-symbols-outlined text-[18px] sm:text-[20px] group-hover:scale-110 transition-transform">
                  {a.icon}
                </span>
              </div>
              <span className="text-[12px] sm:text-[11px] font-bold sm:font-semibold text-[var(--admin-text-secondary)] group-hover:text-[var(--admin-text-primary)] transition-colors leading-tight">
                {a.label}
              </span>
            </motion.button>
          ))}
        </div>
      </motion.div>

      {/* Recent Activity */}
      <motion.div variants={fadeUp} className="admin-card p-4 sm:p-6 flex flex-col">
        <h3 className="text-[14px] font-semibold text-[var(--admin-text-primary)] mb-5">
          Recent Activity
        </h3>
        {dynamicRecentActivity.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center bg-[var(--admin-bg-subtle)] rounded-[var(--admin-radius-lg)] border border-dashed border-[var(--admin-border)] p-6 text-center">
            <span className="material-symbols-outlined text-[28px] text-[var(--admin-text-tertiary)] mb-2">
              history
            </span>
            <span className="text-[11px] uppercase font-bold text-[var(--admin-text-secondary)] tracking-wider">
              No Recent Activity
            </span>
          </div>
        ) : (
          <div className="relative pl-1">
            {dynamicRecentActivity.slice(0, 5).map((a, i) => (
              <div key={i} className="relative flex items-start gap-3.5 pb-5 last:pb-0 group">
                {/* Timeline connector line */}
                {i < Math.min(dynamicRecentActivity.length, 5) - 1 && (
                  <span
                    className="absolute left-[15px] top-8 bottom-0 w-[1.5px] bg-[var(--admin-border-subtle)]"
                    aria-hidden="true"
                  />
                )}
                {/* Icon */}
                <div className="w-8 h-8 rounded-[var(--admin-radius-md)] bg-[var(--admin-surface-muted)] border border-[var(--admin-border)] flex items-center justify-center shrink-0 text-[var(--admin-text-secondary)] relative z-10 transition-colors group-hover:border-[var(--admin-border-strong)]">
                  <span className="material-symbols-outlined text-[15px]">{a.icon}</span>
                </div>
                {/* Content */}
                <div className="flex-1 min-w-0 pt-0.5">
                  <p className="text-[12px] text-[var(--admin-text-primary)] font-medium leading-relaxed break-words whitespace-normal">
                    {a.text}
                  </p>
                  <span className="inline-flex items-center gap-1 text-[10px] text-[var(--admin-text-tertiary)] mt-1 font-medium">
                    <span className="material-symbols-outlined text-[10px] leading-none">
                      schedule
                    </span>
                    {a.time}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Inventory Alerts */}
      <motion.div variants={fadeUp} className="admin-card p-4 sm:p-6 flex flex-col">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-[14px] font-semibold text-[var(--admin-text-primary)]">
            Inventory Alerts
          </h3>
          <button
            onClick={() => navigate('/admin/inventory')}
            className="text-[11px] font-bold text-[var(--admin-accent)] hover:underline cursor-pointer min-h-0"
          >
            View All
          </button>
        </div>
        {outOfStock === 0 &&
        lowStockProducts === 0 &&
        products.filter((p) => p.stock <= 5).length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center bg-gradient-to-br from-[var(--admin-success-light)] to-[rgba(16,185,129,0.02)] rounded-[var(--admin-radius-lg)] border border-[var(--admin-success-border)] p-6 text-center shadow-[inset_0_1px_2px_rgba(16,185,129,0.05)]">
            <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center mb-2.5 animate-pulse">
              <span className="material-symbols-outlined text-[22px] font-bold">check_circle</span>
            </div>
            <span className="text-[11px] uppercase font-bold tracking-wider text-emerald-700">
              Stock Levels Healthy
            </span>
            <p className="text-[10px] text-emerald-600/80 mt-1 font-medium">
              All products are well stocked
            </p>
          </div>
        ) : (
          <div className="flex-1 overflow-hidden flex flex-col">
            {outOfStock > 0 && (
              <div className="flex items-center gap-3 p-3 rounded-[var(--admin-radius-md)] bg-[var(--admin-error-light)] border border-[var(--admin-error-border)] mb-3">
                <span className="material-symbols-outlined text-[18px] text-[var(--admin-error)]">
                  error
                </span>
                <div>
                  <p className="text-[12px] font-bold text-[var(--admin-error)]">
                    {outOfStock} Product{outOfStock > 1 ? 's' : ''} Out of Stock
                  </p>
                  <p className="text-[10px] text-[var(--admin-error)] opacity-80 mt-0.5">
                    Immediate attention required
                  </p>
                </div>
              </div>
            )}
            {lowStockProducts > 0 && (
              <div className="flex items-center gap-3 p-3 rounded-[var(--admin-radius-md)] bg-[var(--admin-warning-light)] border border-[var(--admin-warning-border)] mb-3">
                <span className="material-symbols-outlined text-[18px] text-[var(--admin-warning)]">
                  warning
                </span>
                <div>
                  <p className="text-[12px] font-bold text-[var(--admin-warning)]">
                    {lowStockProducts} Product{lowStockProducts > 1 ? 's' : ''} Low Stock
                  </p>
                  <p className="text-[10px] text-[var(--admin-warning)] opacity-80 mt-0.5">
                    Running below threshold
                  </p>
                </div>
              </div>
            )}
            <div className="space-y-2 mt-2">
              {products
                .filter((p) => p.stock <= 5)
                .slice(0, 3)
                .map((p, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-2 rounded-[var(--admin-radius-md)] border border-[var(--admin-border-subtle)] hover:bg-[var(--admin-surface-hover)] transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <img
                        onError={handleImageError}
                        src={p.image}
                        alt={p.name}
                        className="w-9 h-9 rounded-[var(--admin-radius-md)] object-cover border border-[var(--admin-border)] shrink-0 shadow-sm"
                      />
                      <div className="min-w-0 flex-1">
                        <span className="text-[12px] text-[var(--admin-text-primary)] font-bold truncate block">
                          {p.name}
                        </span>
                        <span className="text-[10px] text-[var(--admin-text-tertiary)] block mt-0.5 truncate">
                          {p.category || 'General'} · {formatCurrency(p.price)}
                        </span>
                      </div>
                    </div>
                    <span
                      className={`admin-badge ${p.stock === 0 ? 'admin-badge-error' : 'admin-badge-warning'} shrink-0 ml-2 font-bold text-[9px] px-2 py-0.5`}
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
