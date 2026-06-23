import { m as motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { SkeletonDashboard, fadeUp, formatCurrency } from '../../../components/AdminUIKit';

export function ShowcasesTab({ showcases, loadingShowcases, handleDeleteShowcase }) {
  const navigate = useNavigate();

  return (
    <motion.div
      key="showcases"
      initial="hidden"
      animate="show"
      variants={fadeUp}
      className="space-y-6"
    >
      <div className="admin-card p-6 space-y-6">
        <h4 className="text-[14px] font-bold text-[var(--admin-text-primary)]">
          Tambulam & Gift Presentation Designs
        </h4>
        {loadingShowcases ? (
          <SkeletonDashboard />
        ) : showcases.length === 0 ? (
          <div className="py-20 text-center text-[var(--admin-text-tertiary)] text-[12px]">
            No tambulam or gift designs have been created yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {showcases.map((sc) => (
              <div
                key={sc._id || sc.id}
                className="bg-[var(--admin-surface-muted)] rounded-[var(--admin-radius-lg)] border border-[var(--admin-border-subtle)] overflow-hidden flex flex-col justify-between"
              >
                <div>
                  <div className="relative h-40 overflow-hidden bg-[var(--admin-bg-subtle)]">
                    <img src={sc.image} className="w-full h-full object-cover" alt={sc.title} />
                    <span className="absolute top-2 left-2 admin-badge bg-[var(--admin-accent)] text-white border-none font-bold shadow-sm">
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
                <div className="p-4 border-t border-[var(--admin-border-subtle)] flex gap-2">
                  <button
                    onClick={() => navigate(`/admin/showcases/edit/${sc._id || sc.id}`)}
                    className="admin-btn admin-btn-outline flex-1 min-h-[32px] h-8 text-[11px] px-0"
                  >
                    <span className="material-symbols-outlined text-[14px]">edit</span> Edit
                  </button>
                  <button
                    onClick={() => handleDeleteShowcase(sc._id || sc.id)}
                    className="admin-btn-icon w-8 h-8 min-h-0 bg-[var(--admin-error-light)] text-[var(--admin-error)] hover:bg-[var(--admin-error)] hover:text-white border-none"
                  >
                    <span className="material-symbols-outlined text-[14px]">delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
