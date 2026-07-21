import { m as motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { galleryService, productService } from '../../services/domainServices';
import { handleImageError } from '../../utils/media/imageUtils';
import toast from 'react-hot-toast';
import { useAdmin } from '../context/AdminContext';
import { useConfirm } from '../../context/ConfirmProvider';
import { getErrorMessage } from '../../utils/core/errorHelpers';
import {
  PageHeader,
  EmptyState,
  AdminSkeleton,
  FilterBar,
  fadeUp,
  stagger,
} from '../components/AdminUIKit';

export function AdminGallery() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState(['All']);
  const [filter, setFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');
  const [isLoading, setIsLoading] = useState(true);
  const confirm = useConfirm();
  const [_showUpload, setShowUpload] = useState(false);
  const [newItem, setNewItem] = useState({
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
  });
  const [_products, setProducts] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const {
    searchQuery,
    customCategories,
    addCustomCategory,
    updateCustomCategory,
    deleteCustomCategory,
  } = useAdmin();

  const [showCatModal, setShowCatModal] = useState(false);
  const [catForm, setCatForm] = useState({ name: '', description: '', image: '' });
  const [editingCatId, setEditingCatId] = useState(null);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [res, catRes, prodRes] = await Promise.all([
        galleryService.getAll({ limit: 1000 }),
        galleryService.getCategories(),
        productService.getAll({ limit: 150 }),
      ]);
      if (res.success) setItems(res.data.data || res.data.items || res.data || []);
      if (catRes.success) {
        const validCategories = (catRes.data || []).filter(
          (c) => c && typeof c === 'string' && c.trim() !== '',
        );
        setCategories(['All', ...validCategories]);
      }
      if (prodRes.success)
        setProducts(prodRes.data.data || prodRes.data.items || prodRes.data || []);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to load gallery items'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => fetchData(), 0);
    return () => clearTimeout(timer);
  }, []);

  const handleCancel = () => {
    setShowUpload(false);
    setEditingId(null);
    setNewItem({
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
    });
  };

  const handleEdit = (item) => {
    navigate(`/admin/gallery/edit/${item._id || item.id}`);
  };

  const _handleAiAutofill = () => {
    if (!newItem.image) {
      toast.error('Please upload a photo first for AI Vision analysis!');
      return;
    }
    const loadId = toast.loading('AI Vision analyzing design accents...');
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
      toast.success('AI populated details');
    }, 1200);
  };

  const _handleUpload = async (e) => {
    e.preventDefault();
    if (!newItem.image || !newItem.title || !newItem.category) {
      return toast.error('Please fill in title, category, and upload an image');
    }
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
      if (editingId) {
        const res = await galleryService.update(editingId, payload);
        if (res.success) {
          toast.success('Gallery item updated');
          handleCancel();
          fetchData();
        }
      } else {
        const res = await galleryService.create(payload);
        if (res.success) {
          toast.success('Gallery item created');
          handleCancel();
          fetchData();
        }
      }
    } catch (_err) {
      toast.error(editingId ? 'Failed to update' : 'Failed to create');
    }
  };

  const handleSaveCat = (e) => {
    e.preventDefault();
    if (!catForm.name) return;
    if (editingCatId) updateCustomCategory('events', editingCatId, catForm);
    else addCustomCategory('events', catForm);
    setCatForm({ name: '', description: '', image: '' });
    setEditingCatId(null);
  };

  const handleEditCat = (cat) => {
    setEditingCatId(cat.id);
    setCatForm({ name: cat.name, description: cat.description || '', image: cat.image || '' });
  };

  const handleDelete = async (id) => {
    if (
      !(await confirm({
        title: 'Delete Item',
        message: 'Are you sure you want to delete this item?',
        type: 'danger',
      }))
    )
      return;
    try {
      const res = await galleryService.delete(id);
      if (res.success) {
        toast.success('Item deleted');
        setItems(items.filter((i) => (i._id || i.id) !== id));
      }
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to delete item'));
    }
  };

  const filtered = items.filter((g) => {
    const matchesFilter = filter === 'All' || g.category === filter;
    const matchesType = typeFilter === 'All' || g.type === typeFilter;
    const matchesSearch =
      !searchQuery ||
      (g.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (g.category || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (g.event || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (g.tags || []).some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesFilter && matchesType && matchesSearch;
  });

  return (
    <motion.div initial="hidden" animate="show" variants={stagger} className="space-y-6">
      {/* ─── Page Header ─── */}
      <PageHeader
        title="Gallery Curation"
        subtitle={`${items.length} items cataloged · Manage design inspirations and real event showcases`}
      >
        <button
          onClick={() => navigate('/admin/gallery/add')}
          className="admin-btn admin-btn-primary"
        >
          <span className="material-symbols-outlined text-[16px]">add_photo_alternate</span>
          Add Item
        </button>
      </PageHeader>

      {/* Upload/Edit Drawer Removed in favor of Router Navigation */}

      {/* ─── Filters ─── */}
      <motion.div variants={fadeUp} className="space-y-4">
        {/* Type Filter */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex bg-[var(--admin-surface-muted)] rounded-[var(--admin-radius-lg)] p-0.5 border border-[var(--admin-border-subtle)]">
            {[
              { id: 'All', label: 'All Items' },
              { id: 'inspiration', label: 'Inspirations' },
              { id: 'real-event', label: 'Real Events' },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setTypeFilter(t.id)}
                className={`px-3 py-1.5 rounded-[var(--admin-radius-md)] text-[11px] font-semibold cursor-pointer transition-all ${
                  typeFilter === t.id
                    ? 'bg-[var(--admin-surface)] text-[var(--admin-text-primary)] shadow-[var(--admin-shadow-xs)] border border-[var(--admin-border-subtle)]'
                    : 'text-[var(--admin-text-tertiary)] hover:text-[var(--admin-text-primary)]'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <span className="text-[11px] text-[var(--admin-text-tertiary)] font-medium">
            {filtered.length} items
          </span>
        </div>

        {/* Category Filter */}
        <FilterBar filters={categories} value={filter} onChange={setFilter} />
      </motion.div>

      {/* ─── Gallery Grid ─── */}
      <motion.div
        variants={fadeUp}
        className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-3.5 sm:gap-5"
      >
        {isLoading
          ? Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="admin-card overflow-hidden">
                <AdminSkeleton className="w-full aspect-[4/3]" style={{ borderRadius: 0 }} />
                <div className="p-3 sm:p-4 space-y-2 sm:space-y-3">
                  <AdminSkeleton className="w-16 h-4 rounded" />
                  <AdminSkeleton className="w-full h-4 rounded" />
                  <AdminSkeleton className="w-3/4 h-3 rounded" />
                  <div className="flex gap-3 pt-2">
                    <AdminSkeleton className="w-12 h-4 rounded" />
                    <AdminSkeleton className="w-12 h-4 rounded" />
                  </div>
                </div>
              </div>
            ))
          : filtered.map((item) => (
              <motion.div
                key={item._id || item.id}
                layout
                className="relative admin-card overflow-hidden group flex flex-col hover:shadow-[var(--admin-shadow-md)] transition-all duration-300 border border-[var(--admin-border-subtle)] hover:border-[var(--admin-border-strong)] bg-[var(--admin-surface)]"
              >
                {/* Top Image Casing - 100% UNCLUTTERED & CLEAN */}
                <div className="relative overflow-hidden aspect-[4/3] bg-[var(--admin-bg-subtle)] border-b border-[var(--admin-border-subtle)]">
                  <img
                    onError={handleImageError}
                    src={item.image}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500 ease-out"
                  />
                </div>

                {/* Card Content Area (Beautiful, Clean, 100% Symmetrical below the image) */}
                <div className="p-3 flex-1 flex flex-col justify-between space-y-2.5">
                  {/* Category, Event */}
                  {(item.category || item.event) && (
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[9px] font-bold text-[var(--admin-accent)] uppercase tracking-widest truncate">
                        {item.category} {item.event ? `· ${item.event}` : ''}
                      </span>
                    </div>
                  )}

                  {/* Title & Actions row */}
                  <div className="flex items-center justify-between gap-2">
                    <h3
                      className="text-[13px] font-semibold text-[var(--admin-text-primary)] line-clamp-1 leading-snug group-hover:text-[var(--admin-accent)] transition-colors duration-200"
                      title={item.title}
                    >
                      {item.title}
                    </h3>

                    {/* Minimal inline Actions */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => handleEdit(item)}
                        className="!p-0 shrink-0 bg-[var(--admin-surface-muted)] text-[var(--admin-text-secondary)] hover:bg-[var(--admin-warning)] hover:text-white flex items-center justify-center cursor-pointer transition-all active:scale-90"
                        style={{
                          width: '32px',
                          height: '32px',
                          minWidth: '32px',
                          minHeight: '32px',
                          borderRadius: '50%',
                        }}
                        title="Edit"
                      >
                        <span className="material-symbols-outlined text-[14px]">edit</span>
                      </button>
                      <button
                        onClick={() => handleDelete(item._id || item.id)}
                        className="!p-0 shrink-0 bg-[var(--admin-surface-muted)] text-[var(--admin-text-secondary)] hover:bg-[var(--admin-error)] hover:text-white flex items-center justify-center cursor-pointer transition-all active:scale-90"
                        style={{
                          width: '32px',
                          height: '32px',
                          minWidth: '32px',
                          minHeight: '32px',
                          borderRadius: '50%',
                        }}
                        title="Delete"
                      >
                        <span className="material-symbols-outlined text-[14px]">delete</span>
                      </button>
                    </div>
                  </div>

                  {/* Sub-Badges (Type, Video, Linked) */}
                  <div className="flex items-center justify-between flex-nowrap gap-1.5 pt-2 border-t border-[var(--admin-border-subtle)] w-full">
                    <div className="flex items-center gap-1.5 min-w-0">
                      {/* Classification Type Tag */}
                      <span className="h-5 px-2 rounded bg-[var(--admin-surface-muted)] text-[8px] font-bold text-[var(--admin-text-secondary)] uppercase tracking-wider flex items-center justify-center shrink-0">
                        {item.type === 'real-event' ? 'Real Event' : 'Inspiration'}
                      </span>

                      {/* Video Tag if active */}
                      {item.video && (
                        <span className="h-5 px-2 rounded bg-[var(--admin-accent-light)] text-[8px] font-bold text-[var(--admin-accent)] uppercase tracking-wider flex items-center justify-center gap-0.5 shrink-0">
                          <span className="material-symbols-outlined text-[10px] leading-none">
                            play_circle
                          </span>
                          Video
                        </span>
                      )}
                    </div>

                    {/* Linked Products Count tag */}
                    {item.linkedProducts && item.linkedProducts.length > 0 && (
                      <span className="h-5 px-2 rounded bg-[var(--admin-surface-muted)] text-[8px] font-bold text-[var(--admin-text-secondary)] flex items-center justify-center gap-0.5 shrink-0">
                        <span className="material-symbols-outlined text-[10px] text-[var(--admin-accent)] leading-none">
                          link
                        </span>
                        {item.linkedProducts.length} Linked
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
      </motion.div>

      {/* ─── Empty State ─── */}
      {!isLoading && filtered.length === 0 && (
        <EmptyState
          icon="search_off"
          title="No Items Found"
          description="No gallery items match your current filters or search."
          action={
            <button
              onClick={() => {
                setFilter('All');
                setTypeFilter('All');
              }}
              className="admin-btn admin-btn-outline admin-btn-sm"
            >
              Reset Filters
            </button>
          }
        />
      )}

      {/* ─── Category Management Modal ─── */}
      <AnimatePresence>
        {showCatModal && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCatModal(false)}
              className="absolute inset-0 bg-[var(--admin-surface-overlay)] backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-xl admin-card shadow-[var(--admin-shadow-2xl)] p-6 md:p-8 z-10 max-h-[90vh] overflow-y-auto custom-scrollbar"
            >
              {/* Modal Header */}
              <div className="flex justify-between items-center border-b border-[var(--admin-border-subtle)] pb-4 mb-6">
                <div>
                  <p className="text-[10px] font-semibold text-[var(--admin-text-tertiary)] uppercase tracking-wider">
                    Studio Themes
                  </p>
                  <h3 className="text-[16px] font-bold text-[var(--admin-text-primary)] tracking-tight">
                    Showcase Categories
                  </h3>
                </div>
                <button
                  onClick={() => setShowCatModal(false)}
                  className="admin-btn admin-btn-icon w-8 h-8"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>

              {/* Add/Edit Form */}
              <form onSubmit={handleSaveCat} className="admin-card-inset p-4 mb-6 space-y-4">
                <h4 className="text-[11px] font-semibold text-[var(--admin-text-primary)] uppercase tracking-wider">
                  {editingCatId ? ' Edit Theme' : 'Create New Theme'}
                </h4>
                <div className="space-y-1.5">
                  <label className="admin-label">Theme Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. Traditional Haldi Tray Decor"
                    value={catForm.name}
                    onChange={(e) => setCatForm({ ...catForm, name: e.target.value })}
                    className="admin-input"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="admin-label">Description</label>
                  <input
                    type="text"
                    placeholder="e.g. Handcrafted floral trays and brass elements"
                    value={catForm.description}
                    onChange={(e) => setCatForm({ ...catForm, description: e.target.value })}
                    className="admin-input"
                  />
                </div>
                <div className="flex items-center justify-end gap-2 pt-1">
                  {editingCatId && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingCatId(null);
                        setCatForm({ name: '', description: '', image: '' });
                      }}
                      className="admin-btn admin-btn-ghost admin-btn-sm"
                    >
                      Cancel
                    </button>
                  )}
                  <button type="submit" className="admin-btn admin-btn-primary admin-btn-sm">
                    {editingCatId ? 'Save Changes' : '+ Add Theme'}
                  </button>
                </div>
              </form>

              {/* Theme List */}
              <div className="space-y-2">
                <h4 className="text-[11px] font-semibold text-[var(--admin-text-primary)] uppercase tracking-wider mb-3">
                  Active Themes ({customCategories?.events?.length || 0})
                </h4>
                {customCategories?.events?.map((cat) => (
                  <div
                    key={cat.id}
                    className="flex items-center justify-between p-3 admin-card group"
                  >
                    <div className="min-w-0 flex-1 pr-4">
                      <span className="text-[12px] text-[var(--admin-text-primary)] font-semibold block truncate">
                        {cat.name}
                      </span>
                      {cat.description && (
                        <span className="text-[11px] text-[var(--admin-text-tertiary)] block truncate">
                          {cat.description}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => handleEditCat(cat)}
                        className="w-9 h-9 !p-0 aspect-square shrink-0 flex items-center justify-center rounded-full bg-[var(--admin-warning-light)] text-[var(--admin-warning)] hover:bg-[var(--admin-warning)] hover:text-white transition-all cursor-pointer"
                        title="Edit"
                      >
                        <span className="material-symbols-outlined text-[15px]">edit</span>
                      </button>
                      <button
                        onClick={() => deleteCustomCategory('events', cat.id)}
                        className="w-9 h-9 !p-0 aspect-square shrink-0 flex items-center justify-center rounded-full bg-[var(--admin-error-light)] text-[var(--admin-error)] hover:bg-[var(--admin-error)] hover:text-white transition-all cursor-pointer"
                        title="Delete"
                      >
                        <span className="material-symbols-outlined text-[15px]">delete</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
