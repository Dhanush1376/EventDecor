import React, { useState, useMemo } from 'react';
import { formatCurrency, AdminToggle } from '../AdminUIKit';

export function CmsProductPicker({
  products = [],
  selectedIds = [],
  onChange,
  title = 'Link Shoppable Products',
  isAutoMode,
  onToggleAutoMode,
  autoModeLabel = 'Auto-Generated Feed',
}) {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [isFilterOpen, setIsFilterOpen] = useState(true);

  // Extract distinct categories
  const productCategories = useMemo(() => {
    const set = new Set();
    products.forEach((p) => {
      if (p.category && typeof p.category === 'string') {
        set.add(p.category.trim());
      }
    });
    return Array.from(set).sort();
  }, [products]);

  // Selected count
  const selectedCount = (selectedIds || []).length;

  // Filtered products based on search and category
  const filteredProducts = useMemo(() => {
    let list = products;

    if (categoryFilter === 'selected') {
      const idsSet = new Set(selectedIds || []);
      list = list.filter((p) => idsSet.has(p._id || p.id));
    } else if (categoryFilter !== 'all') {
      list = list.filter((p) => p.category === categoryFilter);
    }

    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter(
      (p) =>
        (p.title || p.name || '').toLowerCase().includes(q) ||
        (p.category || '').toLowerCase().includes(q) ||
        (p.sku || '').toLowerCase().includes(q),
    );
  }, [products, categoryFilter, search, selectedIds]);

  const handleToggle = (pId) => {
    if (isAutoMode) return;
    const current = selectedIds || [];
    if (current.includes(pId)) {
      onChange(current.filter((id) => id !== pId));
    } else {
      onChange([...current, pId]);
    }
  };

  const handleClearAll = () => {
    if (isAutoMode) return;
    onChange([]);
  };

  return (
    <div className="admin-card p-3 sm:p-4 space-y-2.5 sm:space-y-3 rounded-[8px] bg-[var(--admin-surface)] border border-[var(--admin-border)] shadow-xs">
      {/* ─── Ultra-Clean Header ─── */}
      <div className="flex items-center justify-between gap-2 border-b border-[var(--admin-border-subtle)] pb-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <span className="material-symbols-outlined text-[18px] text-[var(--admin-accent)] shrink-0">
            shopping_bag
          </span>
          <h3 className="font-bold text-[13px] sm:text-[14px] text-[var(--admin-text-primary)] truncate">
            {title}
          </h3>
          {!isAutoMode && selectedCount > 0 ? (
            <span className="px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-[var(--admin-accent)]/15 text-[var(--admin-accent)] border border-[var(--admin-accent)]/30 shrink-0">
              {selectedCount} selected
            </span>
          ) : !isAutoMode ? (
            <span className="text-[11px] text-[var(--admin-text-tertiary)] shrink-0 hidden sm:inline">
              0 selected
            </span>
          ) : null}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {onToggleAutoMode && (
            <AdminToggle label={autoModeLabel} checked={isAutoMode} onChange={onToggleAutoMode} />
          )}
          {!isAutoMode && selectedCount > 0 && (
            <button
              type="button"
              onClick={handleClearAll}
              className="text-[11px] font-bold text-rose-600 hover:text-rose-700 hover:underline cursor-pointer px-1 py-0.5 rounded transition-colors"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* ─── Auto-Mode Notice ─── */}
      {isAutoMode && (
        <div className="p-2.5 rounded-[6px] bg-[var(--admin-surface-muted)] border border-[var(--admin-border)] flex items-center justify-between gap-2 text-[11.5px] text-[var(--admin-text-secondary)]">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="material-symbols-outlined text-[16px] text-[var(--admin-accent)] shrink-0">
              auto_mode
            </span>
            <span className="truncate">Auto-feed active: displaying products automatically.</span>
          </div>
          <button
            type="button"
            onClick={onToggleAutoMode}
            className="px-2.5 py-0.8 rounded-[4px] bg-[var(--admin-surface)] hover:bg-[var(--admin-surface-hover)] text-[var(--admin-accent)] border border-[var(--admin-border)] text-[11px] font-bold cursor-pointer transition-all shrink-0 shadow-2xs"
          >
            Manual
          </button>
        </div>
      )}

      {/* ─── Search & View Toolbar ─── */}
      <div
        className={`flex items-center gap-2 transition-opacity ${
          isAutoMode ? 'opacity-40 pointer-events-none' : 'opacity-100'
        }`}
      >
        <div className="relative flex-1">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[var(--admin-text-tertiary)] text-[17px] pointer-events-none">
            search
          </span>
          <input
            type="text"
            value={search}
            disabled={isAutoMode}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products..."
            className="w-full h-9 bg-[var(--admin-surface)] border border-[var(--admin-border)] focus:border-[var(--admin-accent)] focus:ring-1 focus:ring-[var(--admin-accent)] rounded-[6px] pl-10 pr-8 text-[12px] text-[var(--admin-text-primary)] placeholder:text-[var(--admin-text-tertiary)] outline-none transition-colors"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--admin-text-tertiary)] hover:text-[var(--admin-text-primary)] text-[13px] cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>

        {/* Filter Toggle Button */}
        <button
          type="button"
          disabled={isAutoMode}
          onClick={() => setIsFilterOpen((prev) => !prev)}
          className={`h-9 px-2.5 sm:px-3 rounded-[6px] border text-[12px] font-semibold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
            isFilterOpen || categoryFilter !== 'all'
              ? 'bg-[var(--admin-accent)] text-white border-[var(--admin-accent)] shadow-2xs'
              : 'bg-[var(--admin-surface)] text-[var(--admin-text-secondary)] border border-[var(--admin-border)] hover:bg-[var(--admin-surface-muted)] hover:text-[var(--admin-text-primary)]'
          }`}
          title={isFilterOpen ? 'Hide Filters' : 'Open Filters'}
        >
          <span className="material-symbols-outlined text-[16px]">tune</span>
          <span className="hidden sm:inline">Filters</span>
          {categoryFilter !== 'all' && (
            <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0" />
          )}
        </button>

        {/* View Toggle */}
        <div className="flex items-center gap-0.5 bg-[var(--admin-surface-muted)] p-0.5 rounded-[6px] border border-[var(--admin-border)] shrink-0 h-9">
          <button
            type="button"
            disabled={isAutoMode}
            onClick={() => setViewMode('grid')}
            className={`w-7 h-7 rounded-[4px] flex items-center justify-center cursor-pointer transition-all ${
              viewMode === 'grid'
                ? 'bg-[var(--admin-surface)] text-[var(--admin-accent)] shadow-2xs border border-[var(--admin-border)]'
                : 'text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)]'
            }`}
            title="Grid View"
          >
            <span className="material-symbols-outlined text-[16px] block">grid_view</span>
          </button>
          <button
            type="button"
            disabled={isAutoMode}
            onClick={() => setViewMode('list')}
            className={`w-7 h-7 rounded-[4px] flex items-center justify-center cursor-pointer transition-all ${
              viewMode === 'list'
                ? 'bg-[var(--admin-surface)] text-[var(--admin-accent)] shadow-2xs border border-[var(--admin-border)]'
                : 'text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)]'
            }`}
            title="List View"
          >
            <span className="material-symbols-outlined text-[16px] block">view_list</span>
          </button>
        </div>
      </div>

      {/* ─── Clean Category Filter Pills (Collapsible / Openable) ─── */}
      {isFilterOpen && (
        <div
          className={`flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 text-[11px] transition-opacity ${
            isAutoMode ? 'opacity-40 pointer-events-none' : 'opacity-100'
          }`}
        >
          <button
            type="button"
            onClick={() => setCategoryFilter('all')}
            className={`h-7 px-2.5 rounded-full font-medium transition-all cursor-pointer shrink-0 text-[11.5px] ${
              categoryFilter === 'all'
                ? 'bg-[var(--admin-accent)] text-white shadow-2xs font-semibold'
                : 'bg-[var(--admin-surface-muted)] text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)] hover:bg-[var(--admin-surface-hover)] border border-[var(--admin-border)]'
            }`}
          >
            All ({products.length})
          </button>

          {selectedCount > 0 && (
            <button
              type="button"
              onClick={() => setCategoryFilter('selected')}
              className={`h-7 px-2.5 rounded-full font-medium transition-all cursor-pointer shrink-0 flex items-center gap-1 text-[11.5px] ${
                categoryFilter === 'selected'
                  ? 'bg-[var(--admin-accent)] text-white shadow-2xs font-semibold'
                  : 'bg-[var(--admin-accent)]/10 text-[var(--admin-accent)] border border-[var(--admin-accent)]/30 hover:bg-[var(--admin-accent)]/20'
              }`}
            >
              <span className="material-symbols-outlined text-[13px]">check_circle</span>
              Selected ({selectedCount})
            </button>
          )}

          {productCategories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategoryFilter(cat)}
              className={`h-7 px-2.5 rounded-full font-medium transition-all cursor-pointer shrink-0 text-[11.5px] ${
                categoryFilter === cat
                  ? 'bg-[var(--admin-accent)] text-white shadow-2xs font-semibold'
                  : 'bg-[var(--admin-surface-muted)] text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)] hover:bg-[var(--admin-surface-hover)] border border-[var(--admin-border)]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* ─── Product Cards Grid / List ─── */}
      <div
        className={`transition-all duration-300 ${isAutoMode ? 'opacity-40 pointer-events-none grayscale-[40%]' : 'opacity-100'}`}
      >
        {filteredProducts.length === 0 ? (
          <div className="py-8 px-4 text-center rounded-[6px] bg-[var(--admin-surface-muted)]/40 border border-dashed border-[var(--admin-border)] space-y-1.5">
            <span className="material-symbols-outlined text-[26px] text-[var(--admin-text-tertiary)]">
              search_off
            </span>
            <p className="text-[12px] font-medium text-[var(--admin-text-secondary)]">
              No products found
            </p>
            {(search || categoryFilter !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setCategoryFilter('all');
                }}
                className="text-[11px] font-bold text-[var(--admin-accent)] hover:underline cursor-pointer"
              >
                Reset filters
              </button>
            )}
          </div>
        ) : viewMode === 'grid' ? (
          /* ─── GRID VIEW ─── */
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-2.5 max-h-[420px] sm:max-h-[500px] xl:max-h-[560px] overflow-y-auto custom-scrollbar p-0.5">
            {filteredProducts.map((p) => {
              const pId = p._id || p.id;
              const isChecked = (selectedIds || []).includes(pId);
              const thumb =
                p.imageSrc ||
                p.image ||
                p.thumbnail ||
                p.images?.[0]?.url ||
                (typeof p.images?.[0] === 'string' ? p.images[0] : null);
              const pTitle = p.title || p.name || 'Product';

              return (
                <div
                  key={pId}
                  onClick={() => handleToggle(pId)}
                  className={`group relative rounded-[7px] border overflow-hidden cursor-pointer transition-all duration-150 flex flex-col bg-[var(--admin-surface)] ${
                    isChecked
                      ? 'border-[var(--admin-accent)] ring-1.5 ring-[var(--admin-accent)]/25 shadow-xs bg-[var(--admin-accent)]/[0.02]'
                      : 'border-[var(--admin-border)] hover:border-[var(--admin-accent)]/40 hover:shadow-2xs'
                  }`}
                >
                  {/* Image Container */}
                  <div className="relative aspect-square w-full bg-[var(--admin-surface-muted)] overflow-hidden">
                    {thumb ? (
                      <img
                        src={thumb}
                        alt={pTitle}
                        className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-200"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[var(--admin-text-tertiary)]">
                        <span className="material-symbols-outlined text-[24px]">inventory_2</span>
                      </div>
                    )}

                    {/* Sleek Selection Checkbox Badge */}
                    <div className="absolute top-1.5 right-1.5 z-10">
                      <div
                        className={`w-5.5 h-5.5 rounded-full flex items-center justify-center transition-all ${
                          isChecked
                            ? 'bg-[var(--admin-accent)] text-white shadow-xs scale-105 border border-white/50'
                            : 'bg-black/25 backdrop-blur-xs border border-white/70 text-transparent group-hover:border-white group-hover:bg-black/40'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[13px] font-bold">
                          check
                        </span>
                      </div>
                    </div>

                    {/* Subtle Category Pill */}
                    {p.category && (
                      <div className="absolute bottom-1.5 left-1.5 z-10 max-w-[80%]">
                        <span className="block truncate px-1.5 py-0.2 rounded-full text-[8.5px] font-bold uppercase tracking-wider bg-black/60 backdrop-blur-xs text-white">
                          {p.category}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Details */}
                  <div className="p-2 flex-1 flex flex-col justify-between gap-1">
                    <h4
                      className="text-[11.5px] font-semibold text-[var(--admin-text-primary)] truncate leading-tight"
                      title={pTitle}
                    >
                      {pTitle}
                    </h4>
                    <div className="flex items-center justify-between gap-1 pt-0.5 border-t border-[var(--admin-border-subtle)]">
                      <span className="text-[11.5px] font-bold text-emerald-600 dark:text-emerald-400">
                        {p.price !== undefined ? formatCurrency(p.price) : ''}
                      </span>
                      {isChecked && (
                        <span className="text-[9px] font-bold text-[var(--admin-accent)] uppercase tracking-wider">
                          Selected
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* ─── LIST VIEW ─── */
          <div className="space-y-1.5 max-h-[420px] sm:max-h-[500px] xl:max-h-[560px] overflow-y-auto custom-scrollbar p-0.5">
            {filteredProducts.map((p) => {
              const pId = p._id || p.id;
              const isChecked = (selectedIds || []).includes(pId);
              const thumb =
                p.imageSrc ||
                p.image ||
                p.thumbnail ||
                p.images?.[0]?.url ||
                (typeof p.images?.[0] === 'string' ? p.images[0] : null);
              const pTitle = p.title || p.name || 'Product';

              return (
                <div
                  key={pId}
                  onClick={() => handleToggle(pId)}
                  className={`flex items-center gap-2.5 p-2 rounded-[6px] cursor-pointer transition-all border ${
                    isChecked
                      ? 'bg-[var(--admin-accent)]/8 border-[var(--admin-accent)] shadow-2xs'
                      : 'bg-[var(--admin-surface)] border-[var(--admin-border)] hover:border-[var(--admin-border-subtle)]'
                  }`}
                >
                  <div
                    className={`w-4.5 h-4.5 rounded-full flex items-center justify-center shrink-0 transition-all ${
                      isChecked
                        ? 'bg-[var(--admin-accent)] text-white shadow-2xs'
                        : 'border border-[var(--admin-border-strong)] bg-[var(--admin-surface)] text-transparent'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[12px] font-bold">check</span>
                  </div>

                  {thumb ? (
                    <img
                      src={thumb}
                      alt=""
                      className="w-8 h-8 rounded-[4px] object-cover border border-[var(--admin-border)] bg-stone-100 shrink-0"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-[4px] bg-[var(--admin-surface-muted)] border border-[var(--admin-border)] flex items-center justify-center text-[var(--admin-text-tertiary)] shrink-0">
                      <span className="material-symbols-outlined text-[16px]">inventory_2</span>
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <p className="text-[11.5px] font-bold text-[var(--admin-text-primary)] truncate leading-tight">
                      {pTitle}
                    </p>
                    <div className="flex items-center gap-2 mt-0.2">
                      <span className="text-[10px] text-[var(--admin-text-tertiary)]">
                        {p.category || 'Product'}
                      </span>
                      {p.sku && (
                        <span className="text-[9.5px] text-[var(--admin-text-tertiary)] bg-[var(--admin-surface-muted)] px-1 rounded">
                          SKU: {p.sku}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="text-[11.5px] font-bold text-emerald-600 dark:text-emerald-400">
                      {p.price !== undefined ? formatCurrency(p.price) : ''}
                    </p>
                    {isChecked && (
                      <span className="text-[9px] font-bold text-[var(--admin-accent)] uppercase tracking-wider">
                        Selected
                      </span>
                    )}
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
