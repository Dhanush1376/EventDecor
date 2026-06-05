import { Suspense, lazy } from 'react';
import { SEO } from '../components/seo/SEO';
import { CheckoutProvider, useCheckout } from '../checkout/CheckoutProvider';
import toast from 'react-hot-toast';
import { CheckoutSidebarSkeleton, CheckoutStepSkeleton } from '../components/ui/Skeleton';

const CheckoutAddressStep = lazy(() => import('../checkout/CheckoutAddressStep'));
const CheckoutPaymentStep = lazy(() => import('../checkout/CheckoutPaymentStep'));
const CheckoutRentalDurationStep = lazy(() => import('../checkout/CheckoutRentalDurationStep'));
const CheckoutVerificationStep = lazy(() => import('../checkout/CheckoutVerificationStep'));
import { CheckoutSteps } from '../components/ui/CheckoutSteps';

function StepFallback({ mode = 'address' }) {
  return <CheckoutStepSkeleton mode={mode} />;
}

const CheckoutSidebar = lazy(() => import('../checkout/CheckoutSidebar'));

function CheckoutContent() {
  const { activeStep, setActiveStep, activeSelectedAddress, navigate, orderType, checkoutSteps } =
    useCheckout();

  return (
    <div className="bg-surface-container-low min-h-screen pb-32 font-body text-on-surface">
      <SEO
        title="Secure Checkout"
        description="Finalize your Siri Arts & Crafts order through our secure checkout portal."
        noindex
      />

      {/* Top Header Strip with Animated Progress Bar */}
      <CheckoutSteps
        steps={checkoutSteps}
        currentStep={activeStep}
        orderType={orderType}
        onStepClick={(stepIndex) => {
          if (stepIndex === 0) {
            navigate('/cart');
          } else if (stepIndex === activeStep) {
            return; // Already here
          } else if (stepIndex < activeStep) {
            setActiveStep(stepIndex);
          } else {
            // Cannot jump forward without passing validations, rely on continue buttons
            toast.error('Please complete the current step to proceed.');
          }
        }}
      />

      <div className="max-w-[1240px] mx-auto w-full pt-6 md:pt-10 px-4 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Active Step Form Details */}
          <div
            className={
              (orderType === 'rental' && activeStep === 2) ||
              (orderType === 'purchase' && activeStep === 1)
                ? 'lg:col-span-12 xl:col-span-12 w-full'
                : 'lg:col-span-7 xl:col-span-8'
            }
          >
            <Suspense fallback={<StepFallback mode="address" />}>
              {orderType === 'rental' && activeStep === 1 && <CheckoutRentalDurationStep />}
              {((orderType === 'rental' && activeStep === 2) ||
                (orderType === 'purchase' && activeStep === 1)) && <CheckoutAddressStep />}
              {orderType === 'rental' && activeStep === 3 && <CheckoutVerificationStep />}
              {((orderType === 'rental' && activeStep === 4) ||
                (orderType === 'purchase' && activeStep === 2)) && <CheckoutPaymentStep />}
            </Suspense>
          </div>

          {/* Right Column: Price Details Sidebar & Recommendations */}
          {!(
            (orderType === 'rental' && activeStep === 2) ||
            (orderType === 'purchase' && activeStep === 1)
          ) && (
            <div className="lg:col-span-5 xl:col-span-4">
              <Suspense fallback={<CheckoutSidebarSkeleton />}>
                <CheckoutSidebar />
              </Suspense>
            </div>
          )}
        </div>
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
