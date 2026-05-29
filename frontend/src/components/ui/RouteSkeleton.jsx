import React from "react";
import { PageLoader } from "./PageLoader";
import { 
  Skeleton, 
  ProductCardSkeleton,
  ProductDetailSkeleton,
  HomeSkeleton,
  CartSkeleton, 
  CheckoutStepSkeleton, 
  DashboardSkeleton, 
  GallerySkeleton, 
  WishlistPageSkeleton, 
  EventDetailSkeleton, 
  ContactSkeleton,
  AboutSkeleton,
  BlogListingSkeleton,
  BlogPostSkeleton,
  CustomOrdersSkeleton,
  EventCollectionsSkeleton,
  EventShowcasesSkeleton,
  LocationLandingSkeleton,
  OrderSuccessSkeleton,
  OrderTrackingSkeleton,
  PolicySkeleton,
  AuthSkeleton
} from "./Skeleton";

export function getRouteSkeletonVariant(path) {
  if (path === "/") return "home";
  if (path.startsWith("/product/")) return "detail";
  if (path.startsWith("/collections") || path.startsWith("/search")) return "product-list";
  if (path === "/cart") return "cart";
  if (path === "/checkout") return "checkout";
  if (path.startsWith("/dashboard")) return "dashboard";
  if (path.startsWith("/gallery")) return "gallery";
  if (path === "/wishlist") return "wishlist";
  if (path === "/events/collections") return "event-collections";
  if (path.startsWith("/events")) return "event-showcases";
  if (path === "/contact") return "contact";
  if (path === "/about") return "about";
  if (path === "/custom-orders") return "custom-orders";
  if (path === "/blog") return "blog";
  if (path.startsWith("/blog/")) return "blog-post";
  if (path.startsWith("/auth")) return "auth";
  if (path.startsWith("/track/")) return "order-tracking";
  if (path === "/order-success") return "order-success";
  if (["/shipping", "/returns", "/privacy", "/terms"].includes(path)) return "policy";
  if (path.match(/^\/(wedding-decorations|event-decorators)-[a-z]+$/)) return "location";
  if (path.startsWith("/admin")) return "admin";
  
  return "page";
}

/** Lightweight route transition skeleton — avoids blank screens during lazy route loads. */
export function RouteSkeleton({ variant = "page" }) {
  if (variant === "product-list") {
    return (
      <div className="max-w-[1440px] mx-auto px-4 md:px-[clamp(22px,4.5vw,72px)] py-8 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6" aria-busy="true" aria-label="Loading collection">
        {Array.from({ length: 8 }).map((_, i) => (
          <ProductCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (variant === "detail") return <ProductDetailSkeleton />;
  if (variant === "home") return <HomeSkeleton />;
  
  if (variant === "cart") return <CartSkeleton />;
  if (variant === "checkout") return <div className="max-w-3xl mx-auto pt-8 px-4"><CheckoutStepSkeleton /></div>;
  if (variant === "dashboard") return <DashboardSkeleton />;
  if (variant === "gallery") return <GallerySkeleton />;
  if (variant === "wishlist") return <WishlistPageSkeleton />;
  if (variant === "event") return <EventDetailSkeleton />;
  if (variant === "contact") return <ContactSkeleton />;
  
  // Newly Added Skeletons
  if (variant === "about") return <AboutSkeleton />;
  if (variant === "blog") return <BlogListingSkeleton />;
  if (variant === "blog-post") return <BlogPostSkeleton />;
  if (variant === "custom-orders") return <CustomOrdersSkeleton />;
  if (variant === "event-collections") return <EventCollectionsSkeleton />;
  if (variant === "event-showcases") return <EventShowcasesSkeleton />;
  if (variant === "location") return <LocationLandingSkeleton />;
  if (variant === "order-success") return <OrderSuccessSkeleton />;
  if (variant === "order-tracking") return <OrderTrackingSkeleton />;
  if (variant === "policy") return <PolicySkeleton />;
  if (variant === "auth") return <AuthSkeleton />;
  if (variant === "admin") return <div className="py-20 flex justify-center"><div className="w-10 h-10 border-4 border-black/10 border-t-black rounded-full animate-spin" /></div>;

  return (
    <>
      <PageLoader />
      <div className="min-h-[50vh] flex flex-col items-center justify-center gap-6 px-4" aria-busy="true" aria-label="Loading page">
        <div className="w-full max-w-3xl space-y-4">
          <Skeleton className="h-8 w-2/3 mx-auto" />
          <Skeleton className="h-4 w-1/2 mx-auto" />
          <Skeleton className="h-48 w-full rounded-[28px]" />
        </div>
      </div>
    </>
  );
}
