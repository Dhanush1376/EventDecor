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

          <div className="flex flex-col sm:flex-row items-stretch gap-2 w-full sm:w-auto mb-6">
            <div className="relative flex-1 sm:w-64 shrink-0 bg-[var(--admin-surface-muted)] rounded border border-[var(--admin-border)] flex items-center px-3">
              <span className="material-symbols-outlined text-[18px] text-[var(--admin-text-tertiary)] shrink-0">
                search
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name or ID..."
                className="bg-transparent border-none outline-none w-full text-[13px] text-[var(--admin-text-primary)] placeholder-[var(--admin-text-tertiary)] font-medium px-2 h-10 sm:h-10"
              />
            </div>
            <div className="flex items-stretch gap-2 w-full sm:w-auto overflow-hidden">
              <div className="relative flex items-stretch">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="bg-[var(--admin-surface-muted)] rounded border border-[var(--admin-border)] text-[12px] font-semibold text-[var(--admin-text-primary)] focus:outline-none cursor-pointer transition-all pl-2.5 pr-7 h-10 sm:h-10 appearance-none min-w-0 max-w-[130px] truncate"
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
              <div className="relative flex items-stretch">
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="bg-[var(--admin-surface-muted)] rounded border border-[var(--admin-border)] text-[12px] font-semibold text-[var(--admin-text-primary)] focus:outline-none cursor-pointer transition-all pl-2.5 pr-7 h-10 sm:h-10 appearance-none min-w-0 max-w-[110px] truncate"
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
              <div className="relative flex items-stretch">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="bg-[var(--admin-surface-muted)] rounded border border-[var(--admin-border)] text-[12px] font-semibold text-[var(--admin-text-primary)] focus:outline-none cursor-pointer transition-all pl-2.5 pr-7 h-10 sm:h-10 appearance-none min-w-0 max-w-[120px] truncate"
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
            </div>
          </div>

          {/* Stock Table */}
          <motion.div variants={fadeUp} className="admin-card overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="admin-table w-full min-w-full md:min-w-[700px]">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th className="hidden sm:table-cell">Category</th>
                    <th className="text-center">Stock</th>
                    <th className="hidden sm:table-cell text-center">Sold</th>
                    <th className="text-center">Status</th>
                    <th className="text-right pr-6">Fast Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((p) => (
                    <tr
                      key={p.id}
                      className="hover:bg-[var(--admin-surface-hover)] transition-colors"
                    >
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
                              className="font-semibold text-[var(--admin-text-primary)] text-[12px] truncate"
                              title={p.name}
                            >
                              {p.name}
                            </p>
                            <p className="text-[10px] text-[var(--admin-text-tertiary)] font-medium uppercase tracking-wider mt-0.5 truncate">
                              {p.id.substring(p.id.length - 8).toUpperCase()}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="hidden sm:table-cell text-[var(--admin-text-secondary)] font-medium">
                        {p.category}
                      </td>
                      <td>
                        <div className="flex items-center justify-center gap-2">
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
                      <td className="hidden sm:table-cell text-[var(--admin-text-tertiary)] font-medium text-center">
                        {p.sold}
                      </td>
                      <td>
                        <div className="flex justify-center">
                          <StatusBadge
                            status={
                              p.stock === 0 ? 'Out of Stock' : p.stock <= 5 ? 'Low Stock' : 'Active'
                            }
                          />
                        </div>
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
