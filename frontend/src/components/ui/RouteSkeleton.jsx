import { PageLoader } from './PageLoader';
import { Skeleton } from './SkeletonBase';
import { lazy } from 'react';

export function getRouteSkeletonVariant(path) {
  if (path === '/') return 'home';
  if (path === '/collections') return 'product-list';
  if (path.match(/^\/collections\/[^/]+$/)) return 'collection-detail';
  if (path.startsWith('/product')) return 'product-detail';
  if (path.startsWith('/collections') || path.startsWith('/search')) return 'product-list';
  if (path === '/cart') return 'cart';
  if (path === '/checkout') return 'checkout';
  if (path.startsWith('/dashboard')) return 'dashboard';
  if (path.match(/^\/gallery\/[^/]+$/)) return 'gallery-detail';
  if (path.startsWith('/gallery')) return 'gallery';
  if (path === '/wishlist') return 'wishlist';
  if (path === '/events/collections') return 'event-collections';
  if (path.startsWith('/events')) return 'event-showcases';
  if (path === '/contact') return 'contact';
  if (path === '/about') return 'about';
  if (path === '/custom-orders') return 'custom-orders';
  if (path === '/blog') return 'blog';
  if (path.startsWith('/blog/')) return 'blog-post';
  if (path.startsWith('/track/')) return 'order-tracking';
  if (path === '/order-success') return 'order-success';
  if (['/shipping', '/returns', '/privacy', '/terms'].includes(path)) return 'policy';
  if (path.match(/^\/(wedding-decorations|event-decorators)-[a-z]+$/)) return 'location';
  if (path.startsWith('/admin')) return 'admin';

  return 'page';
}

const LazySkeletons = {
  home: lazy(() => import('./Skeleton').then((m) => ({ default: m.HomeSkeleton }))),
  'product-list': lazy(() =>
    import('./Skeleton').then((m) => ({ default: m.ProductListSkeleton })),
  ),
  'collection-detail': lazy(() =>
    import('./Skeleton').then((m) => ({ default: m.CollectionSkeleton })),
  ),
  'product-detail': lazy(() =>
    import('./Skeleton').then((m) => ({ default: m.ProductDetailSkeleton })),
  ),
  cart: lazy(() => import('./Skeleton').then((m) => ({ default: m.CartSkeleton }))),
  checkout: lazy(() => import('./Skeleton').then((m) => ({ default: m.CheckoutStepSkeleton }))),
  dashboard: lazy(() => import('./Skeleton').then((m) => ({ default: m.DashboardSkeleton }))),
  gallery: lazy(() => import('./Skeleton').then((m) => ({ default: m.GallerySkeleton }))),
  'gallery-detail': lazy(() =>
    import('./Skeleton').then((m) => ({ default: m.GalleryDetailSkeleton })),
  ),
  wishlist: lazy(() => import('./Skeleton').then((m) => ({ default: m.WishlistPageSkeleton }))),
  event: lazy(() => import('./Skeleton').then((m) => ({ default: m.EventDetailSkeleton }))),
  contact: lazy(() => import('./Skeleton').then((m) => ({ default: m.ContactSkeleton }))),
  about: lazy(() => import('./Skeleton').then((m) => ({ default: m.AboutSkeleton }))),
  blog: lazy(() => import('./Skeleton').then((m) => ({ default: m.BlogListingSkeleton }))),
  'blog-post': lazy(() => import('./Skeleton').then((m) => ({ default: m.BlogPostSkeleton }))),
  'custom-orders': lazy(() =>
    import('./Skeleton').then((m) => ({ default: m.CustomOrdersSkeleton })),
  ),
  'event-collections': lazy(() =>
    import('./Skeleton').then((m) => ({ default: m.EventCollectionsSkeleton })),
  ),
  'event-showcases': lazy(() =>
    import('./Skeleton').then((m) => ({ default: m.EventShowcasesSkeleton })),
  ),
  location: lazy(() => import('./Skeleton').then((m) => ({ default: m.LocationLandingSkeleton }))),
  'order-success': lazy(() =>
    import('./Skeleton').then((m) => ({ default: m.OrderSuccessSkeleton })),
  ),
  'order-tracking': lazy(() =>
    import('./Skeleton').then((m) => ({ default: m.OrderTrackingSkeleton })),
  ),
  admin: lazy(() => import('./Skeleton').then((m) => ({ default: m.DashboardSkeleton }))),
};

/** Lightweight route transition skeleton — avoids blank screens during lazy route loads. */
export function RouteSkeleton({ variant = 'page' }) {
  if (variant === 'page' || variant === 'policy') {
    return (
      <>
        <PageLoader />
        <div
          className="min-h-[50vh] flex flex-col items-center justify-center gap-6 px-4"
          aria-busy="true"
          aria-label="Loading page"
        >
          <div className="w-full max-w-3xl space-y-4">
            <Skeleton className="h-8 w-2/3 mx-auto" />
            <Skeleton className="h-4 w-1/2 mx-auto" />
            <Skeleton className="h-48 w-full rounded-[28px]" />
          </div>
        </div>
      </>
    );
  }

  const Component = LazySkeletons[variant];
  if (Component) {
    if (variant === 'checkout') {
      return (
        <div className="max-w-3xl mx-auto pt-8 px-4">
          <Suspense fallback={<PageLoader />}>
            <Component />
          </Suspense>
        </div>
      );
    }
    return (
      <Suspense fallback={<PageLoader />}>
        <Component />
      </Suspense>
    );
  }

  return <PageLoader />;
}
