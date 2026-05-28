import React from "react";
import { StackedSectionWrapper } from "../components/layout/StackedSectionWrapper";
import { DynamicSectionRenderer } from "../components/layout/DynamicSectionRenderer";
import { useRecommendationTracker } from "../hooks/useRecommendationTracker";

import { SEO } from "../components/seo/SEO";
import { FAQAccordion } from "../components/seo/FAQAccordion";
import fallbackFaqsData from "../content/faqs.json";

import { useWebsiteContent } from "../hooks/useWebsiteContent";
import { SITE_URL, OG_IMAGE_URL, buildSameAsLinks } from "../constants/brandEnv";
import {
  HeroSkeleton,
  NavigationHubSkeleton,
  BestsellerSkeleton,
  StorySkeleton,
  GallerySkeleton,
} from "../components/ui";



export function Home() {
  // Track page view
  useRecommendationTracker({ targetType: 'page', targetId: 'home', source: 'homepage' });

  const { homepageSections, seo, contact, footer, faqs, loading } = useWebsiteContent();
  const faqsData = faqs || fallbackFaqsData;
  const siteUrl = SITE_URL || (typeof window !== "undefined" ? window.location.origin : "");
  const sameAs = buildSameAsLinks(footer?.socialLinks);

  const homeSchema = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: seo?.siteName || import.meta.env.VITE_SITE_NAME || "Siri Arts & Crafts",
    image: OG_IMAGE_URL || (siteUrl ? `${siteUrl}/og-brand-card.jpg` : undefined),
    description:
      "Premium handcrafted event decor, wedding trays, and heritage pooja essentials.",
    "@id": siteUrl,
    url: siteUrl,
    telephone: contact?.phone ? `+91-${String(contact.phone).replace(/^\+91-?/, "")}` : import.meta.env.VITE_CONTACT_PHONE,
    address: {
      "@type": "PostalAddress",
      streetAddress: contact?.address || "",
      addressLocality: "Ongole",
      addressRegion: "AP",
      postalCode: "523001",
      addressCountry: "IN",
    },
    ...(sameAs.length > 0 && { sameAs }),
  };

  if (loading) {
    return (
      <>
        <SEO
          title={
            seo?.pages?.home?.title || "Home of Artisanal Heritage & Luxury Decor"
          }
          description={
            seo?.pages?.home?.description ||
            "Discover masterfully crafted luxury event decor pieces that honor ancient Indian traditions with contemporary luxury sensibilities. Bespoke Mandaps, Artisanal Art, and Heritage Decor."
          }
          schema={homeSchema}
          faq={faqsData.homepage}
        />
        <HeroSkeleton />
        <NavigationHubSkeleton />
        <BestsellerSkeleton />
        <StorySkeleton />
        <GallerySkeleton />
      </>
    );
  }

  const visibleSections = homepageSections?.filter((section) => section.isVisible) || [];

  return (
    <>
      <SEO
        title={
          seo?.pages?.home?.title || "Home of Artisanal Heritage & Luxury Decor"
        }
        description={
          seo?.pages?.home?.description ||
          "Discover masterfully crafted luxury event decor pieces that honor ancient Indian traditions with contemporary luxury sensibilities. Bespoke Mandaps, Artisanal Art, and Heritage Decor."
        }
        schema={homeSchema}
        faq={faqsData.homepage}
      />
      <DynamicSectionRenderer pagePath="/" />

      <div className="bg-surface relative z-10 w-full pt-12 pb-24 rounded-b-[40px] shadow-[0_10px_30px_rgba(0,0,0,0.05)] border-x border-b border-outline-variant/10 max-w-[1920px] mx-auto">
        <FAQAccordion faqs={faqsData.homepage} title="Frequently Asked Questions" />
      </div>
    </>
  );
}
