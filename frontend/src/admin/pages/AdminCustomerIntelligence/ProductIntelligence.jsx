import React, { useState, useEffect } from 'react';
import { ShoppingBag, Search, ExternalLink } from 'lucide-react';
import { customerIntelligenceService, productService } from '../../../services/domainServices';

export default function ProductIntelligence() {
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [affinities, setAffinities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  // Fetch some popular products for the dropdown initially
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await productService.getAllProducts({ limit: 50, search });
        setProducts(res.products || []);
      } catch (err) {
        console.error(err);
      }
    };
    const timer = setTimeout(() => fetchProducts(), 500);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch affinities when a product is selected
  useEffect(() => {
    if (!selectedProduct) return;
    const fetchAffinities = async () => {
      setLoading(true);
      try {
        const data = await customerIntelligenceService.getProductAffinities(selectedProduct._id);
        setAffinities(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchAffinities();
  }, [selectedProduct]);

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <ShoppingBag className="w-5 h-5 text-[var(--admin-accent)]" />
          Product Affinity Analysis
        </h2>
        <p className="text-sm text-gray-500 mb-6">
          Discover which products are frequently bought together to optimize bundles and
          recommendations.
        </p>

        <div className="relative max-w-md mb-8">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search a product to analyze..."
            className="w-full pl-10 pr-4 py-3 border border-[var(--admin-border)] rounded-lg focus:ring-2 focus:ring-[var(--admin-accent)] focus:border-[var(--admin-accent)] outline-none transition-all"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          {search && !selectedProduct && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-60 overflow-y-auto">
              {products.map((p) => (
                <button
                  key={p._id}
                  onClick={() => {
                    setSelectedProduct(p);
                    setSearch('');
                  }}
                  className="w-full text-left px-4 py-2 hover:bg-gray-50 border-b border-gray-100 last:border-0 flex items-center gap-3"
                >
                  <img src={p.images[0]} alt="" className="w-8 h-8 rounded object-cover" />
                  <span className="text-sm font-medium text-gray-900 truncate">{p.title}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {selectedProduct && (
          <div className="border-t border-gray-200 pt-8">
            <div className="flex items-center gap-4 mb-6 p-4 bg-[var(--admin-surface-muted)] rounded-lg border border-[var(--admin-border-subtle)]">
              <img
                src={selectedProduct.images?.[0]}
                alt=""
                className="w-16 h-16 rounded shadow-sm object-cover bg-white"
              />
              <div>
                <h3 className="font-semibold text-[var(--admin-text-primary)]">
                  Analyzing: {selectedProduct.title}
                </h3>
                <p className="text-sm text-[var(--admin-text-secondary)]">
                  Customers who bought this also bought...
                </p>
              </div>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-32 admin-skeleton w-full rounded-xl" />
                ))}
              </div>
            ) : affinities.length === 0 ? (
              <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                Not enough co-occurrence data for this product yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {affinities.map((aff, i) => (
                  <div
                    key={i}
                    className="flex flex-col p-4 border border-[var(--admin-border-subtle)] rounded-xl hover:border-[var(--admin-accent)] transition-colors bg-white shadow-sm relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 bg-[var(--admin-accent)] text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
                      {aff.confidence.toFixed(1)}% Match
                    </div>

                    <div className="flex items-center gap-4 mt-2 mb-4">
                      <img
                        src={aff.productDetails?.images?.[0]}
                        alt=""
                        className="w-12 h-12 rounded object-cover border border-gray-100"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {aff.productDetails?.title}
                        </p>
                        <p className="text-xs text-gray-500">{aff.productDetails?.category}</p>
                      </div>
                    </div>

                    <div className="mt-auto pt-3 border-t border-gray-100 flex items-center justify-between">
                      <span className="text-sm text-gray-600 flex items-center gap-1">
                        <ShoppingBag className="w-4 h-4" />
                        Bought together {aff.cooccurrenceCount} times
                      </span>
                      <a
                        href={`/product/${aff.productB}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[var(--admin-accent)] hover:underline"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
