import { m as motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { galleryService, productService } from '../../services/domainServices';
import storeSettingsService from '../../services/api/storeSettingsService';
import { handleImageError } from '../../utils/media/imageUtils';
import toast from 'react-hot-toast';
import { useAdmin } from '../context/AdminContext';
import { useConfirm } from '../../context/ConfirmProvider';
import { getErrorMessage } from '../../utils/core/errorHelpers';
import { PageHeader, EmptyState, AdminSkeleton, fadeUp, stagger } from '../components/AdminUIKit';
import { AdminFilterDrawer } from '../components/ui/AdminFilterDrawer';
import { AdminActiveFilterChips, AdminFilterEmptyState } from '../components/filters';

export function AdminGallery() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState(['All']);
  const [filter, setFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');
  const [showFiltersMenu, setShowFiltersMenu] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const confirm = useConfirm();
  const [_showUpload, setShowUpload] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [storefrontSettings, setStorefrontSettings] = useState({
    hideGallerySection: false,
    hideProductsFromGallery: false,
  });
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
    setSearchQuery,
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
      const [res, catRes, prodRes, settingsRes] = await Promise.all([
        galleryService.getAll({ limit: 1000 }),
        galleryService.getCategories(),
        productService.getAll({ limit: 150 }),
        storeSettingsService.getAdminSettings(true),
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
      const sf = settingsRes?.storefront || settingsRes?.data?.storefront || settingsRes;
      if (sf && (sf.hideGallerySection !== undefined || sf.hideProductsFromGallery !== undefined)) {
        setStorefrontSettings({
          hideGallerySection: Boolean(sf.hideGallerySection),
          hideProductsFromGallery: Boolean(sf.hideProductsFromGallery),
        });
      }
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

  const handleOpenSettingsModal = async () => {
    setShowSettingsModal(true);
    try {
      const res = await storeSettingsService.getAdminSettings(true);
      const sf = res?.storefront || res?.data?.storefront || res;
      if (sf && (sf.hideGallerySection !== undefined || sf.hideProductsFromGallery !== undefined)) {
        setStorefrontSettings({
          hideGallerySection: Boolean(sf.hideGallerySection),
          hideProductsFromGallery: Boolean(sf.hideProductsFromGallery),
        });
      }
    } catch (e) {
      // Keep existing storefrontSettings state
    }
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setIsSavingSettings(true);
    try {
      await storeSettingsService.updateSection('storefront', {
        hideGallerySection: Boolean(storefrontSettings.hideGallerySection),
        hideProductsFromGallery: Boolean(storefrontSettings.hideProductsFromGallery),
      });
      toast.success('Gallery settings updated');
      setShowSettingsModal(false);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to update settings'));
    } finally {
      setIsSavingSettings(false);
    }
  };

  const activeChips = useMemo(() => {
    const chips = [];
    if (typeFilter !== 'All') {
      chips.push({
        key: 'type',
        label: `Type: ${typeFilter === 'inspiration' ? 'Inspirations' : 'Real Events'}`,
        onRemove: () => setTypeFilter('All'),
      });
    }
    if (filter !== 'All') {
      chips.push({
        key: 'category',
        label: `Category: ${filter}`,
        onRemove: () => setFilter('All'),
      });
    }
    return chips;
  }, [typeFilter, filter]);

  const resetAllFilters = () => {
    setFilter('All');
    setTypeFilter('All');
    setSearchQuery('');
  };

  const activeCount = (filter !== 'All' ? 1 : 0) + (typeFilter !== 'All' ? 1 : 0);

  return (
    <motion.div initial="hidden" animate="show" variants={stagger} className="space-y-6">
      {/* ─── Page Header ─── */}
      <PageHeader
        title="Gallery Curation"
        subtitle={
          isLoading ? (
            <span>Loading gallery...</span>
          ) : (
            <div className="flex flex-wrap items-center gap-1.5 text-[13px]">
              <span className="font-semibold text-[var(--admin-text-primary)]">
                {items.length} Total Items
              </span>
              <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                {items.filter((i) => i.featured).length} Featured
              </span>
              <span className="inline-flex items-center gap-1 font-semibold text-amber-600 dark:text-amber-400">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                {categories.length} Categories
              </span>
            </div>
          )
        }
      />

      {/* ─── Sticky 42px Search, Filters & Actions Toolbar (Single Line) ─── */}
      <div className="sticky top-[var(--admin-topbar-height,56px)] z-20 -my-2 py-2.5 bg-[var(--admin-bg)]/95 backdrop-blur-md space-y-2">
        <motion.div variants={fadeUp} className="flex items-center gap-2 w-full box-border">
          {/* 1. Search Bar */}
          <div className="relative flex-1 min-w-0 bg-[var(--admin-surface-muted)] rounded-[4px] border border-[var(--admin-border)] flex items-center px-2.5 sm:px-3 h-[42px] min-h-[42px] max-h-[42px]">
            <span className="material-symbols-outlined text-[18px] text-[var(--admin-text-tertiary)] shrink-0">
              search
            </span>
            <input
              type="text"
              placeholder="Search by title, event, tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none outline-none w-full text-[12.5px] sm:text-[13px] text-[var(--admin-text-primary)] placeholder-[var(--admin-text-tertiary)] font-medium px-2 h-full min-w-0"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="text-[var(--admin-text-tertiary)] hover:text-[var(--admin-text-primary)] cursor-pointer p-1 flex items-center justify-center shrink-0"
                title="Clear search"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            )}
          </div>

          {/* 2. Filters Button & AdminFilterDrawer */}
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setShowFiltersMenu(!showFiltersMenu)}
              className={`h-[42px] min-h-[42px] max-h-[42px] px-2.5 sm:px-3.5 flex items-center justify-center gap-1.5 rounded-[4px] border transition-colors shrink-0 cursor-pointer ${
                showFiltersMenu || activeCount > 0
                  ? 'bg-[var(--admin-accent)] text-white border-transparent shadow-sm'
                  : 'bg-[var(--admin-surface-muted)] text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)] border-[var(--admin-border)] hover:border-[var(--admin-border-strong)]'
              }`}
              title="Gallery Filters"
            >
              <span className="material-symbols-outlined text-[18px]">tune</span>
              <span className="font-semibold text-[13px] hidden sm:inline">
                {activeCount > 0 ? `${activeCount} Filters` : 'Filters'}
              </span>
              {activeCount > 0 && (
                <span className="min-w-[16px] h-4 px-1 rounded-full bg-white text-[var(--admin-accent)] text-[10px] font-bold flex items-center justify-center">
                  {activeCount}
                </span>
              )}
            </button>

            <AdminFilterDrawer
              isOpen={showFiltersMenu}
              onClose={() => setShowFiltersMenu(false)}
              title="Gallery Filters"
              icon="filter_list"
              activeCount={activeCount}
              widthClass="w-[320px] sm:w-[380px]"
              onClearAll={() => {
                setFilter('All');
                setTypeFilter('All');
              }}
              onApply={() => setShowFiltersMenu(false)}
            >
              {/* Filter Section 1: Item Type */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-[var(--admin-text-tertiary)] uppercase tracking-wider block">
                  Item Type
                </label>
                <div className="grid grid-cols-3 gap-1 p-1 bg-[var(--admin-surface-muted)] rounded-[4px] border border-[var(--admin-border)]">
                  {[
                    { id: 'All', label: 'All Items' },
                    { id: 'inspiration', label: 'Inspirations' },
                    { id: 'real-event', label: 'Real Events' },
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setTypeFilter(t.id)}
                      className={`py-1.5 px-1.5 rounded-[3px] text-[11px] sm:text-[11.5px] font-bold transition-all text-center cursor-pointer whitespace-nowrap leading-none ${
                        typeFilter === t.id
                          ? 'bg-white dark:bg-stone-800 text-[var(--admin-accent)] shadow-xs border border-black/5 dark:border-white/5'
                          : 'text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)]'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Filter Section 2: Categories */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold text-[var(--admin-text-tertiary)] uppercase tracking-wider block">
                    Category ({categories.length})
                  </label>
                  {filter !== 'All' && (
                    <button
                      type="button"
                      onClick={() => setFilter('All')}
                      className="text-[10.5px] font-semibold text-[var(--admin-accent)] hover:underline cursor-pointer"
                    >
                      Reset Category
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-[240px] overflow-y-auto custom-scrollbar pr-1">
                  {categories.map((cat) => {
                    const isSelected = filter === cat;
                    const count = items.filter((item) =>
                      cat === 'All' ? true : item.category === cat,
                    ).length;
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setFilter(cat)}
                        className={`flex items-center justify-between px-2.5 py-1.5 rounded-[4px] border text-[11.5px] font-semibold text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[var(--admin-accent)]/10 text-[var(--admin-accent)] border-[var(--admin-accent)] font-bold'
                            : 'bg-[var(--admin-surface)] text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)] border-[var(--admin-border)] hover:border-[var(--admin-border-strong)]'
                        }`}
                      >
                        <span className="truncate">{cat}</span>
                        <span
                          className={`text-[9.5px] px-1.5 py-0.5 rounded-full font-bold ml-1 shrink-0 ${
                            isSelected
                              ? 'bg-[var(--admin-accent)] text-white'
                              : 'bg-[var(--admin-surface-muted)] text-[var(--admin-text-tertiary)]'
                          }`}
                        >
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </AdminFilterDrawer>
          </div>

          {/* 3. Action Buttons: Settings & Add Item */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              type="button"
              onClick={handleOpenSettingsModal}
              className="h-[42px] min-h-[42px] max-h-[42px] px-2.5 sm:px-3 rounded-[4px] bg-[var(--admin-surface-muted)] hover:bg-[var(--admin-border-subtle)] text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)] border border-[var(--admin-border)] font-semibold text-[12.5px] sm:text-[13px] flex items-center justify-center cursor-pointer transition-all active:scale-95 gap-1.5 shrink-0 shadow-2xs"
              title="Gallery Settings"
            >
              <span className="material-symbols-outlined text-[17px]">settings</span>
              <span className="hidden md:inline">Settings</span>
              <span className="text-[10px]">▾</span>
            </button>
            <button
              type="button"
              onClick={() => navigate('/admin/gallery/add')}
              className="h-[42px] min-h-[42px] max-h-[42px] px-3 sm:px-4 rounded-[4px] bg-[var(--admin-accent)] hover:opacity-95 text-white text-[12.5px] sm:text-[13px] font-bold inline-flex items-center gap-1.5 shadow-xs cursor-pointer transition-all active:scale-95 shrink-0 whitespace-nowrap"
              title="Add New Gallery Item"
            >
              <span className="material-symbols-outlined text-[18px]">add_photo_alternate</span>
              <span>Add Item</span>
            </button>
          </div>
        </motion.div>

        {/* Unified Active Filter Chips Row */}
        <AdminActiveFilterChips
          activeChips={activeChips}
          onClearAll={resetAllFilters}
          totalMatches={filtered.length}
          totalItems={items.length}
          itemName="gallery items"
        />
      </div>

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
      {!isLoading &&
        filtered.length === 0 &&
        (items.length > 0 ? (
          <AdminFilterEmptyState
            title="No Items Found"
            message="No gallery items match your current filters or search."
            onReset={resetAllFilters}
          />
        ) : (
          <EmptyState
            icon="photo_library"
            title="Gallery is Empty"
            description="Start curating your storefront inspiration gallery."
          />
        ))}

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

      {/* ─── Gallery Settings Modal ─── */}
      <AnimatePresence>
        {showSettingsModal && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSettingsModal(false)}
              className="absolute inset-0 bg-[var(--admin-surface-overlay)] backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-md admin-card shadow-[var(--admin-shadow-2xl)] p-6 z-10"
            >
              <div className="flex justify-between items-center border-b border-[var(--admin-border-subtle)] pb-4 mb-6">
                <div>
                  <h3 className="text-[16px] font-bold text-[var(--admin-text-primary)] tracking-tight">
                    Gallery Settings
                  </h3>
                </div>
                <button
                  onClick={() => setShowSettingsModal(false)}
                  className="admin-btn admin-btn-icon w-8 h-8"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>

              <form onSubmit={handleSaveSettings} className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-[var(--admin-surface-muted)] rounded-xl border border-[var(--admin-border-subtle)]">
                  <div className="pr-4">
                    <p className="text-[13px] font-bold text-[var(--admin-text-primary)]">
                      Show Gallery on Storefront
                    </p>
                    <p className="text-[11px] text-[var(--admin-text-tertiary)] mt-1">
                      Allow customers to browse your Gallery and inspiration.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={!storefrontSettings.hideGallerySection}
                      onChange={(e) =>
                        setStorefrontSettings({
                          ...storefrontSettings,
                          hideGallerySection: !e.target.checked,
                        })
                      }
                    />
                    <div className="w-11 h-6 bg-[var(--admin-border-strong)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--admin-accent)]"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-4 bg-[var(--admin-surface-muted)] rounded-xl border border-[var(--admin-border-subtle)]">
                  <div className="pr-4">
                    <p className="text-[13px] font-bold text-[var(--admin-text-primary)]">
                      Show Products in Gallery
                    </p>
                    <p className="text-[11px] text-[var(--admin-text-tertiary)] mt-1">
                      Display linked products in Gallery items.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={!storefrontSettings.hideProductsFromGallery}
                      onChange={(e) =>
                        setStorefrontSettings({
                          ...storefrontSettings,
                          hideProductsFromGallery: !e.target.checked,
                        })
                      }
                    />
                    <div className="w-11 h-6 bg-[var(--admin-border-strong)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--admin-accent)]"></div>
                  </label>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-[var(--admin-border-subtle)]">
                  <button
                    type="button"
                    disabled={isSavingSettings}
                    onClick={() => setShowSettingsModal(false)}
                    className="admin-btn admin-btn-ghost"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingSettings}
                    className="admin-btn admin-btn-primary flex items-center gap-1.5"
                  >
                    {isSavingSettings ? (
                      <>
                        <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      'Save Changes'
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
