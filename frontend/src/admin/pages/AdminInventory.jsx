import { m as motion } from 'framer-motion';
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdmin } from '../context/AdminContext';
import { useCategories } from '../../hooks/useProductQueries';
import { handleImageError } from '../../utils/media/imageUtils';
import { productService } from '../../services/api/productService';
import { refreshWebsiteContent } from '../../hooks/useWebsiteContent';
import toast from 'react-hot-toast';
import { getErrorMessage } from '../../utils/core/errorHelpers';
import {
  PageHeader,
  StatusBadge,
  SkeletonTable,
  AdminToggle,
  fadeUp,
  stagger,
} from '../components/AdminUIKit';

export function AdminInventory() {
  const navigate = useNavigate();
  const { products, setProducts, refreshProducts, dataLoading } = useAdmin();
  const { data: productCategories = [] } = useCategories();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [sortBy, setSortBy] = useState('stock-asc');
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);

  const handleRefreshStock = async () => {
    setIsRefreshing(true);
    await refreshProducts();
    setIsRefreshing(false);
  };

  const handleUpdateStock = async (product, newStockStr) => {
    const newStock = parseInt(newStockStr, 10);
    if (isNaN(newStock) || newStock < 0) {
      toast.error('Please enter a valid stock number.');
      return;
    }
    if (newStock === product.stock) return;

    const previousStock = product.stock;
    try {
      setProducts((prev) =>
        prev.map((p) =>
          (p._id || p.id) === (product._id || product.id) ? { ...p, stock: newStock } : p,
        ),
      );

      const res = await productService.update(product._id || product.id, {
        stock: newStock,
      });

      if (res.success) {
        toast.success(`Stock updated to ${newStock} for ${product.name}`);
        await refreshWebsiteContent();
      } else {
        throw new Error('API failed');
      }
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to update stock. Reverting.'));
      setProducts((prev) =>
        prev.map((p) =>
          (p._id || p.id) === (product._id || product.id) ? { ...p, stock: previousStock } : p,
        ),
      );
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
    else if (sortBy === 'newest') result.sort((a, b) => b.id.localeCompare(a.id));

    return result;
  }, [products, selectedCategory, selectedStatus, searchQuery, showLowStockOnly, sortBy]);

  return (
    <motion.div initial="hidden" animate="show" variants={stagger} className="space-y-6">
      {dataLoading ? (
        <SkeletonTable rows={8} cols={6} />
      ) : (
        <>
          <PageHeader
            title="Inventory"
            subtitle="Stock levels across all products"
            className="relative"
          >
            <div className="absolute top-1 right-0 sm:relative sm:top-auto sm:right-auto shrink-0">
              <button
                onClick={handleRefreshStock}
                disabled={isRefreshing}
                className="p-1.5 hover:bg-[var(--admin-surface-muted)] text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)] rounded-lg flex items-center justify-center cursor-pointer transition-all active:scale-95"
                title="Refresh Stock"
              >
                <span
                  className={`material-symbols-outlined text-[20px] ${isRefreshing ? 'animate-spin' : ''}`}
                >
                  sync
                </span>
              </button>
            </div>
          </PageHeader>

          <div className="flex flex-row items-stretch gap-2 shrink-0 w-full overflow-x-auto no-scrollbar pb-1 sm:pb-0 -mx-1 px-1 mb-6">
            {/* Search Bar */}
            <div className="relative shrink-0 flex-1 min-w-[220px] bg-[var(--admin-surface-muted)] border border-[var(--admin-border-subtle)] rounded-[var(--admin-radius-lg)] p-0.5 flex flex-col justify-center">
              <span
                className="material-symbols-outlined absolute left-2 text-[var(--admin-text-tertiary)] pointer-events-none z-10"
                style={{ fontSize: '14px', top: '50%', transform: 'translateY(-50%)' }}
              >
                search
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name or ID..."
                className="w-full h-full min-h-[32px] pl-7 pr-2 bg-[var(--admin-surface)] border border-[var(--admin-border-subtle)] shadow-[var(--admin-shadow-xs)] rounded-[var(--admin-radius-sm)] text-[12px] font-semibold text-[var(--admin-text-primary)] placeholder-[var(--admin-text-tertiary)] focus:outline-none transition-all m-0"
              />
            </div>

            {/* Separator */}
            <div className="w-[1px] bg-[var(--admin-border-subtle)] shrink-0 my-1"></div>

            {/* Categories & Statuses */}
            <div className="relative shrink-0 w-[150px] bg-[var(--admin-surface-muted)] border border-[var(--admin-border-subtle)] rounded-[var(--admin-radius-lg)] p-0.5 flex flex-col justify-center">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full h-full min-h-[32px] pl-2 pr-7 bg-[var(--admin-surface)] border border-[var(--admin-border-subtle)] shadow-[var(--admin-shadow-xs)] rounded-[var(--admin-radius-sm)] text-[11px] font-semibold text-[var(--admin-text-primary)] focus:outline-none appearance-none cursor-pointer transition-all m-0"
              >
                <option value="All">All Categories</option>
                {productCategories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <span
                className="material-symbols-outlined absolute right-2 text-[14px] text-[var(--admin-text-tertiary)] pointer-events-none z-10"
                style={{ top: '50%', transform: 'translateY(-50%)' }}
              >
                expand_more
              </span>
            </div>

            <div className="relative shrink-0 w-[130px] bg-[var(--admin-surface-muted)] border border-[var(--admin-border-subtle)] rounded-[var(--admin-radius-lg)] p-0.5 flex flex-col justify-center">
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full h-full min-h-[32px] pl-2 pr-7 bg-[var(--admin-surface)] border border-[var(--admin-border-subtle)] shadow-[var(--admin-shadow-xs)] rounded-[var(--admin-radius-sm)] text-[11px] font-semibold text-[var(--admin-text-primary)] focus:outline-none appearance-none cursor-pointer transition-all m-0"
              >
                <option value="All">All Statuses</option>
                <option value="active">Active</option>
                <option value="low_stock">Low Stock</option>
                <option value="out_of_stock">Out of Stock</option>
              </select>
              <span
                className="material-symbols-outlined absolute right-2 text-[14px] text-[var(--admin-text-tertiary)] pointer-events-none z-10"
                style={{ top: '50%', transform: 'translateY(-50%)' }}
              >
                expand_more
              </span>
            </div>

            <div className="relative shrink-0 w-[150px] bg-[var(--admin-surface-muted)] border border-[var(--admin-border-subtle)] rounded-[var(--admin-radius-lg)] p-0.5 flex flex-col justify-center">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full h-full min-h-[32px] pl-2 pr-7 bg-[var(--admin-surface)] border border-[var(--admin-border-subtle)] shadow-[var(--admin-shadow-xs)] rounded-[var(--admin-radius-sm)] text-[11px] font-semibold text-[var(--admin-text-primary)] focus:outline-none appearance-none cursor-pointer transition-all m-0"
              >
                <option value="newest">Sort: Newest</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
                <option value="stock-asc">Stock: Low to High</option>
                <option value="stock-desc">Stock: High to Low</option>
              </select>
              <span
                className="material-symbols-outlined absolute right-2 text-[14px] text-[var(--admin-text-tertiary)] pointer-events-none z-10"
                style={{ top: '50%', transform: 'translateY(-50%)' }}
              >
                expand_more
              </span>
            </div>

            {/* Inventory Low Stock Toggle */}
            <div className="flex bg-[var(--admin-surface-muted)] border border-[var(--admin-border-subtle)] rounded-[var(--admin-radius-lg)] p-0.5 flex-col justify-center shrink-0">
              <div className="flex items-center gap-2 h-full min-h-[32px] px-2 bg-[var(--admin-surface)] border border-[var(--admin-border-subtle)] shadow-[var(--admin-shadow-xs)] rounded-[var(--admin-radius-sm)]">
                <AdminToggle
                  checked={showLowStockOnly}
                  onChange={() => setShowLowStockOnly(!showLowStockOnly)}
                />
                <span className="text-[11px] font-semibold text-[var(--admin-text-primary)] whitespace-nowrap">
                  Low Stock Only
                </span>
              </div>
            </div>
          </div>

          {/* Stock Table */}
          <motion.div variants={fadeUp} className="admin-card overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="admin-table w-full min-w-[700px]">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th className="hidden sm:table-cell">Category</th>
                    <th>Stock</th>
                    <th className="hidden sm:table-cell">Sold</th>
                    <th>Status</th>
                    <th className="text-right">Fast Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((p) => (
                    <tr
                      key={p.id}
                      className="hover:bg-[var(--admin-surface-hover)] transition-colors"
                    >
                      <td>
                        <div className="flex items-center gap-3">
                          <img
                            onError={handleImageError}
                            src={p.image}
                            alt={p.name}
                            className="w-9 h-9 rounded-[var(--admin-radius-md)] object-cover border border-[var(--admin-border-subtle)] shrink-0"
                          />
                          <div>
                            <p className="font-semibold text-[var(--admin-text-primary)] text-[12px]">
                              {p.name}
                            </p>
                            <p className="text-[10px] text-[var(--admin-text-tertiary)] font-medium uppercase tracking-wider mt-0.5">
                              {p.id.substring(p.id.length - 8).toUpperCase()}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="hidden sm:table-cell text-[var(--admin-text-secondary)] font-medium">
                        {p.category}
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="0"
                            className="admin-input !w-24 !max-w-[96px] h-8 text-[13px] font-bold text-center p-1 bg-[var(--admin-surface)]"
                            defaultValue={p.stock}
                            onBlur={(e) => handleUpdateStock(p, e.target.value)}
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
                      <td className="hidden sm:table-cell text-[var(--admin-text-tertiary)] font-medium">
                        {p.sold}
                      </td>
                      <td>
                        <StatusBadge
                          status={
                            p.stock === 0 ? 'Out of Stock' : p.stock <= 5 ? 'Low Stock' : 'Active'
                          }
                        />
                      </td>
                      <td className="text-right pr-6">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleUpdateStock(p, p.stock + 10)}
                            className="admin-btn-outline h-7 px-2 text-[10px]"
                            title="Add 10 units"
                          >
                            +10
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        </>
      )}
    </motion.div>
  );
}
