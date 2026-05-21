import React from "react";
import { HeroSection } from "../components/sections/HeroSection";
import { NavigationHub } from "../components/sections/NavigationHub";
import { StackedSectionWrapper } from "../components/layout/StackedSectionWrapper";

import { BestsellerSection } from "../components/sections/BestsellerSection";
import { StorySection } from "../components/sections/StorySection";
import { VerifiedReviews } from "../components/sections/VerifiedReviews";
import { GallerySection } from "../components/sections/GallerySection";

import { SEO } from "../components/seo/SEO";

import { useWebsiteContent } from "../hooks/useWebsiteContent";
import { SITE_URL, OG_IMAGE_URL, buildSameAsLinks } from "../constants/brandEnv";
import {
  HeroSkeleton,
  NavigationHubSkeleton,
  BestsellerSkeleton,
  StorySkeleton,
  GallerySkeleton,
  ReviewsSkeleton,
} from "../components/ui";

const sectionComponents = {
  hero: HeroSection,
  featuredCollections: NavigationHub,
  featuredProducts: BestsellerSection,
  storyTeaser: StorySection,
  galleryPreview: GallerySection,
  testimonials: VerifiedReviews,
};

export function Home() {
  const { homepageSections, seo, contact, footer, loading } = useWebsiteContent();
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
        />
        <HeroSkeleton />
        <NavigationHubSkeleton />
        <BestsellerSkeleton />
        <StorySkeleton />
        <GallerySkeleton />
        <ReviewsSkeleton />
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
      />
      {visibleSections.map((section, index) => {
        const Component = sectionComponents[section.id];
        if (!Component) return null;

        const isEager = ["hero", "featuredCollections"].includes(section.id);
        const isLast = index === visibleSections.length - 1;

        if (isEager) {
          return (
            <StackedSectionWrapper key={section.id} index={index} isLast={isLast}>
              <Component />
            </StackedSectionWrapper>
          );
        }

        return (
          <StackedSectionWrapper key={section.id} index={index} isLast={isLast}>
            <Component />
          </StackedSectionWrapper>
        );
      })}
    </>
  );
}
