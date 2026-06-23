import { useRef, useState, useEffect } from 'react';
import { useScroll, useTransform } from 'framer-motion';
import { SEO } from '../../components/seo/SEO';
import { galleryService, cmsService } from '../../services/domainServices';
import { useWebsiteContent } from '../../hooks/useWebsiteContent';
import logger from '../../utils/core/logger';

// Extracted Components
import { AboutHero } from './AboutHero';
import { AboutStory } from './AboutStory';
import { AboutSpecializations } from './AboutSpecializations';
import { AboutFeatures } from './AboutFeatures';
import { AboutTestimonial } from './AboutTestimonial';
import { AboutFounders } from './AboutFounders';
import { AboutGallery } from './AboutGallery';

export function About() {
  const { navigation } = useWebsiteContent();
  const logoText = navigation?.logo?.text || 'SIRI ARTS & CRAFTS';
  const logoWords = logoText.split(' ');
  const firstWord = logoWords[0] || 'SIRI';
  const restWords = logoWords.slice(1).join(' ') || 'ARTS & CRAFTS';

  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  });
  const heroY = useTransform(scrollYProgress, [0, 0.2], [0, 150]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.15], [1, 0]);

  const [cmsContent, setCmsContent] = useState(null);
  const [galleryPreview, setGalleryPreview] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      // Fetch CMS data with individual catch block
      try {
        const cmsRes = await cmsService.getSection('aboutPage');
        if (cmsRes?.success && cmsRes?.data) {
          setCmsContent(cmsRes.data.data || cmsRes.data);
        }
      } catch (err) {
        logger.error('About page CMS content fetch failed:', err);
      }

      // Fetch Gallery data with individual catch block
      try {
        const galleryRes = await galleryService.getAll({ limit: 8 });
        if (galleryRes?.success) {
          setGalleryPreview(
            galleryRes.data?.items || galleryRes.data?.data || galleryRes.data || [],
          );
        }
      } catch (err) {
        logger.error('About page gallery fetch failed:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  // Premium Data Content from CMS
  const specializations = cmsContent?.specializations || [];
  const features = cmsContent?.features || [];
  const founders = cmsContent?.founders || [];

  return (
    <div ref={containerRef} className="bg-surface relative overflow-hidden text-on-surface">
      <SEO
        title={`Our Story | ${logoText}`}
        description={`Discover the cinematic luxury of ${logoText}. Handcrafted Telugu cultural decor.`}
      />

      <AboutHero
        heroY={heroY}
        heroOpacity={heroOpacity}
        cmsContent={cmsContent}
        firstWord={firstWord}
        restWords={restWords}
      />

      <AboutStory cmsContent={cmsContent} />

      <AboutSpecializations specializations={specializations} />

      <AboutFeatures features={features} />

      <AboutTestimonial cmsContent={cmsContent} />

      <AboutFounders founders={founders} />

      <AboutGallery galleryPreview={galleryPreview} />
    </div>
  );
}
