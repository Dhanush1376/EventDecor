import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { SEO } from '../components/seo/SEO';
import { MandalaArtDecor } from '../components/ui/MandalaArtDecor';
import { GalleryDetailSkeleton } from '../components/ui/Skeleton';
import { useGalleryViewer } from '../hooks/gallery/useGalleryViewer';

import { GalleryMobileLayout } from './GalleryDetail/components/GalleryMobileLayout';
import { GalleryDesktopLayout } from './GalleryDetail/components/GalleryDesktopLayout';
import { GalleryDiscoveryFeed } from './GalleryDetail/components/GalleryDiscoveryFeed';

export function GalleryDetail() {
  const { id } = useParams();

  const {
    item,
    linkedProducts,
    moreLikeThis,
    loading,
    error,
    pageUrl,
    isScrollingDown,
    imageHovered,
    setImageHovered,
    handleShopLook,
    handleWishlistLook,
    isLiked,
    formattedDate,
    navigate,
  } = useGalleryViewer(id);

  if (loading) return <GalleryDetailSkeleton />;

  if (!item) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fcfbf9]">
        <div className="text-center">
          <h2 className="font-display text-2xl mb-4">Discovery not found</h2>
          <Link
            to="/gallery"
            className="text-primary underline font-label uppercase tracking-widest text-xs font-bold"
          >
            Back to Gallery
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#fcfbf9] min-h-screen selection:bg-primary/20 relative pt-[56px] md:pt-20 pb-32 md:pb-20 overflow-hidden">
      <SEO title={item.title} description={item.description} />

      {/* Background Mandala Art */}
      <MandalaArtDecor
        variant={2}
        size={500}
        className="-top-24 -right-24 hidden lg:block absolute"
        opacity={0.06}
        spinDuration={300}
      />

      {/* Breadcrumbs — Desktop */}
      <nav
        className="hidden md:flex items-center gap-2 font-label text-[11px] uppercase tracking-[0.25em] mb-8 text-black/30 max-w-[1340px] mx-auto px-6 lg:px-10"
        aria-label="Breadcrumb"
      >
        <Link to="/" className="hover:text-primary transition-colors">
          Home
        </Link>
        <span className="opacity-30">/</span>
        <Link to="/gallery" className="hover:text-primary transition-colors">
          Gallery
        </Link>
        <span className="opacity-30">/</span>
        <span className="text-black font-bold truncate max-w-[200px]">{item.title}</span>
      </nav>

      {/* ═══════ Main Content ═══════ */}
      <main className="max-w-[1340px] mx-auto md:px-6 lg:px-10">
        <GalleryMobileLayout
          item={item}
          pageUrl={pageUrl}
          isLiked={isLiked}
          isScrollingDown={isScrollingDown}
          handleShopLook={handleShopLook}
          handleWishlistLook={handleWishlistLook}
          navigate={navigate}
        />

        <GalleryDesktopLayout
          item={item}
          pageUrl={pageUrl}
          linkedProducts={linkedProducts}
          isLiked={isLiked}
          formattedDate={formattedDate}
          imageHovered={imageHovered}
          setImageHovered={setImageHovered}
          handleShopLook={handleShopLook}
          handleWishlistLook={handleWishlistLook}
          navigate={navigate}
        />

        <GalleryDiscoveryFeed moreLikeThis={moreLikeThis} />
      </main>

      {/* Subtle marble texture overlay */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.02] mix-blend-overlay z-[400] bg-marble" />
    </div>
  );
}
