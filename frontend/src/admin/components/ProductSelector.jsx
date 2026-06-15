import { useState, useEffect } from 'react';
import { productService } from '../../services/api/productService';
import logger from '../../utils/logger';
import toast from 'react-hot-toast';

export function ProductSelector({ selectedIds = [], onChange, maxItems = null }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        // Fetch all products for admin
        const res = await productService.getAdminAll({ limit: 1000 });
        if (Array.isArray(res?.data?.data)) {
          setProducts(res.data.data);
        } else if (Array.isArray(res?.data?.items)) {
          setProducts(res.data.items);
        } else if (Array.isArray(res?.data?.products)) {
          setProducts(res.data.products);
        } else if (Array.isArray(res?.data)) {
          setProducts(res.data);
        } else if (Array.isArray(res)) {
          setProducts(res);
        } else {
          setProducts([]);
        }
      } catch (err) {
        logger.error('Failed to fetch products for selector', err);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  const toggleProduct = (productId) => {
    const isSelected = selectedIds.includes(productId);
    let newIds = [...selectedIds];

    if (isSelected) {
      newIds = newIds.filter((id) => id !== productId);
    } else {
      if (maxItems && newIds.length >= maxItems) {
        alert(`You can only select up to ${maxItems} items.`);
        return;
      }
      newIds.push(productId);
    }
    onChange(newIds);
  };

  const handleToggleFeatured = async (e, product) => {
    e.stopPropagation(); // Prevent selecting the card
    const productId = product._id || product.id;
    try {
      await productService.toggleFeatured(productId);
      // Update local state to reflect the change
      setProducts((prev) =>
        prev.map((p) => ((p._id || p.id) === productId ? { ...p, featured: !p.featured } : p)),
      );
      toast.success(
        `Product ${product.featured ? 'removed from featured' : 'marked as featured'} successfully!`,
      );
    } catch (err) {
      toast.error('Failed to toggle featured status');
      logger.error('Failed to toggle featured status: ', err);
    }
  };

  const filteredProducts = products
    .filter((p) => {
      const id = p._id || p.id;
      return (
        p.title?.toLowerCase().includes(search.toLowerCase()) ||
        id?.toLowerCase().includes(search.toLowerCase())
      );
    })
    .sort((a, b) => {
      const aId = a._id || a.id;
      const bId = b._id || b.id;
      const aSelected = selectedIds.includes(aId);
      const bSelected = selectedIds.includes(bId);
      if (aSelected && !bSelected) return -1;
      if (!aSelected && bSelected) return 1;
      return 0;
    });

  return (
    <div className="space-y-4">
      {/* Selected Items Chips */}
      {selectedIds.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {selectedIds.map((id) => {
            const product = products.find((p) => (p._id || p.id) === id);
            if (!product) return null;
            return (
              <span
                key={id}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[var(--admin-accent)]/10 border border-[var(--admin-accent)]/30 text-[var(--admin-accent)] text-[11px] font-semibold rounded-lg shadow-sm"
              >
                <div
                  className="w-4 h-4 rounded-full bg-cover bg-center shrink-0 border border-[var(--admin-accent)]/20"
                  style={{ backgroundImage: `url(${product.images?.[0]?.url || product.image})` }}
                />
                <span className="truncate max-w-[150px]">{product.title || product.name}</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleProduct(id);
                  }}
                  className="w-4 h-4 rounded-full hover:bg-[var(--admin-accent)]/20 flex items-center justify-center transition-colors shrink-0"
                >
                  <span className="material-symbols-outlined text-[12px] font-bold">close</span>
                </button>
              </span>
            );
          })}
        </div>
      )}

      <AdminField label="Search Products to Add">
        <div className="relative flex items-center w-full shadow-[var(--admin-shadow-xs)] rounded-xl">
          <span className="material-symbols-outlined absolute left-3.5 text-[var(--admin-text-tertiary)] text-[16px]">
            search
          </span>
          <input
            type="text"
            placeholder="Search by product title or ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-[12px] rounded-xl border border-[var(--admin-border)] focus:border-[var(--admin-accent)] focus:outline-none bg-[var(--admin-surface-muted)] hover:bg-[var(--admin-surface)] text-[var(--admin-text-primary)] transition-colors"
          />
        </div>
      </AdminField>

      <div className="flex justify-between items-center text-[11px] font-semibold text-[var(--admin-text-secondary)] uppercase tracking-wider mb-2">
        <span>Available Products</span>
        <span>
          {selectedIds.length} {maxItems ? `/ ${maxItems}` : ''} Selected
        </span>
      </div>

      <div className="border border-[var(--admin-border)] rounded-2xl bg-[var(--admin-surface)] max-h-[360px] overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-[var(--admin-border)] hover:scrollbar-thumb-[var(--admin-border-subtle)]">
        {loading ? (
          <div className="flex justify-center items-center py-10">
            <div className="w-5 h-5 border-2 border-[var(--admin-accent)] border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-8 text-[var(--admin-text-tertiary)] text-[12px]">
            No products found matching "{search}"
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {filteredProducts.map((product) => {
              const productId = product._id || product.id;
              const isSelected = selectedIds.includes(productId);

              // Find the index to show order (1, 2, 3...)
              const selectedIndex = selectedIds.indexOf(productId);

              return (
                <div
                  key={productId}
                  onClick={() => toggleProduct(productId)}
                  className={`relative group cursor-pointer rounded-xl border transition-all overflow-hidden p-2 flex flex-col gap-2
                    ${
                      isSelected
                        ? 'border-[var(--admin-accent)] bg-[var(--admin-accent)]/5 shadow-[var(--admin-shadow-sm)]'
                        : product.featured
                          ? 'border-[#BFA15F] bg-[#BFA15F]/10 hover:shadow-[var(--admin-shadow-xs)]'
                          : 'border-[var(--admin-border)] bg-[var(--admin-surface-muted)] hover:border-[var(--admin-border-subtle)] hover:shadow-[var(--admin-shadow-xs)]'
                    }
                  `}
                >
                  {isSelected && (
                    <div className="absolute top-1.5 right-1.5 z-10 w-5 h-5 rounded-full bg-[var(--admin-accent)] text-white flex items-center justify-center text-[10px] font-bold shadow-sm">
                      {selectedIndex + 1}
                    </div>
                  )}

                  {/* Featured Toggle Button */}
                  <button
                    type="button"
                    onClick={(e) => handleToggleFeatured(e, product)}
                    className={`absolute top-1.5 left-1.5 z-20 w-7 h-7 min-w-[28px] min-h-[28px] p-0 m-0 border-none outline-none rounded-full flex items-center justify-center transition-all shrink-0 ${
                      product.featured
                        ? 'bg-[#BFA15F] text-white shadow-sm'
                        : 'bg-black/20 text-white/70 hover:bg-black/40 hover:text-white backdrop-blur-sm opacity-0 group-hover:opacity-100'
                    }`}
                    title={product.featured ? 'Remove from Featured' : 'Mark as Featured'}
                  >
                    <span
                      className="material-symbols-outlined text-[16px] leading-none block"
                      style={{ fontVariationSettings: product.featured ? "'FILL' 1" : "'FILL' 0" }}
                    >
                      star
                    </span>
                  </button>

                  <div className="w-full aspect-square rounded-lg overflow-hidden bg-white/50 relative">
                    {product.imageSrc || product.images?.[0] ? (
                      <CloudinaryImage
                        src={product.imageSrc || product.images[0]}
                        alt={product.title}
                        className={`w-full h-full object-cover transition-transform duration-500 ${isSelected ? 'scale-105' : 'group-hover:scale-105'}`}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-[var(--admin-border)]/20 text-[var(--admin-text-tertiary)]">
                        <span className="material-symbols-outlined">image</span>
                      </div>
                    )}

                    {isSelected && (
                      <div className="absolute inset-0 bg-[var(--admin-accent)]/10 mix-blend-multiply pointer-events-none" />
                    )}
                  </div>

                  <div className="flex flex-col flex-1 min-w-0">
                    <span
                      className="text-[11px] font-semibold text-[var(--admin-text-primary)] truncate"
                      title={product.title}
                    >
                      {product.title}
                    </span>
                    <span className="text-[10px] font-bold text-[var(--admin-accent)] mt-0.5">
                      ₹{product.price?.toLocaleString('en-IN') || 0}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
