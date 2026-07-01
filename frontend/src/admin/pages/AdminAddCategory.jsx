import { m as motion } from 'framer-motion';
import {
  AdminToggle,
  fadeUp,
  SkeletonForm,
  AdminField,
  AdminInput,
  SectionHeader,
} from '../components/AdminUIKit';
import { DraftStatusIndicator } from '../components/DraftStatusIndicator';
import { DraftRestoreModal } from '../components/DraftRestoreModal';
import { UnsavedChangesGuard } from '../components/UnsavedChangesGuard';
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { getErrorMessage } from '../../utils/core/errorHelpers';
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
        } catch (_err) {
          toast.error('Failed to load category details');
        } finally {
          setIsLoading(false);
        }
      };
      fetchCategory();
    }
  }, [id, navigate, isEditMode, setFormData]);

  const handleNameChange = (e) => {
    const val = e.target.value;
    setFormData((prev) => {
      const currentName = prev.name || '';
      const currentSlug = prev.slug || '';
      const expectedSlug = currentName.toLowerCase().replace(/[\s\W-]+/g, '-');
      const isAuto = currentSlug === expectedSlug;
      return {
        ...prev,
        name: val,
        slug: isAuto ? val.toLowerCase().replace(/[\s\W-]+/g, '-') : currentSlug,
      };
    });
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
      <SectionHeader
        icon={isEditMode ? 'edit_note' : 'category'}
        title={isEditMode ? 'Edit Category' : 'Create Category'}
        description={
          isEditMode
            ? 'Update category properties and display scope'
            : 'Specify name, scope type, and publishing rules'
        }
        onBack={() => navigate('/admin/categories')}
      />

      <div className="w-full mt-6">
        <div className="flex items-center justify-end mb-4">
          <DraftStatusIndicator status={draftStatus} lastSavedAt={lastSavedAt} />
        </div>
        <motion.div variants={fadeUp} initial="hidden" animate="show" className="space-y-6">
          <div className="admin-card p-6 md:p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <AdminField
                label="Category Name"
                description="The primary display name of the category"
              >
                <AdminInput
                  required
                  type="text"
                  placeholder="e.g. Traditional Mandaps"
                  value={formData.name}
                  onChange={handleNameChange}
                />
              </AdminField>

              <AdminField
                label="Slug / URL Path"
                description="The URL-friendly identifier for the category"
              >
                <AdminInput
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
                  className="font-mono text-[13px]"
                />
              </AdminField>

              <AdminField
                label="Category Scope Type"
                description="Where this category will be utilized"
              >
                <select
                  className="w-full bg-[var(--admin-surface-muted)] border border-[var(--admin-border)] focus:border-[var(--admin-accent)] rounded-xl px-4 py-3 text-[13px] font-medium text-[var(--admin-text-primary)] transition-all outline-none"
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                >
                  <option value="product">Product Catalog</option>
                  <option value="event">Real Event Showcase</option>
                  <option value="gallery">Inspiration Gallery</option>
                  <option value="global">Global Shared Scope</option>
                </select>
              </AdminField>

              <div className="pt-4 border-t border-[var(--admin-border-subtle)] mt-2">
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
                  className="px-6 py-3 rounded-xl border border-[var(--admin-border-strong)] text-[var(--admin-text-primary)] font-bold text-[13px] hover:bg-[var(--admin-surface-muted)] transition-all"
                >
                  Cancel
                </button>
                <button
                  disabled={submitting}
                  type="submit"
                  className="flex-1 px-6 py-3 rounded-xl bg-[var(--admin-accent)] text-[var(--admin-text-inverse)] font-bold text-[13px] hover:brightness-110 transition-all shadow-[var(--admin-shadow-sm)] disabled:opacity-50"
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
