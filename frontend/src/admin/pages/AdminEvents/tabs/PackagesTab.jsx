import { m as motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { SkeletonDashboard, fadeUp } from '../../../components/AdminUIKit';

export function PackagesTab({ events, loadingPortfolio }) {
  const navigate = useNavigate();

  return (
    <motion.div
      key="packages"
      initial="hidden"
      animate="show"
      variants={fadeUp}
      className="space-y-6"
    >
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-[14px] font-bold text-[var(--admin-text-primary)]">
            Decor Packages & Themes
          </h3>
          <p className="text-[12px] text-[var(--admin-text-tertiary)] mt-0.5">
            Manage published catalogs visible to customer discovery masonry grids.
          </p>
        </div>
        <button
          onClick={() => navigate('/admin/events/add')}
          className="admin-btn admin-btn-primary h-9"
        >
          <span className="material-symbols-outlined text-[16px]">add</span>
          Publish Theme Curation
        </button>
      </div>

      {loadingPortfolio ? (
        <SkeletonDashboard />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {events.map((ev) => (
            <div
              key={ev._id || ev.id}
              className="admin-card overflow-hidden p-0 flex flex-col group"
            >
              <div className="relative aspect-[16/10] overflow-hidden bg-[var(--admin-bg-subtle)] shrink-0">
                <img
                  src={ev.image}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  alt={ev.title}
                />
                <span className="absolute top-3 left-3 admin-badge bg-[var(--admin-surface)] text-[var(--admin-text-primary)] border-none shadow-[var(--admin-shadow-sm)] font-bold">
                  {ev.category}
                </span>
              </div>
              <div className="p-5 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start gap-2 mb-2">
                    <h4 className="text-[14px] font-bold text-[var(--admin-text-primary)] leading-snug">
                      {ev.title}
                    </h4>
                    <span className="text-[11px] font-bold text-[var(--admin-accent)] shrink-0">
                      {ev.pricing}
                    </span>
                  </div>
                  <p className="text-[11px] text-[var(--admin-text-secondary)] line-clamp-2 leading-relaxed">
                    {ev.description}
                  </p>
                </div>
                <div className="flex gap-2 pt-4 mt-4 border-t border-[var(--admin-border-subtle)]">
                  <button
                    onClick={() => navigate(`/admin/events/edit/${ev._id || ev.id}`)}
                    className="admin-btn admin-btn-outline flex-1 min-h-[32px] h-8 text-[11px] px-0"
                  >
                    <span className="material-symbols-outlined text-[14px]">edit</span> Edit
                  </button>
                  <button
                    onClick={() => navigate(`/events/${ev._id || ev.id}`)}
                    className="admin-btn-icon w-8 h-8 min-h-0 bg-[var(--admin-surface-muted)] border border-[var(--admin-border-subtle)] text-[var(--admin-text-secondary)]"
                  >
                    <span className="material-symbols-outlined text-[14px]">visibility</span>
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
