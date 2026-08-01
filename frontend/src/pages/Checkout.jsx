import { MapPin, ArrowRight } from 'lucide-react';
import { Suspense, useState } from 'react';
import { lazyWithRetry as lazy } from '../utils/performance/lazyWithRetry';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { SEO } from '../components/seo/SEO';
import { CheckoutProvider, useCheckout } from '../checkout/CheckoutProvider';
import {
  CheckoutSidebarSkeleton,
  CheckoutStepSkeleton,
  AddressBarSkeleton,
} from '../components/ui/Skeleton';
import { CheckoutSteps } from '../components/ui/CheckoutSteps';
import toast from 'react-hot-toast';

const CheckoutAddressStep = lazy(() => import('../checkout/CheckoutAddressStep'));
const CheckoutPaymentStep = lazy(() => import('../checkout/CheckoutPaymentStep'));
const CheckoutRentalDurationStep = lazy(() => import('../checkout/CheckoutRentalDurationStep'));
const CheckoutVerificationStep = lazy(() => import('../checkout/CheckoutVerificationStep'));
const CheckoutCustomizationStep = lazy(() =>
  import('../checkout/CheckoutCustomizationStep').then((m) => ({
    default: m.CheckoutCustomizationStep,
  })),
);

function StepFallback({ mode = 'address' }) {
  return <CheckoutStepSkeleton mode={mode} />;
}

const CheckoutSidebar = lazy(() => import('../checkout/CheckoutSidebar'));

function CheckoutContent() {
  const {
    activeStep,
    setActiveStep,
    activeSelectedAddress,
    savedAddresses,
    setSelectedAddressId,
    navigate,
    orderType,
    checkoutSteps,
  } = useCheckout();

  const [isAddressDropdownOpen, setIsAddressDropdownOpen] = useState(false);

  return (
    <div className="bg-surface-container-low min-h-screen pb-32 font-body text-on-surface modern-sans-headings">
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
            toast('Complete the current step to continue', { icon: '📍' });
          }
        }}
      />

      {/* Address Bar - Attached perfectly below checkout steps */}
      {checkoutSteps[activeStep] === 'PAYMENT' &&
        (!activeSelectedAddress ? (
          <AddressBarSkeleton />
        ) : (
          <div
            className={`w-full bg-[#fbf9f6] border-b border-black/10 relative hover:bg-[#f6f2ea] transition-colors ${isAddressDropdownOpen ? 'z-50' : 'z-30'}`}
          >
            <div className="max-w-[1240px] mx-auto px-4 sm:px-8 relative">
              <div
                onClick={() => setIsAddressDropdownOpen(!isAddressDropdownOpen)}
                className="flex items-center justify-between py-3 cursor-pointer select-none"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <MapPin className="text-[18px] text-primary" strokeWidth={1.5} />
                  <span className="text-[11px] lg:text-xs text-[#1a1817] font-semibold truncate leading-none">
                    {activeSelectedAddress.name} -{' '}
                    {activeSelectedAddress.addressString || activeSelectedAddress.address},{' '}
                    {activeSelectedAddress.locality || ''}, {activeSelectedAddress.city}
                  </span>
                </div>
                <span className="material-symbols-outlined text-[18px] text-black/40">
                  {isAddressDropdownOpen ? 'expand_less' : 'expand_more'}
                </span>
              </div>

              {/* Address Switcher Dropdown */}
              <AnimatePresence>
                {isAddressDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute top-full left-4 right-4 mt-1 bg-white border border-black/10 rounded-2xl shadow-xl z-50 p-3 max-h-60 overflow-y-auto"
                  >
                    <div className="text-[9px] uppercase tracking-wider font-bold text-black/40 px-2.5 pb-2 mb-1 border-b border-black/5">
                      Select Destination
                    </div>
                    {!savedAddresses ? (
                      <div className="flex flex-col gap-2 px-2 pb-2">
                        <div className="h-11 bg-black/[0.04] rounded-xl animate-pulse" />
                        <div className="h-11 bg-black/[0.04] rounded-xl animate-pulse" />
                      </div>
                    ) : savedAddresses.length > 0 ? (
                      savedAddresses.map((addr) => {
                        const isSelected =
                          activeSelectedAddress &&
                          String(activeSelectedAddress._id || activeSelectedAddress.id) ===
                            String(addr._id || addr.id);
                        return (
                          <div
                            key={addr._id || addr.id}
                            onClick={() => {
                              setSelectedAddressId(addr._id || addr.id);
                              setIsAddressDropdownOpen(false);
                            }}
                            className={`p-2.5 rounded-xl text-[11px] cursor-pointer hover:bg-neutral-50 transition-colors flex items-start gap-2 ${isSelected ? 'bg-primary/5 text-primary font-bold' : 'text-black/70'}`}
                          >
                            <span className="material-symbols-outlined text-[14px] mt-0.5">
                              {isSelected ? 'radio_button_checked' : 'radio_button_unchecked'}
                            </span>
                            <div className="min-w-0">
                              <div className="font-bold">
                                {addr.name} ({addr.tag})
                              </div>
                              <div className="truncate text-black/50 text-[10px]">
                                {addr.addressString || addr.address}, {addr.locality}, {addr.city}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="p-2.5 rounded-xl text-[11px] text-black/50 text-center">
                        No other addresses saved.
                      </div>
                    )}
                    <div className="mt-2 pt-2 border-t border-black/5 flex justify-end">
                      <Link
                        to="/dashboard?tab=addresses"
                        className="text-[10px] font-bold text-primary uppercase tracking-widest hover:underline flex items-center gap-1"
                      >
                        Manage Addresses
                        <ArrowRight className="text-[12px]" strokeWidth={1.5} />
                      </Link>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        ))}

      <div className="max-w-[1240px] mx-auto w-full pt-6 lg:pt-10 px-4 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 lg:gap-6 items-start">
          {/* Left Column: Active Step Form Details */}
          <div
            className={
              checkoutSteps[activeStep] === 'ADDRESS'
                ? 'lg:col-span-12 xl:col-span-12 w-full'
                : 'lg:col-span-7 xl:col-span-8'
            }
          >
            <Suspense fallback={<StepFallback mode="address" />}>
              {checkoutSteps[activeStep] === 'DURATION' && <CheckoutRentalDurationStep />}
              {checkoutSteps[activeStep] === 'ADDRESS' && <CheckoutAddressStep />}
              {checkoutSteps[activeStep] === 'VERIFY' && <CheckoutVerificationStep />}
              {checkoutSteps[activeStep] === 'CUSTOMIZATION' && (
                <CheckoutCustomizationStep onNext={() => setActiveStep(activeStep + 1)} />
              )}
              {checkoutSteps[activeStep] === 'PAYMENT' && <CheckoutPaymentStep />}
            </Suspense>
          </div>

          {/* Right Column: Price Details Sidebar & Recommendations */}
          {checkoutSteps[activeStep] !== 'ADDRESS' &&
            checkoutSteps[activeStep] !== 'CUSTOMIZATION' && (
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
