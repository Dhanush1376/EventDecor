import React, { Suspense, lazy } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { SEO } from "../components/seo/SEO";
import { CheckoutProvider, useCheckout } from "../checkout/CheckoutProvider";

const CheckoutAddressStep = lazy(() => import("../checkout/CheckoutAddressStep"));
const CheckoutOrderSummaryStep = lazy(() => import("../checkout/CheckoutOrderSummaryStep"));
const CheckoutPaymentStep = lazy(() => import("../checkout/CheckoutPaymentStep"));
const CheckoutSidebar = lazy(() => import("../checkout/CheckoutSidebar"));
const CheckoutRecommendations = lazy(() => import("../checkout/CheckoutRecommendations"));

function StepFallback() {
  return (
    <div
      className="h-24 animate-pulse bg-surface-container-low rounded-lg border border-outline-variant/30"
      aria-hidden
    />
  );
}

function CheckoutContent() {
  const { user, isAuthenticated, navigate } = useCheckout();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="bg-surface-container-low min-h-screen pb-32 font-body text-on-surface"
    >
      <SEO
        title="Secure Checkout"
        description="Finalize your Siri Arts & Crafts order through our secure checkout portal."
        noindex
      />

      <div className="max-w-max-width mx-auto px-4 sm:px-6 pt-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 xl:col-span-8 space-y-4">
            <motion.div
              layout
              className="bg-surface-bright border border-outline-variant/40 rounded-lg overflow-hidden shadow-xs"
            >
              <div className="p-4 bg-surface-bright flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="w-5 h-5 bg-surface-container-low text-secondary font-bold text-[10px] sm:text-xs rounded flex items-center justify-center">
                    1
                  </span>
                  <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-secondary">
                    Login
                  </span>
                  <span className="material-symbols-outlined text-base text-green-700 font-bold">
                    check
                  </span>
                </div>
                {isAuthenticated && (
                  <button
                    type="button"
                    onClick={() => navigate("/dashboard")}
                    className="text-[10px] sm:text-xs font-bold text-primary hover:underline cursor-pointer"
                  >
                    Change
                  </button>
                )}
              </div>
              <div className="px-12 py-3 text-[10px] sm:text-xs text-on-surface border-t border-surface-container-low">
                <span className="font-bold">{user?.name || "Guest User"}</span>{" "}
                <span className="text-secondary mx-2">{user?.phone || "Verification Pending"}</span>
              </div>
            </motion.div>

            <Suspense fallback={<StepFallback />}>
              <CheckoutAddressStep />
            </Suspense>
            <Suspense fallback={<StepFallback />}>
              <CheckoutOrderSummaryStep />
            </Suspense>
            <Suspense fallback={<StepFallback />}>
              <CheckoutRecommendations />
            </Suspense>
            <Suspense fallback={<StepFallback />}>
              <CheckoutPaymentStep />
            </Suspense>
          </div>

          <Suspense fallback={<StepFallback />}>
            <CheckoutSidebar />
          </Suspense>
        </div>
      </div>
    </motion.div>
  );
}

export function Checkout() {
  return (
    <CheckoutProvider>
      <CheckoutContent />
    </CheckoutProvider>
  );
}
