import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { fadeUp } from '../components/AdminUIKit';
import { getErrorMessage } from '../../utils/errorHelpers';
import { useDraft } from '../hooks/useDraft';

export function AdminAddCategory() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = Boolean(id);

  const [isLoading, setIsLoading] = useState(isEditMode);
  const [submitting, setSubmitting] = useState(false);

  const {
    formData,
    setFormData,
    draftStatus,
    showRestoreModal,
    restoreDraft,
    discardDraft,
    deleteDraft,
    lastSavedAt,
    blocker,
  } = useDraft({
    draftKey: isEditMode ? `admin:categories:edit:${id}` : 'admin:categories:add',
    module: 'Categories',
    pageTitle: isEditMode ? `Edit Category ${id}` : 'New Category',
    initialData: {
      name: '',
      slug: '',
      type: 'product',
      isActive: true,
    },
    enabled: true,
  });

  useEffect(() => {
    if (isEditMode) {
      const fetchCategory = async () => {
        try {
          const res = await api.get('/categories');
          if (res.data?.success) {
            const cat = res.data.data.find((c) => c._id === id);
            if (cat) {
              setFormData({
                name: cat.name || '',
                slug: cat.slug || '',
                type: cat.type || 'product',
                isActive: cat.isActive !== undefined ? cat.isActive : true,
              });
            } else {
              toast.error('Category not found');
              navigate('/admin/categories');
            }
          }
        } catch (err) {
          toast.error('Failed to load category details');
        } finally {
          setIsLoading(false);
        }
      };
      fetchCategory();
    }
  }, [id, navigate]);

  const handleNameChange = (e) => {
    const val = e.target.value;
    setFormData((prev) => ({
      ...prev,
      name: val,
      slug:
        prev.slug === prev.name.toLowerCase().replace(/[\s\W-]+/g, '-')
          ? val.toLowerCase().replace(/[\s\W-]+/g, '-')
          : prev.slug,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.slug.trim()) {
      return toast.error('Name and Slug are required');
    }

    setSubmitting(true);
    try {
      if (isEditMode) {
        await api.put(`/categories/${id}`, formData);
        toast.success('Category updated successfully');
      } else {
        await api.post('/categories', formData);
        toast.success('Category created successfully');
      }
      await deleteDraft(); // Clear draft on success
      navigate('/admin/categories');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to save category'));
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-[1280px] mx-auto space-y-6 pb-20 p-6">
        <SkeletonForm fields={4} />
      </div>
    );
  }

  return (
    <div className="max-w-[1280px] mx-auto space-y-6 pb-20 sm:pb-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/admin/categories')}
            className="admin-btn-icon w-10 h-10 min-h-0 bg-[var(--admin-surface)] border border-[var(--admin-border)] hover:bg-[var(--admin-surface-muted)] text-[var(--admin-text-primary)] transition-colors shadow-sm"
          >
            <span className="material-symbols-outlined text-[20px]">arrow_back</span>
          </button>
          <div>
            <h2 className="text-[20px] font-bold text-[var(--admin-text-primary)] leading-none mb-1.5 flex items-center gap-2">
              <span className="material-symbols-outlined text-[22px] text-[var(--admin-accent)]">
                {isEditMode ? 'edit_note' : 'category'}
              </span>
              {isEditMode ? 'Edit Category' : 'Create Category'}
              <DraftStatusIndicator status={draftStatus} lastSavedAt={lastSavedAt} />
            </h2>
            <p className="text-[12px] text-[var(--admin-text-secondary)] font-medium">
              {isEditMode
                ? 'Update category properties and display scope'
                : 'Specify name, scope type, and publishing rules'}
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto">
        <motion.div variants={fadeUp} initial="hidden" animate="show" className="space-y-6">
          <div className="admin-card p-6 md:p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-1.5">
                <label className="admin-label">
                  Category Name <span className="text-error">*</span>
                </label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Traditional Mandaps"
                  value={formData.name}
                  onChange={handleNameChange}
                  className="admin-input"
                />
              </div>

              <div className="space-y-1.5">
                <label className="admin-label">
                  Slug / URL Path <span className="text-error">*</span>
                </label>
                <input
                  required
                  type="text"
                  placeholder="e.g. traditional-mandaps"
                  value={formData.slug}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      slug: e.target.value.toLowerCase().replace(/[\s\W-]+/g, '-'),
                    })
                  }
                  className="admin-input font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="admin-label">
                  Category Scope Type <span className="text-error">*</span>
                </label>
                <select
                  className="admin-select"
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                >
                  <option value="product">Product Catalog</option>
                  <option value="event">Real Event Showcase</option>
                  <option value="gallery">Inspiration Gallery</option>
                  <option value="global">Global Shared Scope</option>
                </select>
              </div>

              <div className="pt-4 border-t border-[var(--admin-border-subtle)]">
                <AdminToggle
                  label="Publishing Status"
                  description="Enable to display items of this category on the storefront"
                  checked={formData.isActive}
                  onChange={() => setFormData({ ...formData, isActive: !formData.isActive })}
                />
              </div>

              <div className="flex gap-3 pt-6 border-t border-[var(--admin-border-subtle)] mt-8">
                <button
                  type="button"
                  onClick={() => navigate('/admin/categories')}
                  className="admin-btn admin-btn-outline flex-1 py-3"
                >
                  Cancel
                </button>
                <button
                  disabled={submitting}
                  type="submit"
                  className="admin-btn admin-btn-primary flex-[2] py-3 shadow-md"
                >
                  {submitting ? 'Saving...' : isEditMode ? 'Save Changes' : 'Create Category'}
                </button>
              </div>
            </form>
          </div>
        </motion.div>
      </div>

      <DraftRestoreModal
        isOpen={showRestoreModal}
        onRestore={restoreDraft}
        onDiscard={discardDraft}
        moduleName="Categories"
        lastSavedAt={lastSavedAt}
      />

      <UnsavedChangesGuard blocker={blocker} />
    </div>
  );
}

export default AdminAddCategory;
