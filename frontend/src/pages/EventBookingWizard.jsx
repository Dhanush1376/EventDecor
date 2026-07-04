import React, { useState, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { SEO } from '../components/seo/SEO';
import { MandalaArtDecor } from '../components/ui/MandalaArtDecor';
import { BookingWizardSkeleton } from '../components/ui/Skeleton';
import { useNavigate, useLocation } from 'react-router-dom';
import { eventService, bookingService, uploadService } from '../services/domainServices';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import logger from '../utils/core/logger';
import { EXTERNAL_URLS } from '../config/constants';
import { CustomerContactGate } from '../components/shared/CustomerContactGate';

// Wizard Steps
import { OccasionStep } from '../components/booking-wizard/OccasionStep';
import { DesignStep } from '../components/booking-wizard/DesignStep';
import { LogisticsStep } from '../components/booking-wizard/LogisticsStep';
import { CustomizationStep } from '../components/booking-wizard/CustomizationStep';
import { AiDesignStep } from '../components/booking-wizard/AiDesignStep';
import { SummaryStep } from '../components/booking-wizard/SummaryStep';

const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = EXTERNAL_URLS.RAZORPAY_CHECKOUT;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

export function EventBookingWizard() {
  const { isAuthenticated, runProtectedAction } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [currentStep, setCurrentStep] = useState(1);
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [formData, setFormData] = useState({
    eventType: 'wedding',
    customOccasion: '',
    eventPackageId: '',
    title: '',
    date: '',
    timing: { start: '08:00 AM', end: '10:00 PM' },
    guestCount: 150,
    venue: { address: '', googleMapsLink: '', isOutdoor: false },
    customization: {
      themeColor: 'Gilded Gold & Crimson Red',
      floralPreference: 'Sacred Jasmine Garlands & Royal Lotuses',
      lightingPreference: 'Vintage Hanging Brass Diyas & Amber Spotlights',
      stageSize: 'Standard (20ft x 12ft)',
      additionalRequests: '',
    },
    selectedAddons: [],
    inspirationImages: [],
  });

  useEffect(() => {
    // Form persistence removed for PII security
  }, [formData]);

  // Design Assistant State
  const [isGeneratingDesign, setIsGeneratingDesign] = useState(false);
  const [aiAnalysisResult, setAiAnalysisResult] = useState(null);
  const [uploadedFileName, setUploadedFileName] = useState('');

  useEffect(() => {
    // Load packages to select from
    eventService
      .getAll()
      .then((res) => {
        if (res.success) {
          const list = res.data.items || res.data.data || (Array.isArray(res.data) ? res.data : []);
          setPackages(list);

          // Pre-select package if navigated from EventDetails page
          const queryParams = new URLSearchParams(location.search);
          const preselectedPkgId = queryParams.get('packageId');
          if (preselectedPkgId) {
            const pkg = list.find((p) => (p._id || p.id) === preselectedPkgId);
            if (pkg) {
              setFormData((prev) => ({
                ...prev,
                eventPackageId: preselectedPkgId,
                eventType: pkg.category?.toLowerCase() || 'wedding',
                title: `${pkg.title} Booking`,
              }));
              // Advance directly to step 3 since design is pre-selected
              setCurrentStep(3);
            }
          }
        }
        setLoading(false);
      })
      .catch((err) => {
        logger.error(err);
        setLoading(false);
      });
  }, [location]);

  if (loading) {
    return <BookingWizardSkeleton />;
  }

  const handleEventTypeSelect = (type) => {
    if (type === 'other') {
      setFormData((prev) => ({ ...prev, eventType: 'other' }));
    } else {
      setFormData((prev) => ({ ...prev, eventType: type, customOccasion: '' }));
      setCurrentStep(2);
    }
  };

  const handlePackageSelect = (pkgId) => {
    const pkg = packages.find((p) => (p._id || p.id) === pkgId);
    setFormData((prev) => ({
      ...prev,
      eventPackageId: pkgId,
      title: pkg ? `${pkg.title} Booking` : prev.title,
    }));
    setCurrentStep(3);
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleNestedInputChange = (parent, field, value) => {
    setFormData((prev) => ({
      ...prev,
      [parent]: { ...prev[parent], [field]: value },
    }));
  };

  const handleAddonChange = (addonName, price, checked) => {
    setFormData((prev) => {
      let nextAddons = [...(prev.selectedAddons || [])];
      if (checked) {
        nextAddons.push({ name: addonName, price });
      } else {
        nextAddons = nextAddons.filter((a) => a.name !== addonName);
      }
      return { ...prev, selectedAddons: nextAddons };
    });
  };

  const generateDesignInspiration = () => {
    setIsGeneratingDesign(true);
    setAiAnalysisResult(null);

    const occasionType = (
      formData.eventType === 'other' ? formData.customOccasion || 'Custom' : formData.eventType
    ).toUpperCase();

    // Deterministically generate result based on occasion type and guest count
    const isLarge = formData.guestCount > 300;
    const mood = occasionType.includes('WEDDING')
      ? 'Sacred South Indian Royal Temple Heritage'
      : 'Elegant Contemporary Celebration';

    const setupTime = isLarge ? '12 - 16 Hours (18 Artisans)' : '6 - 8 Hours (8 Artisans)';
    const price = isLarge ? '₹1,50,000 - ₹3,00,000' : '₹60,000 - ₹1,20,000';

    setAiAnalysisResult({
      detectedOccasion: `${occasionType} CELEBRATION`,
      mood,
      palette: ['#8B0000', '#FFD700', '#FFF8DC', '#228B22'],
      paletteLabels: ['Deep Crimson', 'Gilded Gold', 'Temple Ivory', 'Forest Leaf Green'],
      suggestedProps: [
        'Bespoke Handcrafted Teak Elements',
        'Fresh Floral Garlands',
        'Traditional Brass Decor Accents',
        'Custom Entrance Gateway',
      ],
      estimatedSetupTime: setupTime,
      recommendedInclusions: 'Thematic Backdrop, Ambient Lighting & Entrance Decor',
      estimatedPriceRange: price,
    });

    setFormData((prev) => ({
      ...prev,
      customization: {
        ...prev.customization,
        themeColor: 'Royal Crimson Vermillion & Gilded Gold Hues',
        floralPreference: 'Premium Fresh Jasmine & Lotus',
      },
    }));

    setIsGeneratingDesign(false);
    toast.success('Design Inspiration Blueprint Generated!');
  };

  const handleFileUploadSim = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadedFileName(file.name);
    setIsGeneratingDesign(true);
    setAiAnalysisResult(null);

    try {
      const fd = new FormData();
      fd.append('images', file);

      // Perform real server upload
      const uploadRes = await uploadService.uploadInspirations(fd);
      if (uploadRes.success && uploadRes.images?.length > 0) {
        const uploadedUrl = uploadRes.images[0];
        toast.success('Inspiration image uploaded successfully!');

        setFormData((prev) => ({
          ...prev,
          inspirationImages: [uploadedUrl],
        }));

        generateDesignInspiration();
      } else {
        throw new Error('No image URL returned');
      }
    } catch (err) {
      logger.error(err);
      setIsGeneratingDesign(false);
      toast.error('Upload failed. Generating design from existing inputs...');
      generateDesignInspiration();
    }
  };

  const handleSubmitBooking = async () => {
    if (!isAuthenticated) {
      runProtectedAction(() => handleSubmitBooking());
      return;
    }

    // Validate required fields
    if (!formData.title?.trim()) {
      toast.error('Please enter a booking title.');
      return;
    }
    if (formData.eventType === 'other' && !formData.customOccasion?.trim()) {
      toast.error('Please specify your custom occasion name.');
      return;
    }
    if (!formData.date) {
      toast.error('Please select a date for your event.');
      return;
    }
    if (!formData.venue?.address?.trim()) {
      toast.error('Please specify a venue address.');
      return;
    }

    const loadId = toast.loading('Initializing secure checkout...');
    try {
      const isScriptLoaded = await loadRazorpayScript();
      if (!isScriptLoaded) {
        toast.dismiss(loadId);
        toast.error('Failed to load payment gateway. Please check your connection.');
        return;
      }

      // Map eventType to customOccasion if "other" is selected
      const checkoutPayload = {
        ...formData,
        eventType:
          formData.eventType === 'other'
            ? formData.customOccasion || 'Other Celebration'
            : formData.eventType,
      };

      // 1. Initialize Booking Checkout
      const initRes = await bookingService.initializeCheckout(checkoutPayload);
      if (!initRes.success || !initRes.data) {
        toast.dismiss(loadId);
        toast.error(initRes.message || 'Failed to initialize checkout.');
        return;
      }

      const { bookingId, razorpayOrderId, amount, currency, key } = initRes.data;
      toast.dismiss(loadId);

      // 2. Open Razorpay Modal
      const options = {
        key,
        amount,
        currency,
        name: 'Siri Arts Event Decor',
        description: `Advance Deposit for ${formData.title}`,
        order_id: razorpayOrderId,
        handler: async function (response) {
          const verifyLoadId = toast.loading('Verifying your payment securely...');
          try {
            // 3. Verify Payment Signature
            const verifyRes = await bookingService.verifyCheckout({
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
              bookingId,
            });

            toast.dismiss(verifyLoadId);
            if (verifyRes.success) {
              // session storage cleanup removed
              toast.success('Payment successful! Your luxury event is confirmed.');
              navigate(`/booking-success/${bookingId}`);
            } else {
              toast.error(verifyRes.message || 'Payment verification failed.');
            }
          } catch (err) {
            toast.dismiss(verifyLoadId);
            logger.error('Verification Error:', err);
            toast.error('An error occurred during verification. Contact support.');
          }
        },
        prefill: {
          name: 'Customer',
          email: 'customer@example.com',
        },
        theme: {
          color: 'var(--color-gold-dark)', // Brand Primary
        },
      };

      const paymentObject = new window.Razorpay(options);
      paymentObject.on('payment.failed', function (response) {
        toast.error(`Payment Failed: ${response.error.description}`);
      });
      paymentObject.open();
    } catch (err) {
      toast.dismiss(loadId);
      logger.error(err);
      toast.error('An error occurred. Please verify required fields and login state.');
    }
  };

  const activePackage = packages.find((p) => (p._id || p.id) === formData.eventPackageId);
  const hasCategoryPackages = packages.some(
    (p) => p.category?.toLowerCase() === formData.eventType,
  );

  return (
    <div className="bg-[#fcfbf9] min-h-screen text-on-surface pt-20 lg:pt-32 pb-24 relative overflow-hidden font-body">
      <SEO
        title="Luxury Event Decor Booking | Guided Studio Wizard"
        description="Configure and blueprint your milestone ceremonies with our guided luxury booking wizard."
      />

      <MandalaArtDecor
        variant={3}
        size={500}
        className="-top-32 -right-32 absolute opacity-[0.08]"
        spinDuration={200}
      />
      <MandalaArtDecor
        variant={1}
        size={400}
        className="-bottom-20 -left-20 absolute opacity-[0.06]"
        spinDuration={180}
      />

      <div className="max-w-[1000px] mx-auto px-4 relative z-10">
        {/* Editorial Heading */}
        <div className="text-center mb-10 lg:mb-16">
          <span className="font-label text-[10px] lg:text-[11px] uppercase tracking-[0.4em] text-primary font-bold block mb-3">
            SIRI CREATIVE STUDIO
          </span>
          <h2 className="font-display text-[28px] lg:text-[54px] text-black font-light tracking-tight leading-tight">
            Design Your Celebration.
          </h2>
          <p className="font-body text-black/50 text-[13px] lg:text-[15px] max-w-xl mx-auto mt-3 font-light">
            A premium guided easy step-by-step event planner to map venue dimensions, customized
            color palettes, and rental inventories.
          </p>

          {/* Stepper Progress Bar */}
          <div className="flex items-center justify-center gap-2 mt-8 lg:mt-12 max-w-md mx-auto">
            {[1, 2, 3, 4, 5, 6].map((step) => (
              <React.Fragment key={step}>
                <div
                  onClick={() => step < currentStep && setCurrentStep(step)}
                  className={`w-7 h-7 rounded-full flex items-center justify-center font-display text-xs transition-all duration-500 cursor-pointer ${
                    currentStep === step
                      ? 'bg-primary text-white scale-110 shadow-lg'
                      : currentStep > step
                        ? 'bg-primary/20 text-primary font-semibold'
                        : 'bg-surface-container-high text-black/20'
                  }`}
                >
                  {step}
                </div>
                {step < 6 && (
                  <div
                    className={`h-[2px] flex-1 transition-all duration-700 ${
                      currentStep > step ? 'bg-primary/30' : 'bg-surface-container-high'
                    }`}
                  />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Wizard Main Panel */}
        <div className="bg-white rounded-[24px] lg:rounded-[40px] border border-black/5 shadow-2xl p-6 lg:p-12 min-h-[480px] flex flex-col justify-between">
          <AnimatePresence mode="wait">
            {currentStep === 1 && (
              <OccasionStep
                key="step1"
                formData={formData}
                handleEventTypeSelect={handleEventTypeSelect}
                handleInputChange={handleInputChange}
                setCurrentStep={setCurrentStep}
              />
            )}

            {currentStep === 2 && (
              <DesignStep
                key="step2"
                formData={formData}
                packages={packages}
                loading={loading}
                hasCategoryPackages={hasCategoryPackages}
                handlePackageSelect={handlePackageSelect}
              />
            )}

            {currentStep === 3 && (
              <LogisticsStep
                key="step3"
                formData={formData}
                handleInputChange={handleInputChange}
                handleNestedInputChange={handleNestedInputChange}
              />
            )}

            {currentStep === 4 && (
              <CustomizationStep
                key="step4"
                formData={formData}
                handleNestedInputChange={handleNestedInputChange}
                handleAddonChange={handleAddonChange}
              />
            )}

            {currentStep === 5 && (
              <AiDesignStep
                key="step5"
                handleFileUploadSim={handleFileUploadSim}
                uploadedFileName={uploadedFileName}
                simulateAiAnalysis={generateDesignInspiration}
                isAiAnalyzing={isGeneratingDesign}
                aiAnalysisResult={aiAnalysisResult}
              />
            )}

            {currentStep === 6 && (
              <SummaryStep key="step6" formData={formData} activePackage={activePackage} />
            )}
          </AnimatePresence>

          {/* Stepper Buttons Control panel */}
          <div className="flex items-center justify-between pt-10 border-t border-black/5 mt-10">
            <button
              type="button"
              onClick={() => currentStep > 1 && setCurrentStep((prev) => prev - 1)}
              disabled={currentStep === 1}
              className={`px-8 py-3 rounded-full font-label text-[10px] uppercase tracking-widest font-bold transition-all border ${
                currentStep === 1
                  ? 'border-transparent text-black/10 cursor-not-allowed'
                  : 'border-stone-950/20 text-stone-700 hover:bg-stone-50'
              }`}
            >
              Back
            </button>

            {currentStep < 6 ? (
              <button
                type="button"
                onClick={() => {
                  if (currentStep === 3) {
                    if (!formData.title?.trim()) {
                      toast.error('Please enter a booking title.');
                      return;
                    }
                    if (!formData.date) {
                      toast.error('Please select an event date.');
                      return;
                    }
                    const selectedDate = new Date(formData.date);
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    if (selectedDate < today) {
                      toast.error('Event date cannot be in the past.');
                      return;
                    }
                    if (!formData.venue?.address?.trim()) {
                      toast.error('Please specify a venue address.');
                      return;
                    }
                  }
                  setCurrentStep((prev) => prev + 1);
                }}
                className="bg-primary text-white px-8 py-3 rounded-full font-label text-[10px] uppercase tracking-widest font-bold shadow-lg shadow-primary/20 hover:scale-105 transition-all"
              >
                Proceed Next →
              </button>
            ) : (
              <CustomerContactGate onAction={handleSubmitBooking}>
                <button
                  type="button"
                  className="bg-black text-white px-8 py-3 rounded-full font-label text-[10px] uppercase tracking-widest font-bold shadow-xl shadow-black/20 hover:bg-primary hover:scale-105 transition-all flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-[16px]">lock</span> Pay 50%
                  Deposit & Reserve
                </button>
              </CustomerContactGate>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default EventBookingWizard;
