import { m as motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { getErrorMessage } from '../../utils/core/errorHelpers';
import {
  PageHeader,
  AdminToggle,
  EmptyState,
  SkeletonTable,
  fadeUp,
  stagger,
  AdminFilterDrawer,
} from '../components/AdminUIKit';
import { useConfirm } from '../../context/ConfirmProvider';
import { CategoryModalDrawer } from '../components/categories/CategoryModalDrawer';
import { useAdminFilters } from '../components/filters/useAdminFilters';
import { categoryFilterConfig } from '../components/filters/configs/categoryFilterConfig';
import { AdminActiveFilterChips } from '../components/filters/AdminActiveFilterChips';

export function AdminCategories() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id: routeEditId } = useParams();

  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('name-asc');
  const [showFiltersMenu, setShowFiltersMenu] = useState(false);

  const {
    filteredItems: filteredCategoriesBeforeSort,
    filterState,
    setFilterValue,
    resetFilter,
    resetAllFilters,
    activeChips,
    activeCount,
    totalCount,
    matchCount,
  } = useAdminFilters(categories, categoryFilterConfig, searchQuery);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [isBulkDeactivating, setIsBulkDeactivating] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const confirm = useConfirm();

  const fetchCategories = async () => {
    try {
      const res = await api.get('/categories');
      if (res.data?.success) setCategories(res.data.data);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to load categories'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  // Sync route / query parameters to open drawer or modal without leaving page
  useEffect(() => {
    const isAdd =
      location.pathname.endsWith('/add') ||
      location.search.includes('action=add') ||
      location.search.includes('add=true');

    if (isAdd) {
      setEditingCategory(null);
      setIsCategoryModalOpen(true);
    } else if (routeEditId) {
      const cat = categories.find((c) => c._id === routeEditId);
      if (cat) {
        setEditingCategory(cat);
        setIsCategoryModalOpen(true);
      }
    }
  }, [location.pathname, location.search, routeEditId, categories]);

  const handleOpenAdd = () => {
    setEditingCategory(null);
    setIsCategoryModalOpen(true);
  };

  const handleOpenEdit = (cat) => {
    setEditingCategory(cat);
    setIsCategoryModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsCategoryModalOpen(false);
    setEditingCategory(null);
    if (
      location.pathname.includes('/categories/add') ||
      location.pathname.includes('/categories/edit/') ||
      location.search.includes('action=add') ||
      location.search.includes('add=true')
    ) {
      navigate('/admin/categories', { replace: true });
    }
  };

  const handleToggleActive = async (id, currentStatus) => {
    try {
      await api.put(`/categories/${id}`, { isActive: !currentStatus });
      toast.success('Category status updated');
      fetchCategories();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to update status'));
    }
  };

  const handleDelete = async (id) => {
    if (
      !(await confirm({
        title: 'Delete Category',
        message: 'Are you sure you want to permanently delete this category?',
        type: 'danger',
      }))
    )
      return;

    try {
      await api.delete(`/categories/${id}`);
      toast.success('Category deleted');
      setSelectedCategories((prev) => prev.filter((cId) => cId !== id));
      fetchCategories();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to delete category'));
    }
  };

  const toggleSelectAll = () => {
    setSelectedCategories((prev) =>
      prev.length === filteredCategories.length ? [] : filteredCategories.map((c) => c._id),
    );
  };

  const toggleSelect = (id) => {
    setSelectedCategories((prev) =>
      prev.includes(id) ? prev.filter((cId) => cId !== id) : [...prev, id],
    );
  };

  const handleBulkDelete = async () => {
    if (
      !(await confirm({
        title: 'Bulk Delete Categories',
        message: `Are you sure you want to permanently delete ${selectedCategories.length} categories?`,
        type: 'danger',
      }))
    )
      return;

    setIsBulkDeleting(true);
    try {
      await Promise.all(selectedCategories.map((id) => api.delete(`/categories/${id}`)));
      toast.success(`${selectedCategories.length} categories deleted`);
      setSelectedCategories([]);
      fetchCategories();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to delete some categories'));
      fetchCategories();
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const handleBulkDeactivate = async () => {
    if (
      !(await confirm({
        title: 'Bulk Deactivate Categories',
        message: `Are you sure you want to deactivate ${selectedCategories.length} categories?`,
        type: 'warning',
      }))
    )
      return;

    setIsBulkDeactivating(true);
    try {
      await Promise.all(
        selectedCategories.map((id) => api.put(`/categories/${id}`, { isActive: false })),
      );
      toast.success(`${selectedCategories.length} categories deactivated`);
      setSelectedCategories([]);
      fetchCategories();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to deactivate some categories'));
      fetchCategories();
    } finally {
      setIsBulkDeactivating(false);
    }
  };

  const activeFiltersCount = activeCount;

  // Two-stage pipeline: Sorting separated from filtering
  const filteredCategories = useMemo(() => {
    let result = [...filteredCategoriesBeforeSort];
    result.sort((a, b) => {
      if (sortBy === 'name-asc') return (a.name || '').localeCompare(b.name || '');
      if (sortBy === 'name-desc') return (b.name || '').localeCompare(a.name || '');
      if (sortBy === 'newest') return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      if (sortBy === 'oldest') return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
      return 0;
    });
    return result;
  }, [filteredCategoriesBeforeSort, sortBy]);

  const getScopeBadge = (type) => {
    switch (type) {
      case 'product':
        return {
          icon: 'inventory_2',
          label: 'Product',
          cls: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
        };
      case 'gallery':
        return {
          icon: 'photo_library',
          label: 'Gallery',
          cls: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
        };
      case 'event':
        return {
          icon: 'celebration',
          label: 'Event',
          cls: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
        };
      default:
        return {
          icon: 'category',
          label: type || 'Category',
          cls: 'bg-stone-500/10 text-stone-600 dark:text-stone-400 border-stone-500/20',
        };
    }
  };

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={stagger}
      className="space-y-4 sm:space-y-6 pb-28 sm:pb-8"
    >
      {/* Header: Title and Live Badges */}
      <PageHeader
        title="Manage Categories"
        subtitle={
          loading ? (
            <span>Loading categories...</span>
          ) : (
            <div className="flex flex-wrap items-center gap-1.5 text-[12.5px] sm:text-[13px]">
              <span className="font-semibold text-[var(--admin-text-primary)]">
                {categories.length} Total Categories
              </span>
              <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {categories.filter((c) => c.isActive !== false).length} Active
              </span>
              {categories.some((c) => c.isActive === false) && (
                <span className="inline-flex items-center gap-1 font-semibold text-amber-600 dark:text-amber-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  {categories.filter((c) => c.isActive === false).length} Inactive
                </span>
              )}
            </div>
          )
        }
      />

      {/* Sticky Search & Controls Bar */}
      <div className="sticky top-[var(--admin-topbar-height,56px)] z-20 -my-2 py-2.5 bg-[var(--admin-bg)]/95 backdrop-blur-md mb-3 sm:mb-5">
        <div className="relative w-full">
          <motion.div variants={fadeUp} className="flex flex-row items-center gap-2 w-full">
            {/* Search Bar */}
            <div className="relative flex-1 min-w-0 bg-[var(--admin-surface-muted)] rounded-[4px] border border-[var(--admin-border)] flex items-center px-2.5 sm:px-3 h-[42px] min-h-[42px] max-h-[42px]">
              <span className="material-symbols-outlined text-[18px] text-[var(--admin-text-tertiary)] shrink-0">
                search
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search categories..."
                className="bg-transparent border-none outline-none w-full text-[13px] text-[var(--admin-text-primary)] placeholder-[var(--admin-text-tertiary)] font-medium px-2 h-full min-w-0"
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

            {/* Desktop Scope Segmented Pill Switcher */}
            <div className="hidden sm:flex items-center gap-1 p-1 bg-[var(--admin-surface-muted)] rounded-[4px] border border-[var(--admin-border)] h-[42px] min-h-[42px] max-h-[42px] box-border">
              {['All', 'product', 'gallery', 'event'].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setFilterValue('type', t)}
                  className={`h-[32px] min-h-[32px] max-h-[32px] px-2.5 sm:px-3 rounded-[3px] text-[12px] font-semibold cursor-pointer transition-all capitalize whitespace-nowrap flex items-center justify-center box-border ${
                    (filterState.type || 'All') === t
                      ? 'bg-white dark:bg-stone-800 text-[var(--admin-accent)] shadow-xs font-bold'
                      : 'text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)]'
                  }`}
                >
                  {t === 'All' ? 'All' : t}
                </button>
              ))}
            </div>

            {/* Filters Button */}
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => setShowFiltersMenu(!showFiltersMenu)}
                className={`h-[42px] min-h-[42px] max-h-[42px] px-2.5 sm:px-3.5 flex items-center justify-center gap-1.5 rounded-[4px] border transition-colors shrink-0 cursor-pointer ${
                  showFiltersMenu || activeFiltersCount > 0
                    ? 'bg-[var(--admin-accent)] text-white border-transparent shadow-xs'
                    : 'bg-[var(--admin-surface-muted)] text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)] border-[var(--admin-border)] hover:border-[var(--admin-border-strong)]'
                }`}
                title="Filters"
              >
                <span className="material-symbols-outlined text-[18px]">tune</span>
                <span className="font-semibold text-[13px] hidden sm:inline">
                  {activeFiltersCount > 0 ? `${activeFiltersCount} Filters` : 'Filters'}
                </span>
                {activeFiltersCount > 0 && (
                  <span className="min-w-[16px] h-4 px-1 rounded-full bg-white text-[var(--admin-accent)] text-[10px] font-bold flex items-center justify-center">
                    {activeFiltersCount}
                  </span>
                )}
              </button>

              <AdminFilterDrawer
                isOpen={showFiltersMenu}
                onClose={() => setShowFiltersMenu(false)}
                title="Filter Categories"
                icon="tune"
                activeCount={activeFiltersCount}
                onClearAll={() => {
                  resetAllFilters();
                  setSortBy('name-asc');
                  setSearchQuery('');
                }}
                clearAllLabel="Reset"
                onApply={() => setShowFiltersMenu(false)}
              >
                {/* Type Scope */}
                <div className="block sm:hidden">
                  <label className="text-[11px] font-bold text-[var(--admin-text-tertiary)] uppercase tracking-wider mb-1.5 block">
                    Type Scope
                  </label>
                  <select
                    value={filterState.type}
                    onChange={(e) => setFilterValue('type', e.target.value)}
                    className="w-full bg-[var(--admin-bg)] border border-[var(--admin-border)] rounded-[4px] px-3 py-2 text-[12px] font-medium outline-none text-[var(--admin-text-primary)] cursor-pointer"
                  >
                    <option value="All">All Types</option>
                    <option value="product">Product</option>
                    <option value="gallery">Gallery</option>
                    <option value="event">Event</option>
                  </select>
                </div>

                {/* Status Filter */}
                <div>
                  <label className="text-[11px] font-bold text-[var(--admin-text-tertiary)] uppercase tracking-wider mb-1.5 block">
                    Status
                  </label>
                  <select
                    value={filterState.status}
                    onChange={(e) => setFilterValue('status', e.target.value)}
                    className="w-full bg-[var(--admin-bg)] border border-[var(--admin-border)] rounded-[4px] px-3 py-2 text-[12px] font-medium outline-none text-[var(--admin-text-primary)] cursor-pointer"
                  >
                    <option value="All">All Statuses</option>
                    <option value="active">Active Only</option>
                    <option value="inactive">Inactive Only</option>
                  </select>
                </div>

                {/* Products Count Coverage */}
                <div>
                  <label className="text-[11px] font-bold text-[var(--admin-text-tertiary)] uppercase tracking-wider mb-1.5 block">
                    Catalog Coverage
                  </label>
                  <select
                    value={filterState.inventoryCoverage}
                    onChange={(e) => setFilterValue('inventoryCoverage', e.target.value)}
                    className="w-full bg-[var(--admin-bg)] border border-[var(--admin-border)] rounded-[4px] px-3 py-2 text-[12px] font-medium outline-none text-[var(--admin-text-primary)] cursor-pointer"
                  >
                    <option value="All">All Categories</option>
                    <option value="has_products">Has Products (&gt;0)</option>
                    <option value="empty">Empty Categories (0 Products)</option>
                    <option value="heavy">High Volume (20+ Products)</option>
                  </select>
                </div>

                {/* Storefront Featured */}
                <div>
                  <label className="text-[11px] font-bold text-[var(--admin-text-tertiary)] uppercase tracking-wider mb-1.5 block">
                    Storefront Visibility
                  </label>
                  <select
                    value={filterState.featured}
                    onChange={(e) => setFilterValue('featured', e.target.value)}
                    className="w-full bg-[var(--admin-bg)] border border-[var(--admin-border)] rounded-[4px] px-3 py-2 text-[12px] font-medium outline-none text-[var(--admin-text-primary)] cursor-pointer"
                  >
                    <option value="All">All Visibility</option>
                    <option value="featured">Featured / Navbar Shown</option>
                    <option value="standard">Standard Catalog Only</option>
                  </select>
                </div>

                {/* Sort By */}
                <div>
                  <label className="text-[11px] font-bold text-[var(--admin-text-tertiary)] uppercase tracking-wider mb-1.5 block">
                    Sort By
                  </label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="w-full bg-[var(--admin-bg)] border border-[var(--admin-border)] rounded-[4px] px-3 py-2 text-[12px] font-medium outline-none text-[var(--admin-text-primary)] cursor-pointer"
                  >
                    <option value="name-asc">Name (A → Z)</option>
                    <option value="name-desc">Name (Z → A)</option>
                    <option value="newest">Newest First</option>
                    <option value="oldest">Oldest First</option>
                  </select>
                </div>
              </AdminFilterDrawer>
            </div>

            {/* Add Category Button */}
            <button
              type="button"
              onClick={handleOpenAdd}
              className="h-[42px] min-h-[42px] max-h-[42px] px-3 sm:px-3.5 bg-[var(--admin-accent)] hover:opacity-95 text-white rounded-[4px] flex items-center justify-center cursor-pointer transition-all active:scale-95 shadow-xs shrink-0 gap-1.5 font-semibold text-[13px]"
              title="Add Category"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              <span className="hidden sm:inline">Add Category</span>
            </button>
          </motion.div>

          {/* In-Place Overlapping Bulk Selection Bar */}
          <AnimatePresence>
            {selectedCategories.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -4, scale: 0.99 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4, scale: 0.99 }}
                transition={{ duration: 0.15 }}
                className="absolute inset-0 z-30 flex flex-row items-center justify-between gap-2 sm:gap-3 px-3 sm:px-4 bg-[var(--admin-surface)] border border-[var(--admin-border-strong)] rounded-[4px] shadow-sm h-[42px] min-h-[42px] max-h-[42px] box-border"
              >
                {/* Left: Checkbox & Count */}
                <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                  <input
                    type="checkbox"
                    checked={
                      selectedCategories.length === filteredCategories.length &&
                      filteredCategories.length > 0
                    }
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded-[3px] border-[var(--admin-border-strong)] accent-[var(--admin-accent)] cursor-pointer shrink-0"
                    title={
                      selectedCategories.length === filteredCategories.length
                        ? 'Deselect all'
                        : 'Select all'
                    }
                  />
                  <span className="text-[12.5px] font-bold text-[var(--admin-text-primary)] flex items-center gap-1.5 shrink-0">
                    <span className="inline-flex items-center justify-center min-w-[20px] h-[20px] px-1 rounded-full bg-[var(--admin-accent)]/15 text-[var(--admin-accent)] text-[11px] font-extrabold">
                      {selectedCategories.length}
                    </span>
                    <span>selected</span>
                  </span>

                  {selectedCategories.length < filteredCategories.length && (
                    <button
                      type="button"
                      onClick={toggleSelectAll}
                      className="text-[12px] font-semibold text-[var(--admin-accent)] hover:underline cursor-pointer truncate hidden md:inline"
                    >
                      Select all ({filteredCategories.length})
                    </button>
                  )}
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleBulkDeactivate}
                    disabled={isBulkDeactivating}
                    className="h-8 px-2.5 sm:px-3 rounded-[3px] bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800/60 hover:bg-amber-100 text-[11.5px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
                    title="Deactivate selected"
                  >
                    <span className="material-symbols-outlined text-[15px]">block</span>
                    <span className="hidden sm:inline">Deactivate</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleBulkDelete}
                    disabled={isBulkDeleting}
                    className="h-8 px-2.5 sm:px-3 rounded-[3px] bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800/60 hover:bg-rose-100 text-[11.5px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
                    title="Delete selected"
                  >
                    <span className="material-symbols-outlined text-[15px]">delete</span>
                    <span className="hidden sm:inline">Delete</span>
                  </button>

                  <div className="w-[1px] h-5 bg-[var(--admin-border-subtle)] mx-0.5" />

                  <button
                    type="button"
                    onClick={() => setSelectedCategories([])}
                    className="h-8 w-8 rounded-[3px] text-[var(--admin-text-tertiary)] hover:text-[var(--admin-text-primary)] hover:bg-[var(--admin-surface-muted)] flex items-center justify-center transition-colors cursor-pointer"
                    title="Clear Selection"
                  >
                    <span className="material-symbols-outlined text-[16px]">close</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Active Filter Chips Row */}
        <AdminActiveFilterChips
          activeChips={activeChips}
          totalCount={totalCount}
          matchCount={matchCount}
          onClearAll={() => {
            resetAllFilters();
            setSortBy('name-asc');
            setSearchQuery('');
          }}
          itemName="categories"
          className="mt-2 mb-1"
        />
      </div>

      {/* Main Content */}
      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div key="loading" variants={fadeUp}>
            <SkeletonTable rows={6} cols={6} />
          </motion.div>
        ) : filteredCategories.length === 0 ? (
          <motion.div
            key="empty"
            variants={fadeUp}
            className="admin-card py-16 flex justify-center"
          >
            <EmptyState
              icon={searchQuery || activeCount > 0 ? 'search_off' : 'category'}
              title={searchQuery || activeCount > 0 ? 'No Categories Found' : 'No Categories Yet'}
              description={
                searchQuery || activeCount > 0
                  ? 'No categories match the selected search or filter criteria.'
                  : 'Create your first category to organize products and content across the storefront.'
              }
              action={
                searchQuery || activeCount > 0 ? (
                  <button
                    onClick={() => {
                      resetAllFilters();
                      setSearchQuery('');
                      setSortBy('name-asc');
                    }}
                    className="admin-btn admin-btn-outline cursor-pointer"
                  >
                    Clear Filters
                  </button>
                ) : (
                  <button onClick={handleOpenAdd} className="admin-btn admin-btn-primary">
                    <span className="material-symbols-outlined text-[16px]">add</span>
                    Add Category
                  </button>
                )
              }
            />
          </motion.div>
        ) : (
          <motion.div key="content" variants={fadeUp} className="space-y-4">
            {/* Mobile Category Cards View (< md screens) */}
            <div className="md:hidden space-y-2.5">
              {filteredCategories.map((cat) => {
                const isSelected = selectedCategories.includes(cat._id);
                const scope = getScopeBadge(cat.type);

                return (
                  <div
                    key={cat._id}
                    className={`bg-[var(--admin-surface)] rounded-[4px] border p-3.5 shadow-xs transition-all flex flex-col gap-2.5 ${
                      isSelected
                        ? 'border-[var(--admin-accent)] ring-1 ring-[var(--admin-accent)]/30 bg-[var(--admin-accent)]/[0.02]'
                        : 'border-[var(--admin-border)] hover:border-[var(--admin-border-strong)]'
                    }`}
                  >
                    {/* Header: Checkbox + Icon + Name & Slug + Active Toggle */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2.5 min-w-0 flex-1">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(cat._id)}
                          className="w-4 h-4 mt-1 rounded-[3px] border-[var(--admin-border-strong)] accent-[var(--admin-accent)] cursor-pointer shrink-0"
                        />
                        <div
                          onClick={() => handleOpenEdit(cat)}
                          className="w-9 h-9 rounded-[4px] bg-[var(--admin-surface-muted)] border border-[var(--admin-border)] flex items-center justify-center text-[var(--admin-text-secondary)] shrink-0 cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[18px]">
                            {scope.icon}
                          </span>
                        </div>
                        <div
                          className="min-w-0 flex-1 cursor-pointer"
                          onClick={() => handleOpenEdit(cat)}
                        >
                          <h4 className="font-bold text-[14px] text-[var(--admin-text-primary)] hover:text-[var(--admin-accent)] transition-colors truncate leading-tight">
                            {cat.name}
                          </h4>
                          <span className="font-mono text-[11px] text-[var(--admin-text-tertiary)] block truncate mt-0.5">
                            /{cat.slug}
                          </span>
                        </div>
                      </div>

                      {/* Status Toggle on Right */}
                      <div
                        className="flex items-center gap-1.5 shrink-0 pt-0.5"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span
                          className={`text-[10.5px] font-bold ${
                            cat.isActive !== false
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-stone-400 dark:text-stone-500'
                          }`}
                        >
                          {cat.isActive !== false ? 'Active' : 'Inactive'}
                        </span>
                        <AdminToggle
                          size="sm"
                          checked={cat.isActive !== false}
                          onChange={() => handleToggleActive(cat._id, cat.isActive !== false)}
                        />
                      </div>
                    </div>

                    {/* Description if present */}
                    {cat.description && (
                      <p className="text-[11.5px] text-[var(--admin-text-secondary)] line-clamp-2 leading-relaxed pl-6.5">
                        {cat.description}
                      </p>
                    )}

                    {/* Footer: Scope Badge + Action Buttons */}
                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-[var(--admin-border-subtle)]">
                      <span
                        className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-[4px] border uppercase tracking-wider ${scope.cls}`}
                      >
                        <span className="material-symbols-outlined text-[12px] leading-none">
                          {scope.icon}
                        </span>
                        <span>{scope.label}</span>
                      </span>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(cat)}
                          className="h-7.5 px-2.5 rounded-[3px] bg-[var(--admin-surface-muted)] hover:bg-[var(--admin-surface)] border border-[var(--admin-border)] text-[var(--admin-text-primary)] text-[11.5px] font-bold flex items-center gap-1 transition-all active:scale-95 cursor-pointer shadow-2xs"
                        >
                          <span className="material-symbols-outlined text-[14px]">edit</span>
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(cat._id)}
                          className="h-7.5 w-7.5 rounded-[3px] bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20 flex items-center justify-center transition-all active:scale-95 cursor-pointer shadow-2xs"
                          title="Delete Category"
                        >
                          <span className="material-symbols-outlined text-[14px]">delete</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop Table View (>= md screens) */}
            <div className="hidden md:block admin-card p-0 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="admin-table w-full min-w-[700px]">
                  <thead>
                    <tr>
                      <th className="w-12 text-center pl-4">
                        <input
                          type="checkbox"
                          checked={
                            filteredCategories.length > 0 &&
                            selectedCategories.length === filteredCategories.length
                          }
                          onChange={toggleSelectAll}
                          className="w-4 h-4 rounded-[4px] border-[var(--admin-border-strong)] accent-[var(--admin-accent)] cursor-pointer"
                          title={
                            selectedCategories.length === filteredCategories.length
                              ? 'Deselect all'
                              : 'Select all'
                          }
                        />
                      </th>
                      <th>Category Name</th>
                      <th>Slug / URL Path</th>
                      <th className="text-center min-w-[130px]">Type Scope</th>
                      <th className="text-center min-w-[120px]">Status</th>
                      <th className="text-right pr-6 min-w-[100px]">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCategories.map((cat) => {
                      const isSelected = selectedCategories.includes(cat._id);
                      const scope = getScopeBadge(cat.type);

                      return (
                        <tr
                          key={cat._id}
                          className={`admin-table-row-clickable group transition-colors ${
                            isSelected ? 'bg-[var(--admin-accent)]/5' : ''
                          }`}
                          onClick={() => handleOpenEdit(cat)}
                        >
                          {/* Checkbox */}
                          <td
                            className="w-12 text-center pl-4"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelect(cat._id)}
                              className="w-4 h-4 rounded-[4px] border-[var(--admin-border-strong)] accent-[var(--admin-accent)] cursor-pointer"
                            />
                          </td>

                          {/* Name with Scope Icon */}
                          <td>
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-[4px] bg-[var(--admin-surface-muted)] border border-[var(--admin-border)] flex items-center justify-center text-[var(--admin-text-secondary)] shrink-0">
                                <span className="material-symbols-outlined text-[18px]">
                                  {scope.icon}
                                </span>
                              </div>
                              <div className="min-w-0">
                                <p className="font-bold text-[13px] text-[var(--admin-text-primary)] group-hover:text-[var(--admin-accent)] transition-colors truncate">
                                  {cat.name}
                                </p>
                                {cat.description && (
                                  <p className="text-[11px] text-[var(--admin-text-tertiary)] truncate max-w-[280px]">
                                    {cat.description}
                                  </p>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Slug */}
                          <td>
                            <span className="font-mono text-[11px] px-2 py-0.5 rounded-[3px] bg-[var(--admin-surface-muted)] border border-[var(--admin-border-subtle)] text-[var(--admin-text-secondary)]">
                              /{cat.slug}
                            </span>
                          </td>

                          {/* Type Scope */}
                          <td className="text-center">
                            <span
                              className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-[4px] border uppercase tracking-wider ${scope.cls}`}
                            >
                              <span className="material-symbols-outlined text-[13px] leading-none">
                                {scope.icon}
                              </span>
                              <span>{scope.label}</span>
                            </span>
                          </td>

                          {/* Status Toggle & Badge */}
                          <td className="text-center" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-center gap-2">
                              <span
                                className={`text-[11px] font-bold ${
                                  cat.isActive !== false
                                    ? 'text-emerald-600 dark:text-emerald-400'
                                    : 'text-stone-400 dark:text-stone-500'
                                }`}
                              >
                                {cat.isActive !== false ? 'Active' : 'Inactive'}
                              </span>
                              <AdminToggle
                                size="sm"
                                checked={cat.isActive !== false}
                                onChange={() => handleToggleActive(cat._id, cat.isActive !== false)}
                              />
                            </div>
                          </td>

                          {/* Actions */}
                          <td className="text-right pr-6" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleOpenEdit(cat)}
                                className="admin-btn-icon w-8 h-8 p-0 min-h-0 text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)]"
                                title="Edit Category"
                              >
                                <span className="material-symbols-outlined text-[16px]">edit</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDelete(cat._id)}
                                className="admin-btn-icon w-8 h-8 p-0 min-h-0 text-[var(--admin-text-secondary)] hover:text-rose-600 hover:bg-rose-500/10"
                                title="Delete Category"
                              >
                                <span className="material-symbols-outlined text-[16px]">
                                  delete
                                </span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <CategoryModalDrawer
        isOpen={isCategoryModalOpen}
        onClose={handleCloseModal}
        category={editingCategory}
        onSuccess={fetchCategories}
      />
    </motion.div>
  );
}

export default AdminCategories;
