import React, { Suspense, lazy } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { SEO } from "../components/seo/SEO";
import { CheckoutProvider, useCheckout } from "../checkout/CheckoutProvider";
import toast from "react-hot-toast";
import { CheckoutSidebarSkeleton, CheckoutStepSkeleton } from "../components/ui/Skeleton";

const CheckoutAddressStep = lazy(() => import("../checkout/CheckoutAddressStep"));
const CheckoutPaymentStep = lazy(() => import("../checkout/CheckoutPaymentStep"));
import { CheckoutSteps } from "../components/ui/CheckoutSteps";

function StepFallback({ mode = "address" }) {
  return <CheckoutStepSkeleton mode={mode} />;
}

const CheckoutSidebar = lazy(() => import("../checkout/CheckoutSidebar"));

function CheckoutContent() {
  const { activeStep, setActiveStep, activeSelectedAddress, navigate } = useCheckout();

  return (
    <div className="bg-surface-container-low min-h-screen pb-32 font-body text-on-surface">
      <SEO
        title="Secure Checkout"
        description="Finalize your Siri Arts & Crafts order through our secure checkout portal."
        noindex
      />

      {/* Top Header Strip with Animated Progress Bar */}
      <CheckoutSteps 
        currentStep={activeStep} 
        onStepClick={(stepIndex) => {
          if (stepIndex === 0) {
            navigate("/cart");
          } else if (stepIndex === 1) {
            setActiveStep(1);
          } else if (stepIndex === 2) {
            if (!activeSelectedAddress) {
              toast.error("Please configure and select a delivery address first.");
              return;
            }
            setActiveStep(2);
          }
        }}
      />

      <div className="max-w-[1240px] mx-auto w-full pt-4 px-4 sm:px-6">
        {activeStep === 1 ? (
          <div className="max-w-[768px] mx-auto">
            <Suspense fallback={<StepFallback mode="address" />}>
              <CheckoutAddressStep />
            </Suspense>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Active Step Form Details */}
            <div className="lg:col-span-7 xl:col-span-8">
              <Suspense fallback={<StepFallback mode="payment" />}>
                {activeStep === 2 && <CheckoutPaymentStep />}
              </Suspense>
            </div>

            {/* Right Column: Price Details Sidebar & Recommendations */}
            <div className="lg:col-span-5 xl:col-span-4">
              <Suspense fallback={<CheckoutSidebarSkeleton />}>
                <CheckoutSidebar />
              </Suspense>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function Checkout() {
  return (
    <CheckoutProvider>
      <CheckoutContent />
    </CheckoutProvider>
  );
}
