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
  const { homepageSections, seo, contact, loading } = useWebsiteContent();

  const homeSchema = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: "Siri Arts & Crafts",
    image: "https://siriartsandcrafts.com/og-brand-card.jpg",
    description:
      "Premium handcrafted event decor, wedding trays, and heritage pooja essentials.",
    "@id": "https://siriartsandcrafts.com",
    url: "https://siriartsandcrafts.com",
    telephone: contact?.phone ? `+91-${contact.phone}` : "+91-9866006648",
    address: {
      "@type": "PostalAddress",
      streetAddress: contact?.address || "#28-1-92, South Street, ONGOLE-523001, Prakasam District, Andhra Pradesh",
      addressLocality: "Ongole",
      addressRegion: "AP",
      postalCode: "523001",
      addressCountry: "IN",
    },
    sameAs: [
      "https://instagram.com/siriarts",
      "https://pinterest.com/siriarts",
    ],
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
