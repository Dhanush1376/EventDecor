import React from 'react';
import { Skeleton } from '../SkeletonBase';

export function AuthSkeleton() {
  return (
    <div className="min-h-screen bg-black flex overflow-hidden">
      <div className="hidden lg:block lg:w-1/2 relative bg-surface-container-highest">
        <div className="p-20 w-full min-h-screen flex flex-col justify-between">
          <Skeleton className="h-8 w-40" />
          <div className="space-y-6">
            <Skeleton className="h-16 w-3/4" />
            <Skeleton className="h-16 w-1/2" />
            <Skeleton className="h-4 w-2/3 mt-4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </div>
      </div>
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 md:p-12 bg-surface">
        <div className="w-full max-w-[440px] space-y-10">
          <div className="space-y-3">
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-12 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
          </div>
          <div className="bg-white rounded-[32px] p-5 xs:p-8 md:p-10 border border-outline-variant/30 space-y-6">
            <Skeleton className="h-16 w-full rounded-2xl" />
            <Skeleton className="h-14 w-full rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
