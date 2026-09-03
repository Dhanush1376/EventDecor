import React from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { SEO } from '../components/seo/SEO';
import { MandalaArtDecor } from '../components/ui/MandalaArtDecor';
import { GalleryDetailSkeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/FeedbackStates';
import { useGalleryViewer } from '../hooks/gallery/useGalleryViewer';
import { useConfig } from '../context/ConfigContext';

import { GalleryMobileLayout } from './GalleryDetail/components/GalleryMobileLayout';
import { GalleryDesktopLayout } from './GalleryDetail/components/GalleryDesktopLayout';
import { GalleryDiscoveryFeed } from './GalleryDetail/components/GalleryDiscoveryFeed';

export function GalleryDetail() {
  const { id } = useParams();
  const { storeSettings } = useConfig();

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

  const hideProducts = storeSettings?.storefront?.hideProductsFromGallery;
  const finalLinkedProducts = hideProducts ? [] : linkedProducts;

  if (storeSettings?.storefront?.hideGallerySection) {
    return <Navigate to="/" replace />;
  }

  if (loading) return <GalleryDetailSkeleton />;

  if (!item) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fcfbf9]">
        <EmptyState
          title="Discovery not found"
          description="The moment you're looking for couldn't be found."
          icon="photo_library"
          actionLabel="Back to Gallery"
          onAction={() => (window.location.href = '/gallery')}
        />
      </div>
    );
  }

  return (
    <div className="bg-[#fcfbf9] min-h-screen selection:bg-primary/20 relative pt-[56px] lg:pt-[60px] pb-32 lg:pb-20 overflow-hidden">
      <SEO title={item.title} description={item.description} />

      {/* Background Mandala Art */}
      <MandalaArtDecor
        variant={2}
        size={500}
        className="-top-24 -right-24 hidden lg:block absolute"
        opacity={0.06}
        spinDuration={300}
      />

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
          hideProducts={hideProducts}
        />

        <GalleryDesktopLayout
          item={item}
          pageUrl={pageUrl}
          linkedProducts={finalLinkedProducts}
          isLiked={isLiked}
          formattedDate={formattedDate}
          imageHovered={imageHovered}
          setImageHovered={setImageHovered}
          handleShopLook={handleShopLook}
          handleWishlistLook={handleWishlistLook}
          navigate={navigate}
          hideProducts={hideProducts}
        />

        <GalleryDiscoveryFeed moreLikeThis={moreLikeThis} />
      </main>

      {/* Subtle marble texture overlay */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.02] mix-blend-overlay z-[400] bg-marble" />
    </div>
  );
}
