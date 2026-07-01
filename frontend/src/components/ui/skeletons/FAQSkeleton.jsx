import React from 'react';
import { Skeleton } from '../SkeletonBase';

export function FAQSkeleton() {
  return (
    <div className="w-full max-w-4xl mx-auto py-12 px-margin-mobile lg:px-margin-desktop space-y-4">
      <div className="flex justify-center mb-8">
        <Skeleton className="h-10 w-64 lg:w-96 rounded-full" />
      </div>
      {[...Array(3)].map((_, i) => (
        <div
          key={i}
          className="bg-surface/60 backdrop-blur-md border border-outline-variant/30 rounded-2xl overflow-hidden p-5 flex items-center justify-between"
        >
          <Skeleton className="h-6 w-3/4 rounded-md" />
          <Skeleton className="h-5 w-5 rounded-full shrink-0" />
        </div>
      ))}
    </div>
  );
}
