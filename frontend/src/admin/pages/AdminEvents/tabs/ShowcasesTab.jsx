import { m as motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  SkeletonDashboard,
  fadeUp,
  formatCurrency,
  AdminToggle,
} from '../../../components/AdminUIKit';

export function ShowcasesTab({
  showcases,
  loadingShowcases,
  handleDeleteShowcase,
  toggleShowcaseFeatured,
  toggleShowcaseActive,
}) {
  const navigate = useNavigate();

  return (
    <motion.div
      key="showcases"
      initial="hidden"
      animate="show"
      variants={fadeUp}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <h4 className="text-[14px] font-bold text-[var(--admin-text-primary)]">
          Tambulam & Gift Presentation Designs
        </h4>
      </div>

      {loadingShowcases ? (
        <SkeletonDashboard />
      ) : showcases.length === 0 ? (
        <div className="admin-card py-20 text-center text-[var(--admin-text-tertiary)] text-[12px]">
          No tambulam or gift designs have been created yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
          {showcases.map((sc) => (
            <div
              key={sc._id || sc.id}
              className={`bg-white rounded-[var(--admin-radius-lg)] border border-[var(--admin-border-subtle)] shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col justify-between ${
                sc.isActive === false ? 'opacity-60 grayscale-[30%]' : ''
              }`}
            >
              <div>
                <div className="relative h-44 overflow-hidden bg-[var(--admin-bg-subtle)] group">
                  <img
                    src={sc.image}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    alt={sc.title}
                  />
                  <span className="absolute top-2 left-2 admin-badge bg-[var(--admin-accent)] text-white border-none font-bold shadow-sm backdrop-blur-md">
                    {sc.category?.replace('_', ' ')}
                  </span>
                </div>
                <div className="p-4 space-y-2">
                  <h4 className="text-[13px] font-bold text-[var(--admin-text-primary)] truncate">
                    {sc.title}
                  </h4>
                  <span className="text-[12px] font-bold text-[var(--admin-accent)] block">
                    {formatCurrency(sc.rentalPrice)} / day
                  </span>
                  <p className="text-[11px] text-[var(--admin-text-secondary)] line-clamp-2">
                    {sc.description}
                  </p>
                </div>
              </div>
              <div className="p-4 border-t border-[var(--admin-border-subtle)] flex items-center justify-between gap-3 bg-[var(--admin-surface-muted)]">
                <div className="flex items-center gap-2">
                  <AdminToggle
                    size="sm"
                    checked={sc.isActive !== false}
                    onChange={() => toggleShowcaseActive(sc._id || sc.id, sc.isActive !== false)}
                  />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--admin-text-secondary)]">
                    {sc.isActive !== false ? 'Active' : 'Hidden'}
                  </span>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => navigate(`/admin/showcases/edit/${sc._id || sc.id}`)}
                    title="Edit Showcase"
                    className="admin-btn-icon w-8 h-8 min-h-0 bg-white border border-[var(--admin-border-subtle)] hover:border-[var(--admin-border-strong)] text-[var(--admin-text-primary)]"
                  >
                    <span className="material-symbols-outlined text-[14px]">edit</span>
                  </button>
                  <button
                    onClick={() => toggleShowcaseFeatured(sc._id || sc.id, sc.featured)}
                    title={sc.featured ? 'Remove from Featured' : 'Mark as Featured'}
                    className={`admin-btn-icon w-8 h-8 min-h-0 border-none ${
                      sc.featured
                        ? 'bg-[var(--admin-warning-light)] text-[var(--admin-warning)] hover:bg-[var(--admin-warning)] hover:text-white'
                        : 'bg-[var(--admin-surface-muted)] text-[var(--admin-text-tertiary)] hover:text-[var(--admin-warning)]'
                    }`}
                  >
                    <span
                      className="material-symbols-outlined text-[14px]"
                      style={{ fontVariationSettings: sc.featured ? "'FILL' 1" : "'FILL' 0" }}
                    >
                      star
                    </span>
                  </button>
                  <button
                    onClick={() => handleDeleteShowcase(sc._id || sc.id)}
                    className="admin-btn-icon w-8 h-8 min-h-0 bg-[var(--admin-error-light)] text-[var(--admin-error)] hover:bg-[var(--admin-error)] hover:text-white border-none"
                  >
                    <span className="material-symbols-outlined text-[14px]">delete</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
