import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAdmin } from '../context/AdminContext';
import {
  SectionHeader,
  AdminField,
  AdminInput,
  AdminTextarea,
  AdminToggle,
  PublishBar,
  SkeletonDashboard,
} from '../components/AdminUIKit';
import { ImageUpload } from '../components/ImageUpload';
import toast from 'react-hot-toast';
import { useDraft } from '../hooks/useDraft';
import { DraftStatusIndicator } from '../components/DraftStatusIndicator';
import { DraftRestoreModal } from '../components/DraftRestoreModal';
import { UnsavedChangesGuard } from '../components/UnsavedChangesGuard';
import { cmsService } from '../../services/domainServices';
import logger from '../../utils/logger';
import { DEFAULT_SPECIALIZATIONS, PLACEHOLDER_IMAGES } from '../../constants/placeholderImages';

const cleanSignatureImg = (imgUrl, founderName) => {
  if (
    !imgUrl ||
    imgUrl.includes('unsplash.com') ||
    imgUrl === '' ||
    imgUrl.includes('images.unsplash.com')
  ) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="250" height="80" viewBox="0 0 250 80"><defs><style>@import url('https://fonts.googleapis.com/css2?family=Alex+Brush&amp;display=swap');.sig { font-family: 'Alex Brush', cursive; font-size: 42px; fill: %231a1a1a; }</style></defs><text x="25" y="52" class="sig">${founderName}</text></svg>`;
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  }
  return imgUrl;
};

// ═══════════════════════════════════════════════════════════
// ANIMATION PRESETS (LINEAR LUXURY FADES)
// ═══════════════════════════════════════════════════════════
const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] } },
};
const stagger = { show: { transition: { staggerChildren: 0.05 } } };

// ═══════════════════════════════════════════════════════════
// CATEGORIZED CMS SIDEBAR SCHEMA
// ═══════════════════════════════════════════════════════════
const CMS_SIDEBAR = [
  {
    title: 'Storefront Layout',
    items: [
      { id: 'home', label: 'Home Page Controller', icon: 'home', desc: 'Manage Home Page content' },
    ],
  },
  {
    title: 'Pages',
    items: [
      { id: 'gallery', label: 'Gallery', icon: 'photo_library', desc: 'Pinterest grid tags' },
      { id: 'about', label: 'About Page', icon: 'info', desc: 'Brand chronicler' },
      {
        id: 'events-page',
        label: 'Events Page',
        icon: 'celebration',
        desc: 'Events page banner & promos',
      },
      { id: 'contact', label: 'Contact Info', icon: 'contact_page', desc: 'Helpline routing' },
      {
        id: 'custom-orders',
        label: 'Custom Orders',
        icon: 'design_services',
        desc: 'Digital intake forms',
      },
      { id: 'faqs', label: 'FAQs', icon: 'help_center', desc: 'Frequently Asked Questions' },
    ],
  },
  {
    title: 'SEO & Branding',
    items: [
      { id: 'seo-center', label: 'SEO Settings', icon: 'search', desc: 'Search result metadata' },
      {
        id: 'announcement-bar',
        label: 'Announcements',
        icon: 'campaign',
        desc: 'Header banner banners',
      },
      { id: 'navigation', label: 'Header & Footer', icon: 'menu', desc: 'Logo tagline & bio' },
    ],
  },
  {
    title: 'System Tools',
    items: [
      {
        id: 'publish-controls',
        label: 'History & Rollback',
        icon: 'history',
        desc: 'Checkpoints history',
      },
      { id: 'media-library', label: 'Media Vault', icon: 'image', desc: 'Uploads asset vault' },
      {
        id: 'catalog',
        label: 'Featured Catalog',
        icon: 'inventory_2',
        desc: 'Featured status flags',
      },
    ],
  },
];

// ═══════════════════════════════════════════════════════════
// DYNAMIC AI SPARK COPYWRITER (GLASSMORPHIC COMPOSER)
// ═══════════════════════════════════════════════════════════
function AISparkButton({ text, onApply }) {
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const prompts = [
    { label: '✨ South Indian Heritage', action: 'heritage' },
    { label: '👑 Luxury Rephrase', action: 'luxury' },
    { label: '🇮🇳 Telugu Vernacular', action: 'traditional' },
    { label: '🔍 Local SEO Optimization', action: 'seo' },
    { label: '🗣️ Translate to Telugu', action: 'translate' },
  ];

  const handleGenerate = async (style) => {
    if (!text || text.trim().length < 3) {
      toast.error('Please enter some text first for the AI to enhance.');
      setShowDropdown(false);
      return;
    }

    setLoading(true);
    setShowDropdown(false);

    try {
      const res = await cmsService.aiGenerateContent(text, style);

      if (res.success && res.data?.text) {
        onApply(res.data.text);
        toast.success('AI Content Crafted!', {
          icon: '✨',
          style: {
            background: '#1C1917',
            border: '1px solid #000000',
            color: '#F1F5F9',
            fontSize: '11px',
          },
        });
      } else {
        toast.error('AI returned empty content. Try again.');
      }
    } catch (err) {
      logger.error('AI generation error:', err);
      const errorMsg = err?.response?.data?.message || 'AI service temporarily offline.';
      toast.error(errorMsg, { duration: 4000 });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative inline-block shrink-0">
      <button
        type="button"
        onClick={() => setShowDropdown(!showDropdown)}
        className="flex items-center justify-center transition-all text-[var(--admin-accent)]/80 hover:text-[var(--admin-accent)] cursor-pointer h-7 w-7 rounded-full hover:bg-[var(--admin-accent)]/10 bg-transparent border-none"
        style={{ minHeight: '0px' }}
        title="AI Copywriting Assistant"
        aria-label="Open AI Copywriting Assistant"
      >
        {loading ? (
          <div className="skeleton-box inline-block w-3 h-3 rounded-md" />
        ) : (
          <span className="material-symbols-outlined text-[13px] block font-bold text-[var(--admin-accent)]">
            psychology
          </span>
        )}
      </button>

      {showDropdown && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowDropdown(false)} />
          <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-[var(--admin-surface)] border border-[var(--admin-accent)]/30 shadow-[var(--admin-shadow-sm)] py-2 z-50 overflow-hidden text-[11px] sm:text-[11px] animate-fade-in-up">
            <div className="px-3.5 py-1.5 font-semibold text-[var(--admin-text-secondary)] text-[11px] tracking-[0.18em] uppercase border-b border-[var(--admin-border-subtle)] pb-1.5 mb-1.5 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[11px] sm:text-[11px] text-[var(--admin-accent)] font-bold">
                auto_awesome
              </span>
              AI Copywriter
            </div>
            {prompts.map((p) => (
              <button
                key={p.action}
                type="button"
                onClick={() => handleGenerate(p.action)}
                disabled={loading}
                className="w-full text-left px-4 py-2 hover:bg-[var(--admin-accent)]/10 text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)] transition-all flex items-center gap-2 cursor-pointer font-bold disabled:opacity-50"
              >
                {p.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// MINIMAL FIRST-CLASS STOREFRONT LAYOUT EDITORS
// ═══════════════════════════════════════════════════════════

// 1. HOME PAGE CONTROLLER
function HomePageControllerEditor({ content, onUpdate }) {
  const [activeTab, setActiveTab] = useState('layout');
  const { products, productsError } = useAdmin();
  const [coupons, setCoupons] = useState([]);
  const [loadingCoupons, setLoadingCoupons] = useState(false);

  const fetchAttempted = useRef(false);
  useEffect(() => {
    if (activeTab === 'promo' && !fetchAttempted.current) {
      fetchAttempted.current = true;
      setLoadingCoupons(true);
      import('../../services/api/couponService').then(({ couponService }) => {
        couponService
          .getAll()
          .then((res) => {
            const payload = res?.data || res;
            const list = payload?.coupons || payload?.data || payload || [];
            setCoupons(Array.isArray(list) ? list : []);
          })
          .catch((err) => {
            console.error('Failed to load coupons', err);
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

// 6. GALLERY PORTFOLIO
function GalleryPortfolioEditor({ content, onUpdate }) {
  const gp = content.galleryPreview || {};

  return (
    <div className="admin-card p-6 space-y-6">
      <SectionHeader
        icon="photo_library"
        title="Gallery Curation Settings"
        description="Configure the primary Inspiration Gallery showcase, title tags, item caps, and layout formats"
      />
      <div className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <AdminField
            label="Gallery Headline Tag"
            description="Primary bold title for inspiration portfolio"
          >
            <AdminInput
              value={gp.sectionTitle || ''}
              onChange={(e) => onUpdate('galleryPreview', { sectionTitle: e.target.value })}
              className="!py-2.5 !text-[12px] border-[var(--admin-border)] focus:border-[var(--admin-accent)] bg-[var(--admin-surface-muted)] hover:bg-[var(--admin-surface)]"
            />
          </AdminField>
          <AdminField
            label="Gallery Subtitle Tag"
            description="Gold elegant narrative label showing below heading"
          >
            <AdminInput
              value={gp.sectionSubtitle || ''}
              onChange={(e) => onUpdate('galleryPreview', { sectionSubtitle: e.target.value })}
              className="!py-2.5 !text-[12px] border-[var(--admin-border)] focus:border-[var(--admin-accent)] bg-[var(--admin-surface-muted)] hover:bg-[var(--admin-surface)]"
            />
          </AdminField>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-4 border-t border-[var(--admin-border-subtle)]">
          <AdminField
            label="Maximum Display Count"
            description="Adjust limit of masonry cards shown on feed"
          >
            <AdminInput
              type="number"
              value={gp.maxDisplay || 6}
              onChange={(e) =>
                onUpdate('galleryPreview', { maxDisplay: parseInt(e.target.value) || 6 })
              }
              className="!py-2.5 !text-[11px] sm:text-[11px] border-[var(--admin-border)] focus:border-[var(--admin-accent)] bg-[var(--admin-surface-muted)] hover:bg-[var(--admin-surface)]"
            />
          </AdminField>
          <div className="flex items-center justify-between border border-[var(--admin-border)] px-4.5 py-3 rounded-2xl bg-[var(--admin-surface)] mt-5 h-[46px] shadow-[var(--admin-shadow-xs)]">
            <span className="text-[11px] font-semibold text-[var(--admin-text-secondary)] uppercase tracking-wider">
              Show Grid on Homepage
            </span>
            <AdminToggle
              checked={gp.isVisible !== false}
              onChange={() =>
                onUpdate('galleryPreview', { isVisible: gp.isVisible === false ? true : false })
              }
            />
          </div>
        </div>

        <div className="p-4.5 bg-[var(--admin-surface-muted)] rounded-2xl border border-[var(--admin-border)] space-y-2.5 mt-4 shadow-[var(--admin-shadow-xs)]">
          <span className="text-[11px] sm:text-[11px] font-semibold text-[var(--admin-accent)] uppercase tracking-[0.15em] block">
            Masonry Filter Options
          </span>
          <p className="text-[11px] sm:text-[11px] text-[var(--admin-text-tertiary)] font-light leading-relaxed">
            Storefront visitors can seamlessly filter using categories like{' '}
            <em>Traditional Wedding Decor</em>, <em>Pooja Decoration Sets</em>,{' '}
            <em>Customized Gift Hampers</em>, and <em>Bangle Trays</em> dynamically populated from
            your catalog.
          </p>
        </div>
      </div>
    </div>
  );
}

const DEFAULT_FEATURES = [
  {
    icon: 'handyman',
    title: 'Handmade Artistry',
    desc: 'Every petal, every bead, and every fold is meticulously placed by hand.',
  },
  {
    icon: 'diamond',
    title: 'Premium Quality',
    desc: 'Sourcing only the finest materials globally to ensure unparalleled luxury.',
  },
  {
    icon: 'volunteer_activism',
    title: 'Cultural Roots',
    desc: 'Deeply embedded in authentic Telugu traditions and timeless heritage.',
  },
  {
    icon: 'design_services',
    title: 'Bespoke Design',
    desc: 'Tailored to your specific event theme and personal storytelling.',
  },
];

// 7. ABOUT HERITAGE
function AboutPageDetailsEditor({ content, onUpdate }) {
  const ab = content || {};

  return (
    <div className="admin-card p-6 space-y-6">
      <SectionHeader
        icon="info"
        title="About Page Content"
        description="Configure the story, mission, and founder details"
      />

      <div className="space-y-6">
        {/* Cinematic Hero */}
        <div className="admin-card-inset p-5 space-y-4">
          <h4 className="text-[12px] font-bold text-[var(--admin-text-primary)] uppercase tracking-wider mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-[14px]">view_day</span>
            Hero Section
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4.5">
            <AdminField label="Cinematic Title Headline">
              <AdminInput
                value={ab.heroTitle || ''}
                onChange={(e) => onUpdate('aboutPage', { heroTitle: e.target.value })}
                className="!py-2.5 !text-[12px] border-[var(--admin-border)] focus:border-[var(--admin-accent)]"
              />
            </AdminField>
            <AdminField label="Cinematic Subtitle">
              <AdminInput
                value={ab.heroSubtitle || ''}
                onChange={(e) => onUpdate('aboutPage', { heroSubtitle: e.target.value })}
                className="!py-2.5 !text-[12px] border-[var(--admin-border)] focus:border-[var(--admin-accent)]"
              />
            </AdminField>
          </div>
          <ImageUpload
            label="Cinematic Backdrop Graphic"
            value={ab.heroImage || ''}
            onChange={(val) => onUpdate('aboutPage', { heroImage: val })}
            folder="cms"
          />
        </div>

        {/* Mission & Narrative */}
        <div className="admin-card p-5 space-y-4">
          <span className="text-[11px] sm:text-[11px] font-semibold text-[var(--admin-accent)] uppercase tracking-[0.18em] block border-b border-[var(--admin-border-subtle)] pb-2">
            2. Narrative & Mission Statement
          </span>
          <AdminField
            label="Brand Mission Block"
            description="Core statement emphasizing the Telugu craftsmanship legacy"
          >
            <div className="relative flex items-start w-full shadow-[var(--admin-shadow-xs)] rounded-xl">
              <AdminTextarea
                value={ab.missionStatement || ''}
                onChange={(e) => onUpdate('aboutPage', { missionStatement: e.target.value })}
                rows={3}
                className="!pr-12 !py-2.5 !text-[12px] border-[var(--admin-border)] focus:border-[var(--admin-accent)]"
              />
              <div className="absolute right-2.5 top-2.5">
                <AISparkButton
                  text={ab.missionStatement}
                  onApply={(val) => onUpdate('aboutPage', { missionStatement: val })}
                />
              </div>
            </div>
          </AdminField>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4.5">
            <ImageUpload
              label="Narrative Side Illustration Image"
              value={ab.storyImage || ''}
              onChange={(val) => onUpdate('aboutPage', { storyImage: val })}
              folder="cms"
            />
            <div className="space-y-3.5">
              <AdminField
                label="Primary Founder Name"
                description="Name showing inside leadership frames"
              >
                <AdminInput
                  value={ab.founderName || 'Sirisha Atmakuri'}
                  onChange={(e) => onUpdate('aboutPage', { founderName: e.target.value })}
                  className="!py-2.5 !text-[11px] sm:text-[11px] border-[var(--admin-border)] focus:border-[var(--admin-accent)]"
                />
              </AdminField>
              <AdminField label="Leadership Role Title">
                <AdminInput
                  value={ab.founderRole || 'Founder & Creative Head'}
                  onChange={(e) => onUpdate('aboutPage', { founderRole: e.target.value })}
                  className="!py-2.5 !text-[11px] sm:text-[11px] border-[var(--admin-border)] focus:border-[var(--admin-accent)]"
                />
              </AdminField>
            </div>
          </div>
        </div>

        {/* Dual Leadership */}
        {ab.founders && (
          <div className="admin-card p-5 space-y-4">
            <span className="text-[11px] sm:text-[11px] font-semibold text-[var(--admin-accent)] uppercase tracking-[0.18em] block border-b border-[var(--admin-border-subtle)] pb-2 font-sans">
              3. Studio Founders & Directors
            </span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4.5">
              {ab.founders.map((founder, idx) => (
                <div
                  key={idx}
                  className="bg-[var(--admin-surface)] p-4.5 rounded-xl border border-[var(--admin-border)] space-y-3.5 shadow-[var(--admin-shadow-xs)]"
                >
                  <span className="text-[11px] font-semibold text-[var(--admin-text-tertiary)] uppercase tracking-widest block font-sans">
                    Founder {idx + 1}
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <AdminField label="Full Name">
                      <AdminInput
                        value={founder.name || ''}
                        onChange={(e) => {
                          const copy = [...ab.founders];
                          copy[idx] = { ...copy[idx], name: e.target.value };
                          onUpdate('aboutPage', { founders: copy });
                        }}
                        className="!py-2 !text-[11px] sm:text-[11px]"
                      />
                    </AdminField>
                    <AdminField label="Executive Role">
                      <AdminInput
                        value={founder.role || ''}
                        onChange={(e) => {
                          const copy = [...ab.founders];
                          copy[idx] = { ...copy[idx], role: e.target.value };
                          onUpdate('aboutPage', { founders: copy });
                        }}
                        className="!py-2 !text-[11px] sm:text-[11px]"
                      />
                    </AdminField>
                  </div>
                  <AdminField label="Intro Subtitle Text">
                    <AdminInput
                      value={founder.subtitle || ''}
                      onChange={(e) => {
                        const copy = [...ab.founders];
                        copy[idx] = { ...copy[idx], subtitle: e.target.value };
                        onUpdate('aboutPage', { founders: copy });
                      }}
                      className="!py-2 !text-[11px] sm:text-[11px]"
                    />
                  </AdminField>
                  <AdminField label="Artistic Bio Quote">
                    <AdminTextarea
                      value={founder.quote || ''}
                      onChange={(e) => {
                        const copy = [...ab.founders];
                        copy[idx] = { ...copy[idx], quote: e.target.value };
                        onUpdate('aboutPage', { founders: copy });
                      }}
                      className="!py-1.5 !text-[11px] sm:text-[11px]"
                      rows={3}
                    />
                  </AdminField>
                  <ImageUpload
                    label="Autograph Signature Graphic"
                    value={cleanSignatureImg(founder.signatureImg, founder.name)}
                    onChange={(val) => {
                      const copy = [...ab.founders];
                      copy[idx] = { ...copy[idx], signatureImg: val };
                      onUpdate('aboutPage', { founders: copy });
                    }}
                    folder="cms"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Signature Specializations */}
        <div className="admin-card p-5 space-y-4">
          <div className="flex justify-between items-center border-b border-[var(--admin-border-subtle)] pb-2">
            <span className="text-[11px] sm:text-[11px] font-semibold text-[var(--admin-accent)] uppercase tracking-[0.18em] block font-sans">
              4. Signature Specializations
            </span>
            <button
              type="button"
              onClick={() => {
                const copy = [...(ab.specializations || DEFAULT_SPECIALIZATIONS)];
                copy.push({ title: 'New Specialization', img: '' });
                onUpdate('aboutPage', { specializations: copy });
                toast.success('New Specialization Added!');
              }}
              className="text-[11px] sm:text-[11px] font-bold text-[var(--admin-accent)] hover:text-[var(--admin-accent)] border border-[var(--admin-accent)]/30 hover:border-[var(--admin-accent)] px-3.5 py-1.5 rounded-full bg-[var(--admin-surface)] transition-all cursor-pointer shadow-[var(--admin-shadow-xs)] hover:shadow-xs"
            >
              + Add Specialization
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4.5">
            {(ab.specializations || DEFAULT_SPECIALIZATIONS).map((item, idx) => (
              <div
                key={idx}
                className="p-4 bg-[var(--admin-surface)]/85 backdrop-blur-md rounded-2xl border border-[var(--admin-border)] flex flex-col md:flex-row items-stretch md:items-center gap-4.5 shadow-[var(--admin-shadow-xs)] hover:border-[var(--admin-border-strong)] hover:shadow-[var(--admin-shadow-sm)] transition-all duration-300"
              >
                <div className="flex-1 space-y-1.5">
                  <span className="text-[11px] text-[var(--admin-text-tertiary)] font-semibold uppercase tracking-wider block font-sans">
                    Specialization Title
                  </span>
                  <AdminInput
                    value={item.title || ''}
                    onChange={(e) => {
                      const copy = [...(ab.specializations || DEFAULT_SPECIALIZATIONS)];
                      copy[idx] = { ...copy[idx], title: e.target.value };
                      onUpdate('aboutPage', { specializations: copy });
                    }}
                    className="!py-2 !text-[11px] sm:text-[11px] bg-[var(--admin-surface)] border-[var(--admin-border)]"
                  />
                </div>
                <div className="shrink-0">
                  <ImageUpload
                    label=""
                    value={item.img || ''}
                    onChange={(val) => {
                      const copy = [...(ab.specializations || DEFAULT_SPECIALIZATIONS)];
                      copy[idx] = { ...copy[idx], img: val };
                      onUpdate('aboutPage', { specializations: copy });
                    }}
                    folder="cms"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const copy = (ab.specializations || DEFAULT_SPECIALIZATIONS).filter(
                      (_, i) => i !== idx,
                    );
                    onUpdate('aboutPage', { specializations: copy });
                    toast.success('Specialization Deleted');
                  }}
                  className="text-[var(--admin-error)] opacity-60 hover:opacity-100 transition-opacity flex items-center justify-center p-1.5 hover:bg-[var(--admin-error-light)] rounded-lg shrink-0"
                >
                  <span className="material-symbols-outlined text-[16px] font-bold">delete</span>
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Why Families Choose Us */}
        <div className="admin-card p-5 space-y-4">
          <div className="flex justify-between items-center border-b border-[var(--admin-border-subtle)] pb-2">
            <span className="text-[11px] sm:text-[11px] font-semibold text-[var(--admin-accent)] uppercase tracking-[0.18em] block font-sans">
              5. Why Families Choose Us
            </span>
            <button
              type="button"
              onClick={() => {
                const copy = [...(ab.features || DEFAULT_FEATURES)];
                copy.push({ icon: 'star', title: 'New Feature', desc: 'Feature description.' });
                onUpdate('aboutPage', { features: copy });
                toast.success('New Feature Added!');
              }}
              className="text-[11px] sm:text-[11px] font-bold text-[var(--admin-accent)] hover:text-[var(--admin-accent)] border border-[var(--admin-accent)]/30 hover:border-[var(--admin-accent)] px-3.5 py-1.5 rounded-full bg-[var(--admin-surface)] transition-all cursor-pointer shadow-[var(--admin-shadow-xs)] hover:shadow-xs"
            >
              + Add Feature
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4.5">
            {(ab.features || DEFAULT_FEATURES).map((item, idx) => (
              <div
                key={idx}
                className="p-4 bg-[var(--admin-surface)]/85 backdrop-blur-md rounded-2xl border border-[var(--admin-border)] space-y-3.5 shadow-[var(--admin-shadow-xs)] hover:border-[var(--admin-accent)]/35 transition-all duration-300"
              >
                <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 border-b border-[var(--admin-accent)]/5 pb-2">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <span className="text-[11px] text-[var(--admin-text-tertiary)] font-semibold uppercase tracking-wider shrink-0 font-sans">
                      Feature Title
                    </span>
                    <AdminInput
                      value={item.title || ''}
                      onChange={(e) => {
                        const copy = [...(ab.features || DEFAULT_FEATURES)];
                        copy[idx] = { ...copy[idx], title: e.target.value };
                        onUpdate('aboutPage', { features: copy });
                      }}
                      className="!py-1.5 font-bold !text-[11px] sm:text-[11px] w-full sm:!w-48 bg-[var(--admin-surface)] border-[var(--admin-border)] focus:border-[var(--admin-accent)]"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const copy = (ab.features || DEFAULT_FEATURES).filter((_, i) => i !== idx);
                      onUpdate('aboutPage', { features: copy });
                      toast.success('Feature Deleted');
                    }}
                    className="text-[var(--admin-error)] opacity-60 hover:opacity-100 transition-opacity flex items-center justify-center p-2 hover:bg-[var(--admin-error-light)] rounded-lg self-end sm:self-center shrink-0"
                  >
                    <span className="material-symbols-outlined text-[16px] font-bold">delete</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <AdminField
                    label="Material Symbol Icon Name"
                    description="From Google Material Symbols, e.g. diamond, handyman, star"
                  >
                    <AdminInput
                      value={item.icon || ''}
                      onChange={(e) => {
                        const copy = [...(ab.features || DEFAULT_FEATURES)];
                        copy[idx] = { ...copy[idx], icon: e.target.value };
                        onUpdate('about', { features: copy });
                      }}
                      className="!py-2 !text-[11px] sm:text-[11px] bg-[var(--admin-surface)] border-[var(--admin-border)]"
                    />
                  </AdminField>

                  <AdminField label="Feature Description">
                    <AdminTextarea
                      value={item.desc || ''}
                      onChange={(e) => {
                        const copy = [...(ab.features || DEFAULT_FEATURES)];
                        copy[idx] = { ...copy[idx], desc: e.target.value };
                        onUpdate('about', { features: copy });
                      }}
                      className="!py-1.5 !text-[11px] sm:text-[11px] bg-[var(--admin-surface)] border-[var(--admin-border)]"
                      rows={2}
                    />
                  </AdminField>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// 7.5. EVENTS PAGE BANNER & PROMOS
function EventsPageEditor({ content, onUpdate }) {
  const ep = content || {};
  const hero = ep.hero || {};
  const promo = ep.promo || {};

  return (
    <div className="admin-card p-6 space-y-6">
      <SectionHeader
        icon="celebration"
        title="Events Page Customizer"
        description="Configure banner headline, description, hero background image, and promo background image."
      />
      <div className="space-y-6">
        {/* Hero Section Banner */}
        <div className="admin-card p-5 space-y-4">
          <span className="text-[11px] sm:text-[11px] font-semibold text-[var(--admin-accent)] uppercase tracking-[0.18em] block border-b border-[var(--admin-border-subtle)] pb-2">
            1. Hero Section Banner
          </span>

          <AdminField label="Hero Title" description="The primary main headline of the events page">
            <div className="relative flex items-center w-full shadow-[var(--admin-shadow-xs)] rounded-xl">
              <AdminInput
                value={hero.title || ''}
                onChange={(e) =>
                  onUpdate('eventsPage', { hero: { ...hero, title: e.target.value } })
                }
                className="!pr-12 !py-3 !text-[12px] border-[var(--admin-border)] focus:border-[var(--admin-accent)] bg-[var(--admin-surface-muted)] hover:bg-[var(--admin-surface)]"
              />
              <div className="absolute right-2.5">
                <AISparkButton
                  text={hero.title}
                  onApply={(val) => onUpdate('eventsPage', { hero: { ...hero, title: val } })}
                />
              </div>
            </div>
          </AdminField>

          <AdminField label="Hero Subtitle" description="A short tagline or category group text">
            <div className="relative flex items-center w-full shadow-[var(--admin-shadow-xs)] rounded-xl">
              <AdminInput
                value={hero.subtitle || ''}
                onChange={(e) =>
                  onUpdate('eventsPage', { hero: { ...hero, subtitle: e.target.value } })
                }
                className="!pr-12 !py-3 !text-[12px] border-[var(--admin-border)] focus:border-[var(--admin-accent)] bg-[var(--admin-surface-muted)] hover:bg-[var(--admin-surface)]"
              />
              <div className="absolute right-2.5">
                <AISparkButton
                  text={hero.subtitle}
                  onApply={(val) => onUpdate('eventsPage', { hero: { ...hero, subtitle: val } })}
                />
              </div>
            </div>
          </AdminField>

          <AdminField
            label="Hero Description"
            description="Immersive description paragraph detailing our event services"
          >
            <div className="relative flex items-start w-full shadow-[var(--admin-shadow-xs)] rounded-xl">
              <AdminTextarea
                value={hero.description || ''}
                onChange={(e) =>
                  onUpdate('eventsPage', { hero: { ...hero, description: e.target.value } })
                }
                rows={3}
                className="!pr-12 !py-3 !text-[12px] border-[var(--admin-border)] focus:border-[var(--admin-accent)] bg-[var(--admin-surface-muted)] hover:bg-[var(--admin-surface)]"
              />
              <div className="absolute right-2.5 top-2.5">
                <AISparkButton
                  text={hero.description}
                  onApply={(val) => onUpdate('eventsPage', { hero: { ...hero, description: val } })}
                />
              </div>
            </div>
          </AdminField>

          <ImageUpload
            label="Hero Background Image"
            value={hero.backgroundImage || ''}
            onChange={(val) => onUpdate('eventsPage', { hero: { ...hero, backgroundImage: val } })}
            folder="cms"
          />
        </div>

        {/* Promo Banner Settings */}
        <div className="admin-card p-5 space-y-4">
          <span className="text-[11px] sm:text-[11px] font-semibold text-[var(--admin-accent)] uppercase tracking-[0.18em] block border-b border-[var(--admin-border-subtle)] pb-2">
            2. Promo Banner Settings
          </span>
          <ImageUpload
            label="Promo Section Background Image"
            value={promo.backgroundImage || ''}
            onChange={(val) =>
              onUpdate('eventsPage', { promo: { ...promo, backgroundImage: val } })
            }
            folder="cms"
          />
        </div>
      </div>
    </div>
  );
}

// 8. HELPLINE & LOCATION
function ContactInfoEditor({ content, onUpdate }) {
  const c = content || {};

  return (
    <div className="admin-card p-6 space-y-6">
      <SectionHeader
        icon="contact_page"
        title="Contact Info & Helpline Channels"
        description="Manage direct calling helplines, WhatsApp live endpoints, maps, studio location and hours"
      />

      <div className="space-y-5">
        {/* Core Helpline Links */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4.5">
          <AdminField label="Primary Consultation Helpline" description="Direct voice call link">
            <AdminInput
              value={c.phone || ''}
              onChange={(e) => onUpdate('contact', { phone: e.target.value })}
              className="!py-2.5 !text-[12px] border-[var(--admin-border)] focus:border-[var(--admin-accent)]"
            />
          </AdminField>
          <AdminField label="WhatsApp Instant Link" description="Direct messaging URL">
            <AdminInput
              value={c.whatsapp || ''}
              onChange={(e) => onUpdate('contact', { whatsapp: e.target.value })}
              className="!py-2.5 !text-[12px] border-[var(--admin-border)] focus:border-[var(--admin-accent)]"
            />
          </AdminField>
          <AdminField label="Official Support Email" description="Digital studio inbox">
            <AdminInput
              value={c.email || ''}
              onChange={(e) => onUpdate('contact', { email: e.target.value })}
              className="!py-2.5 !text-[12px] border-[var(--admin-border)] focus:border-[var(--admin-accent)]"
            />
          </AdminField>
        </div>

        {/* Address and Maps */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4.5 pt-4 border-t border-[var(--admin-border-subtle)]">
          <AdminField
            label="Studio Physical Address"
            description="Location rendered on footer & contact pages"
          >
            <AdminInput
              value={c.address || ''}
              onChange={(e) => onUpdate('contact', { address: e.target.value })}
              className="!py-2.5 !text-[11px] sm:text-[11px] border-[var(--admin-border)] focus:border-[var(--admin-accent)]"
            />
          </AdminField>
          <AdminField
            label="Google Maps Direction Link"
            description="Anchor link routing users to navigate"
          >
            <AdminInput
              value={c.mapEmbed || ''}
              onChange={(e) => onUpdate('contact', { mapEmbed: e.target.value })}
              placeholder="e.g. https://maps.google.com/?q=..."
              className="!py-2.5 !text-[11px] sm:text-[11px] border-[var(--admin-border)] focus:border-[var(--admin-accent)]"
            />
          </AdminField>
        </div>

        {/* Timings */}
        <div className="bg-[var(--admin-surface)] p-4.5 rounded-2xl border border-[var(--admin-border)] space-y-3 mt-4 shadow-[var(--admin-shadow-xs)]">
          <span className="text-[11px] sm:text-[11px] font-semibold text-[var(--admin-accent)] uppercase tracking-[0.15em] block font-sans">
            Studio Business Hours
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4.5">
            <AdminField label="Weekdays opening schedule">
              <AdminInput
                value={c.businessHours || 'Mon - Sat: 10 AM - 7 PM'}
                onChange={(e) => onUpdate('contact', { businessHours: e.target.value })}
                className="!py-2 !text-[11px] sm:text-[11px] bg-[var(--admin-surface)] border-[var(--admin-border)]"
              />
            </AdminField>
            <div className="p-3 bg-[var(--admin-surface-muted)] rounded-xl border border-[var(--admin-border-subtle)] flex items-center justify-center text-center">
              <span className="text-[11px] text-[var(--admin-text-tertiary)] font-light leading-normal">
                Rendered across the responsive helpline and custom booking panels.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// 9. CUSTOM INTAKE FORM
function CustomOrdersEditor({ content, onUpdate }) {
  const co = content || {};
  return (
    <div className="admin-card p-6 space-y-6">
      <SectionHeader
        icon="design_services"
        title="Custom Orders Settings"
        description="Configure titles and messages for the bespoke intake flow"
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <AdminField label="Intake Page Headline">
          <AdminInput
            value={co.pageTitle || ''}
            onChange={(e) => onUpdate('custom-orders', { pageTitle: e.target.value })}
            className="!py-2.5 !text-[12px] border-[var(--admin-border)] focus:border-[var(--admin-accent)]"
          />
        </AdminField>
        <AdminField label="Intake Form Notice Text">
          <AdminInput
            value={co.noticeText || ''}
            onChange={(e) => onUpdate('custom-orders', { noticeText: e.target.value })}
            className="!py-2.5 !text-[12px] border-[var(--admin-border)] focus:border-[var(--admin-accent)]"
          />
        </AdminField>
      </div>
    </div>
  );
}

// 11. FAQS
function FAQEditor({ content, onUpdate }) {
  const faqs = content.faqs || {};
  const homepageFaqs = faqs.homepage || [];
  const productsFaqs = faqs.products || [];

  const handleUpdate = (category, idx, field, value) => {
    const copy = category === 'homepage' ? [...homepageFaqs] : [...productsFaqs];
    copy[idx] = { ...copy[idx], [field]: value };
    onUpdate('faqs', { [category]: copy });
  };

  const handleAdd = (category) => {
    const copy = category === 'homepage' ? [...homepageFaqs] : [...productsFaqs];
    copy.push({ question: 'New Question', answer: 'Answer here' });
    onUpdate('faqs', { [category]: copy });
  };

  const handleDelete = (category, idx) => {
    const copy = category === 'homepage' ? [...homepageFaqs] : [...productsFaqs];
    copy.splice(idx, 1);
    onUpdate('faqs', { [category]: copy });
  };

  return (
    <div className="admin-card p-6 space-y-6">
      <SectionHeader
        icon="help_center"
        title="Frequently Asked Questions"
        description="Manage the FAQs displayed on the Homepage and Product pages"
      />

      <div className="space-y-6">
        {/* Homepage FAQs */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <span className="text-[12px] font-semibold text-[var(--admin-accent)] uppercase tracking-[0.18em]">
              Homepage FAQs
            </span>
            <button
              onClick={() => handleAdd('homepage')}
              className="text-[11px] sm:text-[11px] font-bold text-[var(--admin-accent)] hover:text-[var(--admin-accent)] border border-[var(--admin-accent)]/30 hover:border-[var(--admin-accent)] px-3.5 py-1.5 rounded-full bg-[var(--admin-surface)] transition-all cursor-pointer shadow-[var(--admin-shadow-xs)] hover:shadow-xs"
            >
              + Add FAQ
            </button>
          </div>
          <div className="space-y-4">
            {homepageFaqs.map((faq, idx) => (
              <div
                key={idx}
                className="p-4 bg-[var(--admin-surface)] rounded-2xl border border-[var(--admin-border)] space-y-3.5 shadow-[var(--admin-shadow-xs)]"
              >
                <div className="flex justify-between items-center border-b border-[var(--admin-accent)]/5 pb-2">
                  <AdminField label={`Question ${idx + 1}`} className="w-full">
                    <AdminInput
                      value={faq.question}
                      onChange={(e) => handleUpdate('homepage', idx, 'question', e.target.value)}
                      className="!py-1.5 font-bold !text-[11px] bg-[var(--admin-surface)] border-[var(--admin-border)] focus:border-[var(--admin-accent)]"
                    />
                  </AdminField>
                  <button
                    onClick={() => handleDelete('homepage', idx)}
                    className="text-[var(--admin-error)] opacity-60 hover:opacity-100 p-2.5 ml-2 hover:bg-[var(--admin-error-light)] rounded-lg cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px]">delete</span>
                  </button>
                </div>
                <AdminField label="Answer">
                  <AdminTextarea
                    value={faq.answer}
                    onChange={(e) => handleUpdate('homepage', idx, 'answer', e.target.value)}
                    rows={2}
                    className="!py-2 !text-[11px] bg-[var(--admin-surface)] border-[var(--admin-border)] focus:border-[var(--admin-accent)]"
                  />
                </AdminField>
              </div>
            ))}
          </div>
        </div>

        {/* Product FAQs */}
        <div className="pt-6 border-t border-[var(--admin-border-subtle)]">
          <div className="flex justify-between items-center mb-4">
            <span className="text-[12px] font-semibold text-[var(--admin-accent)] uppercase tracking-[0.18em]">
              Products FAQs
            </span>
            <button
              onClick={() => handleAdd('products')}
              className="text-[11px] sm:text-[11px] font-bold text-[var(--admin-accent)] hover:text-[var(--admin-accent)] border border-[var(--admin-accent)]/30 hover:border-[var(--admin-accent)] px-3.5 py-1.5 rounded-full bg-[var(--admin-surface)] transition-all cursor-pointer shadow-[var(--admin-shadow-xs)] hover:shadow-xs"
            >
              + Add FAQ
            </button>
          </div>
          <div className="space-y-4">
            {productsFaqs.map((faq, idx) => (
              <div
                key={idx}
                className="p-4 bg-[var(--admin-surface)] rounded-2xl border border-[var(--admin-border)] space-y-3.5 shadow-[var(--admin-shadow-xs)]"
              >
                <div className="flex justify-between items-center border-b border-[var(--admin-accent)]/5 pb-2">
                  <AdminField label={`Question ${idx + 1}`} className="w-full">
                    <AdminInput
                      value={faq.question}
                      onChange={(e) => handleUpdate('products', idx, 'question', e.target.value)}
                      className="!py-1.5 font-bold !text-[11px] bg-[var(--admin-surface)] border-[var(--admin-border)] focus:border-[var(--admin-accent)]"
                    />
                  </AdminField>
                  <button
                    onClick={() => handleDelete('products', idx)}
                    className="text-[var(--admin-error)] opacity-60 hover:opacity-100 p-2.5 ml-2 hover:bg-[var(--admin-error-light)] rounded-lg cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px]">delete</span>
                  </button>
                </div>
                <AdminField label="Answer">
                  <AdminTextarea
                    value={faq.answer}
                    onChange={(e) => handleUpdate('products', idx, 'answer', e.target.value)}
                    rows={2}
                    className="!py-2 !text-[11px] bg-[var(--admin-surface)] border-[var(--admin-border)] focus:border-[var(--admin-accent)]"
                  />
                </AdminField>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// 10. SEO META CENTER
function SEOCenterEditor({ content, onUpdate }) {
  const seo = content || {};

  return (
    <div className="admin-card p-6 space-y-6">
      <SectionHeader
        icon="search"
        title="SEO Settings & Brand Metadata"
        description="Configure search engine title suffixes, global descriptions, indexing keys, and social thumbnails"
      />

      <div className="space-y-5">
        {/* Title & Desc */}
        <AdminField
          label="Default Google Page Title Tag"
          description="Displayed on search results tabs (max 60 chars)"
        >
          <AdminInput
            value={seo.globalTitle || ''}
            onChange={(e) => onUpdate('seo', { globalTitle: e.target.value })}
            className="!py-2.5 !text-[12px] border-[var(--admin-border)] focus:border-[var(--admin-accent)] bg-[var(--admin-surface-muted)] hover:bg-[var(--admin-surface)]"
          />
        </AdminField>

        <AdminField
          label="Meta Description Block"
          description="Text block crawled by Google for list snippets (max 160 chars)"
        >
          <AdminTextarea
            value={seo.globalDescription || ''}
            onChange={(e) => onUpdate('seo', { globalDescription: e.target.value })}
            rows={3}
            className="!py-2.5 !text-[12px] border-[var(--admin-border)] focus:border-[var(--admin-accent)] bg-[var(--admin-surface-muted)] hover:bg-[var(--admin-surface)]"
          />
        </AdminField>

        {/* Social Meta */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-4 border-t border-[var(--admin-border-subtle)]">
          <AdminField
            label="Global Search Keywords Tag"
            description="Comma-separated crawling keywords"
          >
            <AdminInput
              value={seo.globalKeywords || ''}
              onChange={(e) => onUpdate('seo', { globalKeywords: e.target.value })}
              className="!py-2.5 !text-[11px] sm:text-[11px] border-[var(--admin-border)] focus:border-[var(--admin-accent)] bg-[var(--admin-surface-muted)] hover:bg-[var(--admin-surface)]"
            />
          </AdminField>
          <ImageUpload
            label="OpenGraph Social Share Thumbnail URL"
            value={seo.ogImage || ''}
            onChange={(val) => onUpdate('seo', { ogImage: val })}
            folder="cms"
          />
        </div>
      </div>
    </div>
  );
}

// 12. ANNOUNCEMENT PROMOS
function AnnouncementBarEditor({ banners, onUpdate }) {
  return (
    <div className="admin-card p-6 space-y-6">
      <SectionHeader
        icon="campaign"
        title="Header Promotion Promos"
        description="Configure and display sliding text banners highlighting seasonal offers"
      />
      <div className="space-y-4">
        {banners?.map((b, idx) => (
          <div
            key={b.id}
            className={`p-4 rounded-2xl border flex items-center justify-between gap-3.5 transition-all duration-300 shadow-[var(--admin-shadow-xs)] hover:shadow-xs ${
              b.isActive
                ? 'bg-[var(--admin-surface)] border-[var(--admin-accent)]'
                : 'bg-[var(--admin-surface)]/80 border-[var(--admin-border)] opacity-70 hover:opacity-100'
            }`}
          >
            <div className="flex items-center gap-3 flex-1">
              <div className="w-7 h-7 rounded-lg bg-[var(--admin-surface-muted)] border border-[var(--admin-accent)]/20 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[14px] text-[var(--admin-accent)] font-semibold">
                  {b.icon || 'notifications'}
                </span>
              </div>
              <AdminInput
                value={b.text}
                onChange={(e) => {
                  const copy = [...banners];
                  copy[idx] = { ...copy[idx], text: e.target.value };
                  onUpdate('announcement', { banners: copy });
                }}
                className="!py-1.5 !text-[11px] sm:text-[11px] bg-transparent flex-1 border-none focus:bg-transparent shadow-none"
              />
            </div>
            <AdminToggle
              checked={b.isActive}
              onChange={() => {
                const copy = banners.map((item) =>
                  item.id === b.id
                    ? { ...item, isActive: !item.isActive }
                    : { ...item, isActive: false },
                );
                onUpdate('announcement', { banners: copy });
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// 13. HEADER & FOOTERS
function NavigationFooterEditor({ nav, footer, onUpdate }) {
  return (
    <div className="space-y-6">
      <div className="bg-[var(--admin-surface)] rounded-[var(--admin-radius-xl)] border border-[var(--admin-border)] p-6 space-y-5 shadow-[var(--admin-shadow-xs)] relative overflow-hidden">
        <SectionHeader
          icon="menu"
          title="Navbar Logo Builder"
          description="Adjust boutique storefront name and sub-line credentials"
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <AdminField label="Navbar Brand Name">
            <AdminInput
              value={nav.logo?.text || ''}
              onChange={(e) =>
                onUpdate('navigation', { logo: { ...nav.logo, text: e.target.value } })
              }
              className="!py-2.5 !text-[12px] border-[var(--admin-border)] focus:border-[var(--admin-accent)] bg-[var(--admin-surface-muted)] hover:bg-[var(--admin-surface)]"
            />
          </AdminField>
          <AdminField label="Subtext Tagline">
            <AdminInput
              value={nav.logo?.tagline || ''}
              onChange={(e) =>
                onUpdate('navigation', { logo: { ...nav.logo, tagline: e.target.value } })
              }
              className="!py-2.5 !text-[12px] border-[var(--admin-border)] focus:border-[var(--admin-accent)] bg-[var(--admin-surface-muted)] hover:bg-[var(--admin-surface)]"
            />
          </AdminField>
        </div>
      </div>

      <div className="bg-[var(--admin-surface)] rounded-[var(--admin-radius-xl)] border border-[var(--admin-border)] p-6 space-y-5 shadow-[var(--admin-shadow-xs)] relative overflow-hidden">
        <SectionHeader
          icon="bottom_navigation"
          title="Footer Credentials"
          description="Manage general description summary blocks rendered inside the page base layout"
        />
        <AdminField label="Footer Brand Biography">
          <AdminTextarea
            value={footer.description || ''}
            onChange={(e) => onUpdate('footer', { description: e.target.value })}
            rows={3}
            className="!py-2.5 !text-[12px] border-[var(--admin-border)] focus:border-[var(--admin-accent)] bg-[var(--admin-surface-muted)] hover:bg-[var(--admin-surface)]"
          />
        </AdminField>
      </div>
    </div>
  );
}

// 14. VERSION ROLLBACK
function PublisherVersionsEditor() {
  const versions = [
    {
      id: 4,
      tag: 'v2.4',
      desc: 'Pre-Diwali Launch Curation - by Sirisha',
      time: 'May 17, 2026 19:30',
    },
    {
      id: 3,
      tag: 'v2.3',
      desc: 'Summer Wedding Collections - by Balaji',
      time: 'May 10, 2026 14:15',
    },
  ];

  return (
    <div className="bg-[var(--admin-surface)] rounded-[var(--admin-radius-xl)] border border-[var(--admin-border)] p-6 space-y-5 shadow-[var(--admin-shadow-xs)] relative overflow-hidden">
      <SectionHeader
        icon="history"
        title="Version Rollback Vault"
        description="Quickly restore previously published storefront layouts and restore visual snapshots"
      />
      <div className="space-y-4">
        {versions.map((v) => (
          <div
            key={v.id}
            className="p-4.5 bg-[var(--admin-surface)] rounded-2xl border border-[var(--admin-border)] flex items-center justify-between gap-4.5 shadow-[var(--admin-shadow-xs)] hover:border-[var(--admin-border-strong)] hover:shadow-[var(--admin-shadow-sm)] transition-all duration-300"
          >
            <div className="space-y-1">
              <span className="text-[7.5px] bg-[var(--admin-accent)]/15 text-[var(--admin-accent)] font-semibold px-2.5 py-0.5 rounded-full font-mono w-fit block shadow-[var(--admin-shadow-xs)]">
                {v.tag}
              </span>
              <span className="text-[12px] font-bold text-[var(--admin-text-primary)] mt-2 block leading-none">
                {v.desc}
              </span>
              <span className="text-[11px] text-[var(--admin-text-tertiary)] block mt-1">
                {v.time}
              </span>
            </div>
            <button
              onClick={() => toast.success(`Rolled back to ${v.tag}!`)}
              className="px-4 py-2 rounded-xl text-[11px] sm:text-[11px] sm:text-[11px] font-semibold border border-[var(--admin-border)] hover:border-[var(--admin-accent)] bg-[var(--admin-surface)] text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)] cursor-pointer shadow-[var(--admin-shadow-xs)] transition-all active:scale-95"
            >
              Restore
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// 15. MEDIA VAULT
function MediaLibraryEditor() {
  const mediaFiles = [
    {
      id: 1,
      name: 'temple_style_mandap.png',
      size: '1.4 MB',
      url: PLACEHOLDER_IMAGES.collectionWedding,
    },
    {
      id: 2,
      name: 'luxury_royal_wedding.png',
      size: '2.1 MB',
      url: PLACEHOLDER_IMAGES.mandalaHero,
    },
  ];

  return (
    <div className="admin-card p-6 space-y-6">
      <SectionHeader
        icon="image"
        title="Media Lossless Vault"
        description="Audit dynamic image asset file size weights and retrieve clean Cloudinary reference links"
      />
      <div className="grid grid-cols-1 gap-4.5">
        {mediaFiles.map((f) => (
          <div
            key={f.id}
            className="p-3 bg-[var(--admin-surface)] rounded-2xl border border-[var(--admin-border)] flex items-center justify-between gap-4 shadow-[var(--admin-shadow-xs)] hover:border-[var(--admin-border-strong)] hover:shadow-[var(--admin-shadow-sm)] transition-all duration-300"
          >
            <div className="flex items-center gap-3.5">
              <div
                className="w-11 h-11 rounded-xl bg-cover bg-center shrink-0 border border-[var(--admin-border-subtle)] shadow-inner"
                style={{ backgroundImage: `url(${f.url})` }}
              />
              <div>
                <span className="text-[11px] sm:text-[11px] font-semibold text-[var(--admin-text-primary)] block truncate max-w-[155px] leading-tight">
                  {f.name}
                </span>
                <span className="text-[11px] text-[var(--admin-text-tertiary)] uppercase tracking-widest font-semibold mt-1 block">
                  optimized png • {f.size}
                </span>
              </div>
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(window.location.origin + f.url);
                toast.success('Copied Link to Clipboard!');
              }}
              className="p-2.5 rounded-full bg-[var(--admin-surface-muted)]/60 border border-[var(--admin-accent)]/20 text-[var(--admin-accent)] hover:bg-[var(--admin-accent)]/15 flex items-center justify-center cursor-pointer shadow-[var(--admin-shadow-xs)] active:scale-95 transition-all"
            >
              <span className="material-symbols-outlined text-[13px] block font-bold">link</span>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// 16. INVENTORY QUICK FEATURED STATUS
function QuickCatalogControl() {
  const { products, toggleProductFeatured } = useAdmin();
  return (
    <div className="admin-card p-6 space-y-6">
      <SectionHeader
        icon="inventory_2"
        title="Featured Shelf Flags"
        description="Fast adjustment controls to tag items displaying inside our recommended catalog lists"
      />
      <div className="space-y-3 max-h-[390px] overflow-y-auto pr-1 scrollbar-none">
        {products?.slice(0, 8).map((prd) => (
          <div
            key={prd.id}
            className="p-3 bg-[var(--admin-surface)] rounded-2xl border border-[var(--admin-border)] flex items-center justify-between gap-3 shadow-[var(--admin-shadow-xs)] hover:border-[var(--admin-border-strong)] hover:shadow-[var(--admin-shadow-sm)] transition-all duration-300"
          >
            <div className="flex items-center gap-3">
              <img
                src={prd.image}
                alt={prd.name}
                className="w-10 h-10 object-cover rounded-xl border border-[var(--admin-border-subtle)] shadow-[var(--admin-shadow-xs)] shrink-0"
              />
              <div>
                <span className="text-[11px] sm:text-[11px] font-bold text-[var(--admin-text-primary)] block line-clamp-1 leading-tight">
                  {prd.name}
                </span>
                <span className="text-[11px] text-[var(--admin-accent)] font-semibold uppercase tracking-widest mt-1 block">
                  {prd.category}
                </span>
              </div>
            </div>
            <button
              onClick={() => toggleProductFeatured(prd.id)}
              className={`p-2.5 rounded-full border transition-all cursor-pointer flex items-center justify-center shadow-[var(--admin-shadow-xs)] active:scale-95 ${
                prd.featured
                  ? 'bg-[var(--admin-accent)]/15 border-[var(--admin-accent)]/40 text-[var(--admin-accent)] shadow-[var(--admin-shadow-sm)]'
                  : 'bg-[var(--admin-surface)] border-[var(--admin-border)] text-[var(--admin-text-tertiary)] hover:text-[var(--admin-text-secondary)]'
              }`}
            >
              <span className="material-symbols-outlined text-[13px] block font-bold">star</span>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// MAIN COMPONENT ENTRYPOINT (THEME BUILDER LAYOUT 3-COLUMNS)
// ═══════════════════════════════════════════════════════════
export function AdminContent() {
  const {
    websiteContent,
    updateContent,
    publishAllContent,
    hasUnsavedContent,
    reorderHomepageSections,
    toggleHomepageSection,
    autoPublish,
    toggleAutoPublish,
    auxContent,
    dataLoading,
  } = useAdmin();

  const [activeSection, setActiveSection] = useState('home');

  const {
    formData: draftWebsiteContent,
    setFormData: setDraftWebsiteContent,
    draftStatus,
    showRestoreModal,
    restoreDraft,
    discardDraft,
    deleteDraft,
    lastSavedAt,
    blocker,
  } = useDraft({
    draftKey: 'admin:content:all',
    module: 'Content',
    pageTitle: 'Content Management',
    initialData: websiteContent,
    enabled: !autoPublish && !dataLoading,
  });

  // Use draft content if available, otherwise fallback to context content
  const activeContent = draftWebsiteContent || websiteContent;

  const handleUpdateContent = (section, payload) => {
    const isHomeSection = activeSection === 'home';
    const isAutoPublishDisabled = isHomeSection ? true : !autoPublish;

    // If auto-publish is disabled (globally or just for this section), save to draft
    if (isAutoPublishDisabled) {
      setDraftWebsiteContent((prev) => ({
        ...prev,
        [section]: { ...(prev[section] || {}), ...payload },
      }));
    }

    // Also dispatch to context (which might auto-save depending on its logic)
    updateContent(section, payload, isAutoPublishDisabled);
  };

  const handlePublishAll = async () => {
    await publishAllContent();
    if (!autoPublish) {
      await deleteDraft();
    }
  };

  const categoryScrollRef = useRef(null);
  const subitemScrollRef = useRef(null);

  useEffect(() => {
    // Scroll active category into view
    const activeCategoryEl = categoryScrollRef.current?.querySelector('.active-category');
    if (activeCategoryEl) {
      activeCategoryEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
    // Scroll active subitem into view
    const activeSubitemEl = subitemScrollRef.current?.querySelector('.active-subitem');
    if (activeSubitemEl) {
      activeSubitemEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, [activeSection]);

  const [expandedCategories, setExpandedCategories] = useState({
    'Storefront Layout': true,
    Pages: true,
    'SEO & Branding': true,
    'System Tools': false,
  });

  const toggleCategory = (cat) => {
    setExpandedCategories((prev) => ({ ...prev, [cat]: !prev[cat] }));
  };

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={stagger}
      className="max-w-[1500px] mx-auto space-y-6 relative font-sans text-[var(--admin-text-primary)] text-[12px] leading-normal"
    >
      {dataLoading ? (
        <SkeletonDashboard />
      ) : (
        <>
          {/* Sleek Minimal Command Header */}
          <motion.div
            variants={fadeUp}
            className="flex flex-col sm:flex-row sm:items-center justify-between pb-4.5 border-b border-[var(--admin-border)] gap-4"
          >
            <div>
              <h2 className="text-[22px] font-bold text-[var(--admin-text-primary)] tracking-tight">
                Storefront CMS Editor
              </h2>
              <div className="flex items-center gap-3 mt-1">
                <p className="text-[10px] text-[var(--admin-text-secondary)] tracking-wide">
                  Website Layout & Theme Styling
                </p>
                {!autoPublish && (
                  <DraftStatusIndicator status={draftStatus} lastSavedAt={lastSavedAt} />
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 flex-nowrap sm:w-auto justify-end shrink-0">
              {activeSection !== 'home' && (
                <>
                  <div className="hidden sm:flex items-center gap-2 text-[11px] text-[var(--admin-success)] font-semibold uppercase tracking-wider bg-[var(--admin-success-light)] border border-[var(--admin-success-border)] px-4 py-1.5 rounded-full shadow-[var(--admin-shadow-xs)]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--admin-success)] animate-pulse " />
                    Live Sync Mode
                  </div>

                  {/* Quick Auto-Publish Toggle Switch */}
                  <div className="flex items-center gap-2 bg-[var(--admin-bg-subtle)] border border-[var(--admin-border)] px-3 rounded-full shadow-[var(--admin-shadow-xs)] h-[34px] shrink-0">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--admin-text-secondary)]">
                      Auto-Publish
                    </span>
                    <AdminToggle
                      checked={autoPublish}
                      onChange={toggleAutoPublish}
                      size="sm"
                      aria-label="Toggle Auto-Publish"
                    />
                  </div>

                  {autoPublish && (
                    <div className="flex items-center gap-2 px-3 bg-[var(--admin-success-light)] text-[var(--admin-success)] border border-[var(--admin-success-border)] rounded-full text-[11px] font-bold uppercase tracking-wider h-[34px] shrink-0">
                      <span className="material-symbols-outlined text-[14px] animate-spin-slow">
                        sync
                      </span>
                      <span>Auto-Publishing</span>
                    </div>
                  )}
                </>
              )}

              {(!autoPublish || activeSection === 'home') && (
                <button
                  onClick={handlePublishAll}
                  className="flex items-center gap-2 px-4 bg-[var(--admin-text-primary)] text-[var(--admin-text-inverse)] hover:bg-[var(--admin-accent-hover)] rounded-full transition-all duration-300 text-[11px] font-bold uppercase tracking-[0.2em] cursor-pointer shadow-[var(--admin-shadow-sm)] hover:shadow-[var(--admin-shadow-md)] hover:-translate-y-0.5 active:scale-95 shrink-0 border border-transparent hover:border-[var(--admin-accent)]/40 h-[34px]"
                >
                  <span className="material-symbols-outlined text-[14px] font-bold">publish</span>
                  <span>Publish</span>
                </button>
              )}
            </div>
          </motion.div>

          {/* 2-Column Luxury Workspace Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-[230px_1fr] xl:grid-cols-[240px_1fr] gap-6 items-start">
            {/* Mobile Navigation Header: Horizontal Scrollable Swipe Hub (Mobile Only) */}
            <div className="block lg:hidden space-y-3.5 bg-[var(--admin-surface-muted)] rounded-[var(--admin-radius-xl)] border border-[var(--admin-border)] p-4 shadow-[var(--admin-shadow-xs)]">
              {/* Main Category Groups */}
              <div
                ref={categoryScrollRef}
                className="flex items-center gap-1.5 overflow-x-auto pb-1.5 border-b border-[var(--admin-border-subtle)] scrollbar-hide"
                style={{
                  scrollbarWidth: 'none',
                  msOverflowStyle: 'none',
                  WebkitOverflowScrolling: 'touch',
                }}
              >
                {CMS_SIDEBAR.map((cat) => {
                  const isGroupActive = cat.items.some((item) => item.id === activeSection);
                  return (
                    <button
                      key={cat.title}
                      type="button"
                      onClick={() => {
                        // Instantly set active section to the first item under this category group
                        setActiveSection(cat.items[0].id);
                      }}
                      className={`px-3.5 py-1.5 rounded-xl text-[11px] sm:text-[11px] font-semibold uppercase tracking-[0.12em] transition-all duration-300 shrink-0 cursor-pointer border ${
                        isGroupActive
                          ? 'text-[var(--admin-text-inverse)] bg-[var(--admin-text-primary)] border-[var(--admin-text-primary)] shadow-[var(--admin-shadow-sm)] active-category'
                          : 'text-[var(--admin-text-secondary)] bg-[var(--admin-bg-subtle)]/40 border-[var(--admin-border)] hover:bg-[var(--admin-surface)] hover:text-[var(--admin-text-primary)]'
                      }`}
                    >
                      {cat.title}
                    </button>
                  );
                })}
              </div>

              {/* Sub-item Nodes */}
              <div
                ref={subitemScrollRef}
                className="flex items-center gap-2 overflow-x-auto py-0.5 scrollbar-hide"
                style={{
                  scrollbarWidth: 'none',
                  msOverflowStyle: 'none',
                  WebkitOverflowScrolling: 'touch',
                }}
              >
                {CMS_SIDEBAR.map((cat) => {
                  const isGroupActive = cat.items.some((item) => item.id === activeSection);
                  if (!isGroupActive) return null;

                  return cat.items.map((item) => {
                    const isActive = activeSection === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setActiveSection(item.id)}
                        className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition-all duration-200 shrink-0 border ${
                          isActive
                            ? 'bg-[var(--admin-accent-subtle)] border-transparent text-[var(--admin-accent)] font-semibold active-subitem'
                            : 'bg-[var(--admin-surface)]/60 border-[var(--admin-border)] text-[var(--admin-text-secondary)] hover:bg-[var(--admin-surface-muted)] hover:text-[var(--admin-text-primary)]'
                        }`}
                      >
                        <span
                          className={`material-symbols-outlined text-[13px] block transition-colors duration-200 ${
                            isActive
                              ? 'text-[var(--admin-accent)]'
                              : 'text-[var(--admin-text-secondary)]/60'
                          }`}
                        >
                          {item.icon}
                        </span>
                        <span className="text-[11px] sm:text-[11px] font-semibold uppercase tracking-wider">
                          {item.label}
                        </span>
                      </button>
                    );
                  });
                })}
              </div>
            </div>

            {/* Column 1: Sidebar Drawer Accordion (Desktop Only) */}
            <motion.div
              variants={fadeUp}
              className="hidden lg:block bg-[var(--admin-surface)] rounded-[var(--admin-radius-xl)] border border-[var(--admin-border)] p-3.5 lg:sticky lg:top-24 lg:space-y-4.5 shadow-[var(--admin-shadow-sm)]"
            >
              {CMS_SIDEBAR.map((cat) => (
                <div key={cat.title} className="space-y-1.5">
                  <button
                    onClick={() => toggleCategory(cat.title)}
                    className="w-full text-left px-2.5 py-1 text-[11px] font-semibold text-[var(--admin-text-tertiary)] hover:text-[var(--admin-text-secondary)] tracking-[0.2em] uppercase flex items-center justify-between border-b border-[var(--admin-accent)]/5 pb-1.5 cursor-pointer transition-all"
                  >
                    <span>{cat.title}</span>
                    <span className="material-symbols-outlined text-[12px] font-bold">
                      {expandedCategories[cat.title] ? 'expand_less' : 'expand_more'}
                    </span>
                  </button>

                  <AnimatePresence initial={false}>
                    {expandedCategories[cat.title] && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden space-y-1 pt-1.5"
                      >
                        {cat.items.map((item) => {
                          const isActive = activeSection === item.id;
                          return (
                            <button
                              key={item.id}
                              onClick={() => {
                                setActiveSection(item.id);
                              }}
                              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left cursor-pointer transition-all duration-200 border ${
                                isActive
                                  ? 'bg-[var(--admin-accent-subtle)] border-transparent text-[var(--admin-accent)] font-semibold'
                                  : 'text-[var(--admin-text-secondary)] border-transparent hover:bg-[var(--admin-surface-muted)] hover:text-[var(--admin-text-primary)]'
                              }`}
                            >
                              <span
                                className={`material-symbols-outlined text-[16px] block transition-colors duration-200 ${
                                  isActive
                                    ? 'text-[var(--admin-accent)] font-semibold'
                                    : 'text-[var(--admin-text-secondary)]/70'
                                }`}
                              >
                                {item.icon}
                              </span>
                              <span className="text-[11px] sm:text-[11px] block truncate flex-1 font-bold uppercase tracking-wider">
                                {item.label}
                              </span>
                            </button>
                          );
                        })}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </motion.div>

            {/* Column 2: Modular Form Workspace */}
            <motion.div variants={fadeUp} className="space-y-4 min-w-0 flex-1">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeSection}
                  initial={{ opacity: 0, y: 3 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -3 }}
                  transition={{ duration: 0.15 }}
                >
                  {activeSection === 'home' && (
                    <HomePageControllerEditor
                      content={activeContent}
                      onUpdate={handleUpdateContent}
                    />
                  )}
                  {activeSection === 'gallery' && (
                    <GalleryPortfolioEditor
                      content={activeContent}
                      onUpdate={handleUpdateContent}
                    />
                  )}
                  {activeSection === 'about' && (
                    <AboutPageDetailsEditor
                      content={activeContent.aboutPage}
                      onUpdate={handleUpdateContent}
                    />
                  )}
                  {activeSection === 'events-page' && (
                    <EventsPageEditor
                      content={activeContent.eventsPage}
                      onUpdate={handleUpdateContent}
                    />
                  )}
                  {activeSection === 'contact' && (
                    <ContactInfoEditor
                      contact={activeContent.contact}
                      onUpdate={handleUpdateContent}
                    />
                  )}
                  {activeSection === 'custom-orders' && (
                    <CustomOrdersEditor content={activeContent} onUpdate={handleUpdateContent} />
                  )}
                  {activeSection === 'seo-center' && (
                    <SEOCenterEditor content={activeContent} onUpdate={handleUpdateContent} />
                  )}

                  {activeSection === 'announcement-bar' && (
                    <AnnouncementBarEditor
                      banners={activeContent.banners}
                      onUpdate={handleUpdateContent}
                    />
                  )}
                  {activeSection === 'navigation' && (
                    <NavigationFooterEditor
                      nav={activeContent.navigation}
                      footer={activeContent.footer}
                      onUpdate={handleUpdateContent}
                    />
                  )}
                  {activeSection === 'publish-controls' && <PublisherVersionsEditor />}
                  {activeSection === 'media-library' && <MediaLibraryEditor />}
                  {activeSection === 'catalog' && <QuickCatalogControl />}
                  {activeSection === 'faqs' && (
                    <FAQEditor content={activeContent} onUpdate={handleUpdateContent} />
                  )}
                </motion.div>
              </AnimatePresence>
            </motion.div>
          </div>

          <PublishBar
            hasChanges={hasUnsavedContent && !autoPublish}
            onPublish={handlePublishAll}
            onReset={() => {}}
          />

          {!autoPublish && (
            <DraftRestoreModal
              isOpen={showRestoreModal}
              onRestore={restoreDraft}
              onDiscard={discardDraft}
              moduleName="Content"
              lastSavedAt={lastSavedAt}
            />
          )}

          <UnsavedChangesGuard blocker={blocker} />
        </>
      )}
    </motion.div>
  );
}

export default AdminContent;
