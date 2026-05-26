import React, { useEffect, useState, Suspense } from 'react';
import api from '../../services/api';
import logger from '../../utils/logger';

// Lazy load section components
const HeroSection = React.lazy(() => import('../sections/HeroSection').then(m => ({ default: m.HeroSection })));
const TrendingSection = React.lazy(() => import('../sections/TrendingSection').then(m => ({ default: m.TrendingSection })));
const SeasonalHighlights = React.lazy(() => import('../sections/SeasonalHighlights').then(m => ({ default: m.SeasonalHighlights })));
const PersonalizedFeed = React.lazy(() => import('../sections/PersonalizedFeed').then(m => ({ default: m.PersonalizedFeed })));
const VerifiedReviews = React.lazy(() => import('../sections/VerifiedReviews').then(m => ({ default: m.VerifiedReviews })));
const StorySection = React.lazy(() => import('../sections/StorySection').then(m => ({ default: m.StorySection })));
const GallerySection = React.lazy(() => import('../sections/GallerySection').then(m => ({ default: m.GallerySection })));
const NavigationHub = React.lazy(() => import('../sections/NavigationHub').then(m => ({ default: m.NavigationHub })));
const BestsellerSection = React.lazy(() => import('../sections/BestsellerSection').then(m => ({ default: m.BestsellerSection })));

const componentRegistry = {
  HeroSection,
  TrendingSection,
  SeasonalHighlights,
  PersonalizedFeed,
  VerifiedReviews,
  StorySection,
  GallerySection,
  NavigationHub,
  BestsellerSection,
};

export const DynamicSectionRenderer = ({ pagePath }) => {
  const [layout, setLayout] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLayout = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/layouts/path?path=${encodeURIComponent(pagePath)}`);
        if (res.data?.success) {
          setLayout(res.data.data);
        }
      } catch (err) {
        logger.error(`Failed to fetch dynamic layout for ${pagePath}`, err);
      } finally {
        setLoading(false);
      }
    };

    fetchLayout();
  }, [pagePath]);

  if (loading) {
    return <div className="animate-pulse bg-surface-container w-full h-[60vh]" />;
  }

  // Fallback if no layout is found (for development until DB is seeded)
  if (!layout || !layout.sections || layout.sections.length === 0) {
    logger.warn(`No dynamic layout found for ${pagePath}, falling back to static render if applicable.`);
    if (pagePath === '/') {
      return (
        <Suspense fallback={<div className="animate-pulse bg-surface-container w-full h-32" />}>
          <HeroSection />
          <NavigationHub />
          <PersonalizedFeed />
          <TrendingSection />
          <SeasonalHighlights />
          <StorySection />
          <GallerySection />
          <VerifiedReviews />
        </Suspense>
      );
    }
    return null;
  }

  return (
    <>
      <Suspense fallback={<div className="animate-pulse bg-surface-container w-full h-32" />}>
        {layout.sections.map((section, index) => {
          const Component = componentRegistry[section.componentName];
          if (!Component) {
            logger.warn(`Component ${section.componentName} is not registered in DynamicSectionRenderer.`);
            return null;
          }
          return <Component key={`${section.componentName}-${index}`} {...section.props} />;
        })}
      </Suspense>
    </>
  );
};

export default DynamicSectionRenderer;
