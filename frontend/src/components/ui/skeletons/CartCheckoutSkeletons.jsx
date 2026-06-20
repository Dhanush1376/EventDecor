import React from 'react';
import { Skeleton } from '../SkeletonBase';
import { AddressBarSkeleton } from './CommonSkeletons';

// ─── Cart Page Skeleton ───
export function CartSkeleton() {
  return (
    <div className="bg-surface-container-low min-h-screen pt-20 pb-40 font-body text-on-surface">
      <AddressBarSkeleton />
      {/* 1. Tabs Skeleton */}
      <div className="w-full bg-surface-bright border-b border-outline-variant/30 py-3 flex justify-center px-4">
        <div className="w-full bg-surface-container/60 backdrop-blur-xl border border-outline-variant/20 p-1.5 rounded-full flex gap-1 items-center relative shadow-inner">
          <Skeleton className="h-10 flex-1 rounded-full" />
          <Skeleton className="h-10 flex-1 rounded-full" />
        </div>
      </div>

      {/* 2. Steps Strip Skeleton */}
      <div className="my-8 max-w-[1240px] mx-auto px-4 sm:px-6">
        <div className="flex justify-center items-center gap-4 py-2">
          <Skeleton className="h-4 w-12 rounded-full" />
          <div className="h-[2px] w-10 bg-outline-variant/30 rounded" />
          <Skeleton className="h-4 w-16 rounded-full" />
          <div className="h-[2px] w-10 bg-outline-variant/30 rounded" />
          <Skeleton className="h-4 w-16 rounded-full" />
        </div>
      </div>

      {/* 3. Main Grid layout matching Cart.jsx */}
      <div className="max-w-[1240px] mx-auto px-2 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column Pane: Cart Items list */}
          <div className="lg:col-span-7 xl:col-span-8 space-y-3">
            {/* Savings Banner Skeleton */}
            <Skeleton className="h-12 w-full rounded-lg" />

            {/* Coupons Promo Banner Skeleton */}
            <div className="bg-surface-bright border border-outline-variant/40 rounded-lg p-5 flex gap-4 shadow-xs relative overflow-hidden">
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-1/2" />
              </div>
              <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
            </div>

            {/* Top Selection Heading Bar */}
            <div className="bg-surface-bright rounded-lg p-4 flex items-center justify-between shadow-xs border border-outline-variant/40">
              <Skeleton className="h-4 w-48" />
              <div className="flex gap-4">
                <Skeleton variant="circle" className="w-5 h-5" />
                <Skeleton variant="circle" className="w-5 h-5" />
              </div>
            </div>

            {/* Cart Item Cards (2 items) */}
            <div className="space-y-3">
              {[...Array(2)].map((_, i) => (
                <div
                  key={i}
                  className="bg-surface-bright rounded-lg shadow-xs p-3.5 border border-outline-variant/40 space-y-3"
                >
                  <div className="flex gap-3 sm:gap-4">
                    {/* Image */}
                    <Skeleton className="w-[85px] h-[115px] sm:w-[100px] sm:h-[130px] rounded-md flex-shrink-0" />

                    {/* Item Details */}
                    <div className="flex-1 space-y-3 py-1">
                      <Skeleton className="h-4 w-3/4" />
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-6 w-16 rounded" />
                        <Skeleton className="h-6 w-20 rounded" />
                      </div>
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-3 w-36" />
                        <Skeleton className="h-3 w-40" />
                      </div>
                    </div>
                  </div>
                  {/* Wishlist Move Button footer */}
                  <div className="border-t border-outline-variant/30 pt-2 flex justify-center">
                    <Skeleton className="h-4 w-28" />
                  </div>
                </div>
              ))}
            </div>

            {/* Cross Selling Recommendations Skeleton */}
            <div className="mt-8 space-y-4">
              <Skeleton className="h-5 w-40" />
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => (
                  <div
                    key={i}
                    className="space-y-3 bg-surface-bright p-3 rounded-xl border border-outline-variant/30"
                  >
                    <Skeleton className="aspect-square w-full rounded-lg" />
                    <Skeleton className="h-3 w-2/3" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-1/3" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column Pane: Wallet, Coupons & Price Details */}
          <div className="lg:col-span-5 xl:col-span-4 space-y-3">
            {/* Wallet Balance box skeleton */}
            <div className="bg-surface-bright border border-outline-variant/40 rounded-lg p-4 shadow-xs flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1">
                <Skeleton variant="circle" className="w-5 h-5" />
                <div className="space-y-1.5 flex-1">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-2.5 w-32" />
                </div>
              </div>
              <Skeleton variant="circle" className="w-5 h-5" />
            </div>

            {/* Coupons Card skeleton */}
            <div className="bg-surface-bright border border-outline-variant/40 rounded-lg p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-7 w-16 rounded-full" />
              </div>
              <div className="flex items-center gap-3 bg-surface-container-lowest border border-outline-variant/40 rounded-lg p-3">
                <Skeleton variant="circle" className="w-5 h-5" />
                <div className="space-y-1.5 flex-1">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-32" />
                </div>
              </div>
            </div>

            {/* Price Details Block skeleton */}
            <div className="bg-surface-bright border border-outline-variant/40 rounded-lg p-5 shadow-xs space-y-4">
              <Skeleton className="h-4 w-32 mb-2" />

              <div className="space-y-3 border-b border-outline-variant/30 pb-4">
                {[...Array(5)].map((_, idx) => (
                  <div key={idx} className="flex justify-between">
                    <Skeleton className="h-3.5 w-24" />
                    <Skeleton className="h-3.5 w-16" />
                  </div>
                ))}
              </div>

              <div className="flex justify-between pt-2">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-20" />
              </div>

              <Skeleton className="h-12 w-full rounded-full mt-2" />

              {/* Security badges */}
              <div className="pt-2 flex justify-center gap-4">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-28" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function CartItemSkeleton() {
  return (
    <div className="flex gap-4 p-4 rounded-2xl bg-white border border-outline-variant/10">
      <Skeleton className="w-24 h-24 md:w-32 md:h-32 rounded-xl flex-shrink-0" />
      <div className="flex-1 space-y-3">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-3 w-1/3" />
        <div className="flex items-center gap-3 pt-2">
          <Skeleton className="h-9 w-28 rounded-full" />
          <Skeleton className="h-5 w-16" />
        </div>
      </div>
    </div>
  );
}

export function CheckoutStepSkeleton({ mode = 'address' }) {
  // Normalize mode to lowercase
  const m = mode.toLowerCase();

  return (
    <div className="space-y-4" aria-busy="true" aria-label={`Loading checkout ${m} step`}>
      {m === 'address' && (
        <div className="space-y-5">
          {/* Header & Add button */}
          <div className="flex justify-between items-center bg-surface-bright border border-outline-variant/40 rounded-lg p-4 shadow-xs">
            <Skeleton className="h-4 w-44" />
            <Skeleton className="h-8 w-36 rounded-full" />
          </div>

          {/* Address Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[...Array(2)].map((_, i) => (
              <div
                key={i}
                className="bg-surface-bright border border-outline-variant/40 rounded-lg p-4.5 space-y-4 shadow-xs"
              >
                <div className="flex justify-between items-start">
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                    <Skeleton className="h-3 w-40" />
                    <Skeleton className="h-3 w-28" />
                  </div>
                  <Skeleton variant="circle" className="w-5 h-5" />
                </div>
                <div className="h-px bg-outline-variant/20" />
                <div className="flex justify-between items-center gap-3">
                  <div className="flex gap-2">
                    <Skeleton className="h-7 w-12 rounded" />
                    <Skeleton className="h-7 w-12 rounded" />
                  </div>
                  <Skeleton className="h-8 w-32 rounded-full" />
                </div>
              </div>
            ))}
          </div>

          {/* Map/Location Section Placeholder */}
          <div className="bg-surface-bright border border-outline-variant/40 rounded-lg p-5 shadow-xs space-y-3">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-48 w-full rounded-lg" />
          </div>
        </div>
      )}

      {m === 'duration' && (
        <div className="bg-surface-bright border border-outline-variant/40 rounded-lg p-5 shadow-xs space-y-6">
          <div className="space-y-2">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-3 w-72" />
          </div>

          {/* Calendar Selectors */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3 bg-surface-container-lowest p-4 rounded-xl border border-outline-variant/30">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-[280px] w-full rounded-lg" />
            </div>
            <div className="space-y-3 bg-surface-container-lowest p-4 rounded-xl border border-outline-variant/30">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-[280px] w-full rounded-lg" />
            </div>
          </div>

          <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 flex justify-between items-center">
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-44" />
            </div>
            <Skeleton className="h-10 w-36 rounded-full" />
          </div>
        </div>
      )}

      {m === 'verify' && (
        <div className="bg-surface-bright border border-outline-variant/40 rounded-lg p-6 shadow-xs max-w-xl mx-auto space-y-6">
          <div className="text-center space-y-2">
            <Skeleton className="h-5 w-48 mx-auto" />
            <Skeleton className="h-3 w-64 mx-auto" />
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="h-12 w-full rounded-lg" />
            </div>

            {/* OTP Grid */}
            <div className="space-y-2.5 pt-2">
              <Skeleton className="h-3 w-36 mx-auto" />
              <div className="flex justify-center gap-3">
                {[...Array(6)].map((_, i) => (
                  <Skeleton key={i} className="w-10 h-12 rounded-lg" />
                ))}
              </div>
            </div>
          </div>

          <Skeleton className="h-12 w-full rounded-full" />
        </div>
      )}

      {m === 'customization' && (
        <div className="bg-surface-bright border border-outline-variant/40 rounded-lg p-6 shadow-xs space-y-6">
          <div className="space-y-1.5 pb-3 border-b border-outline-variant/30">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3.5 w-64" />
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Skeleton className="h-3.5 w-24" />
                <Skeleton className="h-12 w-full rounded-lg" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-3.5 w-24" />
                <Skeleton className="h-12 w-full rounded-lg" />
              </div>
            </div>

            <div className="space-y-2">
              <Skeleton className="h-3.5 w-32" />
              <Skeleton className="h-12 w-full rounded-lg" />
            </div>

            <div className="space-y-2">
              <Skeleton className="h-3.5 w-36" />
              <Skeleton className="h-28 w-full rounded-lg" />
            </div>
          </div>

          <div className="flex justify-end pt-3 border-t border-outline-variant/20">
            <Skeleton className="h-11 w-36 rounded-full" />
          </div>
        </div>
      )}

      {m === 'payment' && (
        <div className="bg-surface-bright border border-outline-variant/40 rounded-lg p-6 shadow-xs space-y-6">
          <div className="pb-3 border-b border-outline-variant/35">
            <Skeleton className="h-4 w-40" />
          </div>

          {/* Payment Method Cards */}
          <div className="space-y-3">
            {[...Array(2)].map((_, i) => (
              <div
                key={i}
                className="border border-outline-variant/30 rounded-xl p-4.5 flex gap-4 items-center bg-surface-container-lowest"
              >
                <Skeleton variant="circle" className="w-5 h-5 flex-shrink-0" />
                <Skeleton className="w-10 h-6 rounded flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3.5 w-48" />
                </div>
              </div>
            ))}
          </div>

          {/* Safe Checkout Badge info */}
          <div className="bg-surface-container-low rounded-xl p-4 flex items-center gap-3 border border-outline-variant/20">
            <Skeleton variant="circle" className="w-8 h-8 flex-shrink-0" />
            <div className="space-y-1.5 flex-1">
              <Skeleton className="h-3 w-48" />
              <Skeleton className="h-2.5 w-full" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function CheckoutSidebarSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading order summary">
      {/* Wallet Balance card */}
      <div className="bg-surface-bright border border-outline-variant/40 rounded-lg p-4 shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-3 flex-1">
          <Skeleton variant="circle" className="w-5 h-5" />
          <div className="space-y-1.5 flex-1">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-2.5 w-32" />
          </div>
        </div>
        <Skeleton variant="circle" className="w-5 h-5" />
      </div>

      {/* Promo Coupon Card */}
      <div className="bg-surface-bright border border-outline-variant/40 rounded-lg p-4 shadow-xs space-y-3">
        <div className="flex justify-between items-center border-b border-outline-variant/40 pb-2">
          <Skeleton className="h-3 w-28" />
          <Skeleton variant="circle" className="w-4 h-4" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 flex-1 rounded-lg" />
          <Skeleton className="h-9 w-20 rounded-full" />
        </div>
      </div>

      {/* Price Details Card */}
      <div className="bg-surface-bright border border-outline-variant/40 rounded-lg p-4 shadow-xs space-y-4">
        <div className="pb-2 border-b border-outline-variant/40 flex justify-between items-center">
          <Skeleton className="h-3.5 w-36" />
          <Skeleton className="h-5 w-14 rounded-full" />
        </div>

        <div className="space-y-3 border-b border-outline-variant/40 pb-4">
          {[...Array(4)].map((_, idx) => (
            <div className="flex justify-between" key={idx}>
              <Skeleton className="h-3 w-24" delay={idx * 60} />
              <Skeleton className="h-3 w-16" delay={idx * 60 + 40} />
            </div>
          ))}
        </div>

        <div className="flex justify-between items-baseline pt-1">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-5 w-20" />
        </div>

        <div className="bg-green-50/70 border border-green-200 rounded-lg p-2 text-center">
          <Skeleton className="h-3.5 w-28 mx-auto" />
        </div>

        <div className="pt-2 border-t border-outline-variant/20 space-y-2">
          {[...Array(2)].map((_, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <Skeleton variant="circle" className="w-4 h-4 flex-shrink-0" />
              <Skeleton className="h-3 w-36" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function AddressSkeleton() {
  return (
    <div className="p-5 rounded-2xl bg-surface-container-low border border-outline-variant/20 space-y-3">
      <div className="flex justify-between items-start">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-4 w-1/2" />
      <div className="flex gap-3 pt-3">
        <Skeleton className="h-8 w-16 rounded-lg" />
        <Skeleton className="h-8 w-16 rounded-lg" />
      </div>
    </div>
  );
}

export function PaymentSkeleton() {
  return (
    <div className="p-4 rounded-2xl bg-surface-container-low border border-outline-variant/20 flex gap-4 items-center">
      <Skeleton className="w-12 h-8 rounded-md" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-20" />
      </div>
      <Skeleton variant="circle" className="w-5 h-5" />
    </div>
  );
}

// ─── Order Success Skeleton ───
export function OrderSuccessSkeleton() {
  return (
    <div className="bg-surface-container-low min-h-screen pt-12 pb-32">
      <div className="bg-surface-bright border-b border-outline-variant/40 py-4 px-4 mb-8 -mt-12">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <Skeleton className="h-5 w-16" />
          <div className="flex-1 border-t-2 border-dashed border-outline-variant/20 mx-3" />
          <Skeleton className="h-5 w-20" />
          <div className="flex-1 border-t-2 border-dashed border-outline-variant/20 mx-3" />
          <Skeleton className="h-5 w-20" />
        </div>
      </div>

      <div className="max-w-[1240px] mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-7 xl:col-span-8 space-y-4">
            <div className="bg-surface-bright rounded-lg p-8 md:p-12 text-center border border-outline-variant/40 space-y-6">
              <Skeleton className="h-20 w-20 rounded-full mx-auto" />
              <Skeleton className="h-8 w-64 mx-auto" />
              <Skeleton className="h-4 w-96 mx-auto" />
              <Skeleton className="h-16 w-80 mx-auto rounded-lg mt-4" />
            </div>

            <div className="bg-surface-bright rounded-lg border border-outline-variant/40">
              <div className="p-4 border-b border-surface-container flex justify-between">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-4 w-20" />
              </div>
              <div className="divide-y divide-surface-container">
                {[...Array(2)].map((_, i) => (
                  <div key={i} className="p-4 sm:p-6 flex gap-4 sm:gap-6">
                    <Skeleton className="w-20 h-24 sm:w-24 sm:h-32 rounded-lg flex-shrink-0" />
                    <div className="flex-1 space-y-3 py-1">
                      <div className="flex justify-between">
                        <Skeleton className="h-5 w-48" />
                        <Skeleton className="h-5 w-20" />
                      </div>
                      <Skeleton className="h-3 w-32" />
                      <div className="flex gap-4 mt-4">
                        <Skeleton className="h-4 w-16" />
                        <Skeleton className="h-4 w-32" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 xl:col-span-4 space-y-4">
            <div className="bg-surface-bright rounded-lg p-4 border border-outline-variant/40 space-y-4">
              <Skeleton className="h-4 w-32 border-b border-outline-variant/40 pb-3" />
              <div className="space-y-3">
                <div className="flex justify-between">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-3 w-16" />
                </div>
                <div className="flex justify-between">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-3 w-16" />
                </div>
                <div className="flex justify-between">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-3 w-16" />
                </div>
                <div className="h-[1px] bg-outline-variant/40 my-3" />
                <div className="flex justify-between">
                  <Skeleton className="h-5 w-24" />
                  <Skeleton className="h-6 w-24" />
                </div>
              </div>
            </div>

            <div className="bg-surface-bright rounded-lg p-4 border border-outline-variant/40 space-y-4">
              <div className="flex justify-between border-b border-outline-variant/40 pb-3">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-4 rounded-full" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-3/4" />
                <Skeleton className="h-4 w-32 mt-2" />
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <Skeleton className="h-12 w-full rounded" />
              <Skeleton className="h-12 w-full rounded" />
              <Skeleton className="h-12 w-full rounded" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Order Tracking Skeleton ───
export function OrderTrackingSkeleton() {
  return (
    <div className="min-h-screen bg-surface-bright py-12 px-4 sm:px-6">
      <div className="max-w-[800px] mx-auto space-y-6">
        <div className="bg-white border border-outline-variant/30 rounded-2xl p-6 md:p-8 space-y-6">
          <Skeleton className="h-6 w-32 mx-auto rounded-full" />
          <Skeleton className="h-8 w-64 mx-auto" />
          <Skeleton className="h-4 w-48 mx-auto" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-dashed border-outline-variant/30">
            {[...Array(4)].map((_, i) => (
              <div key={i}>
                <Skeleton className="h-3 w-20 mb-2" />
                <Skeleton className="h-4 w-24" />
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border border-outline-variant/30 rounded-2xl p-6 md:p-8 space-y-8">
          <Skeleton className="h-5 w-48" />
          <div className="hidden sm:flex items-center justify-between gap-2 overflow-hidden">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex flex-col items-center w-24">
                <Skeleton className="h-11 w-11 rounded-full mb-2" />
                <Skeleton className="h-3 w-16" />
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border border-outline-variant/30 rounded-2xl p-6 md:p-8 space-y-6">
          <Skeleton className="h-5 w-40" />
          <div className="space-y-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex gap-4">
                <div className="w-2 h-2 rounded-full bg-surface-container mt-1.5" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-32 mb-2" />
                  <Skeleton className="h-3 w-48" />
                </div>
                <Skeleton className="h-3 w-20" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function OrderCardSkeleton() {
  return (
    <div className="bg-surface-bright border border-outline-variant/40 rounded-2xl p-5 space-y-4">
      <div className="flex justify-between items-center">
        <div className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-24" />
        </div>
        <Skeleton className="h-6 w-24 rounded-full" />
      </div>
      <Skeleton className="h-[1px] w-full" />
      <div className="flex gap-4">
        <Skeleton className="w-20 h-20 rounded-xl flex-shrink-0" />
        <div className="flex-1 space-y-2 py-1">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/3" />
        </div>
      </div>
      <div className="flex justify-between items-center pt-2">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-9 w-28 rounded-full" />
      </div>
    </div>
  );
}

export function OrdersListSkeleton({ rows = 2 }) {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading orders">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="bg-surface-bright border border-outline-variant/40 rounded-lg p-5 space-y-4"
        >
          <div className="flex justify-between items-center">
            <Skeleton className="h-4 w-44" delay={i * 100} />
            <Skeleton className="h-5 w-24 rounded-full" delay={i * 100 + 60} />
          </div>
          <Skeleton className="h-3 w-2/3" delay={i * 100 + 100} />
          <Skeleton className="h-16 w-full rounded" delay={i * 100 + 140} />
          <div className="flex justify-between">
            <Skeleton className="h-3 w-40" delay={i * 100 + 180} />
            <Skeleton className="h-3 w-28" delay={i * 100 + 220} />
          </div>
        </div>
      ))}
    </div>
  );
}
