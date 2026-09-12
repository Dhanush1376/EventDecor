import { m as motion, AnimatePresence } from 'framer-motion';
import { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdmin } from '../context/AdminContext';
import { useCategories } from '../../hooks/useProductQueries';
import { handleImageError } from '../../utils/media/imageUtils';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { getErrorMessage } from '../../utils/core/errorHelpers';
import {
  PageHeader,
  StatusBadge,
  EmptyState,
  SkeletonTable,
  AdminToggle,
  formatCurrency,
  fadeUp,
  stagger,
  AdminFilterDrawer,
} from '../components/AdminUIKit';
import { DeleteConfirmModal } from '../components/ui/DeleteConfirmModal';
import { PermanentDeleteModal } from '../components/ui/PermanentDeleteModal';
import { useConfirm } from '../../context/ConfirmProvider';
import { useScrollLock } from '../../hooks/useScrollLock';
import {
  useAdminFilters,
  AdminActiveFilterChips,
  AdminFilterSection,
  AdminRangeFilter,
  AdminFilterEmptyState,
} from '../components/filters';
import { productFilterConfig } from '../components/filters/configs';

export function AdminProducts() {
  const navigate = useNavigate();
  const {
    products,
    dataLoading,
    updateProductStock,
    searchQuery,
    setSearchQuery,
    websiteContent,
    updateContent,
    publishContent,
    softDeleteProduct,
    updateProductStatus,
    permanentlyDeleteProduct,
  } = useAdmin();
  const confirm = useConfirm();

  const { data: productCategories = [] } = useCategories();

  // States
  const [activeTab, setActiveTab] = useState('products'); // 'products', 'categories', 'inventory'
  const [sortBy, setSortBy] = useState('newest');
  const [viewMode, setViewMode] = useState('table');
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [showFiltersMenu, setShowFiltersMenu] = useState(false);
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < 640 : false,
  );

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useScrollLock(isMobile && showFiltersMenu);

  // Unified Filter Engine
  const {
    filteredItems: rawFilteredProducts,
    filterState,
    setFilterValue,
    resetFilter,
    resetAllFilters,
    activeChips,
    activeCount,
    totalCount,
    matchCount,
  } = useAdminFilters(products, productFilterConfig, searchQuery);

  // Separate sorting stage: Sorters determine order; filters determine membership
  const filteredProducts = useMemo(() => {
    const list = [...rawFilteredProducts];
    if (sortBy === 'price-asc') list.sort((a, b) => a.price - b.price);
    else if (sortBy === 'price-desc') list.sort((a, b) => b.price - a.price);
    else if (sortBy === 'stock-asc') list.sort((a, b) => a.stock - b.stock);
    else if (sortBy === 'stock-desc') list.sort((a, b) => b.stock - a.stock);
    else if (sortBy === 'name-asc') list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    return list;
  }, [rawFilteredProducts, sortBy]);

  const [deleteModal, setDeleteModal] = useState({ isOpen: false, type: 'soft', product: null });
  const [isDeleting, setIsDeleting] = useState(false);

  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [categoryTypeFilter, setCategoryTypeFilter] = useState('All');
  const [isBulkDeletingCategories, setIsBulkDeletingCategories] = useState(false);
  const [isBulkDeactivatingCategories, setIsBulkDeactivatingCategories] = useState(false);

  const formatCategoryName = (cat) => {
    if (!cat) return 'Category';
    return cat
      .toString()
      .replace(/[-_]+/g, ' ')
      .trim()
      .replace(/\b\w/g, (c) => c.toUpperCase());
  };

  // ─── Categories Logic ───
  const fetchCategories = useCallback(async () => {
    setCategoriesLoading(true);
    try {
      const res = await api.get('/categories');
      if (res.data?.success) setCategories(res.data.data);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to load categories'));
    } finally {
      setCategoriesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'categories' && categories.length === 0) {
      fetchCategories();
    }
  }, [activeTab, categories.length, fetchCategories]);

  const handleToggleCategoryActive = async (id, currentStatus) => {
    try {
      await api.put(`/categories/${id}`, { isActive: !currentStatus });
      toast.success('Category status updated');
      fetchCategories();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to update status'));
    }
  };

  const handleDeleteCategory = async (id) => {
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

  const toggleSelectAllCategories = () => {
    setSelectedCategories((prev) =>
      prev.length === categories.length ? [] : categories.map((c) => c._id),
    );
  };

  const toggleSelectCategory = (id) => {
    setSelectedCategories((prev) =>
      prev.includes(id) ? prev.filter((cId) => cId !== id) : [...prev, id],
    );
  };

  const handleBulkDeleteCategories = async () => {
    if (
      !(await confirm({
        title: 'Bulk Delete Categories',
        message: `Are you sure you want to permanently delete ${selectedCategories.length} categories?`,
        type: 'danger',
      }))
    )
      return;

    setIsBulkDeletingCategories(true);
    try {
      await Promise.all(selectedCategories.map((id) => api.delete(`/categories/${id}`)));
      toast.success(`${selectedCategories.length} categories deleted`);
      setSelectedCategories([]);
      fetchCategories();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to delete some categories'));
      fetchCategories();
    } finally {
      setIsBulkDeletingCategories(false);
    }
  };

  const handleBulkDeactivateCategories = async () => {
    if (
      !(await confirm({
        title: 'Bulk Deactivate Categories',
        message: `Are you sure you want to deactivate ${selectedCategories.length} categories?`,
        type: 'warning',
      }))
    )
      return;

    setIsBulkDeactivatingCategories(true);
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
      setIsBulkDeactivatingCategories(false);
    }
  };

  const filteredCategories = categories.filter(
    (c) => categoryTypeFilter === 'All' || c.type === categoryTypeFilter,
  );

  // ─── Products Helpers ───
  const getIsHeroProduct = (productId) => {
    return (websiteContent?.hero?.productIds || []).includes(productId);
  };

  const toggleHeroProduct = (productId) => {
    const currentHeroIds = websiteContent?.hero?.productIds || [];
    let newIds;
    if (currentHeroIds.includes(productId)) {
      newIds = currentHeroIds.filter((id) => id !== productId);
      toast.success('Removed from Hero Carousel');
    } else {
      newIds = [...currentHeroIds, productId];
      toast.success('Added to Hero Carousel');
    }
    const updatedHero = {
      ...(websiteContent?.hero || {}),
      productIds: newIds,
    };
    updateContent('hero', updatedHero);
    publishContent('hero', updatedHero);
  };

  const handleBulkDelete = async () => {
    if (
      await confirm({
        title: 'Bulk Delete',
        message: `Are you sure you want to move ${selectedProducts.length} products to the recycle bin?`,
        type: 'danger',
      })
    ) {
      for (const id of selectedProducts) {
        if (softDeleteProduct) await softDeleteProduct(id);
      }
      setSelectedProducts([]);
      toast.success(`${selectedProducts.length} products moved to recycle bin`);
    }
  };

  const handleBulkDeactivateProducts = async () => {
    if (
      await confirm({
        title: 'Bulk Deactivate',
        message: `Are you sure you want to deactivate ${selectedProducts.length} products?`,
        type: 'warning',
      })
    ) {
      for (const id of selectedProducts) {
        if (updateProductStatus) await updateProductStatus(id, 'inactive');
      }
      setSelectedProducts([]);
      toast.success(`${selectedProducts.length} products deactivated`);
    }
  };

  const openDeleteModal = (product, type = 'soft') => {
    setDeleteModal({ isOpen: true, type, product });
  };

  const closeDeleteModal = () => {
    if (!isDeleting) {
      setDeleteModal({ isOpen: false, type: 'soft', product: null });
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteModal.product) return;
    setIsDeleting(true);
    try {
      if (deleteModal.type === 'soft') {
        if (softDeleteProduct) await softDeleteProduct(deleteModal.product.id);
      } else {
        if (permanentlyDeleteProduct) await permanentlyDeleteProduct(deleteModal.product.id);
      }
      closeDeleteModal();
    } finally {
      setIsDeleting(false);
    }
  };

  const handleStockChange = (productId, newStock) => {
    const val = parseInt(newStock, 10);
    if (!isNaN(val) && val >= 0) {
      if (updateProductStock) {
        updateProductStock(productId, val);
      } else {
        toast.error('updateProductStock not implemented in useAdminProducts');
      }
    }
  };

  const toggleSelect = (id) =>
    setSelectedProducts((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id],
    );

  const toggleSelectAll = () =>
    setSelectedProducts((prev) =>
      prev.length === filteredProducts.length ? [] : filteredProducts.map((p) => p.id),
    );

  const statusLabels = {
    active: 'Active',
    low_stock: 'Low Stock',
    out_of_stock: 'Out of Stock',
    draft: 'Draft',
    inactive: 'Inactive',
  };

  return (
    <motion.div initial="hidden" animate="show" variants={stagger} className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Products"
        subtitle={
          <div className="flex flex-wrap items-center gap-1.5 text-[13px]">
            <span className="font-semibold text-[var(--admin-text-primary)]">
              {products.length} Total Products
            </span>
            <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              {products.filter((p) => p.status !== 'inactive' && p.status !== 'draft').length}{' '}
              Active
            </span>
            {products.filter((p) => (p.stock || 0) <= 5 && (p.stock || 0) > 0).length > 0 && (
              <span className="inline-flex items-center gap-1 font-semibold text-amber-600 dark:text-amber-400">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                {products.filter((p) => (p.stock || 0) <= 5 && (p.stock || 0) > 0).length} Low Stock
              </span>
            )}
            {products.filter((p) => (p.stock || 0) === 0).length > 0 && (
              <span className="inline-flex items-center gap-1 font-semibold text-rose-600 dark:text-rose-400">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                {products.filter((p) => (p.stock || 0) === 0).length} Out of Stock
              </span>
            )}
          </div>
        }
      />

      {/* Main Content Area */}
      {activeTab === 'categories' ? (
        /* Categories Tab */
        <motion.div variants={fadeUp}>
          {categoriesLoading ? (
            <SkeletonTable rows={4} cols={4} />
          ) : categories.length === 0 ? (
            <EmptyState
              icon="category"
              title="No Categories"
              description="Create your first category to organize products and content across the storefront."
              action={
                <button
                  onClick={() => navigate('/admin/categories/add')}
                  className="admin-btn admin-btn-primary admin-btn-sm"
                >
                  <span className="material-symbols-outlined text-[14px]">add</span>
                  Add Category
                </button>
              }
            />
          ) : (
            <div className="admin-card p-0 overflow-hidden">
              {/* Category Filters Header */}
              <div className="p-3 flex items-center justify-between gap-3 border-b border-[var(--admin-border-subtle)]">
                <div className="flex items-center gap-1 p-1 bg-[var(--admin-surface-muted)] rounded-[4px] border border-[var(--admin-border)] overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] min-w-0 box-border">
                  {['All', 'product', 'gallery', 'event'].map((t) => (
                    <button
                      key={t}
                      onClick={() => setCategoryTypeFilter(t)}
                      className={`px-2.5 py-1 rounded-[3px] text-[11px] font-bold cursor-pointer transition-all capitalize whitespace-nowrap shrink-0 box-border ${
                        categoryTypeFilter === t
                          ? 'bg-white dark:bg-stone-800 text-[var(--admin-accent)] shadow-xs font-bold'
                          : 'text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)]'
                      }`}
                    >
                      {t === 'All' ? 'All Types' : t}
                    </button>
                  ))}
                </div>
                <span className="text-[11px] text-[var(--admin-text-tertiary)] font-medium shrink-0 whitespace-nowrap">
                  {filteredCategories.length} categories
                </span>
              </div>

              {/* Bulk Actions Header for Categories */}
              <AnimatePresence>
                {selectedCategories.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden bg-[var(--admin-surface)] border-b border-[var(--admin-border-subtle)] rounded-t-[var(--admin-radius-lg)]"
                  >
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 px-4 py-2.5">
                      <div className="flex items-center gap-3">
                        <span className="text-[13px] font-bold text-[var(--admin-text-primary)] flex items-center gap-1.5">
                          <span className="inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5 rounded-full bg-[var(--admin-accent)]/15 text-[var(--admin-accent)] text-[12px] font-extrabold">
                            {selectedCategories.length}
                          </span>
                          <span>categor{selectedCategories.length > 1 ? 'ies' : 'y'} selected</span>
                        </span>
                      </div>

                      <div className="flex items-center gap-2 justify-end">
                        <button
                          onClick={handleBulkDeactivateCategories}
                          disabled={isBulkDeactivatingCategories}
                          className="h-8.5 px-3 rounded-[var(--admin-radius-sm)] bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800/60 hover:bg-amber-100 dark:hover:bg-amber-900/50 text-[12px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
                          title="Deactivate selected categories"
                        >
                          <span className="material-symbols-outlined text-[16px]">block</span>
                          <span>Deactivate</span>
                        </button>

                        <button
                          onClick={handleBulkDeleteCategories}
                          disabled={isBulkDeletingCategories}
                          className="h-8.5 px-3 rounded-[var(--admin-radius-sm)] bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800/60 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-[12px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
                          title="Delete selected categories"
                        >
                          <span className="material-symbols-outlined text-[16px]">delete</span>
                          <span>Delete</span>
                        </button>

                        <div className="w-[1px] h-6 bg-[var(--admin-border-subtle)] mx-1" />

                        <button
                          onClick={() => setSelectedCategories([])}
                          className="h-8.5 w-8.5 rounded-[var(--admin-radius-sm)] text-[var(--admin-text-tertiary)] hover:text-[var(--admin-text-primary)] hover:bg-[var(--admin-surface-hover)] flex items-center justify-center transition-colors cursor-pointer"
                          title="Clear Selection"
                        >
                          <span className="material-symbols-outlined text-[18px]">close</span>
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="overflow-x-auto">
                <table className="admin-table admin-table-clean-header w-full min-w-[700px]">
                  <thead className="!bg-transparent">
                    <tr className="!bg-transparent border-b border-[var(--admin-border-subtle)]">
                      <th className="pl-6 w-[40px]">
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            checked={
                              filteredCategories.length > 0 &&
                              selectedCategories.length === filteredCategories.length
                            }
                            onChange={toggleSelectAllCategories}
                            className="admin-checkbox"
                          />
                        </div>
                      </th>
                      <th>Category Name</th>
                      <th>Slug / URL Path</th>
                      <th>Type Scope</th>
                      <th>Status</th>
                      <th className="text-right pr-6">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCategories.map((cat) => (
                      <tr
                        key={cat._id}
                        className={`hover:bg-[var(--admin-surface-muted)] transition-colors ${
                          selectedCategories.includes(cat._id)
                            ? 'bg-[var(--admin-surface-muted)]'
                            : ''
                        }`}
                      >
                        <td className="pl-6">
                          <div className="flex items-center">
                            <input
                              type="checkbox"
                              checked={selectedCategories.includes(cat._id)}
                              onChange={() => toggleSelectCategory(cat._id)}
                              className="admin-checkbox"
                            />
                          </div>
                        </td>
                        <td>
                          <span className="font-bold text-[var(--admin-text-primary)] text-[13px]">
                            {cat.name}
                          </span>
                        </td>
                        <td>
                          <span className="font-mono text-[11px] text-[var(--admin-text-secondary)]">
                            {cat.slug}
                          </span>
                        </td>
                        <td>
                          <span className="admin-badge admin-badge-neutral text-[9px] font-bold tracking-wider uppercase">
                            {cat.type}
                          </span>
                        </td>
                        <td>
                          <div onClick={(e) => e.stopPropagation()}>
                            <AdminToggle
                              checked={cat.isActive}
                              onChange={() => handleToggleCategoryActive(cat._id, cat.isActive)}
                            />
                          </div>
                        </td>
                        <td className="text-right pr-6">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => navigate(`/admin/categories/edit/${cat._id}`)}
                              className="admin-btn-icon w-8 h-8 p-0 min-h-0 text-[var(--admin-text-tertiary)] hover:text-[var(--admin-text-primary)]"
                              title="Edit Category"
                            >
                              <span className="material-symbols-outlined text-[16px]">edit</span>
                            </button>
                            <button
                              onClick={() => handleDeleteCategory(cat._id)}
                              className="admin-btn-icon w-8 h-8 p-0 min-h-0 text-[var(--admin-text-tertiary)] hover:text-[var(--admin-error)] hover:bg-[var(--admin-error-light)]"
                              title="Delete Category"
                            >
                              <span className="material-symbols-outlined text-[16px]">delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </motion.div>
      ) : (
        /* Products & Inventory Tabs */
        <>
          {/* Search & Actions Bar: Sticky below top navbar matching Showcase / Orders style */}
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
                    value={searchQuery || ''}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by title, SKU, or category..."
                    className="bg-transparent border-none outline-none w-full text-[13px] text-[var(--admin-text-primary)] placeholder-[var(--admin-text-tertiary)] font-medium px-2 h-full min-w-0"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="text-[var(--admin-text-tertiary)] hover:text-[var(--admin-text-primary)] cursor-pointer p-1 flex items-center justify-center shrink-0"
                    >
                      <span className="material-symbols-outlined text-[16px]">close</span>
                    </button>
                  )}
                </div>

                {/* Action Controls Group */}
                <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                  {/* Filters Button & Popover */}
                  {activeTab === 'products' && (
                    <div className="relative shrink-0">
                      <button
                        type="button"
                        onClick={() => setShowFiltersMenu(!showFiltersMenu)}
                        className={`h-[42px] min-h-[42px] max-h-[42px] px-2.5 sm:px-3.5 flex items-center justify-center gap-1.5 rounded-[4px] border transition-colors shrink-0 cursor-pointer ${
                          showFiltersMenu || activeCount > 0
                            ? 'bg-[var(--admin-accent)] text-white border-transparent shadow-xs'
                            : 'bg-[var(--admin-surface-muted)] text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)] border-[var(--admin-border)] hover:border-[var(--admin-border-strong)]'
                        }`}
                        title="Product Filters"
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
                        title="Product Filters"
                        icon="tune"
                        activeCount={activeCount}
                        onClearAll={resetAllFilters}
                        clearAllLabel="Clear All"
                        onApply={() => setShowFiltersMenu(false)}
                      >
                        {/* Category Filter */}
                        <AdminFilterSection
                          title="Category"
                          active={filterState.category !== 'All'}
                        >
                          <select
                            value={filterState.category}
                            onChange={(e) => setFilterValue('category', e.target.value)}
                            className="w-full bg-[var(--admin-bg)] border border-[var(--admin-border)] rounded-[4px] px-3 py-2 text-[12px] font-medium outline-none text-[var(--admin-text-primary)] cursor-pointer"
                          >
                            <option value="All">All Categories</option>
                            {productCategories.map((c) => (
                              <option key={c} value={c}>
                                {formatCategoryName(c)}
                              </option>
                            ))}
                          </select>
                        </AdminFilterSection>

                        {/* Status Filter */}
                        <AdminFilterSection
                          title="Lifecycle Status"
                          active={filterState.status !== 'All'}
                        >
                          <select
                            value={filterState.status}
                            onChange={(e) => setFilterValue('status', e.target.value)}
                            className="w-full bg-[var(--admin-bg)] border border-[var(--admin-border)] rounded-[4px] px-3 py-2 text-[12px] font-medium outline-none text-[var(--admin-text-primary)] cursor-pointer"
                          >
                            <option value="All">All Statuses</option>
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                            <option value="draft">Draft</option>
                          </select>
                        </AdminFilterSection>

                        {/* Canonical Stock Health Status */}
                        <AdminFilterSection
                          title="Stock Health"
                          active={filterState.stockStatus !== 'all'}
                        >
                          <select
                            value={filterState.stockStatus}
                            onChange={(e) => setFilterValue('stockStatus', e.target.value)}
                            className="w-full bg-[var(--admin-bg)] border border-[var(--admin-border)] rounded-[4px] px-3 py-2 text-[12px] font-medium outline-none text-[var(--admin-text-primary)] cursor-pointer"
                          >
                            <option value="all">All Inventory Levels</option>
                            <option value="in_stock">In Stock (&gt;15 units)</option>
                            <option value="low_warning">Low Warning (6–15 units)</option>
                            <option value="critical_low">Critical Low (1–5 units)</option>
                            <option value="out_of_stock">Out of Stock (0 units)</option>
                          </select>
                        </AdminFilterSection>

                        {/* Stock Quantity Exact Range */}
                        <AdminFilterSection
                          title="Stock Quantity Units"
                          active={
                            filterState.stockRange?.min !== '' || filterState.stockRange?.max !== ''
                          }
                        >
                          <AdminRangeFilter
                            value={filterState.stockRange}
                            onChange={(val) => setFilterValue('stockRange', val)}
                            minPlaceholder="Min units"
                            maxPlaceholder="Max units"
                          />
                        </AdminFilterSection>

                        {/* Price Range Filter */}
                        <AdminFilterSection
                          title="Price Range (₹)"
                          active={
                            filterState.priceRange?.min !== '' || filterState.priceRange?.max !== ''
                          }
                        >
                          <AdminRangeFilter
                            value={filterState.priceRange}
                            onChange={(val) => setFilterValue('priceRange', val)}
                            prefix="₹"
                            minPlaceholder="Min ₹"
                            maxPlaceholder="Max ₹"
                            step="50"
                          />
                        </AdminFilterSection>

                        {/* Media Hygiene Audit */}
                        <AdminFilterSection
                          title="Catalog Photos"
                          active={filterState.media !== 'all'}
                        >
                          <select
                            value={filterState.media}
                            onChange={(e) => setFilterValue('media', e.target.value)}
                            className="w-full bg-[var(--admin-bg)] border border-[var(--admin-border)] rounded-[4px] px-3 py-2 text-[12px] font-medium outline-none text-[var(--admin-text-primary)] cursor-pointer"
                          >
                            <option value="all">All (With & Without Photos)</option>
                            <option value="missing_images">Missing Photos (Needs Upload)</option>
                            <option value="has_images">Has Photos</option>
                          </select>
                        </AdminFilterSection>

                        {/* Product Rental Availability Filter */}
                        <AdminFilterSection
                          title="Rental Option"
                          active={filterState.type !== 'All'}
                        >
                          <select
                            value={filterState.type}
                            onChange={(e) => setFilterValue('type', e.target.value)}
                            className="w-full bg-[var(--admin-bg)] border border-[var(--admin-border)] rounded-[4px] px-3 py-2 text-[12px] font-medium outline-none text-[var(--admin-text-primary)] cursor-pointer"
                          >
                            <option value="All">All Products</option>
                            <option value="rental">Rental Available</option>
                            <option value="sale_only">Sale Only (Non-Rental)</option>
                          </select>
                        </AdminFilterSection>

                        {/* Sort Order */}
                        <AdminFilterSection title="Sort Order">
                          <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            className="w-full bg-[var(--admin-bg)] border border-[var(--admin-border)] rounded-[4px] px-3 py-2 text-[12px] font-medium outline-none text-[var(--admin-text-primary)] cursor-pointer"
                          >
                            <option value="newest">Newest Added</option>
                            <option value="price-asc">Price: Low to High</option>
                            <option value="price-desc">Price: High to Low</option>
                            <option value="stock-asc">Stock: Low to High</option>
                            <option value="stock-desc">Stock: High to Low</option>
                            <option value="name-asc">Name: A to Z</option>
                          </select>
                        </AdminFilterSection>
                      </AdminFilterDrawer>
                    </div>
                  )}

                  {/* Quick Select All in Grid view */}
                  {viewMode === 'grid' && filteredProducts.length > 0 && (
                    <button
                      type="button"
                      onClick={toggleSelectAll}
                      className={`h-[42px] min-h-[42px] max-h-[42px] px-2.5 sm:px-3 rounded-[4px] border text-[12px] sm:text-[13px] font-semibold hidden md:flex items-center justify-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                        selectedProducts.length > 0
                          ? 'bg-[var(--admin-accent)]/10 text-[var(--admin-accent)] border-[var(--admin-accent)]/40'
                          : 'bg-[var(--admin-surface-muted)] text-[var(--admin-text-secondary)] border-[var(--admin-border)] hover:text-[var(--admin-text-primary)]'
                      }`}
                      title={
                        selectedProducts.length === filteredProducts.length
                          ? 'Deselect All'
                          : 'Select All Products'
                      }
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        {selectedProducts.length === filteredProducts.length &&
                        filteredProducts.length > 0
                          ? 'check_box'
                          : selectedProducts.length > 0
                            ? 'indeterminate_check_box'
                            : 'check_box_outline_blank'}
                      </span>
                      <span>
                        {selectedProducts.length === filteredProducts.length
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

                  {/* Add Product Button */}
                  <button
                    type="button"
                    onClick={() => navigate('/admin/products/add')}
                    className="h-[42px] min-h-[42px] max-h-[42px] px-3 sm:px-3.5 bg-[var(--admin-accent)] hover:opacity-95 text-white rounded-[4px] flex items-center justify-center cursor-pointer transition-all active:scale-95 shadow-xs shrink-0 gap-1.5 font-semibold text-[13px]"
                    title="Add Product"
                  >
                    <span className="material-symbols-outlined text-[18px]">add</span>
                    <span className="hidden sm:inline">Add Product</span>
                  </button>
                </div>
              </motion.div>

              {/* Overlapping In-Place Bulk Selection Bar */}
              <AnimatePresence>
                {selectedProducts.length > 0 && (
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
                          selectedProducts.length === filteredProducts.length &&
                          filteredProducts.length > 0
                        }
                        onChange={toggleSelectAll}
                        className="w-4 h-4 rounded-[3px] border-[var(--admin-border-strong)] accent-[var(--admin-accent)] cursor-pointer shrink-0"
                        title={
                          selectedProducts.length === filteredProducts.length
                            ? 'Deselect all'
                            : 'Select all'
                        }
                      />
                      <span className="text-[12.5px] font-bold text-[var(--admin-text-primary)] flex items-center gap-1.5 shrink-0">
                        <span className="inline-flex items-center justify-center min-w-[20px] h-[20px] px-1 rounded-full bg-[var(--admin-accent)]/15 text-[var(--admin-accent)] text-[11px] font-extrabold">
                          {selectedProducts.length}
                        </span>
                        <span>selected</span>
                      </span>

                      {selectedProducts.length < filteredProducts.length && (
                        <button
                          type="button"
                          onClick={toggleSelectAll}
                          className="text-[12px] font-semibold text-[var(--admin-accent)] hover:underline cursor-pointer truncate hidden md:inline"
                        >
                          Select all {filteredProducts.length}
                        </button>
                      )}
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={handleBulkDeactivateProducts}
                        className="h-8 px-2.5 sm:px-3 rounded-[3px] bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800/60 hover:bg-amber-100 dark:hover:bg-amber-900/50 text-[12px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                        title="Deactivate selected products"
                      >
                        <span className="material-symbols-outlined text-[16px]">block</span>
                        <span className="hidden sm:inline">Deactivate</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleBulkDelete}
                        className="h-8 px-2.5 sm:px-3 rounded-[3px] bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800/60 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-[12px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                        title="Delete selected products"
                      >
                        <span className="material-symbols-outlined text-[16px]">delete</span>
                        <span className="hidden sm:inline">Delete</span>
                      </button>

                      <div className="w-[1px] h-5 bg-[var(--admin-border-subtle)] mx-0.5" />

                      <button
                        type="button"
                        onClick={() => setSelectedProducts([])}
                        className="h-8 w-8 rounded-[3px] text-[var(--admin-text-tertiary)] hover:text-[var(--admin-text-primary)] hover:bg-[var(--admin-surface-hover)] flex items-center justify-center transition-colors cursor-pointer"
                        title="Clear Selection"
                      >
                        <span className="material-symbols-outlined text-[18px]">close</span>
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Unified Active Filter Chips & Match Counter Bar */}
          <AdminActiveFilterChips
            activeChips={activeChips}
            totalCount={totalCount}
            matchCount={matchCount}
            onClearAll={resetAllFilters}
            itemName="products"
            className="mb-3 sm:mb-4"
          />

          <AnimatePresence mode="wait">
            {dataLoading ? (
              <motion.div
                key="loading"
                initial="hidden"
                animate="show"
                exit="hidden"
                variants={fadeUp}
              >
                {viewMode === 'table' ? (
                  <SkeletonTable rows={10} cols={8} />
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
                    {[...Array(8)].map((_, i) => (
                      <div
                        key={i}
                        className="admin-skeleton admin-card aspect-[16/15] rounded-[var(--admin-radius-lg)]"
                      />
                    ))}
                  </div>
                )}
              </motion.div>
            ) : filteredProducts.length === 0 ? (
              <motion.div
                key="empty"
                initial="hidden"
                animate="show"
                exit="hidden"
                variants={fadeUp}
                className="w-full"
              >
                {products.length > 0 ? (
                  <AdminFilterEmptyState
                    onReset={resetAllFilters}
                    title="No Matching Products"
                    description="No products match your active stock, price, category, or media filters. Clear your filters to view all products."
                  />
                ) : (
                  <div className="admin-card py-16 flex justify-center">
                    <EmptyState
                      icon="inventory_2"
                      title="No Products Yet"
                      description="Get started by adding your first product to the catalog."
                      action={
                        <button
                          onClick={() => navigate('/admin/products/add')}
                          className="admin-btn admin-btn-primary"
                        >
                          Add Product
                        </button>
                      }
                    />
                  </div>
                )}
              </motion.div>
            ) : viewMode === 'table' ? (
              <motion.div
                key="table"
                initial="hidden"
                animate="show"
                exit="hidden"
                variants={fadeUp}
                className="admin-card p-0 overflow-hidden"
              >
                <div className="overflow-x-auto">
                  <table className="admin-table w-full min-w-[500px] md:min-w-[700px] lg:min-w-[900px]">
                    <thead>
                      <tr>
                        <th className="w-12 text-center">
                          <input
                            type="checkbox"
                            checked={
                              selectedProducts.length === filteredProducts.length &&
                              filteredProducts.length > 0
                            }
                            onChange={toggleSelectAll}
                            className="w-4 h-4 rounded-[4px] border-[var(--admin-border-strong)] accent-[var(--admin-accent)] cursor-pointer"
                          />
                        </th>
                        <th>Product</th>
                        <th>Price</th>
                        <th>Category</th>
                        <th className="text-center min-w-[110px]">Status</th>
                        <th className="text-center min-w-[140px]">Stock Level</th>
                        <th className="text-center">Sold</th>
                        <th className="text-right pr-4">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredProducts.map((p) => (
                        <tr
                          key={p.id}
                          className="admin-table-row-clickable group"
                          onClick={() => {
                            navigate(`/admin/products/edit/${p.id}`);
                          }}
                        >
                          <td className="text-center" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={selectedProducts.includes(p.id)}
                              onChange={() => toggleSelect(p.id)}
                              className="w-4 h-4 rounded-[4px] border-[var(--admin-border-strong)] accent-[var(--admin-accent)] cursor-pointer"
                            />
                          </td>
                          <td>
                            <div className="flex items-center gap-2 pl-1">
                              <img
                                onError={handleImageError}
                                src={p.image}
                                alt={p.name}
                                className="w-9 h-9 rounded-[var(--admin-radius-md)] object-cover border border-[var(--admin-border-subtle)] shrink-0"
                              />
                              <div className="min-w-0 max-w-[130px] sm:max-w-[200px] md:max-w-[250px] lg:max-w-[300px]">
                                <p
                                  className="font-semibold text-[var(--admin-text-primary)] text-[12px] group-hover:text-[var(--admin-accent)] transition-colors truncate"
                                  title={p.name}
                                >
                                  {p.name}
                                </p>
                                <p className="text-[10px] text-[var(--admin-text-tertiary)] font-medium uppercase tracking-wider mt-0.5 truncate">
                                  ID: {p.id.substring(p.id.length - 8)}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="font-bold text-[var(--admin-text-primary)] text-[13px]">
                            {formatCurrency(p.price)}
                          </td>
                          <td className="text-[var(--admin-text-secondary)] font-medium text-[12px]">
                            {formatCategoryName(p.category)}
                          </td>
                          <td className="text-center" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-center gap-2">
                              <StatusBadge status={statusLabels[p.status] || p.status} />
                              <AdminToggle
                                size="sm"
                                checked={p.status !== 'inactive' && p.status !== 'draft'}
                                onChange={() => {
                                  const newStatus =
                                    p.status === 'inactive' || p.status === 'draft'
                                      ? 'active'
                                      : 'inactive';
                                  if (updateProductStatus) updateProductStatus(p.id, newStatus);
                                }}
                              />
                            </div>
                          </td>
                          <td className="text-center" onClick={(e) => e.stopPropagation()}>
                            <div className="inline-flex items-center gap-1 bg-[var(--admin-surface-muted)] border border-[var(--admin-border)] rounded-[4px] p-0.5 shadow-2xs hover:border-[var(--admin-border-strong)] transition-colors">
                              <button
                                type="button"
                                onClick={() =>
                                  handleStockChange(p.id, Math.max(0, (p.stock || 0) - 1))
                                }
                                className="w-6 h-6 rounded-[2px] flex items-center justify-center text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)] hover:bg-[var(--admin-surface)] transition-all cursor-pointer active:scale-95"
                                title="Decrease by 1"
                              >
                                <span className="material-symbols-outlined text-[14px]">
                                  remove
                                </span>
                              </button>
                              <input
                                type="number"
                                min="0"
                                defaultValue={p.stock ?? 0}
                                key={p.stock}
                                onBlur={(e) => {
                                  const val = parseInt(e.target.value, 10);
                                  if (!isNaN(val) && val !== p.stock) {
                                    handleStockChange(p.id, Math.max(0, val));
                                  }
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') e.target.blur();
                                }}
                                className="w-12 text-center text-[12px] font-bold text-[var(--admin-text-primary)] bg-transparent border-none outline-none p-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none cursor-text"
                                title="Click to edit stock level"
                              />
                              <button
                                type="button"
                                onClick={() => handleStockChange(p.id, (p.stock || 0) + 1)}
                                className="w-6 h-6 rounded-[2px] flex items-center justify-center text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)] hover:bg-[var(--admin-surface)] transition-all cursor-pointer active:scale-95"
                                title="Increase by 1"
                              >
                                <span className="material-symbols-outlined text-[14px]">add</span>
                              </button>
                            </div>
                            {p.stock <= 5 && (
                              <div className="mt-1">
                                {p.stock === 0 ? (
                                  <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded-[3px]">
                                    Out of stock
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded-[3px]">
                                    Low stock ({p.stock})
                                  </span>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="text-center font-bold text-[var(--admin-text-primary)] text-[12px]">
                            {p.soldCount || p.sold || 0}
                          </td>
                          <td className="text-right pr-4" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => toggleHeroProduct(p.id)}
                                className={`admin-btn-icon w-8 h-8 p-0 min-h-0 ${
                                  getIsHeroProduct(p.id)
                                    ? 'text-[var(--admin-warning)]'
                                    : 'text-[var(--admin-text-tertiary)] hover:text-[var(--admin-text-primary)]'
                                }`}
                                title={
                                  getIsHeroProduct(p.id)
                                    ? 'Remove from Showcase Hero'
                                    : 'Set as Showcase Hero'
                                }
                              >
                                <span className="material-symbols-outlined text-[18px]">
                                  {getIsHeroProduct(p.id) ? 'star' : 'star_border'}
                                </span>
                              </button>
                              <button
                                onClick={() => navigate(`/admin/products/edit/${p.id}`)}
                                className="admin-btn-icon w-8 h-8 p-0 min-h-0 text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)]"
                                title="Edit Product"
                              >
                                <span className="material-symbols-outlined text-[16px]">edit</span>
                              </button>
                              <button
                                onClick={() => openDeleteModal(p, 'soft')}
                                className="admin-btn-icon w-8 h-8 p-0 min-h-0 text-[var(--admin-text-secondary)] hover:text-rose-600 hover:bg-rose-500/10"
                                title="Delete Product"
                              >
                                <span className="material-symbols-outlined text-[16px]">
                                  delete
                                </span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="grid"
                initial="hidden"
                animate="show"
                exit="hidden"
                variants={stagger}
                className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5"
              >
                {filteredProducts.map((p) => {
                  const isSelected = selectedProducts.includes(p.id);

                  return (
                    <motion.div
                      key={p.id}
                      variants={fadeUp}
                      onClick={() => navigate(`/admin/products/edit/${p.id}`)}
                      className={`bg-[var(--admin-surface)] rounded-[var(--admin-radius-lg)] border overflow-hidden group cursor-pointer hover:border-[var(--admin-border-strong)] hover:shadow-[var(--admin-shadow-md)] transition-all duration-300 flex flex-col justify-between text-left ${
                        isSelected
                          ? 'border-[var(--admin-accent)] ring-2 ring-[var(--admin-accent)]/20 shadow-sm'
                          : 'border-[var(--admin-border-subtle)]'
                      } ${p.status === 'inactive' || p.status === 'draft' ? 'opacity-75' : ''}`}
                    >
                      {/* Image Thumbnail with Select Box on Top Left */}
                      <div className="relative aspect-[16/10] overflow-hidden bg-[var(--admin-bg-subtle)] shrink-0">
                        <img
                          onError={handleImageError}
                          src={p.image}
                          alt={p.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />

                        {/* Select Box on Picture (Top Left) */}
                        <div
                          className="absolute top-2 left-2 z-10"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <label className="w-6 h-6 rounded-[4px] bg-white/90 dark:bg-stone-900/90 backdrop-blur-xs border border-black/15 dark:border-white/15 flex items-center justify-center cursor-pointer shadow-xs transition-transform active:scale-95">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelect(p.id)}
                              className="w-3.5 h-3.5 rounded-[3px] border-[var(--admin-border-strong)] accent-[var(--admin-accent)] cursor-pointer"
                            />
                          </label>
                        </div>
                      </div>

                      {/* Card Content */}
                      <div className="p-2.5 sm:p-3 flex-1 flex flex-col justify-between gap-1.5">
                        {/* Top: Category (No ID) */}
                        <div className="flex items-center">
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--admin-accent)] bg-[var(--admin-accent)]/10 px-2 py-0.5 rounded-[4px] truncate max-w-full">
                            {formatCategoryName(p.category)}
                          </span>
                        </div>

                        {/* Title */}
                        <h4
                          className="text-[13px] sm:text-[13.5px] font-bold text-[var(--admin-text-primary)] group-hover:text-[var(--admin-accent)] transition-colors line-clamp-1 leading-snug"
                          title={p.name}
                        >
                          {p.name}
                        </h4>

                        {/* Price & Active Status Row - Clean & Fit Free */}
                        <div className="flex items-center justify-between pt-1.5 border-t border-[var(--admin-border-subtle)]">
                          <div>
                            <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--admin-text-tertiary)] block leading-none mb-0.5">
                              Price
                            </span>
                            <span className="text-[14px] sm:text-[15px] font-black text-[var(--admin-text-primary)] leading-none">
                              {formatCurrency(p.price)}
                            </span>
                          </div>

                          <div
                            className="flex items-center gap-1.5 cursor-pointer"
                            onClick={(e) => e.stopPropagation()}
                            title={
                              p.status !== 'inactive' && p.status !== 'draft'
                                ? 'Active (Click to deactivate)'
                                : 'Inactive (Click to activate)'
                            }
                          >
                            <span
                              className={`text-[9px] font-bold uppercase tracking-wider ${
                                p.status !== 'inactive' && p.status !== 'draft'
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : 'text-[var(--admin-text-tertiary)]'
                              }`}
                            >
                              {p.status !== 'inactive' && p.status !== 'draft'
                                ? 'Active'
                                : 'Inactive'}
                            </span>
                            <AdminToggle
                              size="sm"
                              checked={p.status !== 'inactive' && p.status !== 'draft'}
                              onChange={() => {
                                const newStatus =
                                  p.status === 'inactive' || p.status === 'draft'
                                    ? 'active'
                                    : 'inactive';
                                if (updateProductStatus) updateProductStatus(p.id, newStatus);
                              }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Footer: Stock Stepper on Left, Actions on Right */}
                      <div
                        className="px-2.5 sm:px-3 py-1.5 border-t border-[var(--admin-border-subtle)] flex items-center justify-between"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {/* Compact Stock Stepper */}
                        <div className="inline-flex items-center bg-[var(--admin-surface-muted)] border border-[var(--admin-border)] rounded-[3px] p-0.5 shadow-2xs">
                          <button
                            type="button"
                            onClick={() => handleStockChange(p.id, Math.max(0, (p.stock || 0) - 1))}
                            className="w-4 h-4 rounded-[2px] flex items-center justify-center text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)] hover:bg-[var(--admin-surface)] cursor-pointer active:scale-95"
                            title="Decrease stock"
                          >
                            <span className="material-symbols-outlined text-[12px]">remove</span>
                          </button>
                          <span
                            className={`min-w-[20px] px-0.5 text-center font-bold text-[11px] font-mono ${
                              p.stock <= 5
                                ? p.stock === 0
                                  ? 'text-rose-600 dark:text-rose-400 font-extrabold'
                                  : 'text-amber-600 dark:text-amber-400 font-extrabold'
                                : 'text-[var(--admin-text-primary)]'
                            }`}
                          >
                            {p.stock ?? 0}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleStockChange(p.id, (p.stock || 0) + 1)}
                            className="w-4 h-4 rounded-[2px] flex items-center justify-center text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)] hover:bg-[var(--admin-surface)] cursor-pointer active:scale-95"
                            title="Increase stock"
                          >
                            <span className="material-symbols-outlined text-[12px]">add</span>
                          </button>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-0.5">
                          <button
                            type="button"
                            onClick={() => toggleHeroProduct(p.id)}
                            title={
                              getIsHeroProduct(p.id)
                                ? 'Remove from Hero Carousel'
                                : 'Feature on Hero Carousel'
                            }
                            className={`w-6 h-6 rounded-[3px] flex items-center justify-center transition-all cursor-pointer ${
                              getIsHeroProduct(p.id)
                                ? 'text-amber-500 bg-amber-500/10 hover:bg-amber-500/20'
                                : 'text-[var(--admin-text-tertiary)] hover:text-amber-500 hover:bg-black/5 dark:hover:bg-white/5'
                            }`}
                          >
                            <span
                              className="material-symbols-outlined text-[15px]"
                              style={{
                                fontVariationSettings: getIsHeroProduct(p.id)
                                  ? "'FILL' 1"
                                  : "'FILL' 0",
                              }}
                            >
                              star
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={() => navigate(`/admin/products/edit/${p.id}`)}
                            title="Edit Product"
                            className="w-6 h-6 rounded-[3px] flex items-center justify-center text-[var(--admin-text-tertiary)] hover:text-[var(--admin-accent)] hover:bg-black/5 dark:hover:bg-white/5 transition-all cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-[15px]">edit</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => openDeleteModal(p, 'soft')}
                            title="Delete Product"
                            className="w-6 h-6 rounded-[3px] flex items-center justify-center text-[var(--admin-text-tertiary)] hover:text-rose-600 hover:bg-rose-500/10 transition-all cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-[15px]">delete</span>
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}

      <DeleteConfirmModal
        isOpen={deleteModal.isOpen && deleteModal.type === 'soft'}
        onClose={closeDeleteModal}
        onConfirm={handleConfirmDelete}
        productTitle={deleteModal.product?.name || ''}
        isDeleting={isDeleting}
      />

      <PermanentDeleteModal
        isOpen={deleteModal.isOpen && deleteModal.type === 'permanent'}
        onClose={closeDeleteModal}
        onConfirm={handleConfirmDelete}
        productTitle={deleteModal.product?.name || ''}
        isDeleting={isDeleting}
      />
    </motion.div>
  );
}
