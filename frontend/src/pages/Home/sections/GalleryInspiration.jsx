import { Link } from 'react-router-dom';
import { m as motion } from 'framer-motion';
import { CloudinaryImage } from '../../../components/ui/CloudinaryImage';
import { SectionHeader } from '../../../components/shared/SectionHeader';
import { MandalaArtDecor } from '../../../components/ui/MandalaArtDecor';
import { HomeSectionState } from '../../../components/homepage/HomeSectionState';
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useWebsiteContent } from '../../../hooks/useWebsiteContent';
import { galleryService } from '../../../services/domainServices';

/**
 * Fashion Inspiration section using real gallery data and Admin-managed copy.
 */
export function GalleryInspiration({ previewContent }) {
  const cms = useWebsiteContent({ includeDefaults: false });
  const activeCms = previewContent || cms;
  const galleryPreview = useMemo(() => activeCms?.galleryInspiration || {}, [activeCms]);
  const cmsLoading = !previewContent && cms.loading;

  const {
    data: rawGalleryItems = [],
    isLoading: galleryLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['homepageGalleryPreview'],
    queryFn: async () => {
      const res = await galleryService.getAll({ limit: 12 });
      if (!res.success) throw new Error('Failed to load gallery');
      return res.data.data || [];
    },
    staleTime: 5 * 60 * 1000,
    enabled: galleryPreview?.isVisible !== false,
  });

  const galleryItems = useMemo(() => {
    if (!rawGalleryItems.length) return [];
    let items = rawGalleryItems;
    if (galleryPreview?.galleryIds && galleryPreview.galleryIds.length > 0) {
      const filtered = rawGalleryItems.filter((item) =>
        galleryPreview.galleryIds.includes(item._id),
      );
      if (filtered.length > 0) {
        items = filtered;
      }
    }
    // Limit to exactly 5 cards as requested
    return items.slice(0, 5);
  }, [rawGalleryItems, galleryPreview]);

  if (galleryPreview?.isVisible === false) return null;
  if (!galleryLoading && !cmsLoading && !isError && galleryItems.length === 0) return null;
  if (cmsLoading || galleryLoading) {
    return (
      <section className="h1-section relative isolate" id="h1-inspiration">
        <div className="h1-container max-w-max-width mx-auto px-margin-mobile lg:px-margin-desktop relative z-10 animate-pulse">
          <div className="flex flex-col items-center mb-8 lg:mb-10 text-center">
            <div className="h-3 w-24 bg-surface-container-high rounded-full mb-2 mx-auto"></div>
            <div className="h-8 lg:h-10 w-48 lg:w-64 bg-surface-container-high rounded-full mx-auto"></div>
          </div>
          <div className="columns-2 lg:columns-3 lg:columns-5 gap-3 lg:gap-5.5 space-y-3 lg:space-y-5.5">
            {['aspect-[4/5]', 'aspect-square', 'aspect-[3/4]', 'aspect-[4/5]', 'aspect-square'].map(
              (aspect, i) => (
                <div
                  key={i}
                  className={`w-full ${aspect} bg-surface-container-high rounded-[24px]`}
                ></div>
              ),
            )}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="h1-section py-16 relative isolate" id="h1-inspiration">
      {/* Background glow gradient behind mandala */}
      <div className="absolute -bottom-32 -left-32 w-[250px] h-[250px] bg-primary-container/15 rounded-full blur-[70px] pointer-events-none z-[-1]" />
      <MandalaArtDecor
        variant={2}
        size={450}
        className="-bottom-20 -left-20 z-[-1]"
        opacity={0.07}
        spinDuration={160}
      />
      <div className="h1-container max-w-max-width mx-auto px-margin-mobile lg:px-margin-desktop relative z-10">
        <SectionHeader
          title={galleryPreview?.sectionTitle || 'Inspiration Gallery'}
          seeAllLink={galleryPreview?.seeAllLink || '/gallery'}
          className="mb-10"
        />

        {isError && (
          <HomeSectionState
            title="Gallery inspiration could not be loaded"
            message="Retry the gallery request or check the gallery API."
            icon="error"
            onRetry={refetch}
          />
        )}
        {!isError && galleryItems.length > 0 && (
          <div className="columns-2 lg:columns-3 lg:columns-4 gap-3 lg:gap-5.5 space-y-3 lg:space-y-5.5 relative z-10">
            {galleryItems.map((item, idx) => (
              <motion.div
                key={item._id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-50px' }}
                transition={{
                  type: 'spring',
                  stiffness: 75,
                  damping: 16,
                  delay: idx * 0.08,
                }}
                className={`break-inside-avoid relative rounded-[22px] lg:rounded-[28px] overflow-hidden shadow-ambient border border-black/5 group cursor-pointer hover-lift-glow ${
                  !item.height || item.height === 'aspect-square'
                    ? idx % 4 === 0
                      ? 'aspect-[2/3]'
                      : idx % 4 === 1
                        ? 'aspect-square'
                        : idx % 4 === 2
                          ? 'aspect-[4/5]'
                          : 'aspect-[3/4]'
                    : item.height
                }`}
              >
                <Link to={`/gallery/${item._id || item.id}`}>
                  <CloudinaryImage
                    src={item.image}
                    alt={item.title}
                    className="transition-transform duration-[2s] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.1]"
                    containerClassName="w-full h-full"
                    loading="lazy"
                    width={item.imageWidth || 600}
                    height={item.imageHeight || null}
                    sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 20vw"
                  />

                  {/* Hover Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity duration-700 ease-out" />

                  <div className="absolute inset-0 p-3 lg:p-5 flex flex-col justify-end opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity duration-700 delay-100">
                    <div className="flex items-end justify-between w-full gap-2">
                      <span className="font-body text-white text-[10px] lg:text-sm transform translate-y-0 lg:translate-y-3.5 lg:group-hover:translate-y-0 transition-transform duration-700 font-semibold tracking-wide text-left">
                        {item.title}
                      </span>
                      <span className="material-symbols-outlined text-white/90 text-[12px] lg:text-[16px] shrink-0 transform translate-y-0 lg:translate-y-3.5 lg:group-hover:translate-y-0 transition-transform duration-700 delay-75">
                        open_in_new
                      </span>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{
                type: 'spring',
                stiffness: 75,
                damping: 16,
                delay: galleryItems.length * 0.08,
              }}
              className="break-inside-avoid rounded-[22px] lg:rounded-[28px] overflow-hidden shadow-ambient border border-primary/20 bg-primary/5 flex flex-col items-center justify-center p-5 w-full aspect-[4/5] group cursor-pointer hover-lift-glow hover:bg-on-surface-variant hover:border-on-surface-variant transition-all duration-700"
            >
              <Link
                className="flex flex-col items-center w-full h-full justify-center text-primary group-hover:text-white transition-colors duration-700"
                to={galleryPreview?.seeAllLink || '/gallery'}
              >
                <div className="w-12 h-12 rounded-full border border-primary/30 group-hover:border-white/30 flex items-center justify-center mb-4 transition-colors duration-700 aspect-square shrink-0">
                  <span
                    className="material-symbols-outlined text-[20px]"
                    style={{ fontVariationSettings: "'wght' 200" }}
                  >
                    grid_view
                  </span>
                </div>
                <h3 className="font-display text-[16px] lg:text-[18px] mb-2 text-center leading-tight">
                  {galleryPreview?.ctaTitle || 'View All Inspiration'}
                </h3>
                <span className="font-label-sm text-[9px] uppercase tracking-[0.2em] font-bold flex items-center justify-center gap-1.5 whitespace-nowrap mt-1">
                  {galleryPreview?.ctaText || 'Explore More'}
                  <span className="material-symbols-outlined text-[12px] group-hover:translate-x-1 transition-transform">
                    arrow_forward
                  </span>
                </span>
              </Link>
            </motion.div>
          </div>
        )}
      </div>
    </section>
  );
}
