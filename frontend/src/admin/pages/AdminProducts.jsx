import { useState, useMemo } from 'react';
import { m as motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAdmin } from '../context/AdminContext';
import { productCategories } from '../data/adminData';
import { handleImageError } from '../../utils/imageUtils';
import {
  PageHeader,
  StatusBadge,
  formatCurrency,
  fadeUp,
  stagger,
  SkeletonTable,
  MobileFilterDrawer,
  EmptyState,
} from '../components/AdminUIKit';

export function AdminProducts() {
  const navigate = useNavigate();
  const {
    products,
    dataLoading,
    deleteProduct,
    toggleProductFeatured,
    searchQuery,
    refreshProducts,
  } = useAdmin();
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [viewMode, setViewMode] = useState('table');
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchCategory = selectedCategory === 'All' || p.category === selectedCategory;
      const matchStatus = selectedStatus === 'All' || p.status === selectedStatus;
      const matchSearch =
        !searchQuery ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.id.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCategory && matchStatus && matchSearch;
    });
  }, [products, selectedCategory, selectedStatus, searchQuery]);

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
      {/* Header */}
      <PageHeader
        title={
          <div className="flex items-center justify-between w-[calc(100vw-80px)] sm:w-auto">
            <span>Products Catalog</span>
            <button
              onClick={() => setIsMobileFilterOpen(true)}
              className="md:hidden flex items-center justify-center w-8 h-8 rounded-full bg-[var(--admin-surface-muted)] border border-[var(--admin-border)] text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)] hover:bg-[var(--admin-border)] transition-colors relative shrink-0"
            >
              <span className="material-symbols-outlined text-[18px]">tune</span>
              {(selectedCategory !== 'All' || selectedStatus !== 'All') && (
                <span className="absolute top-0 right-0 w-2 h-2 rounded-full bg-[var(--admin-accent)] border border-[var(--admin-surface)]" />
              )}
            </button>
          </div>
        }
        subtitle={`${products.length} products`}
        icon="inventory_2"
        iconColor="products"
      >
        <button
          onClick={() => navigate('/admin/products/add')}
          className="admin-btn admin-btn-primary h-9"
        >
          <span className="material-symbols-outlined text-[16px]">add</span>
          Add Product
        </button>
      </PageHeader>

      <motion.div
        variants={fadeUp}
        className="admin-card p-2 sm:p-3 hidden md:flex flex-row items-center justify-between gap-2"
      >
        {/* Mobile Filters (moved to headerAction, but we still need the desktop filters here) */}

        {/* Desktop Filters */}
        <div className="hidden md:flex items-center gap-1.5 flex-1 min-w-0">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="admin-input h-9 min-h-0 text-[11px] sm:text-[12px] font-semibold py-0 px-2 cursor-pointer flex-1 min-w-0 md:flex-initial md:min-w-[180px]"
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
            className="admin-input h-9 min-h-0 text-[11px] sm:text-[12px] font-semibold py-0 px-2 cursor-pointer flex-1 min-w-0 md:flex-initial md:min-w-[150px]"
          >
            <option value="All">All Statuses</option>
            <option value="active">Active</option>
            <option value="low_stock">Low Stock</option>
            <option value="out_of_stock">Out of Stock</option>
          </select>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {selectedProducts.length > 0 && (
            <span className="admin-badge admin-badge-info h-9 px-2 flex items-center justify-center font-bold text-[10px] hidden sm:inline-flex">
              {selectedProducts.length} selected
            </span>
          )}

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
        </div>
      </motion.div>

      {/* Table / Grid Render */}
      <AnimatePresence mode="wait">
        {dataLoading ? (
          <motion.div key="loading" initial="hidden" animate="show" exit="hidden" variants={fadeUp}>
            {viewMode === 'table' ? (
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
                searchQuery || selectedCategory !== 'All' || selectedStatus !== 'All'
                  ? 'No Matches Found'
                  : 'No Products Yet'
              }
              description={
                searchQuery || selectedCategory !== 'All' || selectedStatus !== 'All'
                  ? 'No products match the search or filter criteria.'
                  : 'Get started by adding your first product to the catalog.'
              }
              action={
                searchQuery || selectedCategory !== 'All' || selectedStatus !== 'All' ? (
                  <button
                    onClick={() => {
                      setSelectedCategory('All');
                      setSelectedStatus('All');
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
                    <span className="material-symbols-outlined text-[16px]">add</span> Add Product
                  </button>
                )
              }
            />
          </motion.div>
        ) : viewMode === 'table' ? (
          <motion.div
            key="table"
            initial="hidden"
            animate="show"
            exit="hidden"
            variants={fadeUp}
            className="admin-card"
          >
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="admin-table w-full min-w-[900px]">
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
                    <th className="hidden md:table-cell">Category</th>
                    <th>Price</th>
                    <th className="hidden sm:table-cell">Stock</th>
                    <th className="hidden lg:table-cell">Views</th>
                    <th className="hidden lg:table-cell">Sold</th>
                    <th>Status</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((p) => (
                    <tr
                      key={p.id}
                      className="admin-table-row-clickable group"
                      onClick={() => navigate(`/admin/products/edit/${p.id}`)}
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
                        <div className="flex items-center gap-3">
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
                      <td className="hidden md:table-cell text-[var(--admin-text-secondary)] font-medium text-[12px]">
                        {p.category}
                      </td>
                      <td className="font-bold text-[var(--admin-text-primary)] text-[13px]">
                        {formatCurrency(p.price)}
                      </td>
                      <td className="hidden sm:table-cell">
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
                      <td className="hidden lg:table-cell text-[var(--admin-text-tertiary)] font-medium">
                        {p.views.toLocaleString()}
                      </td>
                      <td className="hidden lg:table-cell text-[var(--admin-text-tertiary)] font-medium">
                        {p.sold} units
                      </td>
                      <td>
                        <StatusBadge status={statusLabels[p.status] || p.status} />
                      </td>
                      <td className="text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => toggleProductFeatured(p.id)}
                            className={`admin-btn-icon w-8 h-8 p-0 min-h-0 ${
                              p.featured
                                ? 'text-[var(--admin-warning)]'
                                : 'text-[var(--admin-text-tertiary)] hover:text-[var(--admin-text-primary)]'
                            }`}
                            title="Toggle Featured"
                          >
                            <span
                              className="material-symbols-outlined text-[18px]"
                              style={{
                                fontVariationSettings: p.featured ? "'FILL' 1" : "'FILL' 0",
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
                            <span className="material-symbols-outlined text-[16px]">edit</span>
                          </button>
                          <button
                            onClick={() => deleteProduct(p.id)}
                            className="admin-btn-icon w-8 h-8 p-0 min-h-0 text-[var(--admin-text-tertiary)] hover:text-[var(--admin-error)] hover:bg-[var(--admin-error-light)]"
                            title="Delete"
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

            {/* Mobile Stacked Cards (replaces table on small screens) */}
            <div className="flex md:hidden flex-col gap-3 p-3 bg-[var(--admin-bg-subtle)]">
              {filteredProducts.map((p) => (
                <div
                  key={p.id}
                  onClick={() => navigate(`/admin/products/edit/${p.id}`)}
                  className="bg-[var(--admin-surface)] rounded-[var(--admin-radius-lg)] p-3 shadow-sm border border-[var(--admin-border)] flex flex-col gap-3 cursor-pointer hover:border-[var(--admin-border-strong)] transition-all"
                >
                  <div className="flex items-start gap-3">
                    <img
                      onError={handleImageError}
                      src={p.image}
                      alt={p.name}
                      className="w-16 h-16 rounded-[var(--admin-radius-md)] object-cover border border-[var(--admin-border-subtle)] shrink-0"
                    />
                    <div className="flex-1 min-w-0 pt-0.5">
                      <div className="flex justify-between items-start gap-2">
                        <p className="font-bold text-[var(--admin-text-primary)] text-[13px] leading-tight line-clamp-2">
                          {p.name}
                        </p>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            // show action sheet here normally, for now we will just link to edit
                            navigate(`/admin/products/edit/${p.id}`);
                          }}
                          className="admin-btn-icon w-8 h-8 p-0 min-h-0 text-[var(--admin-text-tertiary)] -mr-2 -mt-1"
                        >
                          <span className="material-symbols-outlined text-[18px]">more_vert</span>
                        </button>
                      </div>
                      <p className="text-[11px] text-[var(--admin-text-tertiary)] mt-1">
                        {p.category}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-[var(--admin-border-subtle)]">
                    <span className="font-bold text-[var(--admin-text-primary)] text-[14px]">
                      {formatCurrency(p.price)}
                    </span>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[11px] font-bold ${p.stock === 0 ? 'text-[var(--admin-error)]' : 'text-[var(--admin-text-secondary)]'}`}
                      >
                        Stock: {p.stock}
                      </span>
                      <StatusBadge
                        status={statusLabels[p.status] || p.status}
                        className="border-none px-1.5 py-0.5 text-[9px]"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        ) : (
          /* Grid View */
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
                  {p.featured && (
                    <div className="absolute top-3 left-3 bg-[var(--admin-bg)] text-[var(--admin-text-primary)] px-2.5 py-1 rounded-[var(--admin-radius-sm)] text-[9px] font-extrabold uppercase tracking-widest shadow-[var(--admin-shadow-sm)]">
                      Featured
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
        <div className="pt-4 flex items-center justify-between">
          <button
            onClick={() => {
              setSelectedCategory('All');
              setSelectedStatus('All');
            }}
            className="text-[12px] font-bold text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)]"
          >
            Clear Filters
          </button>
        </div>
      </MobileFilterDrawer>
    </motion.div>
  );
}
