import { useRef } from 'react';
import React, { useState, useEffect } from 'react';
import { SectionHeader, AdminField, AdminInput, AdminToggle } from '../AdminUIKit';
import { useAdmin } from '../../context/AdminContext';
import logger from '../../../utils/core/logger';

export function HomePageControllerEditor({ content, onUpdate }) {
  const [activeTab, setActiveTab] = useState('layout');
  const [heroSubTab, setHeroSubTab] = useState('products');
  const { products, _productsError } = useAdmin();
  const [coupons, setCoupons] = useState([]);
  const [loadingCoupons, setLoadingCoupons] = useState(false);
  const [showcases, setShowcases] = useState([]);
  const [loadingShowcases, setLoadingShowcases] = useState(false);
  const [galleryItems, setGalleryItems] = useState([]);
  const [loadingGallery, setLoadingGallery] = useState(false);

  const uniqueCategories = React.useMemo(() => {
    const cats = new Set(products?.map((p) => p.category));
    return [...cats].filter(Boolean);
  }, [products]);

  // HTML5 Drag & Drop State
  const [draggedIdx, setDraggedIdx] = useState(null);

  const fetchAttempted = useRef({ promo: false, hero: false, gallery: false });
  useEffect(() => {
    if (activeTab === 'promo' && !fetchAttempted.current.promo) {
      fetchAttempted.current.promo = true;
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

    if ((activeTab === 'hero' || activeTab === 'occasions') && !fetchAttempted.current.hero) {
      fetchAttempted.current.hero = true;
      setLoadingShowcases(true);
      import('../../../services/domainServices').then(({ showcaseService }) => {
        showcaseService
          .getAll()
          .then((res) => {
            const list = res?.data || [];
            setShowcases(Array.isArray(list) ? list : []);
          })
          .catch((err) => {
            logger.error('Failed to load showcases', err);
            setShowcases([]);
          })
          .finally(() => setLoadingShowcases(false));
      });
    }

    if (activeTab === 'gallery' && !fetchAttempted.current.gallery) {
      fetchAttempted.current.gallery = true;
      setLoadingGallery(true);
      import('../../../services/domainServices').then(({ galleryService }) => {
        galleryService
          .getAll({ limit: 1000 })
          .then((res) => {
            let list = [];
            if (res?.success) {
              list = res.data?.data || res.data?.items || res.data || [];
            } else {
              list = res?.data || res || [];
            }
            setGalleryItems(Array.isArray(list) ? list : []);
          })
          .catch((err) => {
            logger.error('Failed to load gallery items', err);
            setGalleryItems([]);
          })
          .finally(() => setLoadingGallery(false));
      });
    }
  }, [activeTab]);

  const updateSectionState = (sectionId, field, value) => {
    onUpdate(sectionId, { ...(content[sectionId] || {}), [field]: value });
  };

  const renderProductSelector = (sectionId) => {
    const isAutoMode = content[sectionId]?.useAutoFeed !== false; // defaults to true

    return (
      <div className="pt-4 border-t border-[var(--admin-border-subtle)] space-y-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-[11px] font-semibold text-[var(--admin-accent)] uppercase tracking-wider block">
            Product Feed
          </span>
          <AdminToggle
            label="Auto-Generated"
            checked={isAutoMode}
            onChange={() => updateSectionState(sectionId, 'useAutoFeed', !isAutoMode)}
          />
        </div>
        <div
          className={`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-h-[400px] overflow-y-auto pr-2 scrollbar-thin transition-all duration-300 ${isAutoMode ? 'opacity-50 pointer-events-none grayscale-[50%]' : 'opacity-100'}`}
        >
          {!products || products.length === 0 ? (
            <div className="col-span-full p-4 text-center text-[var(--admin-text-secondary)] text-[12px] bg-[var(--admin-surface-muted)] rounded-xl border border-[var(--admin-border)]">
              Loading products...
            </div>
          ) : (
            products.map((p) => {
              const pId = p._id || p.id;
              const isSelected = (content[sectionId]?.productIds || []).includes(pId);
              return (
                <div
                  key={pId}
                  onClick={() => {
                    const currentIds = content[sectionId]?.productIds || [];
                    let newIds;
                    if (isSelected) {
                      newIds = currentIds.filter((id) => id !== pId);
                    } else {
                      newIds = [...currentIds, pId];
                    }
                    updateSectionState(sectionId, 'productIds', newIds);
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
                    src={p.imageSrc || p.image || p.thumbnail}
                    alt={p.name || p.title}
                    className="w-full aspect-[3/4] object-cover rounded-xl shadow-inner border border-[var(--admin-border-subtle)]"
                  />
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold text-[var(--admin-text-primary)] block line-clamp-1">
                      {p.name || p.title}
                    </span>
                    <span className="text-[10px] font-semibold text-[var(--admin-accent)] uppercase tracking-wider block">
                      {p.category}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
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

  const handleDragStart = (e, idx) => {
    setDraggedIdx(idx);
    e.dataTransfer.effectAllowed = 'move';
    // Transparent image for drag ghost if preferred
  };

  const handleDragOver = (e, idx) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, idx) => {
    e.preventDefault();
    if (draggedIdx === null || draggedIdx === idx) return;

    const newSections = [...homepageSections];
    const draggedItem = newSections[draggedIdx];
    newSections.splice(draggedIdx, 1);
    newSections.splice(idx, 0, draggedItem);

    onUpdate('homepageSections', newSections);
    setDraggedIdx(null);
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
          ...homepageSections.map((sec) => {
            const baseId = sec.id.split('_')[0];
            switch (baseId) {
              case 'hero': return 'Hero';
              case 'promoBanner': return 'Promo';
              case 'categoryGrid': return 'Categories';
              case 'trendingProducts': return 'Trending';
              case 'shopByOccasion': return 'Occasions';
              case 'featuredProducts': return 'Featured';
              case 'recommendedProducts': return 'Recommended';
              case 'galleryInspiration': return 'Gallery';
              default: return baseId;
            }
          })
        ].map((tab, idx) => (
          <button
            key={`${tab}-${idx}`}
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
              draggable
              onDragStart={(e) => handleDragStart(e, idx)}
              onDragOver={(e) => handleDragOver(e, idx)}
              onDrop={(e) => handleDrop(e, idx)}
              className={`flex items-center justify-between p-3 bg-[var(--admin-surface-muted)] rounded-xl border border-[var(--admin-border)] shadow-sm transition-all duration-300 ${draggedIdx === idx ? 'opacity-50 border-[var(--admin-accent)] scale-[0.98]' : 'opacity-100'} hover:border-[var(--admin-border-strong)]`}
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
                    type="button"
                    disabled={idx === 0}
                    onClick={() => moveSection(idx, -1)}
                    className="disabled:opacity-30 hover:text-[var(--admin-accent)] cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[14px]">expand_less</span>
                  </button>
                  <button
                    type="button"
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
          <div className="flex gap-2 border-b border-[var(--admin-border-subtle)] pb-4 mb-4">
            <button
              onClick={() => setHeroSubTab('products')}
              className={`px-4 py-2 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all border ${
                heroSubTab === 'products'
                  ? 'bg-[var(--admin-accent)]/10 text-[var(--admin-accent)] border-[var(--admin-accent)]/30'
                  : 'bg-[var(--admin-surface)] text-[var(--admin-text-secondary)] border-[var(--admin-border)] hover:bg-[var(--admin-surface-muted)]'
              }`}
            >
              Hero Products ({content.hero?.productIds?.length || 0}/{products ? products.length : '0'})
            </button>
            <button
              onClick={() => setHeroSubTab('showcases')}
              className={`px-4 py-2 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all border ${
                heroSubTab === 'showcases'
                  ? 'bg-[var(--admin-accent)]/10 text-[var(--admin-accent)] border-[var(--admin-accent)]/30'
                  : 'bg-[var(--admin-surface)] text-[var(--admin-text-secondary)] border-[var(--admin-border)] hover:bg-[var(--admin-surface-muted)]'
              }`}
            >
              Hero Showcases ({showcases?.filter(s => s.featured).length || 0}/{showcases ? showcases.length : '0'})
            </button>
          </div>

          {heroSubTab === 'products' && (
            <div>
              <span className="text-[11px] font-semibold text-[var(--admin-accent)] uppercase tracking-[0.18em] block mb-4 pb-2">
                Select Hero Products
              </span>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-h-[400px] overflow-y-auto pr-2 scrollbar-thin">
                {!products || products.length === 0 ? (
                  <div className="col-span-full p-4 text-center text-[var(--admin-text-secondary)] text-[12px] bg-[var(--admin-surface-muted)] rounded-xl border border-[var(--admin-border)]">
                    No products available to select. Check if products exist in the catalog or if
                    the API failed.
                  </div>
                ) : (
                  [...products].sort((a, b) => {
                    const aSelected = (content.hero?.productIds || []).includes(a.id || a._id);
                    const bSelected = (content.hero?.productIds || []).includes(b.id || b._id);
                    return (bSelected ? 1 : 0) - (aSelected ? 1 : 0);
                  }).map((prd) => {
                    const isSelected = (content.hero?.productIds || []).includes(prd.id || prd._id);
                    return (
                      <div
                        key={prd.id}
                        onClick={() => {
                          const currentIds = content.hero?.productIds || [];
                          let newIds;
                          if (isSelected) {
                            newIds = currentIds.filter((id) => id !== prd.id);
                          } else {
                            newIds = [...currentIds, prd.id];
                          }
                          updateSectionState('hero', 'productIds', newIds);
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
                          <span className="material-symbols-outlined text-[14px] font-bold">
                            check
                          </span>
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

          {/* Showcases Section */}
          {heroSubTab === 'showcases' && (
            <div>
              <span className="text-[11px] font-semibold text-[var(--admin-accent)] uppercase tracking-[0.18em] block mb-4 pb-2">
                Select Hero Showcases
              </span>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-h-[400px] overflow-y-auto pr-2 scrollbar-thin">
                {loadingShowcases ? (
                  <div className="col-span-full p-4 text-center text-[var(--admin-text-secondary)] text-[12px] bg-[var(--admin-surface-muted)] rounded-xl border border-[var(--admin-border)]">
                    Loading showcases...
                  </div>
                ) : !showcases || showcases.length === 0 ? (
                  <div className="col-span-full p-4 text-center text-[var(--admin-text-secondary)] text-[12px] bg-[var(--admin-surface-muted)] rounded-xl border border-[var(--admin-border)]">
                    No showcases available. Check if they exist or API failed.
                  </div>
                ) : (
                  [...showcases].sort((a, b) => {
                    const aSelected = a.featured === true;
                    const bSelected = b.featured === true;
                    return (bSelected ? 1 : 0) - (aSelected ? 1 : 0);
                  }).map((sc) => {
                    const scId = sc._id || sc.id;
                    const isSelected = sc.featured === true;
                    return (
                      <div
                        key={scId}
                        onClick={async () => {
                          try {
                            const { showcaseService } =
                              await import('../../../services/domainServices');
                            const res = await showcaseService.update(scId, {
                              featured: !isSelected,
                            });
                            if (res.success) {
                              setShowcases((prev) =>
                                prev.map((s) =>
                                  (s._id || s.id) === scId ? { ...s, featured: !isSelected } : s,
                                ),
                              );
                            }
                          } catch (err) {
                            logger.error('Failed to toggle showcase featured state', err);
                          }
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
                          <span className="material-symbols-outlined text-[14px] font-bold">
                            check
                          </span>
                        </div>
                        <img
                          src={sc.image}
                          alt={sc.title}
                          className="w-full aspect-square object-cover rounded-xl shadow-inner border border-[var(--admin-border-subtle)]"
                        />
                        <div className="space-y-1">
                          <span className="text-[11px] font-bold text-[var(--admin-text-primary)] block line-clamp-1">
                            {sc.title}
                          </span>
                          <span className="text-[10px] font-semibold text-[var(--admin-accent)] uppercase tracking-wider block">
                            {sc.category?.replace('_', ' ')}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
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
          {/* --- Coupon Cards Selection --- */}
          <AdminField label="Select Coupon to Auto-fill (Optional)">
            {loadingCoupons ? (
              <div className="flex justify-center py-6">
                <span className="material-symbols-outlined animate-spin text-[24px] text-[var(--admin-text-tertiary)]">
                  refresh
                </span>
              </div>
            ) : coupons.length === 0 ? (
              <div className="text-center py-6 border border-dashed border-[var(--admin-border)] rounded-2xl bg-[var(--admin-surface-muted)]">
                <span className="material-symbols-outlined text-[24px] text-[var(--admin-text-tertiary)] mb-2 block">
                  local_activity
                </span>
                <p className="text-[12px] text-[var(--admin-text-secondary)]">
                  No active coupons available.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-1">
                {coupons.map((c) => {
                  const isSelected = content.promoBanner?.couponCode === c.code;
                  const discountStr =
                    c.discountType === 'percentage' ? `${c.discountValue}%` : `₹${c.discountValue}`;

                  return (
                    <div
                      key={c._id || c.id}
                      onClick={() => {
                        if (isSelected) {
                          // Deselect
                          onUpdate('promoBanner', {
                            ...(content.promoBanner || {}),
                            couponCode: '',
                            text: '',
                            link: '',
                          });
                        } else {
                          // Select and Auto-fill
                          const minOrderText =
                            c.minOrderAmount > 0 ? ` ON ORDERS ABOVE ₹${c.minOrderAmount}` : '';
                          const generatedText = `LIMITED TIME OFFER: GET ${discountStr} OFF${minOrderText} USING CODE ${c.code}`;
                          let targetLink = '/collections';
                          if (c.targetType === 'categories' && c.targetCategories?.length) {
                            targetLink = `/collections?collection=${c.targetCategories.join(',')}`;
                          } else if (c.targetType === 'products' && c.targetProductIds?.length) {
                            targetLink = `/collections?ids=${c.targetProductIds.join(',')}`;
                          }

                          onUpdate('promoBanner', {
                            ...(content.promoBanner || {}),
                            couponCode: c.code,
                            text: generatedText,
                            ctaText: 'CLAIM OFFER',
                            link: targetLink,
                          });
                        }
                      }}
                      className={`relative flex flex-col justify-center items-center p-4 rounded-[14px] cursor-pointer transition-all duration-300 border ${
                        isSelected
                          ? 'border-[var(--admin-accent)] bg-[var(--admin-accent)]/5 shadow-[0_4px_12px_rgba(var(--admin-accent-rgb),0.15)]'
                          : 'border-[var(--admin-border)] bg-[var(--admin-surface-muted)] hover:border-[var(--admin-border-hover)] hover:shadow-sm'
                      }`}
                    >
                      {isSelected && (
                        <div className="absolute top-2.5 right-2.5">
                          <span className="material-symbols-outlined text-[16px] text-[var(--admin-accent)] fill-current">
                            check_circle
                          </span>
                        </div>
                      )}
                      <div
                        className={`text-[11px] font-bold tracking-widest uppercase mb-1 ${isSelected ? 'text-[var(--admin-accent)]' : 'text-[var(--admin-text-secondary)]'}`}
                      >
                        {c.code}
                      </div>
                      <div
                        className={`text-[14px] font-bold ${isSelected ? 'text-[var(--admin-text-primary)]' : 'text-[var(--admin-text-primary)]'}`}
                      >
                        {discountStr} OFF
                      </div>
                      {c.minOrderAmount > 0 && (
                        <div className="text-[10px] text-[var(--admin-text-tertiary)] mt-1 font-medium">
                          Min ₹{c.minOrderAmount}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </AdminField>

          {/* --- Banner Text Inputs --- */}
          <div className="pt-2 border-t border-[var(--admin-border)]">
            <AdminField label="Banner Text">
              <AdminInput
                value={content.promoBanner?.text || ''}
                onChange={(e) => updateSectionState('promoBanner', 'text', e.target.value)}
                className="!py-2.5 !text-[12px]"
                placeholder="e.g., LIMITED TIME OFFER: GET 15% OFF USING CODE..."
              />
            </AdminField>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <AdminField label="CTA Text">
              <AdminInput
                value={content.promoBanner?.ctaText || ''}
                onChange={(e) => updateSectionState('promoBanner', 'ctaText', e.target.value)}
                className="!py-2.5 !text-[12px]"
                placeholder="e.g., CLAIM OFFER"
              />
            </AdminField>
            <AdminField label="Redirect Link">
              <AdminInput
                value={content.promoBanner?.link || ''}
                onChange={(e) => updateSectionState('promoBanner', 'link', e.target.value)}
                className="!py-2.5 !text-[12px]"
                placeholder="e.g., /collections"
              />
            </AdminField>
          </div>
        </div>
      )}

      {activeTab === 'categories' && (
        <div className="space-y-6">
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
              <span className="text-[11px] font-semibold text-[var(--admin-accent)] uppercase tracking-[0.18em] block mb-4 pb-2">
                Select Store Categories to Feature
              </span>
            </div>

            <div className="flex flex-wrap gap-3">
              {uniqueCategories.map((categoryName) => {
                const isSelected = (content.categoryGrid?.categories || []).some(
                  (c) => c.title === categoryName,
                );
                return (
                  <button
                    key={categoryName}
                    type="button"
                    onClick={() => {
                      const ObjectCopy = { ...content.categoryGrid };
                      const cats = [...(ObjectCopy.categories || [])];
                      const existingIdx = cats.findIndex((c) => c.title === categoryName);

                      if (existingIdx >= 0) {
                        cats.splice(existingIdx, 1);
                      } else {
                        cats.push({
                          title: categoryName,
                          link: `/collections?category=${encodeURIComponent(categoryName)}`,
                          image: '',
                        });
                      }
                      updateSectionState('categoryGrid', 'categories', cats);
                    }}
                    className={`px-4 py-2 rounded-full text-[12px] font-bold transition-all ${
                      isSelected
                        ? 'bg-[var(--admin-text-primary)] text-[var(--admin-surface)] shadow-md'
                        : 'bg-[var(--admin-surface-muted)] text-[var(--admin-text-secondary)] hover:bg-[var(--admin-border)]'
                    }`}
                  >
                    {categoryName}{' '}
                    {isSelected && (
                      <span className="ml-1 material-symbols-outlined text-[14px] align-middle">
                        check_circle
                      </span>
                    )}
                  </button>
                );
              })}
              {uniqueCategories.length === 0 && (
                <div className="text-[12px] text-[var(--admin-text-tertiary)] italic">
                  No categories found in product catalog.
                </div>
              )}
            </div>
          </div>

          {content.categoryGrid?.categories?.length > 0 && (
            <div className="pt-6 border-t border-[var(--admin-border-subtle)] space-y-6">
              <span className="text-[11px] font-semibold text-[var(--admin-accent)] uppercase tracking-[0.18em] block mb-4 pb-2">
                Configure Cover Photos
              </span>

              {(content.categoryGrid?.categories || []).map((cat, idx) => {
                const categoryProducts = products?.filter((p) => p.category === cat.title) || [];

                return (
                  <div
                    key={`cat-config-${idx}`}
                    className="p-5 bg-[var(--admin-surface-muted)] rounded-2xl border border-[var(--admin-border)] shadow-sm space-y-4"
                  >
                    <div className="flex items-center justify-between mb-4 pb-4 border-b border-[var(--admin-border-subtle)]">
                      <div className="flex items-center gap-4 w-full pr-4">
                        {cat.image ? (
                          <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-[var(--admin-border)] shadow-sm shrink-0">
                            <img
                              src={cat.image}
                              alt={cat.title}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="w-12 h-12 rounded-full border-2 border-dashed border-[var(--admin-border-strong)] flex items-center justify-center shrink-0 bg-[var(--admin-surface)]">
                            <span className="material-symbols-outlined text-[var(--admin-text-tertiary)] text-[20px]">
                              image
                            </span>
                          </div>
                        )}
                        <div className="flex-1">
                          <h3 className="text-[15px] font-bold text-[var(--admin-text-primary)]">
                            {cat.title}
                          </h3>
                          <div className="flex items-center gap-2 mt-1 w-full max-w-md">
                            <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--admin-text-tertiary)] shrink-0">
                              Link:
                            </span>
                            <input
                              type="text"
                              value={cat.link || ''}
                              onChange={(e) => {
                                const ObjectCopy = { ...content.categoryGrid };
                                const cats = [...(ObjectCopy.categories || [])];
                                cats[idx] = { ...cats[idx], link: e.target.value };
                                updateSectionState('categoryGrid', 'categories', cats);
                              }}
                              className="text-[11px] text-[var(--admin-text-secondary)] bg-transparent border-b border-transparent focus:border-[var(--admin-accent)]/50 outline-none focus:ring-0 p-0 m-0 w-full transition-colors"
                              placeholder={`/collections?category=${encodeURIComponent(cat.title)}`}
                            />
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          const ObjectCopy = { ...content.categoryGrid };
                          const cats = [...(ObjectCopy.categories || [])];
                          cats.splice(idx, 1);
                          updateSectionState('categoryGrid', 'categories', cats);
                        }}
                        className="text-[var(--admin-error)] bg-[var(--admin-error)]/5 hover:bg-[var(--admin-error)]/10 p-2 rounded-xl transition-colors border border-[var(--admin-error)]/20 shrink-0"
                        title="Remove Featured Category"
                      >
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                    </div>

                    <div className="pt-2">
                      <span className="text-[10px] font-bold text-[var(--admin-text-tertiary)] uppercase tracking-wider mb-3 block">
                        Select Cover Photo from {cat.title} Products
                      </span>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-h-[300px] overflow-y-auto pr-2 scrollbar-thin">
                        {categoryProducts.length > 0 ? (
                          categoryProducts.map((product) => {
                            const isSelected = cat.image === product.image;
                            return (
                              <div
                                key={product._id || product.id}
                                onClick={() => {
                                  const ObjectCopy = { ...content.categoryGrid };
                                  const cats = [...(ObjectCopy.categories || [])];
                                  cats[idx] = { ...cats[idx], image: product.image };
                                  updateSectionState('categoryGrid', 'categories', cats);
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
                                  <span className="material-symbols-outlined text-[14px] font-bold">
                                    check
                                  </span>
                                </div>
                                <img
                                  src={product.image}
                                  alt={product.name}
                                  className="w-full aspect-square object-cover rounded-xl shadow-inner border border-[var(--admin-border-subtle)]"
                                />
                                <div className="space-y-1">
                                  <span className="text-[11px] font-bold text-[var(--admin-text-primary)] block line-clamp-1">
                                    {product.name}
                                  </span>
                                  <span className="text-[10px] font-semibold text-[var(--admin-accent)] uppercase tracking-wider block line-clamp-1">
                                    {product.category}
                                  </span>
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <div className="col-span-full p-4 text-center text-[var(--admin-text-secondary)] text-[12px] bg-[var(--admin-surface-muted)] rounded-xl border border-[var(--admin-border)]">
                            No products found in this category.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === 'trending' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
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
          {renderProductSelector('trendingProducts')}
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
            <span className="text-[11px] font-semibold text-[var(--admin-accent)] uppercase tracking-wider block mb-4">
              Select Occasion Showcases
            </span>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-h-[400px] overflow-y-auto pr-2 scrollbar-thin">
              {loadingShowcases ? (
                <div className="col-span-full p-4 text-center text-[var(--admin-text-secondary)] text-[12px] bg-[var(--admin-surface-muted)] rounded-xl border border-[var(--admin-border)]">
                  Loading showcases...
                </div>
              ) : !showcases || showcases.length === 0 ? (
                <div className="col-span-full p-4 text-center text-[var(--admin-text-secondary)] text-[12px] bg-[var(--admin-surface-muted)] rounded-xl border border-[var(--admin-border)]">
                  No showcases available. Check if they exist or API failed.
                </div>
              ) : (
                showcases.map((sc) => {
                  const scId = sc._id || sc.id;
                  const isSelected = (content.shopByOccasion?.selectedShowcaseIds || []).includes(
                    scId,
                  );
                  return (
                    <div
                      key={scId}
                      onClick={() => {
                        const currentIds = content.shopByOccasion?.selectedShowcaseIds || [];
                        let newIds;
                        if (isSelected) {
                          newIds = currentIds.filter((id) => id !== scId);
                        } else {
                          newIds = [...currentIds, scId];
                        }
                        updateSectionState('shopByOccasion', 'selectedShowcaseIds', newIds);
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
                        <span className="material-symbols-outlined text-[14px] font-bold">
                          check
                        </span>
                      </div>
                      <img
                        src={sc.image}
                        alt={sc.title}
                        className="w-full aspect-square object-cover rounded-xl shadow-inner border border-[var(--admin-border-subtle)]"
                      />
                      <div className="space-y-1">
                        <span className="text-[11px] font-bold text-[var(--admin-text-primary)] block line-clamp-1">
                          {sc.title}
                        </span>
                        <span className="text-[10px] font-semibold text-[var(--admin-accent)] uppercase tracking-wider block">
                          {sc.category?.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'featured' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
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
          {renderProductSelector('featuredProducts')}
        </div>
      )}

      {activeTab === 'recommended' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
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
          {renderProductSelector('recommendedProducts')}
        </div>
      )}

      {activeTab === 'gallery' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <AdminField label="Section Title">
              <AdminInput
                value={content.galleryInspiration?.sectionTitle || 'Inspiration Gallery'}
                onChange={(e) =>
                  updateSectionState('galleryInspiration', 'sectionTitle', e.target.value)
                }
              />
            </AdminField>
            <AdminField label="Section Subtitle">
              <AdminInput
                value={
                  content.galleryInspiration?.sectionSubtitle ||
                  'A visual journey through our finest installations'
                }
                onChange={(e) =>
                  updateSectionState('galleryInspiration', 'sectionSubtitle', e.target.value)
                }
              />
            </AdminField>
          </div>

          <div className="pt-4 border-t border-[var(--admin-border-subtle)] space-y-4">
            <span className="text-[11px] font-semibold text-[var(--admin-accent)] uppercase tracking-wider block mb-4">
              Select Gallery Highlights
            </span>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-h-[400px] overflow-y-auto pr-2 scrollbar-thin">
              {loadingGallery ? (
                <div className="col-span-full p-4 text-center text-[var(--admin-text-secondary)] text-[12px] bg-[var(--admin-surface-muted)] rounded-xl border border-[var(--admin-border)]">
                  Loading gallery items...
                </div>
              ) : !galleryItems || galleryItems.length === 0 ? (
                <div className="col-span-full p-4 text-center text-[var(--admin-text-secondary)] text-[12px] bg-[var(--admin-surface-muted)] rounded-xl border border-[var(--admin-border)]">
                  No gallery items available.
                </div>
              ) : (
                galleryItems.map((gi, index) => {
                  const giId = gi._id || gi.id;
                  const currentIds = content.galleryInspiration?.galleryIds || [];

                  // The storefront only respects IDs that actually exist, otherwise falls back
                  const validIds = currentIds.filter((id) =>
                    galleryItems.some((item) => (item._id || item.id) === id),
                  );
                  const isDefaultMode = validIds.length === 0;

                  // Storefront shows max 5 items in fallback mode
                  const isSelected = isDefaultMode ? index < 5 : validIds.includes(giId);

                  return (
                    <div
                      key={giId}
                      onClick={() => {
                        let newIds;
                        if (isDefaultMode) {
                          newIds = galleryItems.slice(0, 5).map((g) => g._id || g.id);
                          if (isSelected) {
                            newIds = newIds.filter((id) => id !== giId);
                          } else {
                            newIds.push(giId);
                          }
                        } else {
                          if (isSelected) {
                            newIds = validIds.filter((id) => id !== giId);
                          } else {
                            newIds = [...validIds, giId];
                          }
                        }
                        updateSectionState('galleryInspiration', 'galleryIds', newIds);
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
                        <span className="material-symbols-outlined text-[14px] font-bold">
                          check
                        </span>
                      </div>
                      <img
                        src={gi.image || gi.images?.[0] || gi.thumbnail}
                        alt={gi.title}
                        className="w-full aspect-square object-cover rounded-xl shadow-inner border border-[var(--admin-border-subtle)]"
                      />
                      <div className="space-y-1">
                        <span className="text-[11px] font-bold text-[var(--admin-text-primary)] block line-clamp-1">
                          {gi.title}
                        </span>
                        {gi.category && (
                          <span className="text-[10px] font-semibold text-[var(--admin-accent)] uppercase tracking-wider block">
                            {gi.category.replace('_', ' ')}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
