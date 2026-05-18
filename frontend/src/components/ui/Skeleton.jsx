import React from "react";

export function Skeleton({ className = "", variant = "rect" }) {
  const variants = {
    rect: "rounded-2xl",
    circle: "rounded-full",
    text: "rounded-lg h-4 w-3/4",
  };

  return (
    <div
      className={`bg-surface-container border border-outline-variant/10 ${variants[variant]} ${className} relative overflow-hidden`}
    >
      {/* Exquisite micro-shimmer overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer" />
    </div>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton className="aspect-[4/5] w-full" />
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <Skeleton className="h-3 w-1/4" />
          <Skeleton className="h-3 w-1/6" />
        </div>
        <Skeleton className="h-6 w-3/4" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-1/3" />
          <Skeleton className="h-8 w-1/4" />
        </div>
      </div>
    </div>
  );
}

