import { m as motion, AnimatePresence } from 'framer-motion';
import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AdminEventsShowcasesTabSkeleton,
  fadeUp,
  stagger,
  formatCurrency,
  StatusBadge,
  EmptyState,
  AdminToggle,
  AdminFilterDrawer,
} from '../../../components/AdminUIKit';
import { handleImageError } from '../../../../utils/media/imageUtils';
import { useConfirm } from '../../../../context/ConfirmProvider';

export function ShowcasesTab({
  showcases = [],
  loadingShowcases,
  handleDeleteShowcase,
  toggleShowcaseFeatured,
  toggleShowcaseActive,
}) {
  const navigate = useNavigate();
  const confirm = useConfirm();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All'); // 'All' | 'Active' | 'Hidden'
  const [sortBy, setSortBy] = useState('newest');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'table'
  const [selectedShowcases, setSelectedShowcases] = useState([]);
  const [showFiltersMenu, setShowFiltersMenu] = useState(false);
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < 640 : false,
  );

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const formatCategoryName = (category) => {
    if (!category) return 'Tambulam & Gift';
    return category
      .toString()
      .replace(/[-_]+/g, ' ')
      .trim()
      .replace(/\b\w/g, (char) => char.toUpperCase());
  };

  const categories = useMemo(() => {
    const cats = new Set();
    showcases.forEach((sc) => {
      if (sc.category) cats.add(sc.category);
    });
    return ['All', ...Array.from(cats)];
  }, [showcases]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (selectedCategory !== 'All') count++;
    if (statusFilter !== 'All') count++;
    if (sortBy !== 'newest') count++;
    return count;
  }, [selectedCategory, statusFilter, sortBy]);

  const filteredShowcases = useMemo(() => {
    let result = showcases.filter((sc) => {
      const matchesCategory = selectedCategory === 'All' || sc.category === selectedCategory;
      const matchesStatus =
        statusFilter === 'All' ||
        (statusFilter === 'Active' && sc.isActive !== false) ||
        (statusFilter === 'Hidden' && sc.isActive === false);

      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        sc.title?.toLowerCase().includes(q) ||
        sc.description?.toLowerCase().includes(q) ||
        sc.category?.toLowerCase().includes(q) ||
        formatCategoryName(sc.category).toLowerCase().includes(q);

      return matchesCategory && matchesStatus && matchesSearch;
    });

    return result.sort((a, b) => {
      if (sortBy === 'price-asc') return (a.rentalPrice || 0) - (b.rentalPrice || 0);
      if (sortBy === 'price-desc') return (b.rentalPrice || 0) - (a.rentalPrice || 0);
      if (sortBy === 'title-asc') return (a.title || '').localeCompare(b.title || '');
      return 0; // newest / default order
    });
  }, [showcases, selectedCategory, statusFilter, searchQuery, sortBy]);

  const toggleSelect = (id) => {
    setSelectedShowcases((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const toggleSelectAll = () => {
    setSelectedShowcases((prev) =>
      prev.length === filteredShowcases.length
        ? []
        : filteredShowcases.map((sc) => sc._id || sc.id),
    );
  };

  const handleBulkDeactivate = async () => {
    if (
      await confirm({
        title: 'Bulk Deactivate',
        message: `Are you sure you want to deactivate ${selectedShowcases.length} selected showcases?`,
        type: 'warning',
      })
    ) {
      for (const id of selectedShowcases) {
        const item = showcases.find((sc) => (sc._id || sc.id) === id);
        if (item && item.isActive !== false) {
          await toggleShowcaseActive(id, true);
        }
      }
      setSelectedShowcases([]);
    }
  };

  const handleBulkDelete = async () => {
    if (
      await confirm({
        title: 'Bulk Delete',
        message: `Are you sure you want to delete ${selectedShowcases.length} selected showcases?`,
        type: 'danger',
      })
    ) {
      for (const id of selectedShowcases) {
        await handleDeleteShowcase(id);
      }
      setSelectedShowcases([]);
    }
  };

  return (
    <motion.div
      key="showcases"
      initial="hidden"
      animate="show"
      variants={fadeUp}
      className="space-y-6"
    >
      {/* Search & Actions Bar: Sticky below top navbar matching Orders page style */}
      <div className="sticky top-[var(--admin-topbar-height,56px)] z-20 -my-2 py-2.5 bg-[var(--admin-bg)]/95 backdrop-blur-md mb-5">
        <div className="relative w-full">
          <motion.div variants={fadeUp} className="flex flex-row items-center gap-2 w-full">
            {/* Search Bar - Height exactly matches Actions (42px) */}
            <div className="relative flex-1 min-w-0 bg-[var(--admin-surface-muted)] rounded-[4px] border border-[var(--admin-border)] flex items-center px-2.5 sm:px-3 h-[42px] min-h-[42px] max-h-[42px]">
              <span className="material-symbols-outlined text-[18px] text-[var(--admin-text-tertiary)] shrink-0">
                search
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by title or category..."
                className="bg-transparent border-none outline-none w-full text-[13px] text-[var(--admin-text-primary)] placeholder-[var(--admin-text-tertiary)] font-medium px-2 h-full min-w-0"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="text-[var(--admin-text-tertiary)] hover:text-[var(--admin-text-primary)] cursor-pointer p-1 flex items-center justify-center"
                >
                  <span className="material-symbols-outlined text-[16px]">close</span>
                </button>
              )}
            </div>

            {/* Action Controls Group */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              {/* Filters Button & Popover */}
              <div className="relative shrink-0">
                <button
                  type="button"
                  onClick={() => setShowFiltersMenu(!showFiltersMenu)}
                  className={`h-[42px] min-h-[42px] max-h-[42px] px-2.5 sm:px-3.5 flex items-center justify-center gap-1.5 rounded-[4px] border transition-colors shrink-0 cursor-pointer ${
                    showFiltersMenu || activeFiltersCount > 0
                      ? 'bg-[var(--admin-accent)] text-white border-transparent shadow-xs'
                      : 'bg-[var(--admin-surface-muted)] text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)] border-[var(--admin-border)] hover:border-[var(--admin-border-strong)]'
                  }`}
                  title="Showcase Filters"
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
                  title="Showcase Filters"
                  icon="filter_list"
                  activeCount={activeFiltersCount}
                  onClearAll={() => {
                    setSelectedCategory('All');
                    setStatusFilter('All');
                    setSortBy('newest');
                  }}
                  clearAllLabel="Clear All"
                  onApply={() => setShowFiltersMenu(false)}
                >
                  {/* Category Filter */}
                  <div>
                    <label className="text-[10px] font-bold text-[var(--admin-text-tertiary)] uppercase tracking-wider mb-1.5 block">
                      Category
                    </label>
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="w-full bg-[var(--admin-bg)] border border-[var(--admin-border)] rounded-[4px] px-3 py-2 text-[12px] font-medium outline-none text-[var(--admin-text-primary)] cursor-pointer"
                    >
                      <option value="All">All Categories</option>
                      {categories
                        .filter((c) => c !== 'All')
                        .map((c) => (
                          <option key={c} value={c}>
                            {formatCategoryName(c)}
                          </option>
                        ))}
                    </select>
                  </div>

                  {/* Status Filter */}
                  <div>
                    <label className="text-[10px] font-bold text-[var(--admin-text-tertiary)] uppercase tracking-wider mb-1.5 block">
                      Status
                    </label>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="w-full bg-[var(--admin-bg)] border border-[var(--admin-border)] rounded-[4px] px-3 py-2 text-[12px] font-medium outline-none text-[var(--admin-text-primary)] cursor-pointer"
                    >
                      <option value="All">All Statuses</option>
                      <option value="Active">Active Only</option>
                      <option value="Hidden">Hidden Only</option>
                    </select>
                  </div>

                  {/* Sort By Filter */}
                  <div>
                    <label className="text-[10px] font-bold text-[var(--admin-text-tertiary)] uppercase tracking-wider mb-1.5 block">
                      Sort By
                    </label>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="w-full bg-[var(--admin-bg)] border border-[var(--admin-border)] rounded-[4px] px-3 py-2 text-[12px] font-medium outline-none text-[var(--admin-text-primary)] cursor-pointer"
                    >
                      <option value="newest">Newest Added</option>
                      <option value="price-asc">Price: Low to High</option>
                      <option value="price-desc">Price: High to Low</option>
                      <option value="title-asc">Title: A to Z</option>
                    </select>
                  </div>
                </AdminFilterDrawer>
              </div>

              {/* Quick Select All in Grid view (Desktop/tablet only) */}
              {viewMode === 'grid' && filteredShowcases.length > 0 && (
                <button
                  type="button"
                  onClick={toggleSelectAll}
                  className={`h-[42px] min-h-[42px] max-h-[42px] px-2.5 sm:px-3 rounded-[4px] border text-[12px] sm:text-[13px] font-semibold hidden md:flex items-center justify-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                    selectedShowcases.length > 0
                      ? 'bg-[var(--admin-accent)]/10 text-[var(--admin-accent)] border-[var(--admin-accent)]/40'
                      : 'bg-[var(--admin-surface-muted)] text-[var(--admin-text-secondary)] border-[var(--admin-border)] hover:text-[var(--admin-text-primary)]'
                  }`}
                  title={
                    selectedShowcases.length === filteredShowcases.length
                      ? 'Deselect All'
                      : 'Select All Showcases'
                  }
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {selectedShowcases.length === filteredShowcases.length &&
                    filteredShowcases.length > 0
                      ? 'check_box'
                      : selectedShowcases.length > 0
                        ? 'indeterminate_check_box'
                        : 'check_box_outline_blank'}
                  </span>
                  <span>
                    {selectedShowcases.length === filteredShowcases.length
                      ? 'Deselect All'
                      : 'Select All'}
                  </span>
                </button>
              )}

              {/* View Mode Switcher Box */}
              <div className="flex items-center gap-1 shrink-0 bg-[var(--admin-surface-muted)] rounded-[4px] border border-[var(--admin-border)] p-1 h-[42px] min-h-[42px] max-h-[42px] box-border">
                <button
                  type="button"
                  onClick={() => setViewMode('table')}
                  className={`h-[32px] w-[32px] min-h-[32px] min-w-[32px] max-h-[32px] max-w-[32px] rounded-[3px] box-border flex items-center justify-center transition-all cursor-pointer ${
                    viewMode === 'table'
                      ? 'bg-white dark:bg-stone-800 text-[var(--admin-accent)] shadow-xs font-bold'
                      : 'text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)]'
                  }`}
                  title="Table View"
                >
                  <span className="material-symbols-outlined text-[18px] leading-none">
                    view_list
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  className={`h-[32px] w-[32px] min-h-[32px] min-w-[32px] max-h-[32px] max-w-[32px] rounded-[3px] box-border flex items-center justify-center transition-all cursor-pointer ${
                    viewMode === 'grid'
                      ? 'bg-white dark:bg-stone-800 text-[var(--admin-accent)] shadow-xs font-bold'
                      : 'text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)]'
                  }`}
                  title="Cards / Grid View"
                >
                  <span className="material-symbols-outlined text-[18px] leading-none">
                    grid_view
                  </span>
                </button>
              </div>

              {/* Add Showcase Action Button */}
              <button
                type="button"
                onClick={() => navigate('/admin/showcases/add')}
                className="h-[42px] min-h-[42px] max-h-[42px] px-3 sm:px-3.5 bg-[var(--admin-accent)] hover:opacity-95 text-white rounded-[4px] flex items-center justify-center cursor-pointer transition-all active:scale-95 shadow-xs shrink-0 gap-1.5 font-semibold text-[13px]"
                title="Add Showcase"
              >
                <span className="material-symbols-outlined text-[18px]">add</span>
                <span className="hidden sm:inline">Add Showcase</span>
              </button>
            </div>
          </motion.div>

          {/* Dedicated Bulk Selection Bar - Overlaps entire searchbar in-place */}
          <AnimatePresence>
            {selectedShowcases.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -4, scale: 0.99 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4, scale: 0.99 }}
                transition={{ duration: 0.15 }}
                className="absolute inset-0 z-30 flex flex-row items-center justify-between gap-2 sm:gap-3 px-3 sm:px-4 bg-[var(--admin-surface)] border border-[var(--admin-border-strong)] rounded-[4px] shadow-sm h-[42px] min-h-[42px] max-h-[42px] box-border"
              >
                {/* Left: Checkbox & Count */}
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                  <input
                    type="checkbox"
                    checked={
                      selectedShowcases.length === filteredShowcases.length &&
                      filteredShowcases.length > 0
                    }
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded-[4px] border-[var(--admin-border-strong)] accent-[var(--admin-accent)] cursor-pointer shrink-0"
                    title={
                      selectedShowcases.length === filteredShowcases.length
                        ? 'Deselect all'
                        : 'Select all'
                    }
                  />
                  <span className="text-[12px] sm:text-[13px] font-bold text-[var(--admin-text-primary)] flex items-center gap-1 sm:gap-1.5 whitespace-nowrap">
                    <span className="inline-flex items-center justify-center min-w-[20px] h-[20px] px-1 rounded-full bg-[var(--admin-accent)]/15 text-[var(--admin-accent)] text-[11px] font-extrabold">
                      {selectedShowcases.length}
                    </span>
                    <span className="hidden xs:inline">selected</span>
                  </span>

                  {selectedShowcases.length < filteredShowcases.length ? (
                    <button
                      type="button"
                      onClick={toggleSelectAll}
                      className="text-[11px] sm:text-[12px] font-semibold text-[var(--admin-accent)] hover:underline cursor-pointer ml-0.5 sm:ml-1 truncate"
                    >
                      Select all {filteredShowcases.length}
                    </button>
                  ) : (
                    <span className="text-[10px] sm:text-[11px] font-medium text-[var(--admin-text-tertiary)] ml-0.5 sm:ml-1 hidden sm:inline">
                      (All {filteredShowcases.length})
                    </span>
                  )}
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-1 sm:gap-2 justify-end shrink-0">
                  <button
                    type="button"
                    onClick={handleBulkDeactivate}
                    className="h-7 sm:h-8 px-2 sm:px-2.5 rounded-[4px] bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800/60 hover:bg-amber-100 dark:hover:bg-amber-900/50 text-[11px] sm:text-[12px] font-bold flex items-center gap-1 sm:gap-1.5 transition-colors cursor-pointer shadow-xs"
                    title="Deactivate selected showcases"
                  >
                    <span className="material-symbols-outlined text-[15px] sm:text-[16px]">
                      block
                    </span>
                    <span className="hidden sm:inline">Deactivate</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleBulkDelete}
                    className="h-7 sm:h-8 px-2 sm:px-2.5 rounded-[4px] bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800/60 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-[11px] sm:text-[12px] font-bold flex items-center gap-1 sm:gap-1.5 transition-colors cursor-pointer shadow-xs"
                    title="Delete selected showcases"
                  >
                    <span className="material-symbols-outlined text-[15px] sm:text-[16px]">
                      delete
                    </span>
                    <span className="hidden sm:inline">Delete</span>
                  </button>

                  <div className="w-[1px] h-5 sm:h-6 bg-[var(--admin-border-subtle)] mx-0.5 sm:mx-1" />

                  <button
                    type="button"
                    onClick={() => setSelectedShowcases([])}
                    className="h-7 w-7 sm:h-8 sm:w-8 rounded-[4px] text-[var(--admin-text-tertiary)] hover:text-[var(--admin-text-primary)] hover:bg-[var(--admin-surface-hover)] flex items-center justify-center transition-colors cursor-pointer"
                    title="Clear Selection"
                  >
                    <span className="material-symbols-outlined text-[17px] sm:text-[18px]">
                      close
                    </span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Main View Area */}
      <AnimatePresence mode="wait">
        {loadingShowcases ? (
          <AdminEventsShowcasesTabSkeleton />
        ) : showcases.length === 0 ? (
          <EmptyState
            icon="redeem"
            title="No Tambulam or Gift Designs Yet"
            description="Showcase your gift arrangements, trousseau packing, and tambulam trays to clients."
            action={
              <button
                onClick={() => navigate('/admin/showcases/add')}
                className="admin-btn admin-btn-primary h-9 px-4 text-[12px]"
              >
                Add First Showcase
              </button>
            }
          />
        ) : filteredShowcases.length === 0 ? (
          <EmptyState
            icon="search_off"
            title="No Matching Showcases"
            description={`No showcases matched your current search and filter criteria.`}
            action={
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('All');
                  setStatusFilter('All');
                  setSortBy('newest');
                }}
                className="admin-btn admin-btn-outline h-9 px-4 text-[12px]"
              >
                Clear Filters
              </button>
            }
          />
        ) : viewMode === 'grid' ? (
          /* GRID VIEW (Matching Products Page Layout - strictly max 4 per row on laptop) */
          <motion.div
            key="grid"
            initial="hidden"
            animate="show"
            exit="hidden"
            variants={stagger}
            className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-4 gap-5"
          >
            {filteredShowcases.map((sc) => {
              const id = sc._id || sc.id;
              const isSelected = selectedShowcases.includes(id);

              return (
                <motion.div
                  key={id}
                  variants={fadeUp}
                  onClick={() => navigate(`/admin/showcases/edit/${id}`)}
                  className={`bg-[var(--admin-surface)] rounded-[var(--admin-radius-lg)] border overflow-hidden group cursor-pointer hover:border-[var(--admin-border-strong)] hover:shadow-[var(--admin-shadow-md)] transition-all duration-300 flex flex-col justify-between text-left h-full ${
                    isSelected
                      ? 'border-[var(--admin-accent)] ring-2 ring-[var(--admin-accent)]/20 shadow-sm'
                      : 'border-[var(--admin-border-subtle)]'
                  } ${sc.isActive === false ? 'opacity-75' : ''}`}
                >
                  {/* Clean Photo Container: NO BUTTONS AT ALL */}
                  <div className="relative aspect-[16/10] overflow-hidden bg-[var(--admin-bg-subtle)] shrink-0">
                    <img
                      onError={handleImageError}
                      src={sc.image}
                      alt={sc.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>

                  {/* Card Content (Clean, Spacious, No Description) */}
                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                      {/* Meta Top: Checkbox, Category, ID */}
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div
                          className="flex items-center gap-2 min-w-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelect(id)}
                            className="w-4 h-4 rounded-[4px] border-[var(--admin-border-strong)] accent-[var(--admin-accent)] cursor-pointer shrink-0"
                          />
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--admin-accent)] bg-[var(--admin-accent)]/10 px-2 py-0.5 rounded-[4px] truncate">
                            {formatCategoryName(sc.category)}
                          </span>
                        </div>
                        <span className="text-[10px] text-[var(--admin-text-tertiary)] font-mono shrink-0">
                          #{(id || '').slice(-6)}
                        </span>
                      </div>

                      {/* Title */}
                      <h4 className="text-[14px] font-bold text-[var(--admin-text-primary)] group-hover:text-[var(--admin-accent)] transition-colors line-clamp-1 leading-snug">
                        {sc.title}
                      </h4>
                    </div>

                    {/* Price and Active Toggle Row */}
                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-[var(--admin-border-subtle)]">
                      <div>
                        <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--admin-text-tertiary)] block">
                          Rental Price
                        </span>
                        <span className="text-[16px] font-black text-[var(--admin-text-primary)]">
                          {formatCurrency(sc.rentalPrice || 0)}
                        </span>
                      </div>

                      <div
                        className="flex items-center gap-2 bg-[var(--admin-surface-muted)]/80 px-2.5 py-1 rounded-[4px] border border-[var(--admin-border-subtle)]"
                        onClick={(e) => e.stopPropagation()}
                        title={
                          sc.isActive !== false
                            ? 'Active (Click to deactivate)'
                            : 'Hidden (Click to activate)'
                        }
                      >
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider ${
                            sc.isActive !== false
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-[var(--admin-text-tertiary)]'
                          }`}
                        >
                          {sc.isActive !== false ? 'Active' : 'Hidden'}
                        </span>
                        <AdminToggle
                          size="sm"
                          checked={sc.isActive !== false}
                          onChange={() => toggleShowcaseActive(id, sc.isActive !== false)}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Card Footer: Clean Action Bar */}
                  <div
                    className="px-4 py-2 bg-[var(--admin-surface-muted)]/50 border-t border-[var(--admin-border-subtle)] flex items-center justify-between"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div>
                      {sc.featured ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-[4px] border border-amber-500/20">
                          <span
                            className="material-symbols-outlined text-[13px]"
                            style={{ fontVariationSettings: "'FILL' 1" }}
                          >
                            star
                          </span>
                          Featured
                        </span>
                      ) : (
                        <span className="text-[11px] text-[var(--admin-text-tertiary)] font-medium">
                          Standard
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => toggleShowcaseFeatured(id, sc.featured)}
                        title={sc.featured ? 'Remove from Featured' : 'Mark as Featured'}
                        className={`w-8 h-8 rounded-[4px] flex items-center justify-center transition-all cursor-pointer ${
                          sc.featured
                            ? 'text-amber-500 bg-amber-500/10 hover:bg-amber-500/20'
                            : 'text-[var(--admin-text-tertiary)] hover:text-amber-500 hover:bg-black/5 dark:hover:bg-white/5'
                        }`}
                      >
                        <span
                          className="material-symbols-outlined text-[18px]"
                          style={{ fontVariationSettings: sc.featured ? "'FILL' 1" : "'FILL' 0" }}
                        >
                          star
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => navigate(`/admin/showcases/edit/${id}`)}
                        title="Edit Showcase"
                        className="w-8 h-8 rounded-[4px] flex items-center justify-center text-[var(--admin-text-tertiary)] hover:text-[var(--admin-accent)] hover:bg-black/5 dark:hover:bg-white/5 transition-all cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[18px]">edit</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteShowcase(id)}
                        title="Delete Showcase"
                        className="w-8 h-8 rounded-[4px] flex items-center justify-center text-[var(--admin-text-tertiary)] hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-all cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        ) : (
          /* TABLE VIEW (Matching Products Page Layout) */
          <motion.div
            key="table"
            initial="hidden"
            animate="show"
            exit="hidden"
            variants={fadeUp}
            className="admin-card p-0 overflow-hidden"
          >
            <div className="overflow-x-auto">
              <table className="admin-table w-full min-w-[700px]">
                <thead>
                  <tr>
                    <th className="w-12 text-center">
                      <input
                        type="checkbox"
                        checked={
                          selectedShowcases.length === filteredShowcases.length &&
                          filteredShowcases.length > 0
                        }
                        onChange={toggleSelectAll}
                        className="w-4 h-4 rounded-[4px] border-[var(--admin-border-strong)] accent-[var(--admin-accent)] cursor-pointer"
                      />
                    </th>
                    <th>Showcase</th>
                    <th>Category</th>
                    <th>Rental Price</th>
                    <th className="text-center">Status</th>
                    <th className="text-right pr-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredShowcases.map((sc) => {
                    const id = sc._id || sc.id;
                    const isSelected = selectedShowcases.includes(id);

                    return (
                      <tr
                        key={id}
                        className={`admin-table-row-clickable group ${isSelected ? 'bg-[var(--admin-surface-hover)]' : ''}`}
                        onClick={() => navigate(`/admin/showcases/edit/${id}`)}
                      >
                        <td className="text-center" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelect(id)}
                            className="w-4 h-4 rounded-[4px] border-[var(--admin-border-strong)] accent-[var(--admin-accent)] cursor-pointer"
                          />
                        </td>
                        <td>
                          <div className="flex items-center gap-3 pl-1">
                            <img
                              onError={handleImageError}
                              src={sc.image}
                              alt={sc.title}
                              className="w-10 h-10 rounded-[var(--admin-radius-md)] object-cover border border-[var(--admin-border-subtle)] shrink-0"
                            />
                            <div className="min-w-0 max-w-[280px]">
                              <p className="font-semibold text-[var(--admin-text-primary)] text-[13px] group-hover:text-[var(--admin-accent)] transition-colors truncate">
                                {sc.title}
                              </p>
                              <p className="text-[10px] text-[var(--admin-text-tertiary)] font-medium uppercase tracking-wider mt-0.5 truncate">
                                ID: {(id || '').slice(-8)}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="text-[12px] text-[var(--admin-text-secondary)] font-medium">
                            {formatCategoryName(sc.category)}
                          </span>
                        </td>
                        <td>
                          <span className="text-[13px] font-bold text-[var(--admin-text-primary)]">
                            {formatCurrency(sc.rentalPrice || 0)}
                          </span>
                        </td>
                        {/* Status Column with StatusBadge and AdminToggle */}
                        <td className="text-center" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-2">
                            <StatusBadge
                              status={sc.isActive !== false ? 'active' : 'inactive'}
                              className="cursor-pointer hover:opacity-80 transition-opacity"
                            />
                            <AdminToggle
                              size="sm"
                              checked={sc.isActive !== false}
                              onChange={() => toggleShowcaseActive(id, sc.isActive !== false)}
                            />
                          </div>
                        </td>
                        <td className="text-right pr-4" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => toggleShowcaseFeatured(id, sc.featured)}
                              title={sc.featured ? 'Remove from Featured' : 'Mark as Featured'}
                              className={`w-8 h-8 rounded-[var(--admin-radius-sm)] flex items-center justify-center transition-all ${
                                sc.featured
                                  ? 'text-[var(--admin-warning)]'
                                  : 'text-[var(--admin-text-tertiary)] hover:text-[var(--admin-text-primary)] hover:bg-[var(--admin-surface-muted)]'
                              }`}
                            >
                              <span
                                className="material-symbols-outlined text-[18px]"
                                style={{
                                  fontVariationSettings: sc.featured ? "'FILL' 1" : "'FILL' 0",
                                }}
                              >
                                star
                              </span>
                            </button>
                            <button
                              type="button"
                              onClick={() => navigate(`/admin/showcases/edit/${id}`)}
                              title="Edit Showcase"
                              className="w-8 h-8 rounded-[var(--admin-radius-sm)] text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)] hover:bg-[var(--admin-surface-muted)] flex items-center justify-center transition-colors"
                            >
                              <span className="material-symbols-outlined text-[16px]">edit</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteShowcase(id)}
                              title="Delete Showcase"
                              className="w-8 h-8 rounded-[var(--admin-radius-sm)] text-[var(--admin-text-secondary)] hover:text-[var(--admin-error)] hover:bg-[var(--admin-error-light)] flex items-center justify-center transition-colors"
                            >
                              <span className="material-symbols-outlined text-[16px]">delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
