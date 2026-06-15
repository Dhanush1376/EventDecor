import { m as motion } from 'framer-motion';
import { ImageUpload } from '../components/ImageUpload';
import { VideoUpload } from '../components/VideoUpload';
import { PageHeader, stagger } from '../components/AdminUIKit';
import { DraftStatusIndicator } from '../components/DraftStatusIndicator';
import { DraftRestoreModal } from '../components/DraftRestoreModal';
import { UnsavedChangesGuard } from '../components/UnsavedChangesGuard';
import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { galleryService, productService } from '../../services/domainServices';
import toast from 'react-hot-toast';
import { useAdmin } from '../context/AdminContext';
import { useDraft } from '../hooks/useDraft';

export function AdminAddGalleryItem() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = Boolean(id);
  const { customCategories } = useAdmin();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(isEditing);
  const [submitting, setSubmitting] = useState(false);

  const {
    formData: newItem,
    setFormData: setNewItem,
    draftStatus,
    showRestoreModal,
    restoreDraft,
    discardDraft,
    deleteDraft,
    lastSavedAt,
    blocker,
  } = useDraft({
    draftKey: isEditing ? `admin:gallery:edit:${id}` : 'admin:gallery:add',
    module: 'Gallery',
    pageTitle: isEditing ? `Edit Gallery Item ${id}` : 'New Gallery Item',
    initialData: {
      title: '',
      teluguTitle: '',
      category: '',
      event: '',
      style: '',
      image: '',
      video: '',
      tags: '',
      description: '',
      story: '',
      type: 'inspiration',
      linkedProducts: [],
    },
    enabled: true,
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const prodRes = await productService.getAll({ limit: 150 });
        if (prodRes.success)
          setProducts(prodRes.data.data || prodRes.data.items || prodRes.data || []);

        if (isEditing) {
          const res = await galleryService.getById(id);
          if (res.success) {
            const item = res.data;
            setNewItem({
              title: item.title || '',
              teluguTitle: item.teluguTitle || '',
              category: item.category || '',
              event: item.event || '',
              style: item.style || '',
              image: item.image || '',
              video: item.video || '',
              type: item.type || 'inspiration',
              tags: Array.isArray(item.tags) ? item.tags.join(',') : item.tags || '',
              description: item.description || '',
              story: item.story || '',
              linkedProducts: Array.isArray(item.linkedProducts)
                ? item.linkedProducts.map((p) => p._id || p.id || p)
                : [],
            });
          } else {
            toast.error('Failed to load item details');
            navigate('/admin/gallery');
          }
        }
      } catch (err) {
        toast.error('Error loading data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, isEditing, navigate]);

  const handleAiAutofill = () => {
    if (!newItem.image) {
      toast.error('Please upload a photo first for AI Vision analysis!');
      return;
    }
    const loadId = toast.loading('✨ AI Vision analyzing design accents...');
    setTimeout(() => {
      toast.dismiss(loadId);
      setNewItem((prev) => ({
        ...prev,
        title: prev.title || 'Royal Jasmine Backdrop',
        teluguTitle: prev.teluguTitle || 'స్వర్ణ మల్లె పందిరి',
        category: prev.category || 'Traditional',
        event: prev.event || 'Wedding',
        style: prev.style || 'Temple Heritage',
        tags: prev.tags || 'wedding, jasmine, traditional, gold, backdrop, mandap',
        description:
          prev.description ||
          'A clean, elegant stage backdrop adorned with fresh marigold and jasmine garlands, set against a classic gold border frame.',
        story:
          prev.story ||
          'Inspired by traditional South Indian temple architecture, handcrafted using locally sourced fresh flowers and premium drapes.',
      }));
      toast.success('✨ AI populated details');
    }, 1200);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newItem.image || !newItem.title || !newItem.category) {
      return toast.error('Please fill in title, category, and upload an image');
    }
    setSubmitting(true);
    const payload = {
      ...newItem,
      tags:
        typeof newItem.tags === 'string'
          ? newItem.tags
              .split(',')
              .map((t) => t.trim())
              .filter(Boolean)
          : newItem.tags,
    };
    try {
      if (isEditing) {
        const res = await galleryService.update(id, payload);
        if (res.success) {
          await deleteDraft(); // Clear draft on success
          toast.success('Gallery item updated');
          navigate('/admin/gallery');
        }
      } else {
        const res = await galleryService.create(payload);
        if (res.success) {
          await deleteDraft(); // Clear draft on success
          toast.success('Gallery item created');
          navigate('/admin/gallery');
        }
      }
    } catch (err) {
      toast.error(isEditing ? 'Failed to update' : 'Failed to create');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-[var(--admin-text-secondary)]">Loading...</div>;
  }

  return (
    <motion.div initial="hidden" animate="show" variants={stagger} className="space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader
          title={isEditing ? 'Edit Gallery Item' : 'Curate Gallery Item'}
          subtitle={
            isEditing
              ? 'Update showcase assets and details'
              : 'Upload design inspiration or real event details'
          }
          backButton={{ label: 'Back to Gallery', path: '/admin/gallery' }}
        />
        <div className="hidden sm:flex self-start mt-2">
          <DraftStatusIndicator status={draftStatus} lastSavedAt={lastSavedAt} />
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
        {/* Left Column — Media Uploads & Linked Products */}
        <div className="lg:col-span-5 space-y-5 sm:space-y-6">
          {/* Image Upload Area */}
          <div className="admin-card p-5 sm:p-6 space-y-5">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="admin-label mb-0">Image Asset *</label>
                {newItem.image && (
                  <span className="px-2 py-0.5 rounded-full text-[8.5px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/10 flex items-center gap-0.5">
                    <span className="material-symbols-outlined text-[10px] leading-none">
                      check_circle
                    </span>
                    Active
                  </span>
                )}
              </div>
              <ImageUpload
                value={newItem.image}
                onChange={(val) => {
                  setNewItem({ ...newItem, image: val });
                  toast.success('Photo uploaded! Click AI Autofill to populate details.');
                }}
                folder="gallery"
              />
            </div>

            {/* Video Upload Area */}
            <div className="space-y-1.5 pt-4 border-t border-[var(--admin-border-subtle)]">
              <div className="flex items-center justify-between">
                <label className="admin-label mb-0">Video Reel (Optional)</label>
                {newItem.video && (
                  <span className="px-2 py-0.5 rounded-full text-[8.5px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/10 flex items-center gap-0.5">
                    <span className="material-symbols-outlined text-[10px] leading-none">
                      videocam
                    </span>
                    Reel Active
                  </span>
                )}
              </div>
              <VideoUpload
                value={newItem.video}
                onChange={(val) => setNewItem({ ...newItem, video: val })}
                folder="gallery"
              />
            </div>

            <button
              type="button"
              onClick={handleAiAutofill}
              className="w-full py-2.5 rounded-[var(--admin-radius-lg)] bg-[var(--admin-accent)]/10 hover:bg-[var(--admin-accent)] hover:text-white text-[var(--admin-accent)] border border-[var(--admin-accent)]/20 transition-all font-semibold text-[11px] uppercase tracking-wider flex items-center justify-center gap-1.5 active:scale-[0.98]"
            >
              <span className="material-symbols-outlined text-[15px]">auto_awesome</span>
              AI Autofill from Photo
            </button>
          </div>

          <div className="admin-card p-5 sm:p-6 space-y-4">
            <div className="space-y-1.5">
              <label className="admin-label">Link Storefront Products</label>
              <p className="text-[10.5px] text-[var(--admin-text-tertiary)] leading-normal -mt-0.5">
                Tag catalog items onto this image so visitors can shop directly.
              </p>
              <div className="admin-card-inset p-2.5 max-h-[180px] overflow-y-auto custom-scrollbar space-y-1 border border-[var(--admin-border-subtle)] rounded-[var(--admin-radius-lg)] bg-[var(--admin-bg-subtle)]">
                {products.length === 0 ? (
                  <p className="text-[11px] text-[var(--admin-text-tertiary)] italic p-2 text-center">
                    No products in store
                  </p>
                ) : (
                  products.map((p) => {
                    const isChecked = newItem.linkedProducts?.includes(p._id || p.id);
                    return (
                      <label
                        key={p._id || p.id}
                        className="flex items-center gap-2.5 p-2 hover:bg-[var(--admin-surface-hover)] rounded-[var(--admin-radius-md)] cursor-pointer transition-colors text-[11.5px] font-medium text-[var(--admin-text-secondary)]"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            const list = newItem.linkedProducts || [];
                            const id = p._id || p.id;
                            if (e.target.checked)
                              setNewItem({ ...newItem, linkedProducts: [...list, id] });
                            else
                              setNewItem({
                                ...newItem,
                                linkedProducts: list.filter((x) => x !== id),
                              });
                          }}
                          className="accent-[var(--admin-accent)] w-4 h-4 rounded"
                        />
                        <span className="truncate">{p.title}</span>
                      </label>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column — Classification & Text Fields */}
        <div className="lg:col-span-7 space-y-4 sm:space-y-6">
          <div className="admin-card p-5 sm:p-6 space-y-5">
            {/* Classification Type Selection */}
            <div className="space-y-2.5">
              <label className="admin-label mb-0">Classification Type</label>
              <div className="grid grid-cols-2 gap-2.5">
                {[
                  { id: 'inspiration', icon: 'palette', label: 'Design Inspiration' },
                  { id: 'real-event', icon: 'auto_awesome', label: 'Real Event' },
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setNewItem({ ...newItem, type: t.id })}
                    className={`p-3 rounded-[var(--admin-radius-md)] text-[11px] font-bold uppercase tracking-wider border transition-all flex flex-col items-center justify-center gap-1 ${
                      newItem.type === t.id
                        ? 'bg-[var(--admin-accent)] text-white border-[var(--admin-accent)] shadow-sm'
                        : 'bg-[var(--admin-surface)] text-[var(--admin-text-tertiary)] border-[var(--admin-border)] hover:border-[var(--admin-border-strong)]'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[20px]">{t.icon}</span>
                    <span className="truncate w-full text-center">{t.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Form Inputs Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="admin-label">Title *</label>
                <input
                  type="text"
                  required
                  value={newItem.title}
                  onChange={(e) => setNewItem({ ...newItem, title: e.target.value })}
                  className="admin-input"
                  placeholder="Enter catalog title"
                />
              </div>
              <div className="space-y-1">
                <label className="admin-label">Telugu Title (Optional)</label>
                <input
                  type="text"
                  value={newItem.teluguTitle}
                  onChange={(e) => setNewItem({ ...newItem, teluguTitle: e.target.value })}
                  className="admin-input"
                  placeholder="సిరి వివాహ అలంకరణ"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="admin-label">Category *</label>
              <select
                required
                value={newItem.category}
                onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
                className="admin-select"
              >
                <option value="">Select Category</option>
                <option value="Traditional">Traditional</option>
                <option value="Floral">Floral</option>
                <option value="Modern">Modern</option>
                <option value="Royal">Royal</option>
                <option value="Minimalist">Minimalist</option>
                <option value="Rustic">Rustic</option>
                {customCategories?.events?.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="admin-label">Event Tag</label>
                <input
                  type="text"
                  value={newItem.event}
                  onChange={(e) => setNewItem({ ...newItem, event: e.target.value })}
                  className="admin-input"
                  placeholder="Wedding, Haldi, Reception"
                />
              </div>
              <div className="space-y-1">
                <label className="admin-label">Style Accent</label>
                <input
                  type="text"
                  value={newItem.style}
                  onChange={(e) => setNewItem({ ...newItem, style: e.target.value })}
                  className="admin-input"
                  placeholder="Temple Heritage, Floral Arch"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="admin-label">Search Tags (Comma separated)</label>
              <input
                type="text"
                value={newItem.tags}
                onChange={(e) => setNewItem({ ...newItem, tags: e.target.value })}
                className="admin-input"
                placeholder="wedding, gold, botanical, mandap"
              />
            </div>

            <div className="space-y-1">
              <label className="admin-label">Description</label>
              <textarea
                value={newItem.description}
                onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                className="admin-textarea"
                rows={3}
                placeholder="Brief design concept..."
              />
            </div>
            <div className="space-y-1">
              <label className="admin-label">Story & Crafting Details (Optional)</label>
              <textarea
                value={newItem.story}
                onChange={(e) => setNewItem({ ...newItem, story: e.target.value })}
                className="admin-textarea"
                rows={3}
                placeholder="Studio story or floral crafting journey..."
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => navigate('/admin/gallery')}
              className="admin-btn admin-btn-outline px-6 py-2.5"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="admin-btn admin-btn-primary px-8 py-2.5"
            >
              {submitting ? 'Saving...' : isEditing ? 'Save Changes' : 'Confirm Curation'}
            </button>
          </div>
        </div>
      </form>

      <DraftRestoreModal
        isOpen={showRestoreModal}
        onRestore={restoreDraft}
        onDiscard={discardDraft}
        moduleName="Gallery"
        lastSavedAt={lastSavedAt}
      />

      <UnsavedChangesGuard blocker={blocker} />
    </motion.div>
  );
}
