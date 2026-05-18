import React, { lazy } from "react";
import { HeroSection } from "../components/sections/HeroSection";
import { NavigationHub } from "../components/sections/NavigationHub";
import { LazySection } from "../components/ui";

// Lazy load below-the-fold landing page components for major performance boosts
const BestsellerSection = lazy(() => import("../components/sections/BestsellerSection").then((m) => ({ default: m.BestsellerSection })));
const StorySection = lazy(() => import("../components/sections/StorySection").then((m) => ({ default: m.StorySection })));
const VerifiedReviews = lazy(() => import("../components/sections/VerifiedReviews").then((m) => ({ default: m.VerifiedReviews })));
const GallerySection = lazy(() => import("../components/sections/GallerySection").then((m) => ({ default: m.GallerySection })));

import { SEO } from "../components/seo/SEO";

import { useWebsiteContent } from "../hooks/useWebsiteContent";

const sectionComponents = {
  hero: HeroSection,
  featuredCollections: NavigationHub,
  featuredProducts: BestsellerSection,
  storyTeaser: StorySection,
  galleryPreview: GallerySection,
  testimonials: VerifiedReviews,
};

export function Home() {
  const { homepageSections, seo, contact } = useWebsiteContent();

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
      streetAddress: contact?.address || "#28-1-92, Beside Kailash PavBhaji Center, South Street, ONGOLE-523001, Prakasam District, Andhra Pradesh",
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
      {homepageSections
        ?.filter((section) => section.isVisible)
        .map((section) => {
          const Component = sectionComponents[section.id];
          if (!Component) return null;

          const isEager = ["hero", "featuredCollections"].includes(section.id);
          if (isEager) {
            return <Component key={section.id} />;
          }

          // Use the IntersectionObserver progressive renderer for below-the-fold sections
          return (
            <LazySection key={section.id} placeholderHeight="450px">
              <Component />
            </LazySection>
          );
        })}
    </>
  );
}
