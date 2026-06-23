import { m as motion } from 'framer-motion';
import { ImageUpload } from '../components/ImageUpload';
import { fadeUp, stagger, SkeletonForm } from '../components/AdminUIKit';
import { DraftStatusIndicator } from '../components/DraftStatusIndicator';
import { DraftRestoreModal } from '../components/DraftRestoreModal';
import { UnsavedChangesGuard } from '../components/UnsavedChangesGuard';
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAdmin } from '../context/AdminContext';
import { eventService } from '../../services/domainServices';
import toast from 'react-hot-toast';
import { useDraft } from '../hooks/useDraft';

const DECOR_STYLES = ['Traditional', 'Floral', 'Modern', 'Royal', 'Minimalist', 'Rustic'];

export function AdminAddEvent() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { refreshEvents, customCategories } = useAdmin();
  const isEditMode = Boolean(id);

  const [isLoading, setIsLoading] = useState(isEditMode);
  const [isSaving, setIsSaving] = useState(false);

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
    draftKey: isEditMode ? `admin:events:edit:${id}` : 'admin:events:add',
    module: 'Events',
    pageTitle: isEditMode ? `Edit Event ${id}` : 'New Event',
    initialData: {
      title: '',
      subtitle: '',
      category: '',
      style: '',
      image: '',
      decorCount: '',
      venueType: 'Indoor/Outdoor',
      pricing: '',
      description: '',
      colorPalette: '',
      features: '',
      materialStyle: '',
      venueSize: '',
      galleryImages: ['', ''],
      beforeImage: '',
      afterImage: '',
      seoTitle: '',
      seoDescription: '',
      isActive: true,
    },
    enabled: true,
  });

  useEffect(() => {
    if (isEditMode) {
      const fetchEvent = async () => {
        try {
          const res = await eventService.getAll({ limit: 100 });
          if (res.success) {
            const list =
              res.data?.data || res.data?.items || (Array.isArray(res.data) ? res.data : []);
            const ev = list.find((e) => (e._id || e.id) === id);
            if (ev) {
              setFormData({
                title: ev.title || '',
                subtitle: ev.subtitle || '',
                category: ev.category || '',
                style: ev.style || '',
                image: ev.image || '',
                decorCount: ev.decorCount || '',
                venueType: ev.venueType || 'Indoor/Outdoor',
                pricing: ev.pricing || '',
                description: ev.description || '',
                colorPalette: ev.colorPalette ? ev.colorPalette.join(',') : '',
                features: ev.features ? ev.features.join(',') : '',
                materialStyle: ev.materialStyle || '',
                venueSize: ev.venueSize || '',
                galleryImages: ev.gallery ? [ev.gallery[1] || '', ev.gallery[2] || ''] : ['', ''],
                beforeImage: ev.beforeAfterImages?.before || '',
                afterImage: ev.beforeAfterImages?.after || '',
                seoTitle: ev.seoTitle || '',
                seoDescription: ev.seoDescription || '',
                isActive: ev.isActive !== undefined ? ev.isActive : true,
              });
            } else {
              toast.error('Event not found');
              navigate('/admin/events');
            }
          }
        } catch (_err) {
          toast.error('Failed to load event details');
        } finally {
          setIsLoading(false);
        }
      };
      fetchEvent();
    }
  }, [id, navigate, isEditMode, setFormData]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (
      !formData.title ||
      !formData.category ||
      !formData.style ||
      !formData.image ||
      !formData.description
    ) {
      return toast.error('Please fill in all required fields.');
    }

    setIsSaving(true);
    try {
      const payload = {
        title: formData.title,
        subtitle: formData.subtitle || undefined,
        category: formData.category,
        style: formData.style,
        image: formData.image,
        decorCount: formData.decorCount || undefined,
        venueType: formData.venueType || undefined,
        pricing: formData.pricing || undefined,
        description: formData.description,
        colorPalette: formData.colorPalette
          ? formData.colorPalette
              .split(',')
              .map((c) => c.trim())
              .filter(Boolean)
          : [],
        features: formData.features
          ? formData.features
              .split(',')
              .map((f) => f.trim())
              .filter(Boolean)
          : [],
        materialStyle: formData.materialStyle || undefined,
        venueSize: formData.venueSize || undefined,
        gallery: [formData.image, ...formData.galleryImages.filter(Boolean)].slice(0, 3),
        beforeAfterImages:
          formData.beforeImage || formData.afterImage
            ? { before: formData.beforeImage || undefined, after: formData.afterImage || undefined }
            : undefined,
        seoTitle: formData.seoTitle || undefined,
        seoDescription: formData.seoDescription || undefined,
        isActive: Boolean(formData.isActive),
      };

      const res = isEditMode
        ? await eventService.update(id, payload)
        : await eventService.create(payload);

      if (res.success) {
        await deleteDraft(); // Clear draft on success
        toast.success(isEditMode ? 'Portfolio updated' : 'Theme published');
        if (refreshEvents) refreshEvents();
        navigate('/admin/events');
      }
    } catch (_err) {
      toast.error('Failed to save event portfolio.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-[1280px] mx-auto space-y-6 pb-20 p-6">
        <SkeletonForm fields={6} />
      </div>
    );
  }

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={stagger}
      className="max-w-[1280px] mx-auto space-y-6 pb-20 p-4 sm:p-0"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/admin/events')}
            className="admin-btn-icon w-10 h-10 min-h-0 bg-[var(--admin-surface)] border border-[var(--admin-border)] hover:bg-[var(--admin-surface-muted)] text-[var(--admin-text-primary)] transition-colors shadow-sm"
          >
            <span className="material-symbols-outlined text-[20px]">arrow_back</span>
          </button>
          <div>
            <h2 className="text-[20px] font-bold text-[var(--admin-text-primary)] leading-none mb-1.5 flex items-center gap-2">
              {isEditMode ? 'Edit Portfolio Event' : 'Create Portfolio Event'}
              <DraftStatusIndicator status={draftStatus} lastSavedAt={lastSavedAt} />
            </h2>
            <p className="text-[12px] text-[var(--admin-text-secondary)] font-medium">
              Configure event details, images, and pricing.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/admin/events')}
            className="admin-btn admin-btn-outline h-10 px-6"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSaving}
            className="admin-btn admin-btn-primary h-10 px-6 shadow-md hover:shadow-lg"
          >
            {isSaving ? 'Saving...' : isEditMode ? 'Save Changes' : 'Publish Event'}
          </button>
        </div>
      </div>

      <motion.div variants={fadeUp} className="admin-card p-6 md:p-8 space-y-8">
        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-2">
              <label className="admin-label">Portfolio Title *</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="admin-input"
                required
                placeholder="e.g. Royal Botanical Mandap"
              />
            </div>
            <div className="space-y-2">
              <label className="admin-label">Theme Category *</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="admin-select"
                required
              >
                <option value="">Select Category</option>
                {customCategories?.events?.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_200px] gap-8">
            <div className="space-y-2">
              <label className="admin-label">Primary Hero Image *</label>
              <input
                type="text"
                value={formData.image}
                onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                className="admin-input font-mono text-[11px]"
                placeholder="Image URL"
                required
              />
              <p className="text-[10px] text-[var(--admin-text-tertiary)]">
                Required for the main portfolio grid display.
              </p>
            </div>
            <div>
              <ImageUpload
                onUploadSuccess={(url) => setFormData((prev) => ({ ...prev, image: url }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
            <div className="space-y-2">
              <label className="admin-label">Decor Style *</label>
              <select
                value={formData.style}
                onChange={(e) => setFormData({ ...formData, style: e.target.value })}
                className="admin-select"
                required
              >
                <option value="">Select Style</option>
                {DECOR_STYLES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="admin-label">Pricing Tag</label>
              <input
                type="text"
                value={formData.pricing}
                onChange={(e) => setFormData({ ...formData, pricing: e.target.value })}
                className="admin-input"
                placeholder="e.g. ₹45,000"
              />
            </div>
            <div className="space-y-2">
              <label className="admin-label">Venue Footprint</label>
              <input
                type="text"
                value={formData.venueSize}
                onChange={(e) => setFormData({ ...formData, venueSize: e.target.value })}
                className="admin-input"
                placeholder="e.g. 5000 sq ft"
              />
            </div>
            <div className="space-y-2">
              <label className="admin-label">Completed Count</label>
              <input
                type="text"
                value={formData.decorCount}
                onChange={(e) => setFormData({ ...formData, decorCount: e.target.value })}
                className="admin-input"
                placeholder="e.g. 15+"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="admin-label">Atmospheric Narrative (Description) *</label>
            <textarea
              rows={4}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="admin-textarea"
              required
            />
          </div>

          <div className="border-t border-[var(--admin-border-subtle)] pt-6 space-y-5">
            <div>
              <h4 className="text-[14px] font-bold text-[var(--admin-text-primary)] flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[18px]">language</span> SEO Meta
                Configuration
              </h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <label className="admin-label">SEO Meta Title</label>
                <input
                  type="text"
                  value={formData.seoTitle || ''}
                  onChange={(e) => setFormData({ ...formData, seoTitle: e.target.value })}
                  className="admin-input"
                />
              </div>
              <div className="space-y-2">
                <label className="admin-label">SEO Meta Description</label>
                <textarea
                  rows={2}
                  value={formData.seoDescription || ''}
                  onChange={(e) => setFormData({ ...formData, seoDescription: e.target.value })}
                  className="admin-textarea"
                />
              </div>
            </div>
          </div>
        </form>
      </motion.div>

      <DraftRestoreModal
        isOpen={showRestoreModal}
        onRestore={restoreDraft}
        onDiscard={discardDraft}
        moduleName="Events"
        lastSavedAt={lastSavedAt}
      />

      <UnsavedChangesGuard blocker={blocker} />
    </motion.div>
  );
}
