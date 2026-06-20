import React, { useState, useEffect } from 'react';
import { SectionHeader, AdminField, AdminInput, AdminToggle } from '../AdminUIKit';
import { ImageUpload } from '../ImageUpload';
import { useAdmin } from '../../context/AdminContext';
import logger from '../../../utils/logger';

export function HomePageControllerEditor({ content, onUpdate }) {
  const [activeTab, setActiveTab] = useState('layout');
  const { products, _productsError } = useAdmin();
  const [coupons, setCoupons] = useState([]);
  const [loadingCoupons, setLoadingCoupons] = useState(false);

  const fetchAttempted = useRef(false);
  useEffect(() => {
    if (activeTab === 'promo' && !fetchAttempted.current) {
      fetchAttempted.current = true;
      setLoadingCoupons(true);
      import('../../../services/api/couponService').then(({ couponService }) => {
        couponService
          .getAll()
          .then((res) => {
            const payload = res?.data || res;
            const list = payload?.coupons || payload?.data || payload || [];
            setCoupons(Array.isArray(list) ? list : []);
          })
          .catch((err) => {
            logger.error('Failed to load coupons', err);
            setCoupons([]);
          })
          .finally(() => setLoadingCoupons(false));
      });
    }
  }, [activeTab]);

  const updateSectionState = (sectionId, field, value) => {
    onUpdate(sectionId, { ...(content[sectionId] || {}), [field]: value });
  };

  // Master Layout array
  const defaultSections = [
    { id: 'hero_1', isVisible: true },
    { id: 'promoBanner_1', isVisible: true },
    { id: 'categoryGrid_1', isVisible: true },
    { id: 'trendingProducts_1', isVisible: true },
    { id: 'shopByOccasion_1', isVisible: true },
    { id: 'featuredProducts_1', isVisible: true },
    { id: 'recommendedProducts_1', isVisible: true },
    { id: 'galleryInspiration_1', isVisible: true },
  ];

  const homepageSections = content.homepageSections || defaultSections;

  const moveSection = (idx, dir) => {
    const newSections = [...homepageSections];
    if (dir === -1 && idx > 0) {
      [newSections[idx], newSections[idx - 1]] = [newSections[idx - 1], newSections[idx]];
    } else if (dir === 1 && idx < newSections.length - 1) {
      [newSections[idx], newSections[idx + 1]] = [newSections[idx + 1], newSections[idx]];
    }
    onUpdate('homepageSections', newSections);
  };

  const toggleSectionVis = (idx) => {
    const newSections = [...homepageSections];
    newSections[idx] = {
      ...newSections[idx],
      isVisible: newSections[idx].isVisible === false ? true : false,
    };
    onUpdate('homepageSections', newSections);
  };

  return (
    <div className="admin-card p-6 space-y-6">
      <SectionHeader
        icon="home"
        title="Home Page Controller"
        description="Manage the storefront homepage layout, sections ordering, and content"
      />

      {/* Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-[var(--admin-border-subtle)] scrollbar-hide">
        {[
          'Layout',
          'Hero',
          'Promo',
          'Categories',
          'Trending',
          'Occasions',
          'Featured',
          'Recommended',
        ].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab.toLowerCase())}
            className={`px-4 py-2 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all border shrink-0 ${
              activeTab === tab.toLowerCase()
                ? 'bg-[var(--admin-accent)]/10 text-[var(--admin-accent)] border-[var(--admin-accent)]/30'
                : 'bg-[var(--admin-surface)] text-[var(--admin-text-secondary)] border-transparent hover:bg-[var(--admin-surface-muted)]'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'layout' && (
        <div className="space-y-3">
          <span className="text-[11px] font-semibold text-[var(--admin-accent)] uppercase tracking-[0.18em] block mb-4 border-b border-[var(--admin-border-subtle)] pb-2">
            Section Ordering & Visibility
          </span>
          {homepageSections.map((sec, idx) => (
            <div
              key={sec.id}
              className="flex items-center justify-between p-3 bg-[var(--admin-surface-muted)] rounded-xl border border-[var(--admin-border)] shadow-sm"
            >
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-[var(--admin-text-tertiary)] cursor-move">
                  drag_indicator
                </span>
                <span className="font-bold text-[12px]">{sec.id.split('_')[0]}</span>
              </div>
              <div className="flex items-center gap-4">
                <AdminToggle
                  checked={sec.isVisible !== false}
                  onChange={() => toggleSectionVis(idx)}
                />
                <div className="flex flex-col gap-1">
                  <button
                    disabled={idx === 0}
                    onClick={() => moveSection(idx, -1)}
                    className="disabled:opacity-30 hover:text-[var(--admin-accent)] cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[14px]">expand_less</span>
                  </button>
                  <button
                    disabled={idx === homepageSections.length - 1}
                    onClick={() => moveSection(idx, 1)}
                    className="disabled:opacity-30 hover:text-[var(--admin-accent)] cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[14px]">expand_more</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'hero' && (
        <div className="space-y-4">
          <span className="text-[11px] font-semibold text-[var(--admin-accent)] uppercase tracking-[0.18em] block mb-4 border-b border-[var(--admin-border-subtle)] pb-2">
            Select Hero Products (Debug: {products ? products.length : 'undefined'} products loaded)
          </span>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-h-[400px] overflow-y-auto pr-2 scrollbar-thin">
            {!products || products.length === 0 ? (
              <div className="col-span-full p-4 text-center text-[var(--admin-text-secondary)] text-[12px] bg-[var(--admin-surface-muted)] rounded-xl border border-[var(--admin-border)]">
                No products available to select. Check if products exist in the catalog or if the
                API failed.
              </div>
            ) : (
              products.map((prd) => {
                const isSelected = (content.hero?.selectedProductIds || []).includes(prd.id);
                return (
                  <div
                    key={prd.id}
                    onClick={() => {
                      const currentIds = content.hero?.selectedProductIds || [];
                      let newIds;
                      if (isSelected) {
                        newIds = currentIds.filter((id) => id !== prd.id);
                      } else {
                        newIds = [...currentIds, prd.id];
                      }
                      updateSectionState('hero', 'selectedProductIds', newIds);
                    }}
                    className={`relative p-3 rounded-2xl border cursor-pointer transition-all duration-300 flex flex-col gap-3 group ${
                      isSelected
                        ? 'bg-[var(--admin-surface)] border-[var(--admin-accent)] ring-1 ring-[var(--admin-accent)] shadow-[var(--admin-shadow-sm)]'
                        : 'bg-[var(--admin-surface)] border-[var(--admin-border)] opacity-70 hover:opacity-100 hover:border-[var(--admin-accent)]/50 shadow-[var(--admin-shadow-xs)]'
                    }`}
                  >
                    <div
                      className={`absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center z-10 transition-colors ${
                        isSelected
                          ? 'bg-[var(--admin-accent)] text-[var(--admin-text-inverse)]'
                          : 'bg-[var(--admin-surface-muted)] border border-[var(--admin-border-strong)] text-transparent group-hover:border-[var(--admin-accent)]/50'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[14px] font-bold">check</span>
                    </div>
                    <img
                      src={prd.image}
                      alt={prd.name}
                      className="w-full aspect-square object-cover rounded-xl shadow-inner border border-[var(--admin-border-subtle)]"
                    />
                    <div className="space-y-1">
                      <span className="text-[11px] font-bold text-[var(--admin-text-primary)] block line-clamp-1">
                        {prd.name}
                      </span>
                      <span className="text-[10px] font-semibold text-[var(--admin-accent)] uppercase tracking-wider block">
                        {prd.category}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {activeTab === 'promo' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between border border-[var(--admin-border)] px-4.5 py-3 rounded-2xl bg-[var(--admin-surface)] mt-5 h-[46px] shadow-[var(--admin-shadow-xs)]">
            <span className="text-[11px] font-semibold text-[var(--admin-text-secondary)] uppercase tracking-wider">
              Enable Promo Banner
            </span>
            <AdminToggle
              checked={content.promoBanner?.isActive !== false}
              onChange={() =>
                updateSectionState(
                  'promoBanner',
                  'isActive',
                  content.promoBanner?.isActive === false ? true : false,
                )
              }
            />
          </div>
          <AdminField label="Banner Text">
            <AdminInput
              value={content.promoBanner?.text || ''}
              onChange={(e) => updateSectionState('promoBanner', 'text', e.target.value)}
              className="!py-2.5 !text-[12px]"
            />
          </AdminField>
          <div className="grid grid-cols-2 gap-4">
            <AdminField label="CTA Text">
              <AdminInput
                value={content.promoBanner?.ctaText || ''}
                onChange={(e) => updateSectionState('promoBanner', 'ctaText', e.target.value)}
                className="!py-2.5 !text-[12px]"
              />
            </AdminField>
            <AdminField label="Select Coupon (Optional)">
              <select
                value={content.promoBanner?.couponCode || ''}
                onChange={(e) => updateSectionState('promoBanner', 'couponCode', e.target.value)}
                className="w-full bg-[var(--admin-surface-muted)] border border-[var(--admin-border)] text-[var(--admin-text-primary)] rounded-xl px-4 py-2.5 text-[12px] font-medium outline-none focus:border-[var(--admin-accent)] focus:ring-1 focus:ring-[var(--admin-accent)] transition-all cursor-pointer appearance-none"
                disabled={loadingCoupons}
              >
                <option value="">-- No Coupon Selected --</option>
                {coupons.map((c) => (
                  <option key={c._id || c.id} value={c.code}>
                    {c.code} (
                    {c.discountType === 'percentage'
                      ? `${c.discountValue}% OFF`
                      : `₹${c.discountValue} OFF`}
                    )
                  </option>
                ))}
              </select>
              <div className="absolute right-4 top-[50%] -translate-y-1/2 pointer-events-none text-[var(--admin-text-tertiary)]">
                {loadingCoupons ? (
                  <span className="material-symbols-outlined text-[14px] animate-spin block">
                    refresh
                  </span>
                ) : (
                  <span className="material-symbols-outlined text-[16px] block">expand_more</span>
                )}
              </div>
            </AdminField>
          </div>
          <AdminField label="Redirect Link">
            <AdminInput
              value={content.promoBanner?.link || ''}
              onChange={(e) => updateSectionState('promoBanner', 'link', e.target.value)}
              className="!py-2.5 !text-[12px]"
            />
          </AdminField>
        </div>
      )}

      {activeTab === 'categories' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <AdminField label="Section Title">
              <AdminInput
                value={content.categoryGrid?.sectionTitle || ''}
                onChange={(e) => updateSectionState('categoryGrid', 'sectionTitle', e.target.value)}
              />
            </AdminField>
            <AdminField label="Section Subtitle">
              <AdminInput
                value={content.categoryGrid?.sectionSubtitle || ''}
                onChange={(e) =>
                  updateSectionState('categoryGrid', 'sectionSubtitle', e.target.value)
                }
              />
            </AdminField>
          </div>

          <div className="pt-4 border-t border-[var(--admin-border-subtle)] space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-[11px] font-semibold text-[var(--admin-accent)] uppercase tracking-wider">
                Categories List
              </span>
              <button
                type="button"
                onClick={() => {
                  const cats = [...(content.categoryGrid?.categories || [])];
                  cats.push({ title: 'New Category', link: '', image: '' });
                  updateSectionState('categoryGrid', 'categories', cats);
                }}
                className="text-[11px] font-bold text-[var(--admin-accent)] hover:text-[var(--admin-text-inverse)] hover:bg-[var(--admin-accent)] border border-[var(--admin-accent)]/30 px-3 py-1 rounded-full cursor-pointer transition-colors"
              >
                + Add Category
              </button>
            </div>

            {(content.categoryGrid?.categories || []).map((cat, idx) => (
              <div
                key={`cat-${idx}`}
                className="relative p-5 pr-14 bg-[var(--admin-surface)] rounded-2xl border border-[var(--admin-border)] shadow-sm flex flex-col md:flex-row gap-6 items-center group"
              >
                <div className="flex-1 space-y-4 w-full">
                  <AdminField label="Category Title">
                    <AdminInput
                      value={cat.title || cat.name || ''}
                      onChange={(e) => {
                        const ObjectCopy = { ...content.categoryGrid };
                        const cats = [...(ObjectCopy.categories || [])];
                        cats[idx] = { ...cats[idx], title: e.target.value };
                        updateSectionState('categoryGrid', 'categories', cats);
                      }}
                    />
                  </AdminField>
                  <AdminField label="Destination Link">
                    <AdminInput
                      value={cat.link || ''}
                      onChange={(e) => {
                        const ObjectCopy = { ...content.categoryGrid };
                        const cats = [...(ObjectCopy.categories || [])];
                        cats[idx] = { ...cats[idx], link: e.target.value };
                        updateSectionState('categoryGrid', 'categories', cats);
                      }}
                    />
                  </AdminField>
                </div>
                <div className="w-full md:w-56 shrink-0 border-l border-[var(--admin-border-subtle)] pl-6">
                  <ImageUpload
                    label="Cover Image"
                    value={cat.image || ''}
                    onChange={(val) => {
                      const ObjectCopy = { ...content.categoryGrid };
                      const cats = [...(ObjectCopy.categories || [])];
                      cats[idx] = { ...cats[idx], image: val };
                      updateSectionState('categoryGrid', 'categories', cats);
                    }}
                    folder="cms"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const ObjectCopy = { ...content.categoryGrid };
                    const cats = [...(ObjectCopy.categories || [])];
                    cats.splice(idx, 1);
                    updateSectionState('categoryGrid', 'categories', cats);
                  }}
                  className="absolute top-4 right-4 text-[var(--admin-text-tertiary)] hover:text-[var(--admin-error)] p-2 hover:bg-[var(--admin-error-light)] rounded-xl transition-all opacity-100 md:opacity-0 md:group-hover:opacity-100 pointer-events-auto md:pointer-events-none md:group-hover:pointer-events-auto z-10"
                >
                  <span className="material-symbols-outlined text-[18px]">delete</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'trending' && (
        <div className="space-y-4">
          <AdminField label="Section Title">
            <AdminInput
              value={content.trendingProducts?.sectionTitle || ''}
              onChange={(e) =>
                updateSectionState('trendingProducts', 'sectionTitle', e.target.value)
              }
            />
          </AdminField>
          <AdminField label="Section Subtitle">
            <AdminInput
              value={content.trendingProducts?.sectionSubtitle || ''}
              onChange={(e) =>
                updateSectionState('trendingProducts', 'sectionSubtitle', e.target.value)
              }
            />
          </AdminField>
        </div>
      )}

      {activeTab === 'occasions' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <AdminField label="Section Title">
              <AdminInput
                value={content.shopByOccasion?.sectionTitle || ''}
                onChange={(e) =>
                  updateSectionState('shopByOccasion', 'sectionTitle', e.target.value)
                }
              />
            </AdminField>
            <AdminField label="Section Subtitle">
              <AdminInput
                value={content.shopByOccasion?.sectionSubtitle || ''}
                onChange={(e) =>
                  updateSectionState('shopByOccasion', 'sectionSubtitle', e.target.value)
                }
              />
            </AdminField>
          </div>
          <div className="pt-4 border-t border-[var(--admin-border-subtle)] space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-[11px] font-semibold text-[var(--admin-accent)] uppercase tracking-wider">
                Occasions List
              </span>
              <button
                type="button"
                onClick={() => {
                  const occs = [...(content.shopByOccasion?.occasions || [])];
                  occs.push({ title: 'New Occasion', link: '', image: '' });
                  updateSectionState('shopByOccasion', 'occasions', occs);
                }}
                className="text-[11px] font-bold text-[var(--admin-accent)] hover:text-[var(--admin-text-inverse)] hover:bg-[var(--admin-accent)] border border-[var(--admin-accent)]/30 px-3 py-1 rounded-full cursor-pointer transition-colors"
              >
                + Add Occasion
              </button>
            </div>
            {(content.shopByOccasion?.occasions || []).map((occ, idx) => (
              <div
                key={`occ-${idx}`}
                className="relative p-5 pr-14 bg-[var(--admin-surface)] rounded-2xl border border-[var(--admin-border)] shadow-sm flex flex-col md:flex-row gap-6 items-center group"
              >
                <div className="flex-1 space-y-4 w-full">
                  <AdminField label="Occasion Title">
                    <AdminInput
                      value={occ.title || ''}
                      onChange={(e) => {
                        const ObjectCopy = { ...content.shopByOccasion };
                        const occs = [...(ObjectCopy.occasions || [])];
                        occs[idx] = { ...occs[idx], title: e.target.value };
                        updateSectionState('shopByOccasion', 'occasions', occs);
                      }}
                    />
                  </AdminField>
                  <AdminField label="Destination Link">
                    <AdminInput
                      value={occ.link || ''}
                      onChange={(e) => {
                        const ObjectCopy = { ...content.shopByOccasion };
                        const occs = [...(ObjectCopy.occasions || [])];
                        occs[idx] = { ...occs[idx], link: e.target.value };
                        updateSectionState('shopByOccasion', 'occasions', occs);
                      }}
                    />
                  </AdminField>
                </div>
                <div className="w-full md:w-56 shrink-0 border-l border-[var(--admin-border-subtle)] pl-6">
                  <ImageUpload
                    label="Cover Image"
                    value={occ.image || ''}
                    onChange={(val) => {
                      const ObjectCopy = { ...content.shopByOccasion };
                      const occs = [...(ObjectCopy.occasions || [])];
                      occs[idx] = { ...occs[idx], image: val };
                      updateSectionState('shopByOccasion', 'occasions', occs);
                    }}
                    folder="cms"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const ObjectCopy = { ...content.shopByOccasion };
                    const occs = [...(ObjectCopy.occasions || [])];
                    occs.splice(idx, 1);
                    updateSectionState('shopByOccasion', 'occasions', occs);
                  }}
                  className="absolute top-4 right-4 text-[var(--admin-text-tertiary)] hover:text-[var(--admin-error)] p-2 hover:bg-[var(--admin-error-light)] rounded-xl transition-all opacity-100 md:opacity-0 md:group-hover:opacity-100 pointer-events-auto md:pointer-events-none md:group-hover:pointer-events-auto z-10"
                >
                  <span className="material-symbols-outlined text-[18px]">delete</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'featured' && (
        <div className="space-y-4">
          <AdminField label="Section Title">
            <AdminInput
              value={content.featuredProducts?.sectionTitle || ''}
              onChange={(e) =>
                updateSectionState('featuredProducts', 'sectionTitle', e.target.value)
              }
            />
          </AdminField>
          <AdminField label="Section Subtitle">
            <AdminInput
              value={content.featuredProducts?.sectionSubtitle || ''}
              onChange={(e) =>
                updateSectionState('featuredProducts', 'sectionSubtitle', e.target.value)
              }
            />
          </AdminField>
        </div>
      )}

      {activeTab === 'recommended' && (
        <div className="space-y-4">
          <AdminField label="Section Title">
            <AdminInput
              value={content.recommendedProducts?.sectionTitle || ''}
              onChange={(e) =>
                updateSectionState('recommendedProducts', 'sectionTitle', e.target.value)
              }
            />
          </AdminField>
          <AdminField label="Section Subtitle">
            <AdminInput
              value={content.recommendedProducts?.sectionSubtitle || ''}
              onChange={(e) =>
                updateSectionState('recommendedProducts', 'sectionSubtitle', e.target.value)
              }
            />
          </AdminField>
        </div>
      )}
    </div>
  );
}
