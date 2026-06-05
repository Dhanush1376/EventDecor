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
      { id: 'hero', label: 'Hero Banner', icon: 'aspect_ratio', desc: 'Primary entrance visuals' },
      {
        id: 'collections',
        label: 'Featured Collections',
        icon: 'grid_view',
        desc: 'Catalog category strips',
      },
      { id: 'story', label: 'About Teaser', icon: 'history_edu', desc: 'Studio lineage details' },
      { id: 'bestsellers', label: 'Bestsellers', icon: 'stars', desc: 'Featured product rows' },
      {
        id: 'homepageSections',
        label: 'Section Order',
        icon: 'reorder',
        desc: 'Reorder homepage blocks',
      },
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

// 1. HERO SHOWCASE
function HeroSectionEditor({ content, onUpdate }) {
  const hero = content.hero || {};
  return (
    <div className="admin-card p-6 space-y-6">
      <SectionHeader
        icon="aspect_ratio"
        title="Hero Banner"
        description="Configure text and buttons for the homepage banner"
      />
      <div className="space-y-5">
        <AdminField
          label="Primary Headline"
          description="The main premium bold text welcoming storefront patrons"
        >
          <div className="relative flex items-center w-full shadow-[var(--admin-shadow-xs)] rounded-xl">
            <AdminInput
              value={hero.title || ''}
              onChange={(e) => onUpdate('hero', { title: e.target.value })}
              className="!pr-12 !py-3 !text-[12px] border-[var(--admin-border)] focus:border-[var(--admin-accent)] bg-[var(--admin-surface-muted)] hover:bg-[var(--admin-surface)]"
            />
            <div className="absolute right-2.5">
              <AISparkButton
                text={hero.title}
                onApply={(val) => onUpdate('hero', { title: val })}
              />
            </div>
          </div>
        </AdminField>

        <AdminField
          label="Subtext Paragraph"
          description="A descriptive sentence establishing the boutique curation context"
        >
          <div className="relative flex items-start w-full shadow-[var(--admin-shadow-xs)] rounded-xl">
            <AdminTextarea
              value={hero.subtitle || ''}
              onChange={(e) => onUpdate('hero', { subtitle: e.target.value })}
              rows={2}
              className="!pr-12 !py-3 !text-[12px] border-[var(--admin-border)] focus:border-[var(--admin-accent)] bg-[var(--admin-surface-muted)] hover:bg-[var(--admin-surface)]"
            />
            <div className="absolute right-2.5 top-2.5">
              <AISparkButton
                text={hero.subtitle}
                onApply={(val) => onUpdate('hero', { subtitle: val })}
              />
            </div>
          </div>
        </AdminField>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <AdminField
            label="Gold Badge Tagline"
            description="Main badge line (e.g. 'Artisan Excellence Since 2015')"
          >
            <AdminInput
              value={hero.badgeText || ''}
              onChange={(e) => onUpdate('hero', { badgeText: e.target.value })}
              className="!py-2.5 !text-[11px] sm:text-[11px] border-[var(--admin-border)] focus:border-[var(--admin-accent)] bg-[var(--admin-surface-muted)] hover:bg-[var(--admin-surface)]"
            />
          </AdminField>
          <AdminField
            label="Rotating Seal Ring Text"
            description="Floating seal label (e.g. '• HANDCRAFTED LUXURY • HERITAGE ARTISTRY •')"
          >
            <AdminInput
              value={hero.rotatingSealText || ''}
              onChange={(e) => onUpdate('hero', { rotatingSealText: e.target.value })}
              className="!py-2.5 !text-[11px] sm:text-[11px] border-[var(--admin-border)] focus:border-[var(--admin-accent)] bg-[var(--admin-surface-muted)] hover:bg-[var(--admin-surface)]"
            />
          </AdminField>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <ImageUpload
            label="Lossless Background Image"
            value={hero.backgroundImage || ''}
            onChange={(val) => onUpdate('hero', { backgroundImage: val })}
            folder="cms"
          />

          <ImageUpload
            label="Mobile Background Image"
            value={hero.mobileBackgroundImage || ''}
            onChange={(val) => onUpdate('hero', { mobileBackgroundImage: val })}
            folder="cms"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-4 border-t border-[var(--admin-border-subtle)]">
          <AdminField label="Primary Action Button Text">
            <AdminInput
              value={hero.ctaPrimary?.text || ''}
              onChange={(e) =>
                onUpdate('hero', {
                  ctaPrimary: { ...(hero.ctaPrimary || {}), text: e.target.value },
                })
              }
              className="!py-2.5 !text-[11px] sm:text-[11px] border-[var(--admin-border)] focus:border-[var(--admin-accent)] bg-[var(--admin-surface-muted)] hover:bg-[var(--admin-surface)]"
            />
          </AdminField>
          <AdminField
            label="Primary Action Button Destination Link"
            description="Page path (e.g. '/collections')"
          >
            <AdminInput
              value={hero.ctaPrimary?.link || ''}
              onChange={(e) =>
                onUpdate('hero', {
                  ctaPrimary: { ...(hero.ctaPrimary || {}), link: e.target.value },
                })
              }
              className="!py-2.5 !text-[11px] sm:text-[11px] border-[var(--admin-border)] focus:border-[var(--admin-accent)] bg-[var(--admin-surface-muted)] hover:bg-[var(--admin-surface)]"
            />
          </AdminField>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2">
          <AdminField label="Secondary Action Button Text">
            <AdminInput
              value={hero.ctaSecondary?.text || ''}
              onChange={(e) =>
                onUpdate('hero', {
                  ctaSecondary: { ...(hero.ctaSecondary || {}), text: e.target.value },
                })
              }
              className="!py-2.5 !text-[11px] sm:text-[11px] border-[var(--admin-border)] focus:border-[var(--admin-accent)] bg-[var(--admin-surface-muted)] hover:bg-[var(--admin-surface)]"
            />
          </AdminField>
          <AdminField
            label="Secondary Action Button Destination Link"
            description="Page path (e.g. '/about')"
          >
            <AdminInput
              value={hero.ctaSecondary?.link || ''}
              onChange={(e) =>
                onUpdate('hero', {
                  ctaSecondary: { ...(hero.ctaSecondary || {}), link: e.target.value },
                })
              }
              className="!py-2.5 !text-[11px] sm:text-[11px] border-[var(--admin-border)] focus:border-[var(--admin-accent)] bg-[var(--admin-surface-muted)] hover:bg-[var(--admin-surface)]"
            />
          </AdminField>
        </div>

        <div className="pt-4 border-t border-[var(--admin-border-subtle)] space-y-4">
          <h4 className="text-[11px] font-semibold uppercase tracking-wider text-[var(--admin-accent)]">
            Floating Glass Card Settings (Desktop View)
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <AdminField label="Floating Card Title">
              <AdminInput
                value={hero.floatingCardTitle || ''}
                onChange={(e) => onUpdate('hero', { floatingCardTitle: e.target.value })}
                className="!py-2.5 !text-[11px] sm:text-[11px] border-[var(--admin-border)] focus:border-[var(--admin-accent)] bg-[var(--admin-surface-muted)] hover:bg-[var(--admin-surface)]"
              />
            </AdminField>
            <AdminField label="Floating Card Action Button Link">
              <AdminInput
                value={hero.floatingCardCtaLink || ''}
                onChange={(e) => onUpdate('hero', { floatingCardCtaLink: e.target.value })}
                className="!py-2.5 !text-[11px] sm:text-[11px] border-[var(--admin-border)] focus:border-[var(--admin-accent)] bg-[var(--admin-surface-muted)] hover:bg-[var(--admin-surface)]"
              />
            </AdminField>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <AdminField label="Floating Card Action Button Text">
              <AdminInput
                value={hero.floatingCardCtaText || ''}
                onChange={(e) => onUpdate('hero', { floatingCardCtaText: e.target.value })}
                className="!py-2.5 !text-[11px] sm:text-[11px] border-[var(--admin-border)] focus:border-[var(--admin-accent)] bg-[var(--admin-surface-muted)] hover:bg-[var(--admin-surface)]"
              />
            </AdminField>
            <AdminField label="Floating Card Description Paragraph">
              <AdminInput
                value={hero.floatingCardDesc || ''}
                onChange={(e) => onUpdate('hero', { floatingCardDesc: e.target.value })}
                className="!py-2.5 !text-[11px] sm:text-[11px] border-[var(--admin-border)] focus:border-[var(--admin-accent)] bg-[var(--admin-surface-muted)] hover:bg-[var(--admin-surface)]"
              />
            </AdminField>
          </div>
        </div>
      </div>
    </div>
  );
}

// 2. FEATURED STRIP
function FeaturedCollectionsEditor({ content, onUpdate }) {
  const fCol = content.featuredCollections || {};
  return (
    <div className="admin-card p-6 space-y-6">
      <SectionHeader
        icon="grid_view"
        title="Featured Collections Strip"
        description="Manage the dynamic catalog grid links showcasing signature design categories"
      />
      <div className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <AdminField label="Section Headline">
            <AdminInput
              value={fCol.sectionTitle || ''}
              onChange={(e) => onUpdate('featuredCollections', { sectionTitle: e.target.value })}
              className="!py-2.5 !text-[12px] border-[var(--admin-border)] focus:border-[var(--admin-accent)] bg-[var(--admin-surface-muted)] hover:bg-[var(--admin-surface)]"
            />
          </AdminField>
          <AdminField label="Pill Subtitle">
            <AdminInput
              value={fCol.sectionSubtitle || ''}
              onChange={(e) => onUpdate('featuredCollections', { sectionSubtitle: e.target.value })}
              className="!py-2.5 !text-[12px] border-[var(--admin-border)] focus:border-[var(--admin-accent)] bg-[var(--admin-surface-muted)] hover:bg-[var(--admin-surface)]"
            />
          </AdminField>
        </div>

        <div className="space-y-4 pt-4 border-t border-[var(--admin-border-subtle)]">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-[var(--admin-accent)] block mb-1">
            Configure Category Nodes
          </label>
          <div className="grid grid-cols-1 gap-4.5">
            {fCol.items?.map((item, idx) => (
              <div
                key={item.id || idx}
                className="p-4 bg-[var(--admin-surface)] rounded-2xl border border-[var(--admin-border)] flex flex-col md:flex-row items-stretch md:items-center gap-4.5 shadow-[var(--admin-shadow-xs)] hover:border-[var(--admin-border-strong)] hover:shadow-[var(--admin-shadow-sm)] transition-all duration-300"
              >
                <div className="flex-1 space-y-1.5">
                  <span className="text-[11px] text-[var(--admin-text-tertiary)] font-semibold uppercase tracking-wider block font-sans">
                    Node Name
                  </span>
                  <AdminInput
                    value={item.name || ''}
                    onChange={(e) => {
                      const copy = [...fCol.items];
                      copy[idx] = { ...copy[idx], name: e.target.value };
                      onUpdate('featuredCollections', { items: copy });
                    }}
                    className="!py-2 !text-[11px] sm:text-[11px] bg-[var(--admin-surface)] border-[var(--admin-border)]"
                  />
                </div>
                <div className="shrink-0">
                  <ImageUpload
                    label=""
                    value={item.image || ''}
                    onChange={(val) => {
                      const copy = [...fCol.items];
                      copy[idx] = { ...copy[idx], image: val };
                      onUpdate('featuredCollections', { items: copy });
                    }}
                    folder="cms"
                  />
                </div>
                <div className="flex items-center gap-3 shrink-0 pt-2.5 md:pt-0 border-t md:border-t-0 border-[var(--admin-accent)]/5 justify-between md:justify-end">
                  <span className="text-[11px] sm:text-[11px] font-bold text-[var(--admin-text-tertiary)] uppercase tracking-wider">
                    Visible
                  </span>
                  <AdminToggle
                    checked={item.isVisible}
                    onChange={() => {
                      const copy = [...fCol.items];
                      copy[idx] = { ...copy[idx], isVisible: !copy[idx].isVisible };
                      onUpdate('featuredCollections', { items: copy });
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// 3. ARTISAN STORY
function StoryTeaserEditor({ content, onUpdate }) {
  const story = content.storyTeaser || {};
  return (
    <div className="admin-card p-6 space-y-6">
      <SectionHeader
        icon="history_edu"
        title="Artisan Story"
        description="Share the brand story with visitors"
      />
      <div className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <AdminField label="Editorial Gold Subtitle">
            <AdminInput
              value={story.subtitle || ''}
              onChange={(e) => onUpdate('storyTeaser', { subtitle: e.target.value })}
              className="!py-2.5 !text-[12px] border-[var(--admin-border)] focus:border-[var(--admin-accent)] bg-[var(--admin-surface-muted)] hover:bg-[var(--admin-surface)]"
            />
          </AdminField>
          <AdminField label="Editorial Bold Headline">
            <AdminInput
              value={story.title || ''}
              onChange={(e) => onUpdate('storyTeaser', { title: e.target.value })}
              className="!py-2.5 !text-[12px] border-[var(--admin-border)] focus:border-[var(--admin-accent)] bg-[var(--admin-surface-muted)] hover:bg-[var(--admin-surface)]"
            />
          </AdminField>
        </div>

        <AdminField
          label="Brand Chronology Paragraph"
          description="Write a compelling, culturally rich editorial narrative"
        >
          <div className="relative flex items-start w-full shadow-[var(--admin-shadow-xs)] rounded-xl">
            <AdminTextarea
              value={story.description || ''}
              onChange={(e) => onUpdate('storyTeaser', { description: e.target.value })}
              rows={4}
              className="!pr-12 !py-3 !text-[12px] border-[var(--admin-border)] focus:border-[var(--admin-accent)] bg-[var(--admin-surface-muted)] hover:bg-[var(--admin-surface)]"
            />
            <div className="absolute right-2.5 top-2.5">
              <AISparkButton
                text={story.description}
                onApply={(val) => onUpdate('storyTeaser', { description: val })}
              />
            </div>
          </div>
        </AdminField>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <ImageUpload
            label="Editorial Accent Graphic"
            value={story.image || ''}
            onChange={(val) => onUpdate('storyTeaser', { image: val })}
            folder="cms"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <AdminField label="Call to Action Button Label">
              <AdminInput
                value={story.ctaText || ''}
                onChange={(e) => onUpdate('storyTeaser', { ctaText: e.target.value })}
                className="!py-2.5 !text-[11px] sm:text-[11px] border-[var(--admin-border)] focus:border-[var(--admin-accent)] bg-[var(--admin-surface-muted)] hover:bg-[var(--admin-surface)]"
              />
            </AdminField>
            <AdminField label="Heritage Year Badge Text">
              <AdminInput
                value={story.establishedYear || 'Est. in 2003'}
                onChange={(e) => onUpdate('storyTeaser', { establishedYear: e.target.value })}
                className="!py-2.5 !text-[11px] sm:text-[11px] border-[var(--admin-border)] focus:border-[var(--admin-accent)] bg-[var(--admin-surface-muted)] hover:bg-[var(--admin-surface)]"
              />
            </AdminField>
          </div>
        </div>
      </div>
    </div>
  );
}

// 4. BESTSELLERS
function BestsellerStripEditor({ content, onUpdate }) {
  const bs = content.featuredProducts || {};
  return (
    <div className="admin-card p-6 space-y-6">
      <SectionHeader
        icon="stars"
        title="Bestsellers"
        description="Control settings for the homepage bestsellers section"
      />
      <div className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <AdminField label="Section Header Headline">
            <AdminInput
              value={bs.sectionTitle || ''}
              onChange={(e) => onUpdate('featuredProducts', { sectionTitle: e.target.value })}
              className="!py-2.5 !text-[12px] border-[var(--admin-border)] focus:border-[var(--admin-accent)] bg-[var(--admin-surface-muted)] hover:bg-[var(--admin-surface)]"
            />
          </AdminField>
          <AdminField label="Shelf Subtitle Tag">
            <AdminInput
              value={bs.sectionSubtitle || ''}
              onChange={(e) => onUpdate('featuredProducts', { sectionSubtitle: e.target.value })}
              className="!py-2.5 !text-[12px] border-[var(--admin-border)] focus:border-[var(--admin-accent)] bg-[var(--admin-surface-muted)] hover:bg-[var(--admin-surface)]"
            />
          </AdminField>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-4 border-t border-[var(--admin-border-subtle)]">
          <AdminField label="Max Items Rendered">
            <AdminInput
              type="number"
              value={bs.maxDisplay || 4}
              onChange={(e) =>
                onUpdate('featuredProducts', { maxDisplay: parseInt(e.target.value) || 4 })
              }
              className="!py-2.5 !text-[11px] sm:text-[11px] border-[var(--admin-border)] focus:border-[var(--admin-accent)] bg-[var(--admin-surface-muted)] hover:bg-[var(--admin-surface)]"
            />
          </AdminField>
          <div className="flex items-center justify-between border border-[var(--admin-border)] px-4.5 py-3 rounded-2xl bg-[var(--admin-surface)] mt-5 h-[46px] shadow-[var(--admin-shadow-xs)]">
            <span className="text-[11px] font-semibold text-[var(--admin-text-secondary)] uppercase tracking-wider">
              Enable Section Shelf
            </span>
            <AdminToggle
              checked={bs.isVisible}
              onChange={() => onUpdate('featuredProducts', { isVisible: !bs.isVisible })}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// 5.5 SECTION ORDERING EDITOR
// ═══════════════════════════════════════════════════════════
function SectionOrderEditor({ sections, onToggle, onReorder }) {
  return (
    <div className="admin-card p-6 space-y-6">
      <SectionHeader
        icon="reorder"
        title="Homepage Section Order & Visibility"
        description="Arrange the order of sections displayed on the live homepage and toggle their visibility"
      />

      <div className="space-y-3.5">
        {sections?.map((section, idx) => (
          <div
            key={section.id}
            className={`flex flex-col sm:flex-row items-stretch sm:items-center gap-4.5 p-4 rounded-2xl border transition-all duration-300 shadow-[var(--admin-shadow-xs)] hover:shadow-xs ${
              section.isVisible
                ? 'bg-[var(--admin-surface)] border-[var(--admin-border)] hover:border-[var(--admin-accent)]/35'
                : 'bg-[var(--admin-surface-muted)] border-transparent opacity-60'
            }`}
          >
            <div className="flex items-center gap-4 min-w-0 flex-1">
              {/* Position Badging */}
              <div className="w-8 h-8 rounded-full bg-[var(--admin-text-primary)] text-white flex items-center justify-center font-semibold text-[11px] shrink-0 shadow-sm">
                {idx + 1}
              </div>

              {/* Title / Description */}
              <div className="flex-1 min-w-0">
                <span className="text-[12px] font-semibold text-[var(--admin-text-primary)] block tracking-tight truncate">
                  {section.label}
                </span>
                <span className="text-[10px] font-bold text-[var(--admin-text-tertiary)] uppercase tracking-widest block mt-0.5 truncate">
                  {section.id === 'hero'
                    ? 'Intro Visuals'
                    : section.id === 'featuredCollections'
                      ? 'Catalog Category Strip'
                      : section.id === 'featuredProducts'
                        ? 'Bestselling Products Shelf'
                        : section.id === 'storyTeaser'
                          ? 'Linage Editorial Story'
                          : 'Patron Voices Reviews'}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-3 pt-3 sm:pt-0 border-t sm:border-t-0 border-[var(--admin-border-subtle)] shrink-0">
              {/* Position Reordering Buttons */}
              <div className="flex items-center gap-1.5 shrink-0 bg-[var(--admin-bg-subtle)] p-1.5 rounded-xl border border-[var(--admin-border)]">
                <button
                  type="button"
                  onClick={() => idx > 0 && onReorder(idx, idx - 1)}
                  disabled={idx === 0}
                  className="text-[var(--admin-text-tertiary)] hover:text-[var(--admin-text-primary)] disabled:opacity-20 cursor-pointer disabled:cursor-default w-7 h-7 rounded-lg hover:bg-[var(--admin-surface)] flex items-center justify-center transition-all border-none bg-transparent"
                  title="Move Section Up"
                >
                  <span className="material-symbols-outlined text-[16px] font-bold">
                    expand_less
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => idx < sections.length - 1 && onReorder(idx, idx + 1)}
                  disabled={idx === sections.length - 1}
                  className="text-[var(--admin-text-tertiary)] hover:text-[var(--admin-text-primary)] disabled:opacity-20 cursor-pointer disabled:cursor-default w-7 h-7 rounded-lg hover:bg-[var(--admin-surface)] flex items-center justify-center transition-all border-none bg-transparent"
                  title="Move Section Down"
                >
                  <span className="material-symbols-outlined text-[16px] font-bold">
                    expand_more
                  </span>
                </button>
              </div>

              {/* Visibility Toggle */}
              <div className="flex items-center gap-2 border-l border-[var(--admin-border-subtle)] pl-4 shrink-0">
                <span className="text-[11px] font-bold text-[var(--admin-text-tertiary)] uppercase tracking-wider hidden sm:inline">
                  Visible
                </span>
                <AdminToggle checked={section.isVisible} onChange={() => onToggle(section.id)} />
              </div>
            </div>
          </div>
        ))}
      </div>
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

  const [activeSection, setActiveSection] = useState('hero');

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
    // If not auto-publishing, save to draft
    if (!autoPublish) {
      setDraftWebsiteContent((prev) => ({
        ...prev,
        [section]: { ...(prev[section] || {}), ...payload },
      }));
    }
    // Also dispatch to context (which might auto-save depending on its logic)
    updateContent(section, payload);
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

              {autoPublish ? (
                <div className="flex items-center gap-2 px-3 bg-[var(--admin-success-light)] text-[var(--admin-success)] border border-[var(--admin-success-border)] rounded-full text-[11px] font-bold uppercase tracking-wider h-[34px] shrink-0">
                  <span className="material-symbols-outlined text-[14px] animate-spin-slow">
                    sync
                  </span>
                  <span>Auto-Publishing</span>
                </div>
              ) : (
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
                  {activeSection === 'hero' && (
                    <HeroSectionEditor content={activeContent} onUpdate={handleUpdateContent} />
                  )}
                  {activeSection === 'collections' && (
                    <FeaturedCollectionsEditor
                      content={activeContent}
                      onUpdate={handleUpdateContent}
                    />
                  )}
                  {activeSection === 'story' && (
                    <StoryTeaserEditor content={activeContent} onUpdate={handleUpdateContent} />
                  )}
                  {activeSection === 'bestsellers' && (
                    <BestsellerStripEditor content={activeContent} onUpdate={handleUpdateContent} />
                  )}

                  {activeSection === 'homepageSections' && (
                    <SectionOrderEditor
                      sections={activeContent.homepageSections}
                      onToggle={toggleHomepageSection}
                      onReorder={reorderHomepageSections}
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
