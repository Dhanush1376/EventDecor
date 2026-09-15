import { Clock, MapPin, ArrowRight } from 'lucide-react';
import { Suspense, useState } from 'react';
import { lazyWithRetry as lazy } from '../utils/performance/lazyWithRetry';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { SEO } from '../components/seo/SEO';
import { CheckoutProvider, useCheckout } from '../checkout/CheckoutProvider';
import { useConfig } from '../context/ConfigContext';
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
  const { isStoreClosed, storeName } = useConfig();
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

  if (isStoreClosed) {
    return (
      <div className="min-h-[75vh] bg-surface-container-low flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-surface border border-outline-variant/30 rounded-2xl p-6 sm:p-8 text-center shadow-md">
          <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-700 flex items-center justify-center mx-auto mb-4">
            <Clock className="w-6 h-6" strokeWidth={1.75} />
          </div>
          <h2 className="font-display text-2xl text-on-surface mb-2 font-medium">
            Checkout Temporarily Paused
          </h2>
          <p className="font-body text-on-surface-variant text-sm mb-6 leading-relaxed">
            Our store is currently in catalog-browsing mode. New order submissions and checkout are
            temporarily paused. Your bag items remain saved for when ordering resumes.
          </p>
          <Link
            to="/collections"
            className="inline-flex items-center justify-center gap-2 w-full py-3.5 px-6 rounded-full bg-black hover:bg-stone-800 text-white text-xs font-bold uppercase tracking-wider transition-colors shadow-sm"
          >
            <span>Explore Collections</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface-container-low min-h-screen pb-32 font-body text-on-surface modern-sans-headings">
      <SEO
        title="Secure Checkout"
        description={`Finalize your ${storeName || 'Siri Arts & Crafts'} order through our secure checkout portal.`}
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
            toast('Complete the current step to continue', {
              icon: <MapPin className="w-4 h-4 text-brand-primary" />,
            });
          }
        }}
      />

      {/* Address Bar - Attached perfectly below checkout steps */}
      {checkoutSteps[activeStep] === 'PAYMENT' &&
        (!activeSelectedAddress ? (
          <AddressBarSkeleton />
        ) : (
          <div
            className={`w-full bg-[#fbf9f6] border-b border-outline-variant/30 relative hover:bg-[#f6f2ea] transition-colors ${isAddressDropdownOpen ? 'z-50' : 'z-30'}`}
          >
            <div className="max-w-[1240px] mx-auto px-4 sm:px-6 relative">
              <div
                onClick={() => setIsAddressDropdownOpen(!isAddressDropdownOpen)}
                className="flex items-center justify-between md:justify-center py-2 cursor-pointer select-none"
              >
                <div className="flex items-center gap-2.5 min-w-0 max-w-2xl">
                  <span className="hidden sm:inline-flex items-center gap-1 bg-primary/10 text-primary text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded shrink-0">
                    <MapPin className="w-3 h-3" strokeWidth={2.2} />
                    Deliver to
                  </span>
                  <span className="text-[11px] sm:text-xs text-neutral-800 font-medium truncate leading-none">
                    <strong className="font-semibold text-neutral-900">
                      {activeSelectedAddress.name}
                    </strong>
                    <span className="text-secondary/60 mx-1.5">•</span>
                    <span className="text-secondary/80">
                      {activeSelectedAddress.addressString || activeSelectedAddress.address},{' '}
                      {activeSelectedAddress.locality ? `${activeSelectedAddress.locality}, ` : ''}
                      {activeSelectedAddress.city}
                    </span>
                  </span>
                </div>
                <div className="flex items-center gap-1 text-primary text-[10px] font-bold uppercase tracking-wider shrink-0 ml-3 sm:ml-4 hover:underline">
                  <span>Change</span>
                  <span className="material-symbols-outlined text-[15px]">
                    {isAddressDropdownOpen ? 'expand_less' : 'expand_more'}
                  </span>
                </div>
              </div>

              {/* Address Switcher Dropdown */}
              <AnimatePresence>
                {isAddressDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute top-full left-4 right-4 md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-xl mt-1 bg-white border border-black/10 rounded-2xl shadow-xl z-50 p-3 max-h-60 overflow-y-auto"
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
            className={`w-full ${
              checkoutSteps[activeStep] === 'CUSTOMIZATION'
                ? 'col-span-12 max-w-2xl mx-auto'
                : 'col-span-1 lg:col-span-7 xl:col-span-8'
            }`}
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
          {checkoutSteps[activeStep] !== 'CUSTOMIZATION' && (
            <div
              className={`col-span-1 lg:col-span-5 xl:col-span-4 ${
                checkoutSteps[activeStep] === 'ADDRESS' ? 'hidden lg:block' : ''
              }`}
            >
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
