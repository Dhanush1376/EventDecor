const SkeletonCard = () => <div className="animate-pulse bg-gray-200 h-32 rounded-md"></div>;
import { m as motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { getErrorMessage } from '../../utils/errorHelpers';
import {
  PageHeader,
  StatusBadge,
  AdminToggle,
  EmptyState,
  fadeUp,
  stagger,
} from '../components/AdminUIKit';

export function AdminLayouts() {
  const [layouts, setLayouts] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchLayouts = async () => {
    try {
      const res = await api.get('/layouts');
      if (res.data?.success) setLayouts(res.data.data);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to load layouts'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLayouts();
  }, []);

  const handleToggleSection = async (layout, sectionIndex) => {
    const updatedSections = [...layout.sections];
    updatedSections[sectionIndex].isActive = !updatedSections[sectionIndex].isActive;

    try {
      await api.post('/layouts', { ...layout, sections: updatedSections });
      toast.success('Section visibility updated');
      fetchLayouts();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to update section visibility'));
    }
  };

  return (
    <motion.div initial="hidden" animate="show" variants={stagger} className="space-y-6">
      <PageHeader
        title="Dynamic Page Layouts"
        subtitle="Control the order, visibility, and properties of UI sections rendered by the dynamic engine."
      />

      {loading ? (
        <div className="space-y-6">
          {[1, 2].map((i) => (
            <SkeletonCard key={i} className="h-64" />
          ))}
        </div>
      ) : layouts.length === 0 ? (
        <EmptyState
          icon="view_carousel"
          title="No Layouts"
          description="No dynamic page layouts have been configured yet."
        />
      ) : (
        <div className="space-y-6">
          {layouts.map((layout) => (
            <motion.div key={layout._id} variants={fadeUp} className="admin-card overflow-hidden">
              <div className="flex items-center justify-between p-5 border-b border-[var(--admin-border-subtle)]">
                <div>
                  <h3 className="text-[15px] font-bold text-[var(--admin-text-primary)] leading-tight">
                    {layout.name}
                  </h3>
                  <p className="text-[11px] text-[var(--admin-text-tertiary)] font-mono mt-1 tracking-wide">
                    Path: {layout.pagePath}
                  </p>
                </div>
                <StatusBadge status={layout.status} />
              </div>

              <div className="divide-y divide-[var(--admin-border-subtle)]">
                {layout.sections
                  .sort((a, b) => a.order - b.order)
                  .map((section, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-4 hover:bg-[var(--admin-surface-hover)] transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-8 h-8 rounded-[var(--admin-radius-md)] bg-[var(--admin-surface-muted)] border border-[var(--admin-border)] text-[var(--admin-text-secondary)] flex items-center justify-center font-bold text-[11px]">
                          {section.order}
                        </div>
                        <div>
                          <span className="font-semibold text-[13px] text-[var(--admin-text-primary)]">
                            {section.componentName}
                          </span>
                          {section.props?.title && (
                            <span className="block text-[11px] text-[var(--admin-text-tertiary)] mt-0.5">
                              "{section.props.title}"
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-4 shrink-0">
                        <span className="text-[10px] font-bold text-[var(--admin-text-tertiary)] uppercase tracking-wider hidden sm:block">
                          Visible
                        </span>
                        <AdminToggle
                          checked={section.isActive}
                          onChange={() => handleToggleSection(layout, idx)}
                        />
                      </div>
                    </div>
                  ))}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

export default AdminLayouts;
