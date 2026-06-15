import { useState, useEffect } from 'react';
import { productService } from '../../services/api/productService';
import logger from '../../utils/logger';

export function CategorySelector({ selectedCategories = [], onChange, maxItems = null }) {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoading(true);
        const res = await productService.getCategories();
        if (Array.isArray(res?.data)) {
          setCategories(res.data);
        } else if (Array.isArray(res)) {
          setCategories(res);
        } else {
          setCategories([]);
        }
      } catch (err) {
        logger.error('Failed to fetch categories for selector', err);
      } finally {
        setLoading(false);
      }
    };
    fetchCategories();
  }, []);

  // Format array to only handle string identifiers for categories for simplicity
  const selectedIds = selectedCategories.map((c) =>
    typeof c === 'string' ? c : c.name || c.id || c.title,
  );

  const toggleCategory = (categoryObj) => {
    const categoryId = categoryObj.name || categoryObj.id || categoryObj.title;
    const isSelected = selectedIds.includes(categoryId);
    let newCategories = [...selectedCategories];

    if (isSelected) {
      newCategories = newCategories.filter((c) => {
        const id = typeof c === 'string' ? c : c.name || c.id || c.title;
        return id !== categoryId;
      });
    } else {
      if (maxItems && newCategories.length >= maxItems) {
        alert(`You can only select up to ${maxItems} items.`);
        return;
      }
      // Store the full object so the frontend has easy access to name/image without fetching
      newCategories.push({
        id: categoryObj.id || categoryObj._id,
        name: categoryObj.name || categoryObj.title || categoryId,
        image: categoryObj.image || categoryObj.thumbnail || null,
      });
    }
    onChange(newCategories);
  };

  const filteredCategories = categories
    .filter((c) => {
      const name = c.name || c.title || '';
      return name.toLowerCase().includes(search.toLowerCase());
    })
    .sort((a, b) => {
      const aId = a.name || a.id || a.title;
      const bId = b.name || b.id || b.title;
      const aSelected = selectedIds.includes(aId);
      const bSelected = selectedIds.includes(bId);
      if (aSelected && !bSelected) return -1;
      if (!aSelected && bSelected) return 1;
      return 0;
    });

  return (
    <div className="space-y-4">
      {/* Selected Items Chips */}
      {selectedCategories.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {selectedCategories.map((c, idx) => {
            const id = typeof c === 'string' ? c : c.name || c.id || c.title;
            const name = typeof c === 'string' ? c : c.name || c.title || id;
            return (
              <span
                key={id + idx}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[var(--admin-accent)]/10 border border-[var(--admin-accent)]/30 text-[var(--admin-accent)] text-[11px] font-semibold rounded-lg shadow-sm"
              >
                <span className="truncate max-w-[150px]">{name}</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleCategory({ name: id });
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

      <AdminField label="Search Categories to Add">
        <div className="relative flex items-center w-full shadow-[var(--admin-shadow-xs)] rounded-xl">
          <span className="material-symbols-outlined absolute left-3.5 text-[var(--admin-text-tertiary)] text-[16px]">
            search
          </span>
          <input
            type="text"
            placeholder="Search by category name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-[12px] rounded-xl border border-[var(--admin-border)] focus:border-[var(--admin-accent)] focus:outline-none bg-[var(--admin-surface-muted)] hover:bg-[var(--admin-surface)] text-[var(--admin-text-primary)] transition-colors"
          />
        </div>
      </AdminField>

      <div className="flex justify-between items-center text-[11px] font-semibold text-[var(--admin-text-secondary)] uppercase tracking-wider mb-2">
        <span>Available Categories</span>
        <span>
          {selectedCategories.length} {maxItems ? `/ ${maxItems}` : ''} Selected
        </span>
      </div>

      <div className="border border-[var(--admin-border)] rounded-2xl bg-[var(--admin-surface)] max-h-[360px] overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-[var(--admin-border)] hover:scrollbar-thumb-[var(--admin-border-subtle)]">
        {loading ? (
          <div className="flex justify-center items-center py-10">
            <div className="w-5 h-5 border-2 border-[var(--admin-accent)] border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : filteredCategories.length === 0 ? (
          <div className="text-center py-8 text-[var(--admin-text-tertiary)] text-[12px]">
            No categories found matching "{search}"
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {filteredCategories.map((category) => {
              const categoryId = category.name || category.id || category.title;
              const isSelected = selectedIds.includes(categoryId);
              const selectedIndex = selectedIds.indexOf(categoryId);

              return (
                <div
                  key={categoryId}
                  onClick={() => toggleCategory(category)}
                  className={`relative group cursor-pointer rounded-xl border transition-all overflow-hidden p-3 flex items-center gap-3
                    ${
                      isSelected
                        ? 'border-[var(--admin-accent)] bg-[var(--admin-accent)]/5 shadow-[var(--admin-shadow-sm)]'
                        : 'border-[var(--admin-border)] bg-[var(--admin-surface-muted)] hover:border-[var(--admin-border-subtle)] hover:shadow-[var(--admin-shadow-xs)]'
                    }
                  `}
                >
                  {isSelected && (
                    <div className="absolute top-1.5 right-1.5 z-10 w-5 h-5 rounded-full bg-[var(--admin-accent)] text-white flex items-center justify-center text-[10px] font-bold shadow-sm">
                      {selectedIndex + 1}
                    </div>
                  )}

                  <div className="w-10 h-10 rounded-lg overflow-hidden bg-[var(--admin-border)]/20 shrink-0 flex items-center justify-center text-[var(--admin-text-tertiary)] relative">
                    {category.image || category.thumbnail ? (
                      <img
                        src={category.image || category.thumbnail}
                        alt={categoryId}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="material-symbols-outlined text-[16px]">category</span>
                    )}
                    {isSelected && (
                      <div className="absolute inset-0 bg-[var(--admin-accent)]/20 mix-blend-multiply pointer-events-none" />
                    )}
                  </div>

                  <div className="flex flex-col flex-1 min-w-0">
                    <span
                      className="text-[12px] font-semibold text-[var(--admin-text-primary)] truncate"
                      title={category.name || category.title}
                    >
                      {category.name || category.title || categoryId}
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
