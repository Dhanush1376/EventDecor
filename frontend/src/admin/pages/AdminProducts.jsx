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
  MobileFilterDrawer,
  SkeletonTable,
  AdminToggle,
  formatCurrency,
  fadeUp,
  stagger,
} from '../components/AdminUIKit';

export function AdminProducts() {
  const navigate = useNavigate();
  const {
    products,
    dataLoading,
    deleteProduct,
    toggleProductFeatured,
    updateProductStock,
    searchQuery,
    setSearchQuery,
    websiteContent,
    updateContent,
    publishContent,
  } = useAdmin();

  const { data: productCategories = [] } = useCategories();

  // States
  const [activeTab, setActiveTab] = useState('products'); // 'products', 'categories', 'inventory'
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);
  const [viewMode, setViewMode] = useState('table');
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  // Category states
  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);

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
    if (!window.confirm('Are you sure you want to permanently delete this category?')) return;
    try {
      await api.delete(`/categories/${id}`);
      toast.success('Category deleted');
      fetchCategories();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to delete category'));
    }
  };

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
    if (window.confirm(`Are you sure you want to delete ${selectedProducts.length} products?`)) {
      for (const id of selectedProducts) {
        await deleteProduct(id);
      }
      setSelectedProducts([]);
      toast.success(`${selectedProducts.length} products deleted`);
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
    return products.filter((p) => {
      const matchCategory = selectedCategory === 'All' || p.category === selectedCategory;
      const matchStatus = selectedStatus === 'All' || p.status === selectedStatus;
      const matchLowStock = showLowStockOnly ? p.stock <= 5 : true;
      const matchSearch =
        !searchQuery ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.id.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCategory && matchStatus && matchLowStock && matchSearch;
    });
  }, [products, selectedCategory, selectedStatus, searchQuery, showLowStockOnly]);

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
  };

  return (
    <motion.div initial="hidden" animate="show" variants={stagger} className="space-y-6">
      {/* Header with Tabs */}
      <PageHeader
        title={
          <div className="flex flex-col gap-3 w-full">
            <div className="flex items-center justify-between">
              <span>Products & Inventory</span>
              <button
                onClick={() => setIsMobileFilterOpen(true)}
                className="md:hidden flex items-center justify-center w-8 h-8 rounded-full bg-[var(--admin-surface-muted)] border border-[var(--admin-border)] text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)] hover:bg-[var(--admin-border)] transition-colors relative shrink-0"
              >
                <span className="material-symbols-outlined text-[18px]">tune</span>
                {(selectedCategory !== 'All' || selectedStatus !== 'All' || showLowStockOnly) && (
                  <span className="absolute top-0 right-0 w-2 h-2 rounded-full bg-[var(--admin-accent)] border border-[var(--admin-surface)]" />
                )}
              </button>
            </div>
            {/* Tabs */}
            <div className="flex items-center gap-6 border-b border-[var(--admin-border-subtle)] mt-1">
              {['products', 'inventory', 'categories'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => {
                    setActiveTab(tab);
                    setSearchQuery('');
                  }}
                  className={`pb-3 text-[13px] font-bold tracking-wide capitalize border-b-2 transition-colors ${
                    activeTab === tab
                      ? 'border-[var(--admin-accent)] text-[var(--admin-accent)]'
                      : 'border-transparent text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)]'
                  }`}
                >
                  {tab === 'inventory' ? 'Inventory Levels' : tab}
                </button>
              ))}
            </div>
          </div>
        }
        subtitle=""
        icon="inventory_2"
        iconColor="products"
      >
        <button
          onClick={() =>
            navigate(activeTab === 'categories' ? '/admin/categories/add' : '/admin/products/add')
          }
          className="admin-btn admin-btn-primary h-9 mt-4 sm:mt-0"
        >
          <span className="material-symbols-outlined text-[16px]">add</span>
          {activeTab === 'categories' ? 'Add Category' : 'Add Product'}
        </button>
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
              <div className="overflow-x-auto">
                <table className="admin-table w-full min-w-[700px]">
                  <thead>
                    <tr>
                      <th className="pl-6">Category Name</th>
                      <th>Slug / URL Path</th>
                      <th>Type Scope</th>
                      <th>Status</th>
                      <th className="text-right pr-6">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categories.map((cat) => (
                      <tr
                        key={cat._id}
                        className="hover:bg-[var(--admin-surface-muted)] transition-colors"
                      >
                        <td className="pl-6">
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

          <motion.div
            variants={fadeUp}
            className="admin-card p-2 sm:p-3 hidden md:flex flex-row items-center justify-between gap-2"
          >
            <div className="hidden md:flex items-center gap-1.5 flex-1 min-w-0">
              <div className="admin-search-wrapper flex-1 min-w-[200px] max-w-[300px]">
                <span className="material-symbols-outlined admin-search-icon">search</span>
                <input
                  type="text"
                  placeholder="Search by name or ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="admin-input h-9 w-full"
                />
              </div>

              {activeTab === 'products' && (
                <>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="admin-input h-9 min-h-0 text-[11px] sm:text-[12px] font-semibold py-0 px-2 cursor-pointer flex-1 min-w-0 md:flex-initial md:min-w-[150px]"
                  >
                    <option value="All">All Categories</option>
                    {productCategories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="admin-input h-9 min-h-0 text-[11px] sm:text-[12px] font-semibold py-0 px-2 cursor-pointer flex-1 min-w-0 md:flex-initial md:min-w-[130px]"
                  >
                    <option value="All">All Statuses</option>
                    <option value="active">Active</option>
                    <option value="low_stock">Low Stock</option>
                    <option value="out_of_stock">Out of Stock</option>
                  </select>
                </>
              )}

              {activeTab === 'inventory' && (
                <div className="flex items-center gap-2 ml-2">
                  <AdminToggle
                    checked={showLowStockOnly}
                    onChange={() => setShowLowStockOnly(!showLowStockOnly)}
                  />
                  <span className="text-[12px] font-bold text-[var(--admin-text-secondary)]">
                    Low Stock Only
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {selectedProducts.length > 0 && (
                <div className="flex items-center gap-2 mr-2 border-r border-[var(--admin-border-subtle)] pr-4 h-9">
                  <span className="admin-badge admin-badge-neutral h-full px-3 flex items-center justify-center font-bold text-[11px] hidden sm:inline-flex bg-[var(--admin-surface-muted)] text-[var(--admin-text-secondary)]">
                    {selectedProducts.length} SELECTED
                  </span>
                  <button
                    onClick={handleBulkDelete}
                    className="admin-btn h-full bg-[var(--admin-error)] text-white hover:opacity-90 border-none px-3 text-[12px] font-bold shadow-sm flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-[16px]">delete</span>
                    Delete
                  </button>
                  <button
                    onClick={() => setSelectedProducts([])}
                    className="admin-btn-outline h-full w-9 p-0 flex items-center justify-center shadow-sm"
                    title="Clear Selection"
                  >
                    <span className="material-symbols-outlined text-[18px]">close</span>
                  </button>
                </div>
              )}

              {activeTab === 'products' && (
                <div className="flex bg-[var(--admin-surface-muted)] border border-[var(--admin-border-subtle)] rounded-[var(--admin-radius-lg)] p-0.5 shadow-sm shrink-0">
                  <button
                    onClick={() => setViewMode('table')}
                    className={`hidden md:flex items-center justify-center w-8 h-7.5 rounded-[var(--admin-radius-md)] transition-all shrink-0 ${
                      viewMode === 'table'
                        ? 'bg-[var(--admin-surface)] text-[var(--admin-text-primary)] shadow-[var(--admin-shadow-sm)] border border-[var(--admin-border-subtle)]'
                        : 'text-[var(--admin-text-tertiary)] hover:text-[var(--admin-text-primary)]'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px]">view_list</span>
                  </button>
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`hidden md:flex items-center justify-center w-8 h-7.5 rounded-[var(--admin-radius-md)] transition-all shrink-0 ${
                      viewMode === 'grid'
                        ? 'bg-[var(--admin-surface)] text-[var(--admin-text-primary)] shadow-[var(--admin-shadow-sm)] border border-[var(--admin-border-subtle)]'
                        : 'text-[var(--admin-text-tertiary)] hover:text-[var(--admin-text-primary)]'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px]">grid_view</span>
                  </button>
                </div>
              )}
            </div>
          </motion.div>

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
                  <table className="admin-table w-full min-w-[900px]">
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
                        {activeTab === 'products' && (
                          <th className="hidden md:table-cell">Category</th>
                        )}
                        {activeTab === 'products' && <th>Price</th>}
                        <th className="hidden lg:table-cell">Status</th>
                        <th>Stock Level</th>
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
                            <div className="flex items-center gap-3 pl-2">
                              <img
                                onError={handleImageError}
                                src={p.image}
                                alt={p.name}
                                className="w-10 h-10 rounded-[var(--admin-radius-md)] object-cover border border-[var(--admin-border-subtle)] shrink-0"
                              />
                              <div>
                                <p className="font-semibold text-[var(--admin-text-primary)] text-[12px] group-hover:text-[var(--admin-accent)] transition-colors">
                                  {p.name}
                                </p>
                                <p className="text-[10px] text-[var(--admin-text-tertiary)] font-medium uppercase tracking-wider mt-0.5">
                                  ID: {p.id.substring(p.id.length - 8)}
                                </p>
                              </div>
                            </div>
                          </td>
                          {activeTab === 'products' && (
                            <td className="hidden md:table-cell text-[var(--admin-text-secondary)] font-medium text-[12px]">
                              {p.category}
                            </td>
                          )}
                          {activeTab === 'products' && (
                            <td className="font-bold text-[var(--admin-text-primary)] text-[13px]">
                              {formatCurrency(p.price)}
                            </td>
                          )}
                          <td className="hidden lg:table-cell">
                            <StatusBadge status={statusLabels[p.status] || p.status} />
                          </td>
                          <td onClick={(e) => activeTab === 'inventory' && e.stopPropagation()}>
                            {activeTab === 'inventory' ? (
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  min="0"
                                  className="admin-input w-20 h-8 text-[12px] font-bold text-center p-1 bg-[var(--admin-surface)]"
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
                            ) : (
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
                            )}
                          </td>
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
                                  onClick={() => deleteProduct(p.id)}
                                  className="admin-btn-icon w-8 h-8 p-0 min-h-0 text-[var(--admin-text-tertiary)] hover:text-[var(--admin-error)] hover:bg-[var(--admin-error-light)]"
                                  title="Delete"
                                >
                                  <span className="material-symbols-outlined text-[16px]">
                                    delete
                                  </span>
                                </button>
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

          <MobileFilterDrawer
            isOpen={isMobileFilterOpen}
            onClose={() => setIsMobileFilterOpen(false)}
            title="Filter Products"
          >
            <div className="space-y-4">
              {activeTab === 'inventory' && (
                <div className="flex items-center gap-2 bg-[var(--admin-surface-muted)] p-3 rounded-[var(--admin-radius-md)] border border-[var(--admin-border-subtle)]">
                  <AdminToggle
                    checked={showLowStockOnly}
                    onChange={() => setShowLowStockOnly(!showLowStockOnly)}
                  />
                  <span className="text-[12px] font-bold text-[var(--admin-text-primary)]">
                    Show Low Stock Only
                  </span>
                </div>
              )}

              <div>
                <label className="text-[10px] font-bold text-[var(--admin-text-secondary)] uppercase tracking-wider block mb-2">
                  Search
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-[var(--admin-text-tertiary)]">
                    search
                  </span>
                  <input
                    type="text"
                    placeholder="Search products by name or ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="admin-input pl-10"
                  />
                </div>
              </div>

              {activeTab === 'products' && (
                <>
                  <div>
                    <label className="text-[10px] font-bold text-[var(--admin-text-secondary)] uppercase tracking-wider block mb-2">
                      Category
                    </label>
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="admin-input"
                    >
                      <option value="All">All Categories</option>
                      {productCategories.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-[var(--admin-text-secondary)] uppercase tracking-wider block mb-2">
                      Status
                    </label>
                    <select
                      value={selectedStatus}
                      onChange={(e) => setSelectedStatus(e.target.value)}
                      className="admin-input"
                    >
                      <option value="All">All Statuses</option>
                      <option value="active">Active</option>
                      <option value="low_stock">Low Stock</option>
                      <option value="out_of_stock">Out of Stock</option>
                    </select>
                  </div>
                </>
              )}

              <div className="pt-4 flex items-center justify-between">
                <button
                  onClick={() => {
                    setSelectedCategory('All');
                    setSelectedStatus('All');
                    setShowLowStockOnly(false);
                  }}
                  className="text-[12px] font-bold text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)]"
                >
                  Clear Filters
                </button>
              </div>
            </div>
          </MobileFilterDrawer>
        </>
      )}
    </motion.div>
  );
}
