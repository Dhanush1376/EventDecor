import { m as motion, AnimatePresence } from 'framer-motion';
import { DraftStatusIndicator } from '../components/DraftStatusIndicator';
import { DraftRestoreModal } from '../components/DraftRestoreModal';
import { UnsavedChangesGuard } from '../components/UnsavedChangesGuard';
import { useState, useEffect, useRef } from 'react';
import { useAdmin } from '../context/AdminContext';

import { useDraft } from '../hooks/useDraft';
import { SkeletonDashboard, PublishBar } from '../components/AdminUIKit';
import { HomePageControllerEditor } from '../components/cms/HomePageControllerEditor';
import { GalleryPortfolioEditor } from '../components/cms/GalleryPortfolioEditor';
import { AboutPageDetailsEditor } from '../components/cms/AboutPageDetailsEditor';
import { ShopPageEditor } from '../components/cms/ShopPageEditor';
import { EventsPageEditor } from '../components/cms/EventsPageEditor';
import { ContactInfoEditor } from '../components/cms/ContactInfoEditor';
import { CustomOrdersEditor } from '../components/cms/CustomOrdersEditor';
import { FAQEditor } from '../components/cms/FAQEditor';
import { SEOCenterEditor } from '../components/cms/SEOCenterEditor';
import { AnnouncementBarEditor } from '../components/cms/AnnouncementBarEditor';
import { NavigationFooterEditor } from '../components/cms/NavigationFooterEditor';
import { PublisherVersionsEditor } from '../components/cms/PublisherVersionsEditor';
import { MediaLibraryEditor } from '../components/cms/MediaLibraryEditor';
import { QuickCatalogControl } from '../components/cms/QuickCatalogControl';

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
      { id: 'shop-page', label: 'Shop Page', icon: 'storefront', desc: 'Shop collections banner' },
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

// ═══════════════════════════════════════════════════════════
// MINIMAL FIRST-CLASS STOREFRONT LAYOUT EDITORS
// ═══════════════════════════════════════════════════════════

// 1. HOME PAGE CONTROLLER

// 6. GALLERY PORTFOLIO

// 7. ABOUT HERITAGE

// 7.5. EVENTS PAGE BANNER & PROMOS

// 8. HELPLINE & LOCATION

// 9. CUSTOM INTAKE FORM

// 11. FAQS

// 10. SEO META CENTER

// 12. ANNOUNCEMENT PROMOS

// 13. HEADER & FOOTERS

// 14. VERSION ROLLBACK

// 15. MEDIA VAULT

// 16. INVENTORY QUICK FEATURED STATUS

// ═══════════════════════════════════════════════════════════
// MAIN COMPONENT ENTRYPOINT (THEME BUILDER LAYOUT 3-COLUMNS)
// ═══════════════════════════════════════════════════════════
export function AdminContent() {
  const {
    websiteContent,
    updateContent,
    bulkUpdateContent,
    publishAllContent,
    hasUnsavedContent,
    _reorderHomepageSections,
    _toggleHomepageSection,
    autoPublish,
    _toggleAutoPublish,
    _auxContent,
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
    enabled: !dataLoading,
    onRestored: (draftInfo) => {
      if (draftInfo?.formData) {
        bulkUpdateContent(draftInfo.formData);
      }
    },
  });

  const _isHomeSection = activeSection === 'home';
  const isDraftMode = true;

  // Use draft content if in draft mode, otherwise fallback to context content
  const activeContent = isDraftMode ? draftWebsiteContent : websiteContent;

  const handleUpdateContent = (section, payload) => {
    // If auto-publish is disabled (globally or just for this section), save to draft
    if (isDraftMode) {
      setDraftWebsiteContent((prev) => {
        let updatedSection;
        if (Array.isArray(payload)) {
          updatedSection = [...payload];
        } else if (Array.isArray(prev[section])) {
          updatedSection = [...prev[section]];
          Object.assign(updatedSection, payload);
        } else {
          updatedSection = { ...(prev[section] || {}), ...payload };
        }
        return {
          ...prev,
          [section]: updatedSection,
        };
      });
    }

    // Also dispatch to context (which might auto-save depending on its logic)
    updateContent(section, payload, isDraftMode);
  };

  const handlePublishAll = async () => {
    await publishAllContent();
    await deleteDraft();
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
                <DraftStatusIndicator status={draftStatus} lastSavedAt={lastSavedAt} />
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 flex-nowrap sm:w-auto justify-end shrink-0">
              <button
                onClick={handlePublishAll}
                className="flex items-center gap-2 px-4 bg-[var(--admin-text-primary)] text-[var(--admin-text-inverse)] hover:bg-[var(--admin-accent-hover)] rounded-full transition-all duration-300 text-[11px] font-bold uppercase tracking-[0.2em] cursor-pointer shadow-[var(--admin-shadow-sm)] hover:shadow-[var(--admin-shadow-md)] hover:-translate-y-0.5 active:scale-95 shrink-0 border border-transparent hover:border-[var(--admin-accent)]/40 h-[34px]"
              >
                <span className="material-symbols-outlined text-[14px] font-bold">publish</span>
                <span>Publish</span>
              </button>
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
                  {activeSection === 'shop-page' && (
                    <ShopPageEditor
                      content={activeContent.shopPage}
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
            hasChanges={hasUnsavedContent}
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
