import React from 'react';
import { Skeleton } from '../SkeletonBase';
import { ProductCardSkeleton } from './ProductSkeletons';
import { AddressBarSkeleton } from './CommonSkeletons';

export function HomeSkeleton() {
  return (
    <div className="h1-page relative bg-surface-bright overflow-hidden">
      {/* Hero Skeleton */}
      <div className="w-full h-[62.5vh] md:h-[80vh] bg-surface-container-high relative animate-pulse overflow-hidden">
        <div className="absolute bottom-[10%] left-[5%] md:bottom-[15%] md:left-[8%] flex flex-col w-[90%] max-w-[800px] z-10">
          <div className="h-3 w-20 md:w-28 bg-surface-container-highest/60 rounded-full mb-2"></div>
          <div className="h-8 md:h-16 w-[80%] bg-surface-container-highest/60 rounded-2xl md:rounded-3xl mb-3"></div>
          <div className="h-4 md:h-5 w-[60%] bg-surface-container-highest/60 rounded-full mb-5"></div>
          <div className="h-5 w-24 md:w-32 bg-surface-container-highest/60 rounded-none mb-2 border-b border-surface-container-highest/80"></div>
        </div>
        <div className="absolute bottom-3 md:bottom-6 left-1/2 -translate-x-1/2 flex gap-1.5 md:gap-2">
          <div className="w-1.5 h-1.5 bg-surface-container-highest/60 rounded-full"></div>
          <div className="w-4 h-1.5 bg-surface-container-highest/80 rounded-[2px]"></div>
          <div className="w-1.5 h-1.5 bg-surface-container-highest/60 rounded-full"></div>
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-surface-bright/80 via-surface-bright/10 to-transparent"></div>
      </div>

      {/* Promo Banner Skeleton */}
      <div className="w-full h-10 md:h-12 bg-surface-container animate-pulse flex items-center justify-center border-y border-surface-container-high">
        <div className="h-3 w-1/2 md:w-1/3 bg-surface-container-highest/50 rounded-full"></div>
      </div>

      {/* Category Grid Skeleton */}
      <div className="max-w-[1400px] mx-auto px-6 mt-16 md:mt-24 animate-pulse">
        <div className="flex flex-col items-center mb-8 md:mb-10">
          <div className="h-3 w-24 bg-surface-container-high rounded-full mb-2"></div>
          <div className="h-8 w-48 md:w-64 bg-surface-container-high rounded-full"></div>
        </div>

        {/* Mobile Grid */}
        <div className="grid grid-cols-2 gap-4 lg:hidden">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="flex flex-col items-center aspect-[4/5] bg-surface-container-high rounded-xl"
            ></div>
          ))}
        </div>

        {/* Desktop Circular Row */}
        <div className="hidden lg:flex justify-center gap-10 mt-8 w-full max-w-[1400px] mx-auto px-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-4 shrink-0">
              <div className="w-40 h-40 rounded-full bg-surface-container-high border-4 border-surface shadow-sm"></div>
              <div className="w-24 h-4 bg-surface-container-high rounded-full"></div>
            </div>
          ))}
        </div>
      </div>

      {/* Trending Products Skeleton */}
      <div className="max-w-[1400px] mx-auto px-6 mt-20 md:mt-32 animate-pulse">
        <div className="flex justify-between items-end mb-8 md:mb-10">
          <div>
            <div className="h-3 w-20 md:w-24 bg-surface-container-high rounded-full mb-2"></div>
            <div className="h-8 md:h-10 w-48 md:w-64 bg-surface-container-high rounded-full"></div>
          </div>
          <div className="h-4 w-20 bg-surface-container-high rounded-full hidden md:block"></div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex flex-col gap-4">
              <div className="w-full aspect-[3/4] bg-surface-container-high rounded-[24px] md:rounded-[32px]"></div>
              <div className="px-1 md:px-2">
                <div className="w-[80%] h-4 bg-surface-container-high rounded-full mb-2"></div>
                <div className="w-[60%] h-3 bg-surface-container-high rounded-full mb-3"></div>
                <div className="w-[40%] h-5 bg-surface-container-high rounded-full"></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Gallery Inspiration Skeleton */}
      <div className="max-w-[1400px] mx-auto px-6 mt-20 md:mt-32 animate-pulse">
        <div className="flex flex-col items-center mb-8 md:mb-10 text-center">
          <div className="h-3 w-24 bg-surface-container-high rounded-full mb-2 mx-auto"></div>
          <div className="h-8 md:h-10 w-48 md:w-64 bg-surface-container-high rounded-full mx-auto"></div>
        </div>
        <div className="columns-2 md:columns-3 lg:columns-5 gap-3 md:gap-5.5 space-y-3 md:space-y-5.5">
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

      {/* Shop By Occasion Skeleton */}
      <div className="max-w-[1400px] mx-auto px-6 mt-20 md:mt-32 mb-24 animate-pulse">
        <div className="flex flex-col items-center text-center mb-8 md:mb-10">
          <div className="h-3 w-24 bg-surface-container-high rounded-full mb-2"></div>
          <div className="h-8 md:h-10 w-56 md:w-72 bg-surface-container-high rounded-full"></div>
        </div>

        {/* Mobile Swipe Carousel */}
        <div className="flex gap-6 justify-center overflow-hidden lg:hidden">
          <div className="w-[75vw] sm:w-[50vw] h-[400px] bg-surface-container-high rounded-[36px] shrink-0"></div>
          <div className="w-[75vw] sm:w-[50vw] h-[400px] bg-surface-container-high rounded-[36px] shrink-0 opacity-40"></div>
        </div>

        {/* Desktop Accordion */}
        <div className="hidden lg:flex w-full max-w-[1200px] mx-auto h-[600px] gap-4 px-8">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex-1 bg-surface-container-high rounded-[32px] h-full"></div>
          ))}
        </div>
      </div>
    </div>
  );
}
