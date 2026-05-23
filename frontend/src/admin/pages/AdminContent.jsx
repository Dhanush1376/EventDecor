import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAdmin } from "../context/AdminContext";
import {
  SectionHeader,
  AdminField,
  AdminInput,
  AdminTextarea,
  AdminToggle,
  PublishBar
} from "../components/AdminUIKit";
import { ImageUpload } from "../components/ImageUpload";
import toast from "react-hot-toast";
import { cmsService } from "../../services/domainServices";
import logger from "../../utils/logger";
import { DEFAULT_SPECIALIZATIONS, PLACEHOLDER_IMAGES } from "../../constants/placeholderImages";

const cleanSignatureImg = (imgUrl, founderName) => {
  if (!imgUrl || imgUrl.includes("unsplash.com") || imgUrl === "" || imgUrl.includes("images.unsplash.com")) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="250" height="80" viewBox="0 0 250 80"><defs><style>@import url('https://fonts.googleapis.com/css2?family=Alex+Brush&amp;display=swap');.sig { font-family: 'Alex Brush', cursive; font-size: 42px; fill: %231a1a1a; }</style></defs><text x="25" y="52" class="sig">${founderName}</text></svg>`;
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  }
  return imgUrl;
};

// ═══════════════════════════════════════════════════════════
// ANIMATION PRESETS (LINEAR LUXURY FADES)
// ═══════════════════════════════════════════════════════════
const fadeUp = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] } } };
const stagger = { show: { transition: { staggerChildren: 0.05 } } };

// ═══════════════════════════════════════════════════════════
// CATEGORIZED CMS SIDEBAR SCHEMA
// ═══════════════════════════════════════════════════════════
const CMS_SIDEBAR = [
  {
    title: "Storefront Layout",
    items: [
      { id: "hero", label: "Hero Banner", icon: "aspect_ratio", desc: "Primary entrance visuals" },
      { id: "collections", label: "Featured Collections", icon: "grid_view", desc: "Catalog category strips" },
      { id: "story", label: "About Teaser", icon: "history_edu", desc: "Studio lineage details" },
      { id: "bestsellers", label: "Bestsellers", icon: "stars", desc: "Featured product rows" },
      { id: "testimonials", label: "Testimonials", icon: "chat_bubble", desc: "Client quotes list" },
      { id: "homepageSections", label: "Section Order", icon: "reorder", desc: "Reorder homepage blocks" },
    ]
  },
  {
    title: "Pages",
    items: [
      { id: "gallery", label: "Gallery", icon: "photo_library", desc: "Pinterest grid tags" },
      { id: "about", label: "About Page", icon: "info", desc: "Brand chronicler" },
      { id: "events-page", label: "Events Page", icon: "celebration", desc: "Events page banner & promos" },
      { id: "contact", label: "Contact Info", icon: "contact_page", desc: "Helpline routing" },
      { id: "custom-orders", label: "Custom Orders", icon: "design_services", desc: "Digital intake forms" }
    ]
  },
  {
    title: "SEO & Branding",
    items: [
      { id: "seo-center", label: "SEO Settings", icon: "search", desc: "Search result metadata" },
      { id: "announcement-bar", label: "Announcements", icon: "campaign", desc: "Header banner banners" },
      { id: "navigation", label: "Header & Footer", icon: "menu", desc: "Logo tagline & bio" }
    ]
  },
  {
    title: "System Tools",
    items: [
      { id: "publish-controls", label: "History & Rollback", icon: "history", desc: "Checkpoints history" },
      { id: "media-library", label: "Media Vault", icon: "image", desc: "Uploads asset vault" },
      { id: "catalog", label: "Featured Catalog", icon: "inventory_2", desc: "Featured status flags" }
    ]
  }
];

// ═══════════════════════════════════════════════════════════
// DYNAMIC AI SPARK COPYWRITER (GLASSMORPHIC COMPOSER)
// ═══════════════════════════════════════════════════════════
function AISparkButton({ text, onApply }) {
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const prompts = [
    { label: "✨ South Indian Heritage", action: "heritage" },
    { label: "👑 Luxury Rephrase", action: "luxury" },
    { label: "🇮🇳 Telugu Vernacular", action: "traditional" },
    { label: "🔍 Local SEO Optimization", action: "seo" },
    { label: "🗣️ Translate to Telugu", action: "translate" }
  ];

  const handleGenerate = async (style) => {
    if (!text || text.trim().length < 3) {
      toast.error("Please enter some text first for the AI to enhance.");
      setShowDropdown(false);
      return;
    }
    
    setLoading(true);
    setShowDropdown(false);
    
    try {
      const res = await cmsService.aiGenerateContent(text, style);
      
      if (res.success && res.data?.text) {
        onApply(res.data.text);
        toast.success("AI Content Crafted!", {
          icon: "✨",
          style: { background: "#1C1917", border: "1px solid #000000", color: "#F1F5F9", fontSize: "11px" }
        });
      } else {
        toast.error("AI returned empty content. Try again.");
      }
    } catch (err) {
      logger.error("AI generation error:", err);
      const errorMsg = err?.response?.data?.message || "AI service temporarily offline.";
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
        className="flex items-center justify-center transition-all text-[#000000]/80 hover:text-[#000000] cursor-pointer h-7 w-7 rounded-full hover:bg-[#000000]/10 bg-transparent border-none"
        style={{ minHeight: "0px" }}
        title="AI Copywriting Assistant"
        aria-label="Open AI Copywriting Assistant"
      >
        {loading ? (
          <span className="w-3 h-3 border-2 border-[#000000] border-t-transparent rounded-full animate-spin" />
        ) : (
          <span className="material-symbols-outlined text-[13px] block font-bold text-[#000000]">auto_awesome</span>
        )}
      </button>

      {showDropdown && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowDropdown(false)} />
          <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white/95 backdrop-blur-md border border-[#000000]/30 shadow-[0_12px_35px_rgba(115,92,0,0.12)] py-2 z-50 overflow-hidden text-[11px] animate-fade-in-up">
            <div className="px-3.5 py-1.5 font-extrabold text-[#64748B] text-[8.5px] tracking-[0.18em] uppercase border-b border-[#000000]/10 pb-1.5 mb-1.5 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[11px] text-[#000000] font-bold">auto_awesome</span>
              AI Copywriter
            </div>
            {prompts.map((p) => (
              <button
                key={p.action}
                type="button"
                onClick={() => handleGenerate(p.action)}
                disabled={loading}
                className="w-full text-left px-4 py-2 hover:bg-[#000000]/10 text-stone-700 hover:text-stone-900 transition-all flex items-center gap-2 cursor-pointer font-bold disabled:opacity-50"
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


// ═══════════════════════════════════════════════════════════
// MINIMAL FIRST-CLASS STOREFRONT LAYOUT EDITORS
// ═══════════════════════════════════════════════════════════

// 1. HERO SHOWCASE
function HeroSectionEditor({ content, onUpdate }) {
  const hero = content.hero || {};
  return (
    <div className="bg-gradient-to-tr from-white to-[#F1F5F9] rounded-[2rem] border border-[#000000]/15 p-6 space-y-6 shadow-[0_15px_40px_rgba(115,92,0,0.02)] relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-[#000000]/30 to-transparent" />
      <SectionHeader
        icon="aspect_ratio"
        title="Hero Banner Curation"
        description="Configure titles, subtitles, and gilded calls-to-action for the primary entrance showcase"
      />
      <div className="space-y-5">
        <AdminField label="Primary Headline" description="The main premium bold text welcoming storefront patrons">
          <div className="relative flex items-center w-full shadow-2xs rounded-xl">
            <AdminInput
              value={hero.title || ""}
              onChange={(e) => onUpdate("hero", { title: e.target.value })}
              className="pr-10 !py-3 !text-[12px] border-stone-200/80 focus:border-[#000000] bg-white/70 hover:bg-white"
            />
            <div className="absolute right-2.5">
              <AISparkButton text={hero.title} onApply={(val) => onUpdate("hero", { title: val })} />
            </div>
          </div>
        </AdminField>

        <AdminField label="Subtext Paragraph" description="A descriptive sentence establishing the boutique curation context">
          <div className="relative flex items-start w-full shadow-2xs rounded-xl">
            <AdminTextarea
              value={hero.subtitle || ""}
              onChange={(e) => onUpdate("hero", { subtitle: e.target.value })}
              rows={2}
              className="pr-10 !py-3 !text-[12px] border-stone-200/80 focus:border-[#000000] bg-white/70 hover:bg-white"
            />
            <div className="absolute right-2.5 top-2.5">
              <AISparkButton text={hero.subtitle} onApply={(val) => onUpdate("hero", { subtitle: val })} />
            </div>
          </div>
        </AdminField>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <AdminField label="Gold Badge Tagline" description="Main badge line (e.g. 'Artisan Excellence Since 2015')">
            <AdminInput
              value={hero.badgeText || ""}
              onChange={(e) => onUpdate("hero", { badgeText: e.target.value })}
              className="!py-2.5 !text-[11.5px] border-stone-200/80 focus:border-[#000000] bg-white/70 hover:bg-white"
            />
          </AdminField>
          <AdminField label="Rotating Seal Ring Text" description="Floating seal label (e.g. '• HANDCRAFTED LUXURY • HERITAGE ARTISTRY •')">
            <AdminInput
              value={hero.rotatingSealText || ""}
              onChange={(e) => onUpdate("hero", { rotatingSealText: e.target.value })}
              className="!py-2.5 !text-[11.5px] border-stone-200/80 focus:border-[#000000] bg-white/70 hover:bg-white"
            />
          </AdminField>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <ImageUpload
            label="Lossless Background Image"
            value={hero.backgroundImage || ""}
            onChange={(val) => onUpdate("hero", { backgroundImage: val })}
            folder="cms"
          />

          <ImageUpload
            label="Mobile Background Image"
            value={hero.mobileBackgroundImage || ""}
            onChange={(val) => onUpdate("hero", { mobileBackgroundImage: val })}
            folder="cms"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-4 border-t border-[#000000]/10">
          <AdminField label="Primary Action Button Text">
            <AdminInput
              value={hero.ctaPrimary?.text || ""}
              onChange={(e) => onUpdate("hero", { ctaPrimary: { ...(hero.ctaPrimary || {}), text: e.target.value } })}
              className="!py-2.5 !text-[11.5px] border-stone-200/80 focus:border-[#000000] bg-white/70 hover:bg-white"
            />
          </AdminField>
          <AdminField label="Primary Action Button Destination Link" description="Page path (e.g. '/collections')">
            <AdminInput
              value={hero.ctaPrimary?.link || ""}
              onChange={(e) => onUpdate("hero", { ctaPrimary: { ...(hero.ctaPrimary || {}), link: e.target.value } })}
              className="!py-2.5 !text-[11.5px] border-stone-200/80 focus:border-[#000000] bg-white/70 hover:bg-white"
            />
          </AdminField>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2">
          <AdminField label="Secondary Action Button Text">
            <AdminInput
              value={hero.ctaSecondary?.text || ""}
              onChange={(e) => onUpdate("hero", { ctaSecondary: { ...(hero.ctaSecondary || {}), text: e.target.value } })}
              className="!py-2.5 !text-[11.5px] border-stone-200/80 focus:border-[#000000] bg-white/70 hover:bg-white"
            />
          </AdminField>
          <AdminField label="Secondary Action Button Destination Link" description="Page path (e.g. '/about')">
            <AdminInput
              value={hero.ctaSecondary?.link || ""}
              onChange={(e) => onUpdate("hero", { ctaSecondary: { ...(hero.ctaSecondary || {}), link: e.target.value } })}
              className="!py-2.5 !text-[11.5px] border-stone-200/80 focus:border-[#000000] bg-white/70 hover:bg-white"
            />
          </AdminField>
        </div>

        <div className="pt-4 border-t border-[#000000]/10 space-y-4">
          <h4 className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#000000]">Floating Glass Card Settings (Desktop View)</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <AdminField label="Floating Card Title">
              <AdminInput
                value={hero.floatingCardTitle || ""}
                onChange={(e) => onUpdate("hero", { floatingCardTitle: e.target.value })}
                className="!py-2.5 !text-[11.5px] border-stone-200/80 focus:border-[#000000] bg-white/70 hover:bg-white"
              />
            </AdminField>
            <AdminField label="Floating Card Action Button Link">
              <AdminInput
                value={hero.floatingCardCtaLink || ""}
                onChange={(e) => onUpdate("hero", { floatingCardCtaLink: e.target.value })}
                className="!py-2.5 !text-[11.5px] border-stone-200/80 focus:border-[#000000] bg-white/70 hover:bg-white"
              />
            </AdminField>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <AdminField label="Floating Card Action Button Text">
              <AdminInput
                value={hero.floatingCardCtaText || ""}
                onChange={(e) => onUpdate("hero", { floatingCardCtaText: e.target.value })}
                className="!py-2.5 !text-[11.5px] border-stone-200/80 focus:border-[#000000] bg-white/70 hover:bg-white"
              />
            </AdminField>
            <AdminField label="Floating Card Description Paragraph">
              <AdminInput
                value={hero.floatingCardDesc || ""}
                onChange={(e) => onUpdate("hero", { floatingCardDesc: e.target.value })}
                className="!py-2.5 !text-[11.5px] border-stone-200/80 focus:border-[#000000] bg-white/70 hover:bg-white"
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
    <div className="bg-gradient-to-tr from-white to-[#F1F5F9] rounded-[2rem] border border-[#000000]/15 p-6 space-y-6 shadow-[0_15px_40px_rgba(115,92,0,0.02)] relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-[#000000]/30 to-transparent" />
      <SectionHeader
        icon="grid_view"
        title="Featured Collections Strip"
        description="Manage the dynamic catalog grid links showcasing signature design categories"
      />
      <div className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <AdminField label="Section Headline">
            <AdminInput
              value={fCol.sectionTitle || ""}
              onChange={(e) => onUpdate("featuredCollections", { sectionTitle: e.target.value })}
              className="!py-2.5 !text-[12px] border-stone-200/80 focus:border-[#000000] bg-white/70 hover:bg-white"
            />
          </AdminField>
          <AdminField label="Pill Subtitle">
            <AdminInput
              value={fCol.sectionSubtitle || ""}
              onChange={(e) => onUpdate("featuredCollections", { sectionSubtitle: e.target.value })}
              className="!py-2.5 !text-[12px] border-stone-200/80 focus:border-[#000000] bg-white/70 hover:bg-white"
            />
          </AdminField>
        </div>

        <div className="space-y-4 pt-4 border-t border-[#000000]/10">
          <label className="text-[9.5px] font-extrabold uppercase tracking-[0.18em] text-[#000000] block mb-1">Configure Category Nodes</label>
          <div className="grid grid-cols-1 gap-4.5">
            {fCol.items?.map((item, idx) => (
              <div key={item.id || idx} className="p-4 bg-white/80 backdrop-blur-md rounded-2xl border border-[#000000]/15 flex flex-col md:flex-row items-stretch md:items-center gap-4.5 shadow-2xs hover:border-[#000000]/35 hover:shadow-xs transition-all duration-300">
                <div className="flex-1 space-y-1.5">
                  <span className="text-[8px] text-stone-400 font-extrabold uppercase tracking-wider block font-sans">Node Name</span>
                  <AdminInput
                    value={item.name || ""}
                    onChange={(e) => {
                      const copy = [...fCol.items];
                      copy[idx] = { ...copy[idx], name: e.target.value };
                      onUpdate("featuredCollections", { items: copy });
                    }}
                    className="!py-2 !text-[11.5px] bg-white border-stone-200/80"
                  />
                </div>
                <div className="shrink-0">
                  <ImageUpload
                    label=""
                    value={item.image || ""}
                    onChange={(val) => {
                      const copy = [...fCol.items];
                      copy[idx] = { ...copy[idx], image: val };
                      onUpdate("featuredCollections", { items: copy });
                    }}
                    folder="cms"
                  />
                </div>
                <div className="flex items-center gap-3 shrink-0 pt-2.5 md:pt-0 border-t md:border-t-0 border-[#000000]/5 justify-between md:justify-end">
                  <span className="text-[9.5px] font-bold text-stone-500 uppercase tracking-wider">Visible</span>
                  <AdminToggle
                    checked={item.isVisible}
                    onChange={() => {
                      const copy = [...fCol.items];
                      copy[idx] = { ...copy[idx], isVisible: !copy[idx].isVisible };
                      onUpdate("featuredCollections", { items: copy });
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
    <div className="bg-gradient-to-tr from-white to-[#F1F5F9] rounded-[2rem] border border-[#000000]/15 p-6 space-y-6 shadow-[0_15px_40px_rgba(115,92,0,0.02)] relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-[#000000]/30 to-transparent" />
      <SectionHeader
        icon="history_edu"
        title="Artisan Story Editorial"
        description="Share the sacred studio lineage and design chronicle with digital storefront visitors"
      />
      <div className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <AdminField label="Editorial Gold Subtitle">
            <AdminInput
              value={story.subtitle || ""}
              onChange={(e) => onUpdate("storyTeaser", { subtitle: e.target.value })}
              className="!py-2.5 !text-[12px] border-stone-200/80 focus:border-[#000000] bg-white/70 hover:bg-white"
            />
          </AdminField>
          <AdminField label="Editorial Bold Headline">
            <AdminInput
              value={story.title || ""}
              onChange={(e) => onUpdate("storyTeaser", { title: e.target.value })}
              className="!py-2.5 !text-[12px] border-stone-200/80 focus:border-[#000000] bg-white/70 hover:bg-white"
            />
          </AdminField>
        </div>

        <AdminField label="Brand Chronology Paragraph" description="Write a compelling, culturally rich editorial narrative">
          <div className="relative flex items-start w-full shadow-2xs rounded-xl">
            <AdminTextarea
              value={story.description || ""}
              onChange={(e) => onUpdate("storyTeaser", { description: e.target.value })}
              rows={4}
              className="pr-10 !py-3 !text-[12px] border-stone-200/80 focus:border-[#000000] bg-white/70 hover:bg-white"
            />
            <div className="absolute right-2.5 top-2.5">
              <AISparkButton text={story.description} onApply={(val) => onUpdate("storyTeaser", { description: val })} />
            </div>
          </div>
        </AdminField>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <ImageUpload
            label="Editorial Accent Graphic"
            value={story.image || ""}
            onChange={(val) => onUpdate("storyTeaser", { image: val })}
            folder="cms"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <AdminField label="Call to Action Button Label">
              <AdminInput
                value={story.ctaText || ""}
                onChange={(e) => onUpdate("storyTeaser", { ctaText: e.target.value })}
                className="!py-2.5 !text-[11.5px] border-stone-200/80 focus:border-[#000000] bg-white/70 hover:bg-white"
              />
            </AdminField>
            <AdminField label="Heritage Year Badge Text">
              <AdminInput
                value={story.establishedYear || "Est. in 2003"}
                onChange={(e) => onUpdate("storyTeaser", { establishedYear: e.target.value })}
                className="!py-2.5 !text-[11.5px] border-stone-200/80 focus:border-[#000000] bg-white/70 hover:bg-white"
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
    <div className="bg-gradient-to-tr from-white to-[#F1F5F9] rounded-[2rem] border border-[#000000]/15 p-6 space-y-6 shadow-[0_15px_40px_rgba(115,92,0,0.02)] relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-[#000000]/30 to-transparent" />
      <SectionHeader
        icon="stars"
        title="Bestsellers Carousel Strip"
        description="Control product display quantities and heading labels on the homepage bestselling shelf"
      />
      <div className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <AdminField label="Section Header Headline">
            <AdminInput
              value={bs.sectionTitle || ""}
              onChange={(e) => onUpdate("featuredProducts", { sectionTitle: e.target.value })}
              className="!py-2.5 !text-[12px] border-stone-200/80 focus:border-[#000000] bg-white/70 hover:bg-white"
            />
          </AdminField>
          <AdminField label="Shelf Subtitle Tag">
            <AdminInput
              value={bs.sectionSubtitle || ""}
              onChange={(e) => onUpdate("featuredProducts", { sectionSubtitle: e.target.value })}
              className="!py-2.5 !text-[12px] border-stone-200/80 focus:border-[#000000] bg-white/70 hover:bg-white"
            />
          </AdminField>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-4 border-t border-[#000000]/10">
          <AdminField label="Max Items Rendered">
            <AdminInput
              type="number"
              value={bs.maxDisplay || 4}
              onChange={(e) => onUpdate("featuredProducts", { maxDisplay: parseInt(e.target.value) || 4 })}
              className="!py-2.5 !text-[11.5px] border-stone-200/80 focus:border-[#000000] bg-white/70 hover:bg-white"
            />
          </AdminField>
          <div className="flex items-center justify-between border border-[#000000]/15 px-4.5 py-3 rounded-2xl bg-white/80 backdrop-blur-xs mt-5 h-[46px] shadow-2xs">
            <span className="text-[10px] font-extrabold text-[#64748B] uppercase tracking-wider">Enable Section Shelf</span>
            <AdminToggle
              checked={bs.isVisible}
              onChange={() => onUpdate("featuredProducts", { isVisible: !bs.isVisible })}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// 5. TESTIMONIALS
function TestimonialsEditor({ content, onUpdate }) {
  const testm = content.testimonials || {};
  return (
    <div className="bg-gradient-to-tr from-white to-[#F1F5F9] rounded-[2rem] border border-[#000000]/15 p-6 space-y-6 shadow-[0_15px_40px_rgba(115,92,0,0.02)] relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-[#000000]/30 to-transparent" />
      <SectionHeader
        icon="chat_bubble"
        title="Patron Voices & Reviews"
        description="Curate luxury client testimonials and rating indicators displayed on the homepage"
      />
      <div className="space-y-5">
        <AdminField label="Section Header Headline">
          <AdminInput
            value={testm.sectionTitle || ""}
            onChange={(e) => onUpdate("testimonials", { sectionTitle: e.target.value })}
            className="!py-2.5 !text-[12px] border-stone-200/80 focus:border-[#000000] bg-white/70 hover:bg-white"
          />
        </AdminField>

        <div className="space-y-4 pt-4 border-t border-[#000000]/10">
          <div className="flex justify-between items-center mb-1">
            <label className="text-[9.5px] font-extrabold uppercase tracking-[0.18em] text-[#000000]">Patron Reviews</label>
            <button
              type="button"
              onClick={() => {
                const newId = Date.now().toString();
                const copy = [...(testm.items || []), { id: newId, name: "New Client", text: "Luxury experience.", rating: 5, isVisible: true }];
                onUpdate("testimonials", { items: copy });
                toast.success("New Review Node Added!");
              }}
              className="text-[9.5px] font-bold text-[#000000] hover:text-stone-950 border border-[#000000]/30 hover:border-stone-900 px-3.5 py-1.5 rounded-full bg-white transition-all cursor-pointer shadow-2xs hover:shadow-xs"
            >
              + Add Review
            </button>
          </div>
          
          <div className="grid grid-cols-1 gap-4">
            {testm.items?.map((item, idx) => (
              <div key={item.id || idx} className="p-4 bg-white/80 backdrop-blur-md rounded-2xl border border-[#000000]/15 space-y-3.5 shadow-2xs hover:border-[#000000]/35 hover:shadow-xs transition-all duration-300">
                <div className="flex justify-between items-center border-b border-[#000000]/5 pb-2">
                  <div className="flex items-center gap-3">
                    <span className="text-[8px] text-stone-400 font-extrabold uppercase tracking-wider">Patron Name</span>
                    <AdminInput
                      value={item.name || ""}
                      onChange={(e) => {
                        const copy = [...testm.items];
                        copy[idx] = { ...copy[idx], name: e.target.value };
                        onUpdate("testimonials", { items: copy });
                      }}
                      className="!py-1.5 font-bold !text-[11.5px] !w-48 bg-white border-stone-200/80 focus:border-[#000000]"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const copy = testm.items.filter(i => i.id !== item.id);
                      onUpdate("testimonials", { items: copy });
                      toast.success("Review Node Deleted");
                    }}
                    className="text-red-500 opacity-60 hover:opacity-100 transition-opacity flex items-center justify-center p-1.5 hover:bg-red-50 rounded-lg"
                  >
                    <span className="material-symbols-outlined text-[16px] font-bold">delete</span>
                  </button>
                </div>
                
                <AdminField label="Review Content Statement">
                  <AdminTextarea
                    value={item.text || ""}
                    onChange={(e) => {
                      const copy = [...testm.items];
                      copy[idx] = { ...copy[idx], text: e.target.value };
                      onUpdate("testimonials", { items: copy });
                    }}
                    className="!text-[11.5px] !py-2 bg-white border-stone-200/80 focus:border-[#000000]"
                    rows={2}
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

// ═══════════════════════════════════════════════════════════
// 5.5 SECTION ORDERING EDITOR
// ═══════════════════════════════════════════════════════════
function SectionOrderEditor({ sections, onToggle, onReorder }) {
  return (
    <div className="bg-gradient-to-tr from-white to-[#F1F5F9] rounded-[2rem] border border-[#000000]/15 p-6 space-y-6 shadow-[0_15px_40px_rgba(115,92,0,0.02)] relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-[#000000]/30 to-transparent" />
      <SectionHeader
        icon="reorder"
        title="Homepage Section Order & Visibility"
        description="Arrange the order of sections displayed on the live homepage and toggle their visibility"
      />

      <div className="space-y-3.5">
        {sections?.map((section, idx) => (
          <div
            key={section.id}
            className={`flex items-center gap-4.5 p-4 rounded-2xl border transition-all duration-300 shadow-2xs hover:shadow-xs ${
              section.isVisible
                ? "bg-white border-[#000000]/15 hover:border-[#000000]/35"
                : "bg-stone-50/50 border-transparent opacity-60"
            }`}
          >
            {/* Position Badging */}
            <div className="w-8 h-8 rounded-full bg-[#0F172A] text-white flex items-center justify-center font-serif font-extrabold text-[11px] shrink-0 shadow-sm">
              {idx + 1}
            </div>

            {/* Title / Description */}
            <div className="flex-1 min-w-0">
              <span className="text-[12px] font-extrabold text-stone-900 block tracking-tight">
                {section.label}
              </span>
              <span className="text-[9px] font-bold text-stone-400 uppercase tracking-widest block mt-0.5 font-sans">
                {section.id === "hero" ? "Intro Visuals" : section.id === "featuredCollections" ? "Catalog Category Strip" : section.id === "featuredProducts" ? "Bestselling Products Shelf" : section.id === "storyTeaser" ? "Linage Editorial Story" : "Patron Voices Reviews"}
              </span>
            </div>

            {/* Position Reordering Buttons */}
            <div className="flex items-center gap-1.5 shrink-0 bg-stone-50 p-1.5 rounded-xl border border-stone-200/80">
              <button
                type="button"
                onClick={() => idx > 0 && onReorder(idx, idx - 1)}
                disabled={idx === 0}
                className="text-stone-500 hover:text-stone-900 disabled:opacity-20 cursor-pointer disabled:cursor-default w-7 h-7 rounded-lg hover:bg-white flex items-center justify-center transition-all border-none bg-transparent"
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
                className="text-stone-500 hover:text-stone-900 disabled:opacity-20 cursor-pointer disabled:cursor-default w-7 h-7 rounded-lg hover:bg-white flex items-center justify-center transition-all border-none bg-transparent"
                title="Move Section Down"
              >
                <span className="material-symbols-outlined text-[16px] font-bold">
                  expand_more
                </span>
              </button>
            </div>

            {/* Visibility Toggle */}
            <div className="flex items-center gap-2 border-l border-[#000000]/10 pl-4.5 shrink-0">
              <span className="text-[9.5px] font-bold text-stone-400 uppercase tracking-wider hidden sm:inline">Visible</span>
              <AdminToggle
                checked={section.isVisible}
                onChange={() => onToggle(section.id)}
              />
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
    <div className="bg-gradient-to-tr from-white to-[#F1F5F9] rounded-[2rem] border border-[#000000]/15 p-6 space-y-6 shadow-[0_15px_40px_rgba(115,92,0,0.02)] relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-[#000000]/30 to-transparent" />
      <SectionHeader
        icon="photo_library"
        title="Gallery Curation Settings"
        description="Configure the primary Inspiration Gallery showcase, title tags, item caps, and layout formats"
      />
      <div className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <AdminField label="Gallery Headline Tag" description="Primary bold title for inspiration portfolio">
            <AdminInput
              value={gp.sectionTitle || ""}
              onChange={(e) => onUpdate("galleryPreview", { sectionTitle: e.target.value })}
              className="!py-2.5 !text-[12px] border-stone-200/80 focus:border-[#000000] bg-white/70 hover:bg-white"
            />
          </AdminField>
          <AdminField label="Gallery Subtitle Tag" description="Gold elegant narrative label showing below heading">
            <AdminInput
              value={gp.sectionSubtitle || ""}
              onChange={(e) => onUpdate("galleryPreview", { sectionSubtitle: e.target.value })}
              className="!py-2.5 !text-[12px] border-stone-200/80 focus:border-[#000000] bg-white/70 hover:bg-white"
            />
          </AdminField>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-4 border-t border-[#000000]/10">
          <AdminField label="Maximum Display Count" description="Adjust limit of masonry cards shown on feed">
            <AdminInput
              type="number"
              value={gp.maxDisplay || 6}
              onChange={(e) => onUpdate("galleryPreview", { maxDisplay: parseInt(e.target.value) || 6 })}
              className="!py-2.5 !text-[11.5px] border-stone-200/80 focus:border-[#000000] bg-white/70 hover:bg-white"
            />
          </AdminField>
          <div className="flex items-center justify-between border border-[#000000]/15 px-4.5 py-3 rounded-2xl bg-white/80 backdrop-blur-xs mt-5 h-[46px] shadow-2xs">
            <span className="text-[10px] font-extrabold text-[#64748B] uppercase tracking-wider">Show Grid on Homepage</span>
            <AdminToggle
              checked={gp.isVisible !== false}
              onChange={() => onUpdate("galleryPreview", { isVisible: gp.isVisible === false ? true : false })}
            />
          </div>
        </div>

        <div className="p-4.5 bg-[#F1F5F9] rounded-2xl border border-[#000000]/15 space-y-2.5 mt-4 shadow-3xs">
          <span className="text-[9.5px] font-extrabold text-[#000000] uppercase tracking-[0.15em] block">Masonry Filter Options</span>
          <p className="text-[9.5px] text-stone-500 font-light leading-relaxed">
            Storefront visitors can seamlessly filter using categories like <em>Traditional Wedding Decor</em>, <em>Pooja Decoration Sets</em>, <em>Customized Gift Hampers</em>, and <em>Bangle Trays</em> dynamically populated from your catalog.
          </p>
        </div>
      </div>
    </div>
  );
}

const DEFAULT_FEATURES = [
  {
    icon: "handyman",
    title: "Handmade Artistry",
    desc: "Every petal, every bead, and every fold is meticulously placed by hand.",
  },
  {
    icon: "diamond",
    title: "Premium Quality",
    desc: "Sourcing only the finest materials globally to ensure unparalleled luxury.",
  },
  {
    icon: "volunteer_activism",
    title: "Cultural Roots",
    desc: "Deeply embedded in authentic Telugu traditions and timeless heritage.",
  },
  {
    icon: "design_services",
    title: "Bespoke Design",
    desc: "Tailored to your specific event theme and personal storytelling.",
  },
];

// 7. ABOUT HERITAGE
function AboutPageDetailsEditor({ content, onUpdate }) {
  const ab = content || {};
  
  return (
    <div className="bg-gradient-to-tr from-white to-[#F1F5F9] rounded-[2rem] border border-[#000000]/15 p-6 space-y-6 shadow-[0_15px_40px_rgba(115,92,0,0.02)] relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-[#000000]/30 to-transparent" />
      <SectionHeader
        icon="info"
        title="About Heritage Page Customizer"
        description="Overhaul the full cinematic brand story, founder profiles, mission, and visual graphics"
      />
      
      <div className="space-y-6">
        {/* Cinematic Hero */}
        <div className="bg-white/80 backdrop-blur-md p-5 rounded-2xl border border-[#000000]/15 space-y-4 shadow-2xs">
          <span className="text-[9.5px] font-extrabold text-[#000000] uppercase tracking-[0.18em] block border-b border-[#000000]/10 pb-2">1. Editorial Hero Showcase</span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4.5">
            <AdminField label="Cinematic Title Headline">
              <AdminInput
                value={ab.heroTitle || ""}
                onChange={(e) => onUpdate("aboutPage", { heroTitle: e.target.value })}
                className="!py-2.5 !text-[12px] border-stone-200/85 focus:border-[#000000]"
              />
            </AdminField>
            <AdminField label="Cinematic Subtitle">
              <AdminInput
                value={ab.heroSubtitle || ""}
                onChange={(e) => onUpdate("aboutPage", { heroSubtitle: e.target.value })}
                className="!py-2.5 !text-[12px] border-stone-200/85 focus:border-[#000000]"
              />
            </AdminField>
          </div>
          <ImageUpload
            label="Cinematic Backdrop Graphic"
            value={ab.heroImage || ""}
            onChange={(val) => onUpdate("aboutPage", { heroImage: val })}
            folder="cms"
          />
        </div>

        {/* Mission & Narrative */}
        <div className="bg-white/80 backdrop-blur-md p-5 rounded-2xl border border-[#000000]/15 space-y-4 shadow-2xs">
          <span className="text-[9.5px] font-extrabold text-[#000000] uppercase tracking-[0.18em] block border-b border-[#000000]/10 pb-2">2. Narrative & Mission Statement</span>
          <AdminField label="Brand Mission Block" description="Core statement emphasizing the Telugu craftsmanship legacy">
            <div className="relative flex items-start w-full shadow-3xs rounded-xl">
              <AdminTextarea
                value={ab.missionStatement || ""}
                onChange={(e) => onUpdate("aboutPage", { missionStatement: e.target.value })}
                rows={3}
                className="pr-10 !py-2.5 !text-[12px] border-stone-200/85 focus:border-[#000000]"
              />
              <div className="absolute right-2.5 top-2.5">
                <AISparkButton text={ab.missionStatement} onApply={(val) => onUpdate("aboutPage", { missionStatement: val })} />
              </div>
            </div>
          </AdminField>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4.5">
            <ImageUpload
              label="Narrative Side Illustration Image"
              value={ab.storyImage || ""}
              onChange={(val) => onUpdate("aboutPage", { storyImage: val })}
              folder="cms"
            />
            <div className="space-y-3.5">
              <AdminField label="Primary Founder Name" description="Name showing inside leadership frames">
                <AdminInput
                  value={ab.founderName || "Sirisha Atmakuri"}
                  onChange={(e) => onUpdate("aboutPage", { founderName: e.target.value })}
                  className="!py-2.5 !text-[11.5px] border-stone-200/85 focus:border-[#000000]"
                />
              </AdminField>
              <AdminField label="Leadership Role Title">
                <AdminInput
                  value={ab.founderRole || "Founder & Creative Head"}
                  onChange={(e) => onUpdate("aboutPage", { founderRole: e.target.value })}
                  className="!py-2.5 !text-[11.5px] border-stone-200/85 focus:border-[#000000]"
                />
              </AdminField>
            </div>
          </div>
        </div>

        {/* Dual Leadership */}
        {ab.founders && (
          <div className="bg-white/80 backdrop-blur-md p-5 rounded-2xl border border-[#000000]/15 space-y-4 shadow-2xs">
            <span className="text-[9.5px] font-extrabold text-[#000000] uppercase tracking-[0.18em] block border-b border-[#000000]/10 pb-2 font-sans">3. Studio Founders & Directors</span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4.5">
              {ab.founders.map((founder, idx) => (
                <div key={idx} className="bg-gradient-to-b from-white to-[#F8F9FB] p-4.5 rounded-xl border border-[#000000]/15 space-y-3.5 shadow-3xs">
                  <span className="text-[8.5px] font-extrabold text-stone-400 uppercase tracking-widest block font-sans">Founder {idx + 1}</span>
                  <div className="grid grid-cols-2 gap-2.5">
                    <AdminField label="Full Name">
                      <AdminInput
                        value={founder.name || ""}
                        onChange={(e) => {
                          const copy = [...ab.founders];
                          copy[idx] = { ...copy[idx], name: e.target.value };
                          onUpdate("aboutPage", { founders: copy });
                        }}
                        className="!py-2 !text-[11px]"
                      />
                    </AdminField>
                    <AdminField label="Executive Role">
                      <AdminInput
                        value={founder.role || ""}
                        onChange={(e) => {
                          const copy = [...ab.founders];
                          copy[idx] = { ...copy[idx], role: e.target.value };
                          onUpdate("aboutPage", { founders: copy });
                        }}
                        className="!py-2 !text-[11px]"
                      />
                    </AdminField>
                  </div>
                  <AdminField label="Intro Subtitle Text">
                    <AdminInput
                      value={founder.subtitle || ""}
                      onChange={(e) => {
                        const copy = [...ab.founders];
                        copy[idx] = { ...copy[idx], subtitle: e.target.value };
                        onUpdate("aboutPage", { founders: copy });
                      }}
                      className="!py-2 !text-[11px]"
                    />
                  </AdminField>
                  <AdminField label="Artistic Bio Quote">
                    <AdminTextarea
                      value={founder.quote || ""}
                      onChange={(e) => {
                        const copy = [...ab.founders];
                        copy[idx] = { ...copy[idx], quote: e.target.value };
                        onUpdate("aboutPage", { founders: copy });
                      }}
                      className="!py-1.5 !text-[11px]"
                      rows={3}
                    />
                  </AdminField>
                  <ImageUpload
                    label="Autograph Signature Graphic"
                    value={cleanSignatureImg(founder.signatureImg, founder.name)}
                    onChange={(val) => {
                      const copy = [...ab.founders];
                      copy[idx] = { ...copy[idx], signatureImg: val };
                      onUpdate("aboutPage", { founders: copy });
                    }}
                    folder="cms"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Signature Specializations */}
        <div className="bg-white/80 backdrop-blur-md p-5 rounded-2xl border border-[#000000]/15 space-y-4 shadow-2xs">
          <div className="flex justify-between items-center border-b border-[#000000]/10 pb-2">
            <span className="text-[9.5px] font-extrabold text-[#000000] uppercase tracking-[0.18em] block font-sans">4. Signature Specializations</span>
            <button
              type="button"
              onClick={() => {
                const copy = [...(ab.specializations || DEFAULT_SPECIALIZATIONS)];
                copy.push({ title: "New Specialization", img: "" });
                onUpdate("aboutPage", { specializations: copy });
                toast.success("New Specialization Added!");
              }}
              className="text-[9.5px] font-bold text-[#000000] hover:text-stone-950 border border-[#000000]/30 hover:border-stone-900 px-3.5 py-1.5 rounded-full bg-white transition-all cursor-pointer shadow-2xs hover:shadow-xs"
            >
              + Add Specialization
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4.5">
            {(ab.specializations || DEFAULT_SPECIALIZATIONS).map((item, idx) => (
              <div key={idx} className="p-4 bg-white/85 backdrop-blur-md rounded-2xl border border-[#000000]/15 flex flex-col md:flex-row items-stretch md:items-center gap-4.5 shadow-2xs hover:border-[#000000]/35 hover:shadow-xs transition-all duration-300">
                <div className="flex-1 space-y-1.5">
                  <span className="text-[8px] text-stone-400 font-extrabold uppercase tracking-wider block font-sans">Specialization Title</span>
                  <AdminInput
                    value={item.title || ""}
                    onChange={(e) => {
                      const copy = [...(ab.specializations || DEFAULT_SPECIALIZATIONS)];
                      copy[idx] = { ...copy[idx], title: e.target.value };
                      onUpdate("aboutPage", { specializations: copy });
                    }}
                    className="!py-2 !text-[11.5px] bg-white border-stone-200/80"
                  />
                </div>
                <div className="shrink-0">
                  <ImageUpload
                    label=""
                    value={item.img || ""}
                    onChange={(val) => {
                      const copy = [...(ab.specializations || DEFAULT_SPECIALIZATIONS)];
                      copy[idx] = { ...copy[idx], img: val };
                      onUpdate("aboutPage", { specializations: copy });
                    }}
                    folder="cms"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const copy = (ab.specializations || DEFAULT_SPECIALIZATIONS).filter((_, i) => i !== idx);
                    onUpdate("aboutPage", { specializations: copy });
                    toast.success("Specialization Deleted");
                  }}
                  className="text-red-500 opacity-60 hover:opacity-100 transition-opacity flex items-center justify-center p-1.5 hover:bg-red-50 rounded-lg shrink-0"
                >
                  <span className="material-symbols-outlined text-[16px] font-bold">delete</span>
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Why Families Choose Us */}
        <div className="bg-white/80 backdrop-blur-md p-5 rounded-2xl border border-[#000000]/15 space-y-4 shadow-2xs">
          <div className="flex justify-between items-center border-b border-[#000000]/10 pb-2">
            <span className="text-[9.5px] font-extrabold text-[#000000] uppercase tracking-[0.18em] block font-sans">5. Why Families Choose Us</span>
            <button
              type="button"
              onClick={() => {
                const copy = [...(ab.features || DEFAULT_FEATURES)];
                copy.push({ icon: "star", title: "New Feature", desc: "Feature description." });
                onUpdate("aboutPage", { features: copy });
                toast.success("New Feature Added!");
              }}
              className="text-[9.5px] font-bold text-[#000000] hover:text-stone-950 border border-[#000000]/30 hover:border-stone-900 px-3.5 py-1.5 rounded-full bg-white transition-all cursor-pointer shadow-2xs hover:shadow-xs"
            >
              + Add Feature
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4.5">
            {(ab.features || DEFAULT_FEATURES).map((item, idx) => (
              <div key={idx} className="p-4 bg-white/85 backdrop-blur-md rounded-2xl border border-[#000000]/15 space-y-3.5 shadow-2xs hover:border-[#000000]/35 transition-all duration-300">
                <div className="flex justify-between items-center border-b border-[#000000]/5 pb-2">
                  <div className="flex items-center gap-3">
                    <span className="text-[8px] text-stone-400 font-extrabold uppercase tracking-wider">Feature Title</span>
                    <AdminInput
                      value={item.title || ""}
                      onChange={(e) => {
                        const copy = [...(ab.features || DEFAULT_FEATURES)];
                        copy[idx] = { ...copy[idx], title: e.target.value };
                        onUpdate("aboutPage", { features: copy });
                      }}
                      className="!py-1.5 font-bold !text-[11.5px] !w-48 bg-white border-stone-200/80 focus:border-[#000000]"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const copy = (ab.features || DEFAULT_FEATURES).filter((_, i) => i !== idx);
                      onUpdate("aboutPage", { features: copy });
                      toast.success("Feature Deleted");
                    }}
                    className="text-red-500 opacity-60 hover:opacity-100 transition-opacity flex items-center justify-center p-1.5 hover:bg-red-50 rounded-lg"
                  >
                    <span className="material-symbols-outlined text-[16px] font-bold">delete</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <AdminField label="Material Symbol Icon Name" description="From Google Material Symbols, e.g. diamond, handyman, star">
                    <AdminInput
                      value={item.icon || ""}
                      onChange={(e) => {
                        const copy = [...(ab.features || DEFAULT_FEATURES)];
                        copy[idx] = { ...copy[idx], icon: e.target.value };
                        onUpdate("aboutPage", { features: copy });
                      }}
                      className="!py-2 !text-[11px] bg-white border-stone-200/80"
                    />
                  </AdminField>

                  <AdminField label="Feature Description">
                    <AdminTextarea
                      value={item.desc || ""}
                      onChange={(e) => {
                        const copy = [...(ab.features || DEFAULT_FEATURES)];
                        copy[idx] = { ...copy[idx], desc: e.target.value };
                        onUpdate("aboutPage", { features: copy });
                      }}
                      className="!py-1.5 !text-[11px] bg-white border-stone-200/80"
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
function EventsPageDetailsEditor({ content, onUpdate }) {
  const ep = content || {};
  const hero = ep.hero || {};
  const promo = ep.promo || {};

  return (
    <div className="bg-gradient-to-tr from-white to-[#F1F5F9] rounded-[2rem] border border-[#000000]/15 p-6 space-y-6 shadow-[0_15px_40px_rgba(115,92,0,0.02)] relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-[#000000]/30 to-transparent" />
      <SectionHeader
        icon="celebration"
        title="Events Page Customizer"
        description="Configure banner headline, description, hero background image, and promo background image."
      />
      <div className="space-y-6">
        {/* Hero Section Banner */}
        <div className="bg-white/80 backdrop-blur-md p-5 rounded-2xl border border-[#000000]/15 space-y-4 shadow-2xs">
          <span className="text-[9.5px] font-extrabold text-[#000000] uppercase tracking-[0.18em] block border-b border-[#000000]/10 pb-2">1. Hero Section Banner</span>
          
          <AdminField label="Hero Title" description="The primary main headline of the events page">
            <div className="relative flex items-center w-full shadow-2xs rounded-xl">
              <AdminInput
                value={hero.title || ""}
                onChange={(e) => onUpdate("eventsPage", { hero: { ...hero, title: e.target.value } })}
                className="pr-10 !py-3 !text-[12px] border-stone-200/80 focus:border-[#000000] bg-white/70 hover:bg-white"
              />
              <div className="absolute right-2.5">
                <AISparkButton text={hero.title} onApply={(val) => onUpdate("eventsPage", { hero: { ...hero, title: val } })} />
              </div>
            </div>
          </AdminField>

          <AdminField label="Hero Subtitle" description="A short tagline or category group text">
            <div className="relative flex items-center w-full shadow-2xs rounded-xl">
              <AdminInput
                value={hero.subtitle || ""}
                onChange={(e) => onUpdate("eventsPage", { hero: { ...hero, subtitle: e.target.value } })}
                className="pr-10 !py-3 !text-[12px] border-stone-200/80 focus:border-[#000000] bg-white/70 hover:bg-white"
              />
              <div className="absolute right-2.5">
                <AISparkButton text={hero.subtitle} onApply={(val) => onUpdate("eventsPage", { hero: { ...hero, subtitle: val } })} />
              </div>
            </div>
          </AdminField>

          <AdminField label="Hero Description" description="Immersive description paragraph detailing our event services">
            <div className="relative flex items-start w-full shadow-2xs rounded-xl">
              <AdminTextarea
                value={hero.description || ""}
                onChange={(e) => onUpdate("eventsPage", { hero: { ...hero, description: e.target.value } })}
                rows={3}
                className="pr-10 !py-3 !text-[12px] border-stone-200/80 focus:border-[#000000] bg-white/70 hover:bg-white"
              />
              <div className="absolute right-2.5 top-2.5">
                <AISparkButton text={hero.description} onApply={(val) => onUpdate("eventsPage", { hero: { ...hero, description: val } })} />
              </div>
            </div>
          </AdminField>

          <ImageUpload
            label="Hero Background Image"
            value={hero.backgroundImage || ""}
            onChange={(val) => onUpdate("eventsPage", { hero: { ...hero, backgroundImage: val } })}
            folder="cms"
          />
        </div>

        {/* Promo Banner Settings */}
        <div className="bg-white/80 backdrop-blur-md p-5 rounded-2xl border border-[#000000]/15 space-y-4 shadow-2xs">
          <span className="text-[9.5px] font-extrabold text-[#000000] uppercase tracking-[0.18em] block border-b border-[#000000]/10 pb-2">2. Promo Banner Settings</span>
          <ImageUpload
            label="Promo Section Background Image"
            value={promo.backgroundImage || ""}
            onChange={(val) => onUpdate("eventsPage", { promo: { ...promo, backgroundImage: val } })}
            folder="cms"
          />
        </div>
      </div>
    </div>
  );
}

// 8. HELPLINE & LOCATION
function ContactInfoEditor({ contact, onUpdate }) {
  const c = contact || {};
  
  return (
    <div className="bg-gradient-to-tr from-white to-[#F1F5F9] rounded-[2rem] border border-[#000000]/15 p-6 space-y-6 shadow-[0_15px_40px_rgba(115,92,0,0.02)] relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-[#000000]/30 to-transparent" />
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
              value={c.phone || ""}
              onChange={(e) => onUpdate("contact", { phone: e.target.value })}
              className="!py-2.5 !text-[12px] border-stone-200/80 focus:border-[#000000]"
            />
          </AdminField>
          <AdminField label="WhatsApp Instant Link" description="Direct messaging URL">
            <AdminInput
              value={c.whatsapp || ""}
              onChange={(e) => onUpdate("contact", { whatsapp: e.target.value })}
              className="!py-2.5 !text-[12px] border-stone-200/80 focus:border-[#000000]"
            />
          </AdminField>
          <AdminField label="Official Support Email" description="Digital studio inbox">
            <AdminInput
              value={c.email || ""}
              onChange={(e) => onUpdate("contact", { email: e.target.value })}
              className="!py-2.5 !text-[12px] border-stone-200/80 focus:border-[#000000]"
            />
          </AdminField>
        </div>

        {/* Address and Maps */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4.5 pt-4 border-t border-[#000000]/10">
          <AdminField label="Studio Physical Address" description="Location rendered on footer & contact pages">
            <AdminInput
              value={c.address || ""}
              onChange={(e) => onUpdate("contact", { address: e.target.value })}
              className="!py-2.5 !text-[11.5px] border-stone-200/80 focus:border-[#000000]"
            />
          </AdminField>
          <AdminField label="Google Maps Direction Link" description="Anchor link routing users to navigate">
            <AdminInput
              value={c.mapEmbed || ""}
              onChange={(e) => onUpdate("contact", { mapEmbed: e.target.value })}
              placeholder="e.g. https://maps.google.com/?q=..."
              className="!py-2.5 !text-[11.5px] border-stone-200/80 focus:border-[#000000]"
            />
          </AdminField>
        </div>

        {/* Timings */}
        <div className="bg-white/80 backdrop-blur-md p-4.5 rounded-2xl border border-[#000000]/15 space-y-3 mt-4 shadow-3xs">
          <span className="text-[9.5px] font-extrabold text-[#000000] uppercase tracking-[0.15em] block font-sans">Studio Business Hours</span>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4.5">
            <AdminField label="Weekdays opening schedule">
              <AdminInput
                value={c.businessHours || "Mon - Sat: 10 AM - 7 PM"}
                onChange={(e) => onUpdate("contact", { businessHours: e.target.value })}
                className="!py-2 !text-[11.5px] bg-white border-stone-200/80"
              />
            </AdminField>
            <div className="p-3 bg-[#F1F5F9] rounded-xl border border-[#000000]/10 flex items-center justify-center text-center">
              <span className="text-[10px] text-stone-500 font-light leading-normal">
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
function CustomOrdersCMSEditor({ content, onUpdate }) {
  const studio = content.digitalStudio || {};
  
  return (
    <div className="bg-gradient-to-tr from-white to-[#F1F5F9] rounded-[2rem] border border-[#000000]/15 p-6 space-y-6 shadow-[0_15px_40px_rgba(115,92,0,0.02)] relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-[#000000]/30 to-transparent" />
      <SectionHeader
        icon="design_services"
        title="Custom Intake Form Modules"
        description="Overhaul active consultation categories, base pricing structures, and dynamic intake modules"
      />
      
      <div className="space-y-5">
        {/* Headers */}
        <div className="p-4.5 bg-[#F1F5F9] rounded-2xl border border-[#000000]/15 space-y-2 shadow-3xs">
          <span className="text-[9.5px] font-extrabold text-[#000000] uppercase tracking-[0.15em] block font-sans">Intake Form Welcome Setup</span>
          <p className="text-[9.5px] text-stone-500 font-light leading-relaxed">
            The Digital Studio intake page lets prospective couples specify their event type (Wedding, Pooja, Engagement, etc.), preferred visual style (Royal Palace, Minimalist, Kundan), venue scale capacity, and custom build modules.
          </p>
        </div>

        {/* Modules Config */}
        <div className="space-y-4 pt-4 border-t border-[#000000]/10">
          <label className="text-[9.5px] font-extrabold uppercase tracking-[0.18em] text-[#000000] block mb-1">Configure Base Prices & Subsystems</label>
          
          <div className="grid grid-cols-1 gap-4">
            {studio.packageModules?.map((mod, idx) => (
              <div key={mod.id || idx} className="p-4.5 bg-white/80 backdrop-blur-md border border-[#000000]/15 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4.5 shadow-2xs hover:border-[#000000]/35 transition-all duration-300">
                <div className="flex-1 space-y-1.5">
                  <span className="text-[8.5px] text-stone-400 font-extrabold uppercase tracking-wider block font-sans">Module Label</span>
                  <span className="text-[12px] font-bold text-stone-850 block leading-tight">{mod.label}</span>
                  <span className="text-[10px] text-stone-450 block font-light leading-normal">{mod.desc}</span>
                </div>
                
                <div className="flex items-center gap-3.5 shrink-0 pt-3 md:pt-0 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 border-[#000000]/5">
                  <div className="space-y-1 w-28">
                    <span className="text-[8px] text-stone-400 font-extrabold uppercase tracking-wider block text-right font-sans">Base Price</span>
                    <AdminInput
                      type="number"
                      value={mod.basePrice || 0}
                      onChange={(e) => {
                        const copy = [...studio.packageModules];
                        copy[idx] = { ...copy[idx], basePrice: parseInt(e.target.value) || 0 };
                        onUpdate("digitalStudio", { packageModules: copy });
                      }}
                      className="!py-2 !text-[11.5px] bg-white text-right font-mono border-stone-200/80"
                    />
                  </div>
                  <div className="space-y-1 text-center shrink-0 ml-2.5">
                    <span className="text-[8px] text-stone-400 font-extrabold uppercase tracking-wider block font-sans">Popular</span>
                    <AdminToggle
                      checked={mod.isPopular}
                      onChange={() => {
                        const copy = [...studio.packageModules];
                        copy[idx] = { ...copy[idx], isPopular: !copy[idx].isPopular };
                        onUpdate("digitalStudio", { packageModules: copy });
                      }}
                    />
                  </div>
                </div>
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
  const seo = content.seo || {};
  
  return (
    <div className="bg-gradient-to-tr from-white to-[#F1F5F9] rounded-[2rem] border border-[#000000]/15 p-6 space-y-6 shadow-[0_15px_40px_rgba(115,92,0,0.02)] relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-[#000000]/30 to-transparent" />
      <SectionHeader
        icon="search"
        title="SEO Settings & Brand Metadata"
        description="Configure search engine title suffixes, global descriptions, indexing keys, and social thumbnails"
      />
      
      <div className="space-y-5">
        {/* Title & Desc */}
        <AdminField label="Default Google Page Title Tag" description="Displayed on search results tabs (max 60 chars)">
          <AdminInput
            value={seo.globalTitle || ""}
            onChange={(e) => onUpdate("seo", { globalTitle: e.target.value })}
            className="!py-2.5 !text-[12px] border-stone-200/80 focus:border-[#000000] bg-white/70 hover:bg-white"
          />
        </AdminField>
        
        <AdminField label="Meta Description Block" description="Text block crawled by Google for list snippets (max 160 chars)">
          <AdminTextarea
            value={seo.globalDescription || ""}
            onChange={(e) => onUpdate("seo", { globalDescription: e.target.value })}
            rows={3}
            className="!py-2.5 !text-[12px] border-stone-200/80 focus:border-[#000000] bg-white/70 hover:bg-white"
          />
        </AdminField>

        {/* Social Meta */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-4 border-t border-[#000000]/10">
          <AdminField label="Global Search Keywords Tag" description="Comma-separated crawling keywords">
            <AdminInput
              value={seo.globalKeywords || ""}
              onChange={(e) => onUpdate("seo", { globalKeywords: e.target.value })}
              className="!py-2.5 !text-[11.5px] border-stone-200/80 focus:border-[#000000] bg-white/70 hover:bg-white"
            />
          </AdminField>
          <ImageUpload
            label="OpenGraph Social Share Thumbnail URL"
            value={seo.ogImage || ""}
            onChange={(val) => onUpdate("seo", { ogImage: val })}
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
    <div className="bg-gradient-to-tr from-white to-[#F1F5F9] rounded-[2rem] border border-[#000000]/15 p-6 space-y-6 shadow-[0_15px_40px_rgba(115,92,0,0.02)] relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-[#000000]/30 to-transparent" />
      <SectionHeader
        icon="campaign"
        title="Header Promotion Promos"
        description="Configure and display sliding text banners highlighting seasonal offers"
      />
      <div className="space-y-4">
        {banners?.map((b, idx) => (
          <div
            key={b.id}
            className={`p-4 rounded-2xl border flex items-center justify-between gap-3.5 transition-all duration-300 shadow-2xs hover:shadow-xs ${
              b.isActive 
                ? "bg-white border-[#000000]" 
                : "bg-white/80 border-stone-200/80 opacity-70 hover:opacity-100"
            }`}
          >
            <div className="flex items-center gap-3 flex-1">
              <div className="w-7 h-7 rounded-lg bg-[#F1F5F9] border border-[#000000]/20 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[14px] text-[#000000] font-semibold">{b.icon || "notifications"}</span>
              </div>
              <AdminInput
                value={b.text}
                onChange={(e) => {
                  const copy = [...banners];
                  copy[idx] = { ...copy[idx], text: e.target.value };
                  onUpdate("banners", copy);
                }}
                className="!py-1.5 !text-[11.5px] bg-transparent flex-1 border-none focus:bg-transparent shadow-none"
              />
            </div>
            <AdminToggle
              checked={b.isActive}
              onChange={() => {
                const copy = banners.map(item => item.id === b.id ? { ...item, isActive: !item.isActive } : { ...item, isActive: false });
                onUpdate("banners", copy);
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
      <div className="bg-gradient-to-tr from-white to-[#F1F5F9] rounded-[2rem] border border-[#000000]/15 p-6 space-y-5 shadow-[0_15px_40px_rgba(115,92,0,0.02)] relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-[#000000]/30 to-transparent" />
        <SectionHeader
          icon="menu"
          title="Navbar Logo Builder"
          description="Adjust boutique storefront name and sub-line credentials"
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <AdminField label="Navbar Brand Name">
            <AdminInput
              value={nav.logo?.text || ""}
              onChange={(e) => onUpdate("navigation", { logo: { ...nav.logo, text: e.target.value } })}
              className="!py-2.5 !text-[12px] border-stone-200/80 focus:border-[#000000] bg-white/70 hover:bg-white"
            />
          </AdminField>
          <AdminField label="Subtext Tagline">
            <AdminInput
              value={nav.logo?.tagline || ""}
              onChange={(e) => onUpdate("navigation", { logo: { ...nav.logo, tagline: e.target.value } })}
              className="!py-2.5 !text-[12px] border-stone-200/80 focus:border-[#000000] bg-white/70 hover:bg-white"
            />
          </AdminField>
        </div>
      </div>

      <div className="bg-gradient-to-tr from-white to-[#F1F5F9] rounded-[2rem] border border-[#000000]/15 p-6 space-y-5 shadow-[0_15px_40px_rgba(115,92,0,0.02)] relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-[#000000]/30 to-transparent" />
        <SectionHeader
          icon="bottom_navigation"
          title="Footer Credentials"
          description="Manage general description summary blocks rendered inside the page base layout"
        />
        <AdminField label="Footer Brand Biography">
          <AdminTextarea
            value={footer.description || ""}
            onChange={(e) => onUpdate("footer", { description: e.target.value })}
            rows={3}
            className="!py-2.5 !text-[12px] border-stone-200/80 focus:border-[#000000] bg-white/70 hover:bg-white"
          />
        </AdminField>
      </div>
    </div>
  );
}

// 14. VERSION ROLLBACK
function PublisherVersionsEditor() {
  const versions = [
    { id: 4, tag: "v2.4", desc: "Pre-Diwali Launch Curation - by Sirisha", time: "May 17, 2026 19:30" },
    { id: 3, tag: "v2.3", desc: "Summer Wedding Collections - by Balaji", time: "May 10, 2026 14:15" }
  ];

  return (
    <div className="bg-gradient-to-tr from-white to-[#F1F5F9] rounded-[2rem] border border-[#000000]/15 p-6 space-y-5 shadow-[0_15px_40px_rgba(115,92,0,0.02)] relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-[#000000]/30 to-transparent" />
      <SectionHeader
        icon="history"
        title="Version Rollback Vault"
        description="Quickly restore previously published storefront layouts and restore visual snapshots"
      />
      <div className="space-y-4">
        {versions.map((v) => (
          <div key={v.id} className="p-4.5 bg-white/80 backdrop-blur-md rounded-2xl border border-[#000000]/15 flex items-center justify-between gap-4.5 shadow-2xs hover:border-[#000000]/35 hover:shadow-xs transition-all duration-300">
            <div className="space-y-1">
              <span className="text-[7.5px] bg-[#000000]/15 text-[#000000] font-extrabold px-2.5 py-0.5 rounded-full font-mono w-fit block shadow-3xs">{v.tag}</span>
              <span className="text-[12px] font-bold text-stone-850 mt-2 block leading-none">{v.desc}</span>
              <span className="text-[8px] text-stone-400 block mt-1">{v.time}</span>
            </div>
            <button
              onClick={() => toast.success(`Rolled back to ${v.tag}!`)}
              className="px-4 py-2 rounded-xl text-[9px] font-extrabold border border-[#000000]/30 hover:border-[#000000] bg-white text-stone-700 hover:text-stone-900 cursor-pointer shadow-2xs transition-all active:scale-95"
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
    { id: 1, name: "temple_style_mandap.png", size: "1.4 MB", url: PLACEHOLDER_IMAGES.collectionWedding },
    { id: 2, name: "luxury_royal_wedding.png", size: "2.1 MB", url: PLACEHOLDER_IMAGES.mandalaHero }
  ];

  return (
    <div className="bg-gradient-to-tr from-white to-[#F1F5F9] rounded-[2rem] border border-[#000000]/15 p-6 space-y-6 shadow-[0_15px_40px_rgba(115,92,0,0.02)] relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-[#000000]/30 to-transparent" />
      <SectionHeader
        icon="image"
        title="Media Lossless Vault"
        description="Audit dynamic image asset file size weights and retrieve clean Cloudinary reference links"
      />
      <div className="grid grid-cols-1 gap-4.5">
        {mediaFiles.map((f) => (
          <div key={f.id} className="p-3 bg-white/80 backdrop-blur-md rounded-2xl border border-[#000000]/15 flex items-center justify-between gap-4 shadow-2xs hover:border-[#000000]/35 hover:shadow-xs transition-all duration-300">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-cover bg-center shrink-0 border border-black/5 shadow-inner" style={{ backgroundImage: `url(${f.url})` }} />
              <div>
                <span className="text-[11.5px] font-extrabold text-stone-850 block truncate max-w-[155px] leading-tight">{f.name}</span>
                <span className="text-[8.5px] text-stone-400 uppercase tracking-widest font-extrabold mt-1 block">optimized png • {f.size}</span>
              </div>
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(window.location.origin + f.url);
                toast.success("Copied Link to Clipboard!");
              }}
              className="p-2.5 rounded-full bg-[#F1F5F9]/60 border border-[#000000]/20 text-[#000000] hover:bg-[#000000]/15 flex items-center justify-center cursor-pointer shadow-2xs active:scale-95 transition-all"
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
    <div className="bg-gradient-to-tr from-white to-[#F1F5F9] rounded-[2rem] border border-[#000000]/15 p-6 space-y-6 shadow-[0_15px_40px_rgba(115,92,0,0.02)] relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-[#000000]/30 to-transparent" />
      <SectionHeader
        icon="inventory_2"
        title="Featured Shelf Flags"
        description="Fast adjustment controls to tag items displaying inside our recommended catalog lists"
      />
      <div className="space-y-3 max-h-[390px] overflow-y-auto pr-1 scrollbar-none">
        {products?.slice(0, 8).map((prd) => (
          <div key={prd.id} className="p-3 bg-white/80 backdrop-blur-md rounded-2xl border border-[#000000]/15 flex items-center justify-between gap-3 shadow-2xs hover:border-[#000000]/35 hover:shadow-xs transition-all duration-300">
            <div className="flex items-center gap-3">
              <img src={prd.image} alt={prd.name} className="w-10 h-10 object-cover rounded-xl border border-black/5 shadow-2xs shrink-0" />
              <div>
                <span className="text-[11.5px] font-bold text-stone-850 block line-clamp-1 leading-tight">{prd.name}</span>
                <span className="text-[8px] text-[#000000] font-extrabold uppercase tracking-widest mt-1 block">{prd.category}</span>
              </div>
            </div>
            <button
              onClick={() => toggleProductFeatured(prd.id)}
              className={`p-2 rounded-full border transition-all cursor-pointer flex items-center justify-center shadow-3xs active:scale-95 ${
                prd.featured 
                  ? "bg-[#000000]/15 border-[#000000]/40 text-[#000000] shadow-[0_2px_8px_rgba(196,168,124,0.2)]" 
                  : "bg-white border-stone-200 text-neutral-300 hover:text-neutral-500"
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
  } = useAdmin();

  const [activeSection, setActiveSection] = useState("hero");
  
  const [expandedCategories, setExpandedCategories] = useState({
    "Storefront Layout": true,
    "Pages": true,
    "SEO & Branding": true,
    "System Tools": false
  });

  const toggleCategory = (cat) => {
    setExpandedCategories(prev => ({ ...prev, [cat]: !prev[cat] }));
  };

  const handleUpdate = (section, data) => {
    updateContent(section, data);
  };

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={stagger}
      className="max-w-[1500px] mx-auto space-y-6 relative font-sans text-neutral-800 text-[12px] leading-normal"
    >
      {/* Sleek Minimal Command Header */}
      <motion.div
        variants={fadeUp}
        className="flex items-center justify-between pb-4.5 border-b border-stone-200/80 gap-4"
      >
        <div>
          <h2 className="text-[22px] font-serif font-extrabold text-neutral-900 tracking-wide">
            Storefront CMS Editor
          </h2>
          <p className="text-[9.5px] text-[#64748B] uppercase tracking-[0.25em] font-extrabold mt-1 block">
            Bespoke Website Layout & Theme Styling Studio
          </p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="hidden sm:flex items-center gap-2 text-[9px] text-emerald-800 font-extrabold uppercase tracking-[0.18em] bg-emerald-50 border border-emerald-200/50 px-4 py-1.5 rounded-full shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_6px_rgba(16,185,129,0.6)]" />
            Live Sync Mode
          </div>

          {/* Quick Auto-Publish Toggle Switch */}
          <div className="flex items-center gap-2 bg-stone-50 border border-stone-200/80 px-3 py-1.5 rounded-full shadow-2xs">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-stone-600">Auto-Publish</span>
            <button
              onClick={toggleAutoPublish}
              className={`w-11 h-6 rounded-full transition-colors duration-250 relative focus:outline-none cursor-pointer min-h-0 p-0 ${
                autoPublish ? "bg-slate-900" : "bg-slate-300"
              }`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform duration-250 shadow-sm ${
                autoPublish ? "translate-x-5" : ""
              }`} />
            </button>
          </div>
          
          {autoPublish ? (
            <div className="flex items-center gap-2 px-5 py-2.5 bg-emerald-950 text-emerald-300 border border-emerald-800/80 rounded-full text-[10px] font-bold uppercase tracking-[0.2em] shadow-2xs">
              <span className="material-symbols-outlined text-[14px] font-bold animate-spin-slow">sync</span>
              <span>Auto-Publishing</span>
            </div>
          ) : (
            <button 
              onClick={publishAllContent} 
              className="flex items-center gap-2 px-5 py-2.5 bg-[#0F172A] text-[#F8F9FB] hover:bg-[#0F172A] rounded-full transition-all duration-300 text-[10px] font-bold uppercase tracking-[0.2em] cursor-pointer shadow-[0_4px_14px_rgba(0,0,0,0.15)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.2)] hover:-translate-y-0.5 active:scale-95 shrink-0 border border-transparent hover:border-[#000000]/40"
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
        <div className="block lg:hidden space-y-3.5 bg-gradient-to-r from-[#F1F5F9] to-[#F8F9FB] rounded-3xl border border-[#000000]/15 p-4 shadow-[0_8px_25px_rgba(115,92,0,0.02)]">
          {/* Main Category Groups */}
          <div 
            className="flex items-center gap-1.5 overflow-x-auto pb-1.5 border-b border-[#000000]/10"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {CMS_SIDEBAR.map((cat) => {
              const isGroupActive = cat.items.some(item => item.id === activeSection);
              return (
                <button
                  key={cat.title}
                  type="button"
                  onClick={() => {
                    // Instantly set active section to the first item under this category group
                    setActiveSection(cat.items[0].id);
                  }}
                  className={`px-3.5 py-1.5 rounded-xl text-[9px] font-extrabold uppercase tracking-[0.12em] transition-all duration-300 shrink-0 cursor-pointer border ${
                    isGroupActive
                      ? "text-[#F8F9FB] bg-[#0F172A] border-[#0F172A] shadow-sm"
                      : "text-[#64748B] bg-[#F8F9FB]/40 border-[#000000]/15 hover:bg-white hover:text-stone-850"
                  }`}
                >
                  {cat.title}
                </button>
              );
            })}
          </div>

          {/* Sub-item Nodes */}
          <div 
            className="flex items-center gap-2 overflow-x-auto py-0.5"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {CMS_SIDEBAR.map((cat) => {
              const isGroupActive = cat.items.some(item => item.id === activeSection);
              if (!isGroupActive) return null;

              return cat.items.map((item) => {
                const isActive = activeSection === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveSection(item.id)}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition-all duration-300 shrink-0 border ${
                      isActive
                        ? "bg-white border-[#000000] text-[#000000] font-extrabold shadow-2xs scale-98"
                        : "bg-white/60 border-stone-200/80 text-[#64748B] hover:bg-white hover:text-stone-850"
                    }`}
                  >
                    <span
                      className={`material-symbols-outlined text-[13px] block transition-colors duration-300 ${
                        isActive ? "text-[#000000]" : "text-[#64748B]/60"
                      }`}
                    >
                      {item.icon}
                    </span>
                    <span className="text-[9.5px] font-extrabold uppercase tracking-wider">
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
          className="hidden lg:block bg-white/80 backdrop-blur-md rounded-[2.5rem] border border-[#000000]/15 p-3.5 lg:sticky lg:top-24 lg:space-y-4.5 shadow-[0_12px_30px_rgba(115,92,0,0.015)]"
        >
          {CMS_SIDEBAR.map((cat) => (
            <div key={cat.title} className="space-y-1.5">
              <button
                onClick={() => toggleCategory(cat.title)}
                className="w-full text-left px-2.5 py-1 text-[8.5px] font-extrabold text-stone-400 hover:text-stone-700 tracking-[0.2em] uppercase flex items-center justify-between border-b border-[#000000]/5 pb-1.5 cursor-pointer transition-all"
              >
                <span>{cat.title}</span>
                <span className="material-symbols-outlined text-[12px] font-bold">
                  {expandedCategories[cat.title] ? "expand_less" : "expand_more"}
                </span>
              </button>

              <AnimatePresence initial={false}>
                {expandedCategories[cat.title] && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
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
                          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left cursor-pointer transition-all duration-300 border ${
                            isActive 
                              ? "bg-[#0F172A] border-[#0F172A] text-[#F8F9FB] font-bold shadow-[0_4px_14px_rgba(0,0,0,0.15)] -translate-y-0.5" 
                              : "text-[#64748B] border-transparent hover:bg-white hover:border-stone-200 hover:text-[#0F172A] hover:shadow-2xs"
                          }`}
                        >
                          <span
                            className={`material-symbols-outlined text-[16px] block transition-colors duration-300 ${
                              isActive ? "text-[#000000] font-semibold" : "text-[#64748B]/70"
                            }`}
                          >
                            {item.icon}
                          </span>
                          <span className="text-[11px] block truncate flex-1 font-bold uppercase tracking-wider">
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
              {activeSection === "hero" && (
                <HeroSectionEditor content={websiteContent} onUpdate={handleUpdate} />
              )}
              {activeSection === "collections" && (
                <FeaturedCollectionsEditor content={websiteContent} onUpdate={handleUpdate} />
              )}
              {activeSection === "story" && (
                <StoryTeaserEditor content={websiteContent} onUpdate={handleUpdate} />
              )}
              {activeSection === "bestsellers" && (
                <BestsellerStripEditor content={websiteContent} onUpdate={handleUpdate} />
              )}
              {activeSection === "testimonials" && (
                <TestimonialsEditor content={websiteContent} onUpdate={handleUpdate} />
              )}
              {activeSection === "homepageSections" && (
                <SectionOrderEditor
                  sections={websiteContent.homepageSections}
                  onToggle={toggleHomepageSection}
                  onReorder={reorderHomepageSections}
                />
              )}
              {activeSection === "gallery" && (
                <GalleryPortfolioEditor content={websiteContent} onUpdate={handleUpdate} />
              )}
              {activeSection === "about" && (
                <AboutPageDetailsEditor content={websiteContent.aboutPage} onUpdate={handleUpdate} />
              )}
              {activeSection === "events-page" && (
                <EventsPageDetailsEditor content={websiteContent.eventsPage} onUpdate={handleUpdate} />
              )}
              {activeSection === "contact" && (
                <ContactInfoEditor contact={websiteContent.contact} onUpdate={handleUpdate} />
              )}
              {activeSection === "custom-orders" && (
                <CustomOrdersCMSEditor content={websiteContent} onUpdate={handleUpdate} />
              )}
              {activeSection === "seo-center" && (
                <SEOCenterEditor content={websiteContent} onUpdate={handleUpdate} />
              )}

              {activeSection === "announcement-bar" && (
                <AnnouncementBarEditor banners={websiteContent.banners} onUpdate={handleUpdate} />
              )}
              {activeSection === "navigation" && (
                <NavigationFooterEditor nav={websiteContent.navigation} footer={websiteContent.footer} onUpdate={handleUpdate} />
              )}
              {activeSection === "publish-controls" && (
                <PublisherVersionsEditor />
              )}
              {activeSection === "media-library" && (
                <MediaLibraryEditor />
              )}
              {activeSection === "catalog" && (
                <QuickCatalogControl />
              )}
            </motion.div>
          </AnimatePresence>
        </motion.div>

      </div>

      <PublishBar
        hasChanges={hasUnsavedContent && !autoPublish}
        onPublish={publishAllContent}
        onReset={() => {}}
      />
    </motion.div>
  );
}

export default AdminContent;
