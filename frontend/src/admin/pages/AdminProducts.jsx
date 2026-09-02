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
} from '../components/AdminUIKit';
import { DeleteConfirmModal } from '../components/ui/DeleteConfirmModal';
import { PermanentDeleteModal } from '../components/ui/PermanentDeleteModal';
import { useConfirm } from '../../context/ConfirmProvider';

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
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [sortBy, setSortBy] = useState('newest');
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);
  const [viewMode, setViewMode] = useState('table');
  const [selectedProducts, setSelectedProducts] = useState([]);

  const [deleteModal, setDeleteModal] = useState({ isOpen: false, type: 'soft', product: null });
  const [isDeleting, setIsDeleting] = useState(false);

  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [categoryTypeFilter, setCategoryTypeFilter] = useState('All');
  const [isBulkDeletingCategories, setIsBulkDeletingCategories] = useState(false);
  const [isBulkDeactivatingCategories, setIsBulkDeactivatingCategories] = useState(false);

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

  const filteredProducts = useMemo(() => {
    let result = products.filter((p) => {
      const matchCategory = selectedCategory === 'All' || p.category === selectedCategory;
      const matchStatus = selectedStatus === 'All' || p.status === selectedStatus;
      const matchLowStock = showLowStockOnly ? p.stock <= 5 : true;
      const matchSearch =
        !searchQuery ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.id.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCategory && matchStatus && matchLowStock && matchSearch;
    });

    if (sortBy === 'price-asc') result.sort((a, b) => a.price - b.price);
    else if (sortBy === 'price-desc') result.sort((a, b) => b.price - a.price);
    else if (sortBy === 'stock-asc') result.sort((a, b) => a.stock - b.stock);
    else if (sortBy === 'stock-desc') result.sort((a, b) => b.stock - a.stock);

    return result;
  }, [products, selectedCategory, selectedStatus, searchQuery, showLowStockOnly, sortBy]);

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
        title={activeTab === 'inventory' ? 'Inventory' : 'Products'}
        subtitle={
          activeTab === 'inventory'
            ? 'Manage stock levels and tracking'
            : 'Manage your products catalog'
        }
        icon={activeTab === 'inventory' ? 'warehouse' : 'inventory_2'}
        iconColor="products"
      >
        <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto mt-4 sm:mt-0">
          <div className="flex items-center gap-1 p-1 bg-[var(--admin-surface-muted)] rounded border border-[var(--admin-border)] flex-1 sm:flex-none h-[46px]">
            {['products', 'inventory'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 sm:flex-none px-2 sm:px-4 h-full rounded-sm text-[13px] font-bold capitalize transition-all flex items-center justify-center whitespace-nowrap ${
                  activeTab === tab
                    ? 'bg-white text-[var(--admin-accent)] shadow-sm'
                    : 'text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)]'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
          <button
            onClick={() =>
              navigate(activeTab === 'categories' ? '/admin/categories/add' : '/admin/products/add')
            }
            className="admin-btn admin-btn-primary flex-1 sm:flex-none h-[46px] px-2 sm:px-5 rounded text-[13px] justify-center whitespace-nowrap"
          >
            <span className="material-symbols-outlined text-[16px]">add</span>
            {activeTab === 'categories' ? 'Add Category' : 'Add Product'}
          </button>
        </div>
      </PageHeader>

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
            <div className="admin-card divide-y divide-[var(--admin-border-subtle)] p-0">
              {/* Category Filters Header */}
              <div className="p-3 flex items-center justify-between gap-3 border-b border-[var(--admin-border-subtle)]">
                <div className="flex items-center gap-1 p-0.5 bg-[var(--admin-surface-muted)] rounded-md border border-[var(--admin-border)] overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] min-w-0">
                  {['All', 'product', 'gallery', 'event'].map((t) => (
                    <button
                      key={t}
                      onClick={() => setCategoryTypeFilter(t)}
                      className={`px-2.5 py-1 rounded-sm text-[11px] font-bold cursor-pointer transition-all capitalize whitespace-nowrap shrink-0 ${
                        categoryTypeFilter === t
                          ? 'bg-white text-[var(--admin-accent)] shadow-sm border border-[var(--admin-border-subtle)]'
                          : 'text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)] border border-transparent'
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
                    className="overflow-hidden bg-[var(--admin-surface-muted)] border-b border-[var(--admin-border-subtle)] rounded-t-[var(--admin-radius-lg)]"
                  >
                    <div className="p-3 flex items-center justify-between">
                      <span className="font-bold text-[13px] text-[var(--admin-text-primary)] pl-3">
                        {selectedCategories.length} Selected
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleBulkDeactivateCategories}
                          disabled={isBulkDeactivatingCategories}
                          className="admin-btn h-8 bg-amber-500 hover:bg-amber-600 text-white border-none px-3 text-[12px] font-bold shadow-sm flex items-center gap-1.5"
                        >
                          <span className="material-symbols-outlined text-[16px]">block</span>
                          Deactivate
                        </button>
                        <button
                          onClick={handleBulkDeleteCategories}
                          disabled={isBulkDeletingCategories}
                          className="admin-btn h-8 bg-[var(--admin-error)] text-white hover:opacity-90 border-none px-3 text-[12px] font-bold shadow-sm flex items-center gap-1.5"
                        >
                          <span className="material-symbols-outlined text-[16px]">delete</span>
                          Delete
                        </button>
                        <button
                          onClick={() => setSelectedCategories([])}
                          className="admin-btn-outline h-8 w-8 p-0 flex items-center justify-center shadow-sm ml-1"
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
                <table className="admin-table w-full min-w-[700px]">
                  <thead>
                    <tr>
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
          {/* Mobile Bulk Actions */}
          <AnimatePresence>
            {selectedProducts.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="md:hidden flex items-center justify-between p-3 bg-[var(--admin-surface)] border border-[var(--admin-border-strong)] rounded-[var(--admin-radius-lg)] shadow-sm"
              >
                <span className="font-bold text-[13px] text-[var(--admin-text-primary)]">
                  {selectedProducts.length} Selected
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleBulkDeactivateProducts}
                    className="admin-btn h-8 bg-amber-500 text-white hover:bg-amber-600 border-none px-3 text-[12px] font-bold shadow-sm flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-[16px]">block</span>
                    Deactivate
                  </button>
                  <button
                    onClick={handleBulkDelete}
                    className="admin-btn h-8 bg-[var(--admin-error)] text-white hover:opacity-90 border-none px-3 text-[12px] font-bold shadow-sm flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-[16px]">delete</span>
                    Delete
                  </button>
                  <button
                    onClick={() => setSelectedProducts([])}
                    className="admin-btn-outline h-8 w-8 p-0 flex items-center justify-center shadow-sm"
                    title="Clear Selection"
                  >
                    <span className="material-symbols-outlined text-[18px]">close</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div
            className={`flex items-stretch gap-2 w-full mb-6 ${activeTab === 'inventory' ? 'flex-row' : 'flex-col sm:flex-row'}`}
          >
            <div className="relative flex-1 min-w-0 sm:w-64 bg-[var(--admin-surface-muted)] rounded border border-[var(--admin-border)] flex items-center px-3">
              <span className="material-symbols-outlined text-[18px] text-[var(--admin-text-tertiary)] shrink-0">
                search
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name or ID..."
                className="bg-transparent border-none outline-none w-full text-[13px] text-[var(--admin-text-primary)] placeholder-[var(--admin-text-tertiary)] font-medium px-2 h-10 sm:h-10 min-w-0"
              />
            </div>
            <div className="flex items-stretch gap-2 min-w-0 overflow-x-auto no-scrollbar pb-1 sm:pb-0 sm:flex-1">
              {activeTab === 'products' && (
                <>
                  <div className="relative flex items-stretch shrink-0 flex-1 min-w-[110px]">
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="bg-[var(--admin-surface-muted)] w-full rounded border border-[var(--admin-border)] text-[12px] font-semibold text-[var(--admin-text-primary)] focus:outline-none cursor-pointer transition-all pl-2.5 pr-7 h-10 sm:h-10 appearance-none truncate"
                    >
                      <option value="All">Category</option>
                      {productCategories.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                    <span
                      className="material-symbols-outlined absolute right-2 text-[16px] text-[var(--admin-text-tertiary)] pointer-events-none"
                      style={{ top: '50%', transform: 'translateY(-50%)' }}
                    >
                      expand_more
                    </span>
                  </div>
                  <div className="relative flex items-stretch shrink-0 flex-1 min-w-[100px]">
                    <select
                      value={selectedStatus}
                      onChange={(e) => setSelectedStatus(e.target.value)}
                      className="bg-[var(--admin-surface-muted)] w-full rounded border border-[var(--admin-border)] text-[12px] font-semibold text-[var(--admin-text-primary)] focus:outline-none cursor-pointer transition-all pl-2.5 pr-7 h-10 sm:h-10 appearance-none truncate"
                    >
                      <option value="All">Status</option>
                      <option value="active">Active</option>
                      <option value="low_stock">Low Stock</option>
                      <option value="out_of_stock">Out of Stock</option>
                    </select>
                    <span
                      className="material-symbols-outlined absolute right-2 text-[16px] text-[var(--admin-text-tertiary)] pointer-events-none"
                      style={{ top: '50%', transform: 'translateY(-50%)' }}
                    >
                      expand_more
                    </span>
                  </div>
                  <div className="relative flex items-stretch shrink-0 flex-1 min-w-[110px]">
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="bg-[var(--admin-surface-muted)] w-full rounded border border-[var(--admin-border)] text-[12px] font-semibold text-[var(--admin-text-primary)] focus:outline-none cursor-pointer transition-all pl-2.5 pr-7 h-10 sm:h-10 appearance-none truncate"
                    >
                      <option value="newest">Newest</option>
                      <option value="price-asc">Price (Low-High)</option>
                      <option value="price-desc">Price (High-Low)</option>
                      <option value="stock-asc">Stock (Low-High)</option>
                      <option value="stock-desc">Stock (High-Low)</option>
                    </select>
                    <span
                      className="material-symbols-outlined absolute right-2 text-[16px] text-[var(--admin-text-tertiary)] pointer-events-none"
                      style={{ top: '50%', transform: 'translateY(-50%)' }}
                    >
                      expand_more
                    </span>
                  </div>
                </>
              )}
              {activeTab === 'inventory' && (
                <div className="flex items-center gap-2 px-3 bg-[var(--admin-surface-muted)] rounded border border-[var(--admin-border)] h-10 sm:h-10 shrink-0">
                  <AdminToggle
                    checked={showLowStockOnly}
                    onChange={() => setShowLowStockOnly(!showLowStockOnly)}
                    size="sm"
                  />
                  <span className="text-[13px] font-semibold text-[var(--admin-text-primary)] whitespace-nowrap">
                    Low Stock
                  </span>
                </div>
              )}
              {selectedProducts.length > 0 && (
                <div className="flex items-center gap-1 shrink-0 bg-[var(--admin-surface-muted)] rounded border border-[var(--admin-border)] p-1 h-10 sm:h-10">
                  <span className="px-2 font-bold text-[11px] text-[var(--admin-text-secondary)]">
                    {selectedProducts.length} SEL
                  </span>
                  <div className="flex items-center gap-1 h-full">
                    <button
                      onClick={handleBulkDeactivateProducts}
                      className="px-3 h-8 rounded-sm bg-amber-500 hover:bg-amber-600 text-white text-[12px] font-bold flex items-center gap-1.5 transition-colors"
                    >
                      <span className="material-symbols-outlined text-[16px]">block</span>
                      <span className="hidden sm:inline">Deactivate</span>
                    </button>
                    <button
                      onClick={handleBulkDelete}
                      className="px-3 h-8 rounded-sm bg-[var(--admin-error)] hover:opacity-90 text-white text-[12px] font-bold flex items-center gap-1.5 transition-colors"
                    >
                      <span className="material-symbols-outlined text-[16px]">delete</span>
                      <span className="hidden sm:inline">Delete</span>
                    </button>
                  </div>
                  <button
                    onClick={() => setSelectedProducts([])}
                    className="w-6 h-8 flex items-center justify-center rounded text-[var(--admin-text-tertiary)] hover:bg-[var(--admin-border-subtle)]"
                    title="Clear Selection"
                  >
                    <span className="material-symbols-outlined text-[16px]">close</span>
                  </button>
                </div>
              )}
              {activeTab === 'products' && (
                <div className="hidden md:flex items-center gap-1 shrink-0 bg-[var(--admin-surface-muted)] rounded border border-[var(--admin-border)] p-1 h-10 sm:h-10">
                  <button
                    onClick={() => setViewMode('table')}
                    className={`w-[30px] h-[30px] rounded-sm flex items-center justify-center transition-all ${
                      viewMode === 'table'
                        ? 'bg-white text-[var(--admin-accent)] shadow-sm border border-[var(--admin-border-subtle)]'
                        : 'text-[var(--admin-text-tertiary)] hover:text-[var(--admin-text-primary)] border border-transparent'
                    }`}
                    title="Table View"
                  >
                    <span className="material-symbols-outlined text-[18px]">view_list</span>
                  </button>
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`w-[30px] h-[30px] rounded-sm flex items-center justify-center transition-all ${
                      viewMode === 'grid'
                        ? 'bg-white text-[var(--admin-accent)] shadow-sm border border-[var(--admin-border-subtle)]'
                        : 'text-[var(--admin-text-tertiary)] hover:text-[var(--admin-text-primary)] border border-transparent'
                    }`}
                    title="Grid View"
                  >
                    <span className="material-symbols-outlined text-[18px]">grid_view</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          <AnimatePresence mode="wait">
            {dataLoading ? (
              <motion.div
                key="loading"
                initial="hidden"
                animate="show"
                exit="hidden"
                variants={fadeUp}
              >
                {viewMode === 'table' || activeTab === 'inventory' ? (
                  <SkeletonTable rows={10} cols={8} />
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
                    {[...Array(10)].map((_, i) => (
                      <div key={i} className="admin-skeleton admin-card aspect-[3/4]" />
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
                className="admin-card py-16 flex justify-center"
              >
                <EmptyState
                  icon={searchQuery ? 'search_off' : 'inventory_2'}
                  title={
                    searchQuery ||
                    selectedCategory !== 'All' ||
                    selectedStatus !== 'All' ||
                    showLowStockOnly
                      ? 'No Matches Found'
                      : 'No Products Yet'
                  }
                  description={
                    searchQuery ||
                    selectedCategory !== 'All' ||
                    selectedStatus !== 'All' ||
                    showLowStockOnly
                      ? 'No products match the search or filter criteria.'
                      : 'Get started by adding your first product to the catalog.'
                  }
                  action={
                    searchQuery ||
                    selectedCategory !== 'All' ||
                    selectedStatus !== 'All' ||
                    showLowStockOnly ? (
                      <button
                        onClick={() => {
                          setSelectedCategory('All');
                          setSelectedStatus('All');
                          setShowLowStockOnly(false);
                        }}
                        className="admin-btn admin-btn-outline"
                      >
                        Clear Filters
                      </button>
                    ) : (
                      <button
                        onClick={() => navigate('/admin/products/add')}
                        className="admin-btn admin-btn-primary"
                      >
                        <span className="material-symbols-outlined text-[16px]">add</span> Add
                        Product
                      </button>
                    )
                  }
                />
              </motion.div>
            ) : viewMode === 'table' || activeTab === 'inventory' ? (
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
                        {activeTab === 'products' && (
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
                        )}
                        <th>Product</th>
                        {activeTab === 'inventory' && <th className="text-center">Stock Level</th>}
                        {activeTab === 'inventory' && <th className="text-center">Sold</th>}
                        {activeTab === 'products' && <th>Price</th>}
                        <th>Category</th>
                        <th className="hidden lg:table-cell">Status</th>
                        {activeTab === 'products' && <th className="text-center">Stock Level</th>}
                        {activeTab === 'inventory' && (
                          <th className="text-right pr-6">Fast Action</th>
                        )}
                        {activeTab === 'products' && <th className="text-right pr-4">Actions</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredProducts.map((p) => (
                        <tr
                          key={p.id}
                          className="admin-table-row-clickable group"
                          onClick={() => {
                            if (activeTab === 'products') navigate(`/admin/products/edit/${p.id}`);
                          }}
                        >
                          {activeTab === 'products' && (
                            <td className="text-center" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={selectedProducts.includes(p.id)}
                                onChange={() => toggleSelect(p.id)}
                                className="w-4 h-4 rounded-[4px] border-[var(--admin-border-strong)] accent-[var(--admin-accent)] cursor-pointer"
                              />
                            </td>
                          )}
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
                          {activeTab === 'inventory' && (
                            <td onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center gap-2 justify-center">
                                <input
                                  type="number"
                                  min="0"
                                  className="admin-input !w-24 !max-w-[96px] h-8 text-[13px] font-bold text-center p-1 bg-[var(--admin-surface)]"
                                  defaultValue={p.stock}
                                  onBlur={(e) => {
                                    if (e.target.value !== String(p.stock)) {
                                      handleStockChange(p.id, e.target.value);
                                    }
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      e.target.blur();
                                    }
                                  }}
                                />
                                {p.stock === 0 && (
                                  <span
                                    className="material-symbols-outlined text-[14px] text-[var(--admin-error)]"
                                    title="Out of stock"
                                  >
                                    warning
                                  </span>
                                )}
                              </div>
                            </td>
                          )}
                          {activeTab === 'inventory' && (
                            <td className="text-center font-bold text-[var(--admin-text-primary)] text-[13px]">
                              {p.soldCount || p.sold || 0}
                            </td>
                          )}
                          {activeTab === 'products' && (
                            <td className="font-bold text-[var(--admin-text-primary)] text-[13px]">
                              {formatCurrency(p.price)}
                            </td>
                          )}
                          <td className="text-[var(--admin-text-secondary)] font-medium text-[12px]">
                            {p.category}
                          </td>
                          <td className="hidden lg:table-cell">
                            <div className="flex items-center gap-3">
                              <StatusBadge status={statusLabels[p.status] || p.status} />
                              <div onClick={(e) => e.stopPropagation()}>
                                <AdminToggle
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
                          </td>
                          {activeTab === 'products' && (
                            <td>
                              <span
                                className={`font-semibold text-[12px] ${
                                  p.stock === 0
                                    ? 'text-[var(--admin-error)]'
                                    : p.stock <= 5
                                      ? 'text-[var(--admin-warning)]'
                                      : 'text-[var(--admin-text-secondary)]'
                                }`}
                              >
                                {p.stock} units
                              </span>
                            </td>
                          )}
                          {activeTab === 'inventory' && (
                            <td className="text-right pr-6" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => handleStockChange(p.id, p.stock + 10)}
                                  className="admin-btn-outline h-7 px-2 text-[10px]"
                                  title="Add 10 units"
                                >
                                  +10
                                </button>
                                <button
                                  onClick={() => handleStockChange(p.id, p.stock + 50)}
                                  className="admin-btn-outline h-7 px-2 text-[10px]"
                                  title="Add 50 units"
                                >
                                  +50
                                </button>
                              </div>
                            </td>
                          )}
                          {activeTab === 'products' && (
                            <td className="text-right pr-4" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => toggleHeroProduct(p.id)}
                                  className={`admin-btn-icon w-8 h-8 p-0 min-h-0 ${
                                    getIsHeroProduct(p.id)
                                      ? 'text-[var(--admin-warning)]'
                                      : 'text-[var(--admin-text-tertiary)] hover:text-[var(--admin-text-primary)]'
                                  }`}
                                  title="Toggle Hero Carousel"
                                >
                                  <span
                                    className="material-symbols-outlined text-[18px]"
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
                                  onClick={() => navigate(`/admin/products/edit/${p.id}`)}
                                  className="admin-btn-icon w-8 h-8 p-0 min-h-0 text-[var(--admin-text-tertiary)] hover:text-[var(--admin-text-primary)]"
                                  title="Edit"
                                >
                                  <span className="material-symbols-outlined text-[16px]">
                                    edit
                                  </span>
                                </button>
                                <button
                                  onClick={() => openDeleteModal(p, 'soft')}
                                  className="admin-btn-icon w-8 h-8 p-0 min-h-0 text-[var(--admin-text-tertiary)] hover:text-[var(--admin-error)] hover:bg-[var(--admin-error-light)]"
                                  title="Move to Recycle Bin"
                                >
                                  <span className="material-symbols-outlined text-[16px]">
                                    delete
                                  </span>
                                </button>
                                {/* Uncomment below to add permanent delete directly to table */}
                                {/* <button
                                  onClick={() => openDeleteModal(p, 'permanent')}
                                  className="admin-btn-icon w-8 h-8 p-0 min-h-0 text-[var(--admin-text-tertiary)] hover:text-[var(--admin-error)] hover:bg-[var(--admin-error-light)]"
                                  title="Permanently Delete"
                                >
                                  <span className="material-symbols-outlined text-[16px]">
                                    delete_forever
                                  </span>
                                </button> */}
                              </div>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            ) : (
              /* Grid View (Products Only) */
              <motion.div
                key="grid"
                initial="hidden"
                animate="show"
                exit="hidden"
                variants={stagger}
                className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5"
              >
                {filteredProducts.map((p) => (
                  <motion.div
                    key={p.id}
                    variants={fadeUp}
                    onClick={() => navigate(`/admin/products/edit/${p.id}`)}
                    className="bg-[var(--admin-surface)] rounded-[var(--admin-radius-xl)] border border-[var(--admin-border-subtle)] overflow-hidden group cursor-pointer hover:border-[var(--admin-border-strong)] hover:shadow-[var(--admin-shadow-md)] transition-all duration-300 flex flex-col justify-between text-left h-full"
                  >
                    <div className="relative aspect-square overflow-hidden bg-[var(--admin-bg-subtle)] shrink-0">
                      <img
                        onError={handleImageError}
                        src={p.image}
                        alt={p.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      {getIsHeroProduct(p.id) && (
                        <div className="absolute top-3 left-3 bg-[var(--admin-bg)] text-[var(--admin-text-primary)] px-2.5 py-1 rounded-[var(--admin-radius-sm)] text-[9px] font-extrabold uppercase tracking-widest shadow-[var(--admin-shadow-sm)]">
                          Hero Carousel
                        </div>
                      )}
                      <div className="absolute top-3 right-3">
                        <StatusBadge
                          status={statusLabels[p.status] || p.status}
                          className="shadow-[var(--admin-shadow-sm)] border-none"
                        />
                      </div>
                    </div>
                    <div className="p-4 flex-1 flex flex-col justify-between border-t border-[var(--admin-border-subtle)]">
                      <div>
                        <p className="text-[14px] font-bold text-[var(--admin-text-primary)] group-hover:text-[var(--admin-accent)] transition-colors line-clamp-2 leading-snug mb-1">
                          {p.name}
                        </p>
                        <p className="text-[11px] text-[var(--admin-text-secondary)] font-medium">
                          {p.category}
                        </p>
                      </div>
                      <div className="flex items-center justify-between mt-4 pt-3 border-t border-[var(--admin-border-subtle)]">
                        <span className="text-[14px] font-bold text-[var(--admin-text-primary)]">
                          {formatCurrency(p.price)}
                        </span>
                        <span
                          className={`text-[11px] font-bold ${p.stock <= 5 ? 'text-[var(--admin-warning)]' : 'text-[var(--admin-text-tertiary)]'}`}
                        >
                          {p.stock} left
                        </span>
                      </div>
                    </div>
                  </motion.div>
                ))}
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
