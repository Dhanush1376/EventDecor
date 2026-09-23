import { m as motion, AnimatePresence } from 'framer-motion';
import { DraftStatusIndicator } from '../components/DraftStatusIndicator';
import { DraftRestoreModal } from '../components/DraftRestoreModal';
import { UnsavedChangesGuard } from '../components/UnsavedChangesGuard';
import { useState, useEffect, useRef, useMemo } from 'react';
import { useAdmin } from '../context/AdminContext';

import { useDraft } from '../hooks/useDraft';
import { AdminContentSkeleton, PublishBar, PageHeader } from '../components/AdminUIKit';
import { HomePageControllerEditor } from '../components/cms/HomePageControllerEditor';
import { GalleryPortfolioEditor } from '../components/cms/GalleryPortfolioEditor';
import { AboutPageDetailsEditor } from '../components/cms/AboutPageDetailsEditor';
import { ShopPageEditor } from '../components/cms/ShopPageEditor';
import { EventsPageEditor } from '../components/cms/EventsPageEditor';
import { ContactInfoEditor } from '../components/cms/ContactInfoEditor';
import { CustomOrdersEditor } from '../components/cms/CustomOrdersEditor';
import { SEOCenterEditor } from '../components/cms/SEOCenterEditor';
import { NavigationFooterEditor } from '../components/cms/NavigationFooterEditor';
import { PublisherVersionsEditor } from '../components/cms/PublisherVersionsEditor';
import { MediaLibraryEditor } from '../components/cms/MediaLibraryEditor';
import { QuickCatalogControl } from '../components/cms/QuickCatalogControl';

// ═══════════════════════════════════════════════════════════
// ANIMATION PRESETS (LINEAR LUXURY FADES)
// ═══════════════════════════════════════════════════════════
const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] } },
};
const stagger = { show: { transition: { staggerChildren: 0.05 } } };

// ═══════════════════════════════════════════════════════════
// CATEGORIZED CMS SIDEBAR SCHEMA
// ═══════════════════════════════════════════════════════════
const CMS_SIDEBAR = [
  {
    title: 'Storefront Layout',
    items: [
      {
        id: 'home',
        label: 'Home Page Controller',
        icon: 'home',
      },
    ],
  },
  {
    title: 'Pages',
    items: [
      {
        id: 'gallery',
        label: 'Gallery Portfolio',
        icon: 'photo_library',
      },
      {
        id: 'about',
        label: 'About Page',
        icon: 'info',
      },
      {
        id: 'shop-page',
        label: 'Shop Page',
        icon: 'storefront',
      },
      {
        id: 'events-page',
        label: 'Events Page',
        icon: 'celebration',
      },
      {
        id: 'contact',
        label: 'Contact Info',
        icon: 'contact_page',
      },
      {
        id: 'custom-orders',
        label: 'Custom Orders',
        icon: 'design_services',
      },
    ],
  },
  {
    title: 'SEO & Navigation',
    items: [
      {
        id: 'seo-center',
        label: 'SEO Settings',
        icon: 'search',
      },
      {
        id: 'navigation',
        label: 'Header & Footer',
        icon: 'menu',
      },
    ],
  },
];

// ═══════════════════════════════════════════════════════════
// MAIN COMPONENT ENTRYPOINT (THEME BUILDER LAYOUT)
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
  const [mobileSectionOpen, setMobileSectionOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);

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

  const isDraftMode = true;
  // Use draft content if in draft mode, otherwise fallback to context content
  const activeContent = isDraftMode ? draftWebsiteContent : websiteContent;

  const handleUpdateContent = (section, payload) => {
    if (isDraftMode) {
      setDraftWebsiteContent((prev) => {
        let updatedSection;
        if (Array.isArray(payload)) {
          updatedSection = [...payload];
          updatedSection.status = 'modified';
        } else if (Array.isArray(prev[section])) {
          updatedSection = [...prev[section]];
          Object.assign(updatedSection, payload);
          updatedSection.status = 'modified';
        } else {
          updatedSection = { ...(prev[section] || {}), ...payload, status: 'modified' };
        }
        return {
          ...prev,
          [section]: updatedSection,
        };
      });
    }

    updateContent(section, payload, isDraftMode);
  };

  const handlePublishAll = async () => {
    try {
      setIsPublishing(true);
      await publishAllContent();
      await deleteDraft();
    } finally {
      setIsPublishing(false);
    }
  };

  const categoryScrollRef = useRef(null);
  const subitemScrollRef = useRef(null);

  useEffect(() => {
    const activeCategoryEl = categoryScrollRef.current?.querySelector('.active-category');
    if (activeCategoryEl) {
      activeCategoryEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
    const activeSubitemEl = subitemScrollRef.current?.querySelector('.active-subitem');
    if (activeSubitemEl) {
      activeSubitemEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, [activeSection]);

  const [expandedCategories, setExpandedCategories] = useState({
    'Storefront Layout': true,
    Pages: true,
    'SEO & Navigation': true,
  });

  const toggleCategory = (cat) => {
    setExpandedCategories((prev) => ({ ...prev, [cat]: !prev[cat] }));
  };

  // Filter sidebar sections based on search query
  const filteredSidebar = useMemo(() => {
    return CMS_SIDEBAR.map((cat) => {
      const matchingItems = cat.items.filter((item) => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return item.label.toLowerCase().includes(q) || item.id.toLowerCase().includes(q);
      });
      if (matchingItems.length === 0) return null;
      return {
        ...cat,
        items: matchingItems,
      };
    }).filter(Boolean);
  }, [searchQuery]);

  const totalSectionsCount = useMemo(() => {
    return CMS_SIDEBAR.reduce((acc, cat) => acc + cat.items.length, 0);
  }, []);

  const currentActiveItem = useMemo(() => {
    for (const cat of CMS_SIDEBAR) {
      const match = cat.items.find((i) => i.id === activeSection);
      if (match) return match;
    }
    return null;
  }, [activeSection]);

  if (dataLoading) {
    return <AdminContentSkeleton />;
  }

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={stagger}
      className="space-y-6 relative font-sans text-[var(--admin-text-primary)]"
    >
      {/* Top Page Header matching Products & Orders style */}
      <PageHeader
        title="Edit Website"
        subtitle={
          <div className="flex flex-wrap items-center gap-2 text-[13px]">
            <span className="font-semibold text-[var(--admin-text-primary)]">
              {totalSectionsCount} Storefront Sections
            </span>
            <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Live Sync Active
            </span>
            <DraftStatusIndicator status={draftStatus} lastSavedAt={lastSavedAt} />
            {currentActiveItem && (
              <span className="hidden sm:inline-flex items-center gap-1 font-medium text-[var(--admin-text-tertiary)]">
                &bull; Editing{' '}
                <strong className="text-[var(--admin-text-primary)]">
                  {currentActiveItem.label}
                </strong>
              </span>
            )}
          </div>
        }
      />

      {/* Sticky 42px Search & Actions Toolbar */}
      <div
        className={`sticky top-[var(--admin-topbar-height,56px)] z-20 -my-2 py-2.5 bg-[var(--admin-bg)]/95 backdrop-blur-md mb-5 ${
          mobileSectionOpen ? 'hidden lg:block' : 'block'
        }`}
      >
        <motion.div variants={fadeUp} className="flex flex-row items-center gap-2 w-full">
          {/* Search Bar - Height exactly 42px */}
          <div className="relative flex-1 min-w-0 bg-[var(--admin-surface-muted)] rounded-[4px] border border-[var(--admin-border)] flex items-center px-2.5 sm:px-3 h-[42px] min-h-[42px] max-h-[42px]">
            <span className="material-symbols-outlined text-[18px] text-[var(--admin-text-tertiary)] shrink-0">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search pages, sections, or SEO settings..."
              className="bg-transparent border-none outline-none w-full text-[13px] text-[var(--admin-text-primary)] placeholder-[var(--admin-text-tertiary)] font-medium px-2 h-full min-w-0"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="text-[var(--admin-text-tertiary)] hover:text-[var(--admin-text-primary)] cursor-pointer p-1 flex items-center justify-center shrink-0"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            )}
          </div>

          {/* Action Buttons in the same line */}
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="h-[42px] min-h-[42px] max-h-[42px] px-3 sm:px-3.5 text-[12px] font-semibold rounded-[4px] border border-[var(--admin-border)] bg-[var(--admin-surface)] hover:bg-[var(--admin-surface-muted)] text-[var(--admin-text-primary)] inline-flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer shrink-0"
            title="Preview Live Storefront"
          >
            <span className="material-symbols-outlined text-[18px]">open_in_new</span>
            <span className="hidden sm:inline">Preview</span>
          </a>

          <button
            type="button"
            onClick={handlePublishAll}
            disabled={isPublishing}
            className="h-[42px] min-h-[42px] max-h-[42px] px-3.5 sm:px-4 rounded-[4px] bg-[var(--admin-accent)] hover:opacity-95 text-white text-[12px] font-bold inline-flex items-center justify-center gap-1.5 shadow-xs cursor-pointer transition-all active:scale-95 disabled:opacity-50 shrink-0"
          >
            {isPublishing ? (
              <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" />
            ) : (
              <span className="material-symbols-outlined text-[18px]">publish</span>
            )}
            <span>Publish Live</span>
          </button>
        </motion.div>
      </div>

      {/* Sticky Mobile Back & Actions Header Bar (Sticky at top navbar when editing a section on mobile) */}
      {mobileSectionOpen && (
        <div className="lg:hidden sticky top-[var(--admin-topbar-height,56px)] z-20 -my-2 py-2 bg-[var(--admin-bg)]/95 backdrop-blur-md mb-4">
          <div className="px-2.5 sm:px-3 py-1.5 bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-[6px] shadow-xs flex items-center justify-between gap-2 min-h-[44px]">
            {/* Left: Back Button */}
            <button
              type="button"
              onClick={() => {
                setMobileSectionOpen(false);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="inline-flex items-center gap-1.5 text-[var(--admin-text-primary)] hover:text-[var(--admin-accent)] transition-all cursor-pointer active:scale-95 group shrink-0"
            >
              <div className="w-7 h-7 rounded-[4px] bg-[var(--admin-bg-subtle)] border border-[var(--admin-border-subtle)] group-hover:border-[var(--admin-accent)] group-hover:bg-[var(--admin-accent)]/10 flex items-center justify-center transition-all shadow-2xs">
                <span className="material-symbols-outlined text-[17px] text-[var(--admin-text-secondary)] group-hover:text-[var(--admin-accent)] group-hover:-translate-x-0.5 transition-all">
                  arrow_back
                </span>
              </div>
              <span className="text-[12px] font-bold text-[var(--admin-text-primary)] group-hover:text-[var(--admin-accent)] transition-colors">
                All Sections
              </span>
            </button>

            {/* Right: Actions (Preview & Publish Live) */}
            <div className="flex items-center gap-1.5 shrink-0">
              <a
                href="/"
                target="_blank"
                rel="noopener noreferrer"
                className="h-8 px-2 text-[11.5px] font-semibold rounded-[4px] border border-[var(--admin-border)] bg-[var(--admin-surface)] hover:bg-[var(--admin-surface-muted)] text-[var(--admin-text-primary)] inline-flex items-center justify-center gap-1 transition-all shadow-2xs cursor-pointer"
                title="Preview Live Storefront"
              >
                <span className="material-symbols-outlined text-[16px]">open_in_new</span>
              </a>

              <button
                type="button"
                onClick={handlePublishAll}
                disabled={isPublishing}
                className="h-8 px-3 rounded-[4px] bg-[var(--admin-accent)] hover:opacity-95 text-white text-[12px] font-bold inline-flex items-center justify-center gap-1.5 shadow-xs cursor-pointer transition-all active:scale-95 disabled:opacity-50 shrink-0"
              >
                {isPublishing ? (
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" />
                ) : (
                  <span className="material-symbols-outlined text-[16px]">publish</span>
                )}
                <span>Publish Live</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Navigation List (App-like Master View) */}
      <div className={`space-y-4 lg:hidden ${mobileSectionOpen ? 'hidden' : 'block'}`}>
        {filteredSidebar.map((cat) => (
          <div
            key={cat.title}
            className="bg-[var(--admin-surface)] rounded-[4px] border border-[var(--admin-border)] shadow-sm overflow-hidden"
          >
            <div className="px-3.5 py-2.5 bg-[var(--admin-bg-subtle)] border-b border-[var(--admin-border-subtle)] flex items-center justify-between">
              <span className="text-[12px] font-bold text-[var(--admin-text-primary)] uppercase tracking-wider">
                {cat.title}
              </span>
              <span className="text-[10px] bg-[var(--admin-surface)] text-[var(--admin-text-secondary)] px-2 py-0.5 rounded-[4px] font-bold border border-[var(--admin-border)] shadow-2xs">
                {cat.items.length}
              </span>
            </div>
            <div className="divide-y divide-[var(--admin-border-subtle)]">
              {cat.items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setActiveSection(item.id);
                    setMobileSectionOpen(true);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="w-full flex items-center justify-between p-3.5 text-left cursor-pointer hover:bg-[var(--admin-bg-subtle)] transition-colors active:bg-[var(--admin-surface-muted)] group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-[4px] bg-[var(--admin-bg-subtle)] border border-[var(--admin-border-subtle)] group-hover:border-[var(--admin-border)] flex items-center justify-center text-[var(--admin-accent)] shrink-0 transition-colors shadow-2xs">
                      <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                    </div>
                    <span className="text-[13.5px] font-bold text-[var(--admin-text-primary)] leading-tight truncate">
                      {item.label}
                    </span>
                  </div>
                  <span className="material-symbols-outlined text-[20px] text-[var(--admin-text-tertiary)] group-hover:text-[var(--admin-accent)] group-hover:translate-x-0.5 transition-all shrink-0 ml-2">
                    chevron_right
                  </span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* 2-Column Split Workspace Grid: Completely Independent Scrolling */}
      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] xl:grid-cols-[300px_1fr] gap-6 items-start lg:h-[calc(100vh-230px)] lg:min-h-[500px]">
        {/* Column 1: Sidebar Drawer Accordion (Desktop) - Independent Scroll */}
        <motion.div
          variants={fadeUp}
          className="hidden lg:flex flex-col bg-[var(--admin-surface)] rounded-md border border-[var(--admin-border)] h-full shadow-2xs overflow-hidden shrink-0"
        >
          {/* Pinned Header */}
          <div className="px-3 pt-3 pb-2.5 border-b border-[var(--admin-border-subtle)] flex items-center justify-between shrink-0 bg-[var(--admin-surface)]">
            <span className="text-[11px] font-semibold text-[var(--admin-text-tertiary)]">
              Storefront Navigation
            </span>
            <span className="text-[11px] font-semibold text-[var(--admin-accent)] px-1.5 py-0.5 rounded-[4px] bg-[var(--admin-accent)]/10">
              {filteredSidebar.reduce((acc, cat) => acc + cat.items.length, 0)} Items
            </span>
          </div>

          {/* Independently Scrollable Navigation List */}
          <div className="flex-1 overflow-y-auto p-2.5 space-y-3.5 custom-scrollbar overscroll-contain">
            {filteredSidebar.length === 0 ? (
              <div className="py-6 text-center text-[var(--admin-text-tertiary)] text-[11px]">
                <span className="material-symbols-outlined text-[24px] block mb-1">search_off</span>
                No sections match &quot;{searchQuery}&quot;
              </div>
            ) : (
              filteredSidebar.map((cat) => (
                <div key={cat.title} className="space-y-1">
                  <button
                    onClick={() => toggleCategory(cat.title)}
                    className="w-full text-left px-2 py-1 text-[11px] font-semibold text-[var(--admin-text-tertiary)] hover:text-[var(--admin-text-secondary)] flex items-center justify-between cursor-pointer transition-all"
                  >
                    <span>{cat.title}</span>
                    <span className="material-symbols-outlined text-[14px]">
                      {expandedCategories[cat.title] ? 'expand_less' : 'expand_more'}
                    </span>
                  </button>

                  <AnimatePresence initial={false}>
                    {expandedCategories[cat.title] && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden space-y-1"
                      >
                        {cat.items.map((item) => {
                          const isActive = activeSection === item.id;
                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => setActiveSection(item.id)}
                              className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-[4px] text-left cursor-pointer transition-all box-border ${
                                isActive
                                  ? 'bg-[var(--admin-accent)]/10 text-[var(--admin-accent)] font-bold border-l-2 border-[var(--admin-accent)] shadow-2xs'
                                  : 'text-[var(--admin-text-secondary)] hover:bg-[var(--admin-surface-muted)] hover:text-[var(--admin-text-primary)] font-medium'
                              }`}
                            >
                              <div
                                className={`w-7 h-7 rounded-[4px] flex items-center justify-center shrink-0 border transition-all ${
                                  isActive
                                    ? 'bg-[var(--admin-surface)] border-[var(--admin-accent)] text-[var(--admin-accent)] shadow-2xs'
                                    : 'bg-[var(--admin-surface-muted)] border-[var(--admin-border-subtle)] text-[var(--admin-text-tertiary)]'
                                }`}
                              >
                                <span className="material-symbols-outlined text-[16px]">
                                  {item.icon}
                                </span>
                              </div>
                              <span
                                className={`text-[12.5px] font-medium truncate flex-1 ${
                                  isActive
                                    ? 'text-[var(--admin-accent)]'
                                    : 'text-[var(--admin-text-primary)]'
                                }`}
                              >
                                {item.label}
                              </span>
                            </button>
                          );
                        })}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))
            )}
          </div>
        </motion.div>

        {/* Column 2: Modular Form Workspace - Independent Scroll */}
        <motion.div
          variants={fadeUp}
          className={`space-y-4 min-w-0 flex-1 lg:h-full lg:overflow-y-auto custom-scrollbar lg:pr-1 overscroll-contain ${
            mobileSectionOpen ? 'block' : 'hidden lg:block'
          }`}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={activeSection}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
            >
              {activeSection === 'home' && (
                <HomePageControllerEditor
                  content={activeContent.homepage || activeContent}
                  onUpdate={handleUpdateContent}
                />
              )}
              {activeSection === 'gallery' && (
                <GalleryPortfolioEditor content={activeContent} onUpdate={handleUpdateContent} />
              )}
              {activeSection === 'about' && (
                <AboutPageDetailsEditor
                  content={activeContent.aboutPage}
                  onUpdate={handleUpdateContent}
                />
              )}
              {activeSection === 'shop-page' && (
                <ShopPageEditor content={activeContent.shopPage} onUpdate={handleUpdateContent} />
              )}
              {activeSection === 'events-page' && (
                <EventsPageEditor
                  content={activeContent.eventsPage}
                  onUpdate={handleUpdateContent}
                />
              )}
              {activeSection === 'contact' && (
                <ContactInfoEditor content={activeContent.contact} onUpdate={handleUpdateContent} />
              )}
              {activeSection === 'custom-orders' && (
                <CustomOrdersEditor content={activeContent} onUpdate={handleUpdateContent} />
              )}
              {activeSection === 'seo-center' && (
                <SEOCenterEditor content={activeContent} onUpdate={handleUpdateContent} />
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
            </motion.div>
          </AnimatePresence>

          {/* Mobile Bottom Publish Action Button */}
          {mobileSectionOpen && (
            <div className="lg:hidden pt-4 pb-2">
              <button
                type="button"
                onClick={handlePublishAll}
                disabled={isPublishing}
                className="w-full h-10 rounded-[4px] bg-[var(--admin-accent)] hover:opacity-95 text-white text-[13px] font-bold inline-flex items-center justify-center gap-2 shadow-sm cursor-pointer transition-all active:scale-95 disabled:opacity-50"
              >
                {isPublishing ? (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" />
                ) : (
                  <span className="material-symbols-outlined text-[18px]">publish</span>
                )}
                <span>Publish Live to Storefront</span>
              </button>
            </div>
          )}
        </motion.div>
      </div>

      <PublishBar hasChanges={hasUnsavedContent} onPublish={handlePublishAll} onReset={() => {}} />

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
    </motion.div>
  );
}

export default AdminContent;
