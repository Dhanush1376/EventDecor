import React from "react";
import { Skeleton, ProductCardSkeleton } from "./Skeleton";

/** Lightweight route transition skeleton — avoids blank screens during lazy route loads. */
export function RouteSkeleton({ variant = "page" }) {
  if (variant === "product-list") {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6" aria-busy="true" aria-label="Loading collection">
        {Array.from({ length: 8 }).map((_, i) => (
          <ProductCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (variant === "detail") {
    return (
      <div className="max-w-7xl mx-auto px-4 py-10 grid md:grid-cols-2 gap-10" aria-busy="true" aria-label="Loading details">
        <Skeleton className="aspect-square w-full" />
        <div className="space-y-4">
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="h-10 w-3/4" />
          <Skeleton className="h-6 w-1/2" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-12 w-40 rounded-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center gap-6 px-4" aria-busy="true" aria-label="Loading page">
      <div className="w-full max-w-3xl space-y-4">
        <Skeleton className="h-8 w-2/3 mx-auto" />
        <Skeleton className="h-4 w-1/2 mx-auto" />
        <Skeleton className="h-48 w-full" />
      </div>
    </div>
  );
}
