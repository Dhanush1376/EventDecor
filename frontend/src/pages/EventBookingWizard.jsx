import React, { useState, useEffect } from 'react';
import { m as motion, AnimatePresence } from 'framer-motion';
import { SEO } from '../components/seo/SEO';
import { MandalaArtDecor } from '../components/ui/MandalaArtDecor';
import { BookingWizardSkeleton } from '../components/ui/Skeleton';
import { OptimizedImage } from '../components/ui/OptimizedImage';
import { useNavigate, useLocation } from 'react-router-dom';
import { eventService, bookingService, uploadService } from '../services/domainServices';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import logger from '../utils/logger';
import { EVENT_TYPES, ADDON_PROPS } from '../config/constants';

const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
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

  // AI Design Assistant State
  const [isAiAnalyzing, setIsAiAnalyzing] = useState(false);
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

  const simulateAiAnalysis = () => {
    setIsAiAnalyzing(true);
    setAiAnalysisResult(null);

    setTimeout(() => {
      setIsAiAnalyzing(false);
      setAiAnalysisResult({
        detectedOccasion:
          (formData.eventType === 'other'
            ? formData.customOccasion || 'Custom'
            : formData.eventType
          ).toUpperCase() + ' CELEBRATION',
        mood: 'Sacred South Indian Royal Temple Heritage',
        palette: ['#8B0000', '#FFD700', '#FFF8DC', '#228B22'],
        paletteLabels: ['Deep Crimson', 'Gilded Gold', 'Temple Ivory', 'Forest Leaf Green'],
        suggestedProps: [
          'Bespoke Handcrafted Teak Mandapam',
          'Hanging Fresh Mogra (Jasmine) & Red Rose Garlands',
          'Traditional Brass Urlis with Floating Lotus Buds',
          'Grand Gateway arch with Banana Stems & Mango Leaves',
        ],
        estimatedSetupTime: '12 - 16 Hours (Assigned to 18 Senior Artisans)',
        recommendedInclusions:
          'Vedic Backdrop Panels, Ambient Amber Up-lighting & Royal Entrance Swings',
        estimatedPriceRange: '₹85,000 - ₹1,40,000',
      });
      // Add analyzed details to customization forms automatically
      setFormData((prev) => ({
        ...prev,
        customization: {
          ...prev.customization,
          themeColor: 'Royal Crimson Vermillion & Gilded Gold Hues',
          floralPreference: 'Premium Fresh Jasmine (Mogra) & Lotus Garland Swags',
        },
      }));
      toast.success('Siri Arts AI Design Assistant: Blueprints & Moodboards Generated!');
    }, 3200);
  };

  const handleFileUploadSim = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadedFileName(file.name);
    setIsAiAnalyzing(true);
    setAiAnalysisResult(null);

    try {
      const fd = new FormData();
      fd.append('images', file);

      // Perform real server upload!
      const uploadRes = await uploadService.uploadInspirations(fd);
      if (uploadRes.success && uploadRes.images?.length > 0) {
        const uploadedUrl = uploadRes.images[0];
        toast.success('Moodboard successfully uploaded to Siri Arts servers!');

        // Trigger the AI Design Assistant calculations
        setTimeout(() => {
          setIsAiAnalyzing(false);
          setAiAnalysisResult({
            detectedOccasion:
              (formData.eventType === 'other'
                ? formData.customOccasion || 'Custom'
                : formData.eventType
              ).toUpperCase() + ' CELEBRATION',
            mood: 'Sacred South Indian Royal Temple Heritage',
            palette: ['#8B0000', '#FFD700', '#FFF8DC', '#228B22'],
            paletteLabels: ['Deep Crimson', 'Gilded Gold', 'Temple Ivory', 'Forest Leaf Green'],
            suggestedProps: [
              'Bespoke Handcrafted Teak Mandapam',
              'Hanging Fresh Mogra (Jasmine) & Red Rose Garlands',
              'Traditional Brass Urlis with Floating Lotus Buds',
              'Grand Gateway arch with Banana Stems & Mango Leaves',
            ],
            estimatedSetupTime: '12 - 16 Hours (Assigned to 18 Senior Artisans)',
            recommendedInclusions:
              'Vedic Backdrop Panels, Ambient Amber Up-lighting & Royal Entrance Swings',
            estimatedPriceRange: '₹85,000 - ₹1,40,000',
          });

          // Sync the actual uploaded image URL into the form!
          setFormData((prev) => ({
            ...prev,
            inspirationImages: [uploadedUrl],
            customization: {
              ...prev.customization,
              themeColor: 'Royal Crimson Vermillion & Gilded Gold Hues',
              floralPreference: 'Premium Fresh Jasmine (Mogra) & Lotus Garland Swags',
            },
          }));
          toast.success('Siri Arts AI Design Assistant: Blueprints & Moodboards Generated!');
        }, 1800);
      } else {
        throw new Error('No image URL returned');
      }
    } catch (err) {
      logger.error(err);
      setIsAiAnalyzing(false);
      toast.error('Upload server offline. Simulating local AI Design Assistant fallback...');
      simulateAiAnalysis();
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
    <div className="bg-[#fcfbf9] min-h-screen text-on-surface pt-20 md:pt-32 pb-24 relative overflow-hidden font-body">
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
        <div className="text-center mb-10 md:mb-16">
          <span className="font-label text-[10px] md:text-[11px] uppercase tracking-[0.4em] text-primary font-bold block mb-3">
            SIRI CREATIVE STUDIO
          </span>
          <h2 className="font-display text-[28px] md:text-[54px] text-black font-light tracking-tight leading-tight">
            Design Your Celebration.
          </h2>
          <p className="font-body text-black/50 text-[13px] md:text-[15px] max-w-xl mx-auto mt-3 font-light">
            A premium guided easy step-by-step event planner to map venue dimensions, customized
            color palettes, and rental inventories.
          </p>

          {/* Stepper Progress Bar */}
          <div className="flex items-center justify-center gap-2 mt-8 md:mt-12 max-w-md mx-auto">
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
        <div className="bg-white rounded-[24px] md:rounded-[40px] border border-black/5 shadow-2xl p-6 md:p-12 min-h-[480px] flex flex-col justify-between">
          <AnimatePresence mode="wait">
            {/* STEP 1: Occasion Type */}
            {currentStep === 1 && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="space-y-8"
              >
                <div className="space-y-2">
                  <h3 className="font-display text-[20px] md:text-[28px] text-black font-semibold">
                    Select Your Occasion
                  </h3>
                  <p className="font-body text-black/45 text-[12px] md:text-[13px]">
                    Select the classification of your milestone celebration to load specialized
                    structural presets.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {EVENT_TYPES.map((type) => (
                    <div
                      key={type.id}
                      onClick={() => handleEventTypeSelect(type.id)}
                      className={`p-6 rounded-[20px] border text-left cursor-pointer transition-all duration-300 group flex items-start gap-4 ${
                        formData.eventType === type.id
                          ? 'bg-primary/5 border-primary/40 shadow-md'
                          : 'border-black/5 hover:border-black/20 hover:bg-[#FAF9F6]'
                      }`}
                    >
                      <div
                        className={`w-12 h-12 rounded-[14px] flex items-center justify-center shrink-0 transition-colors ${
                          formData.eventType === type.id
                            ? 'bg-primary text-white'
                            : 'bg-primary/5 text-primary group-hover:bg-primary group-hover:text-white'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[22px]">{type.icon}</span>
                      </div>
                      <div className="space-y-1">
                        <h4 className="font-display text-[16px] text-black font-bold group-hover:text-primary transition-colors">
                          {type.label}
                        </h4>
                        <p className="font-body text-black/40 text-[11px] leading-relaxed font-light">
                          {type.desc}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {formData.eventType === 'other' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="bg-primary/5 border border-primary/20 rounded-[20px] p-6 space-y-4"
                  >
                    <div className="space-y-1">
                      <label className="font-label text-[10px] uppercase tracking-wider text-primary font-bold block">
                        Specify Your Custom Occasion
                      </label>
                      <p className="font-body text-black/45 text-[11px]">
                        Type the classification of your custom celebration (e.g. Housewarming, Baby
                        Shower, Corporate Seminar, Anniversary Gala).
                      </p>
                    </div>
                    <div className="flex gap-3">
                      <input
                        type="text"
                        placeholder="e.g. Housewarming Ceremony"
                        value={formData.customOccasion || ''}
                        onChange={(e) => handleInputChange('customOccasion', e.target.value)}
                        className="flex-1 px-5 py-3 rounded-full border border-black/5 bg-white text-[13px] outline-none focus:border-primary/45 transition-colors"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && formData.customOccasion?.trim()) {
                            setCurrentStep(2);
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (!formData.customOccasion?.trim()) {
                            toast.error('Please enter your custom occasion name.');
                            return;
                          }
                          setCurrentStep(2);
                        }}
                        className="bg-primary text-white px-6 py-3 rounded-full font-label text-[10px] uppercase tracking-widest font-bold shadow-md shadow-primary/20 hover:scale-105 active:scale-[0.98] transition-all"
                      >
                        Proceed
                      </button>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            )}

            {/* STEP 2: Beautiful Design Packages Selection */}
            {currentStep === 2 && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="space-y-8"
              >
                <div className="space-y-2">
                  <h3 className="font-display text-[20px] md:text-[28px] text-black font-semibold">
                    Select Event Design
                  </h3>
                  <p className="font-body text-black/45 text-[12px] md:text-[13px]">
                    Select an existing package to load designs, or select "Custom Setup" below.
                  </p>
                </div>

                {loading ? (
                  <div className="h-48 flex items-center justify-center">
                    <div className="skeleton-box inline-block w-10 h-10 rounded-md" />
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {/* Custom Preset */}
                    <div
                      onClick={() => handlePackageSelect('')}
                      className={`p-6 rounded-[24px] border text-left cursor-pointer transition-all flex flex-col justify-between h-56 ${
                        hasCategoryPackages ? '' : 'md:col-span-2'
                      } ${
                        !formData.eventPackageId
                          ? 'bg-primary/5 border-primary/40 shadow-lg'
                          : 'border-black/5 hover:border-black/15 bg-stone-50'
                      }`}
                    >
                      <div>
                        <span className="bg-stone-200 text-stone-700 px-2 py-0.5 rounded-full font-label text-[8px] uppercase tracking-widest font-bold">
                          Custom Blueprint
                        </span>
                        <h4 className="font-display text-[18px] text-black font-bold mt-3">
                          Bespoke Architectural Custom Setup
                        </h4>
                        <p className="font-body text-black/40 text-[11px] leading-relaxed mt-2 font-light">
                          Collaborate directly with our design artisans to build a completely unique
                          visual space from scratch.
                        </p>
                      </div>
                      <span className="font-label text-[10px] text-primary uppercase font-bold tracking-widest">
                        Map custom layout →
                      </span>
                    </div>

                    {/* Filtered masteries */}
                    {packages
                      .filter((p) => p.category?.toLowerCase() === formData.eventType)
                      .slice(0, 3)
                      .map((pkg) => (
                        <div
                          key={pkg._id || pkg.id}
                          onClick={() => handlePackageSelect(pkg._id || pkg.id)}
                          className={`p-4 rounded-[24px] border text-left cursor-pointer transition-all flex gap-4 items-center ${
                            formData.eventPackageId === (pkg._id || pkg.id)
                              ? 'bg-primary/5 border-primary/40 shadow-lg'
                              : 'border-black/5 hover:border-black/15'
                          }`}
                        >
                          <div className="w-20 h-24 rounded-[16px] overflow-hidden shrink-0">
                            <OptimizedImage
                              src={pkg.image}
                              className="w-full h-full object-cover"
                              alt={pkg.title}
                            />
                          </div>
                          <div className="space-y-1.5 flex-1 min-w-0">
                            <span className="font-label text-[8px] text-primary uppercase tracking-widest font-bold block">
                              {pkg.style}
                            </span>
                            <h4 className="font-display text-[15px] text-black font-bold truncate leading-tight">
                              {pkg.title}
                            </h4>
                            <p className="font-body text-black/40 text-[10px] leading-tight truncate">
                              {pkg.decorCount || 'Curated Inclusions'}
                            </p>
                            <span className="font-display text-[13px] text-black italic block pt-1 font-semibold">
                              {pkg.pricing}
                            </span>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* STEP 3: Setup Logistics, Dates & Venues */}
            {currentStep === 3 && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="space-y-8"
              >
                <div className="space-y-2">
                  <h3 className="font-display text-[20px] md:text-[28px] text-black font-semibold">
                    Logistics & Schedule Details
                  </h3>
                  <p className="font-body text-black/45 text-[12px] md:text-[13px]">
                    Provide event timestamps and spatial specifications to verify structural
                    clearances.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Event Title */}
                  <div className="space-y-2">
                    <label className="font-label text-[10px] uppercase tracking-wider text-black/50 font-bold block">
                      Event Booking Title
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Dhanush's Traditional Vivaham"
                      value={formData.title}
                      onChange={(e) => handleInputChange('title', e.target.value)}
                      className="w-full px-5 py-3 rounded-full border border-black/5 bg-[#fbf9f6] text-[13px] outline-none focus:border-primary/45 transition-colors"
                      required
                    />
                  </div>

                  {/* Event Date */}
                  <div className="space-y-2">
                    <label className="font-label text-[10px] uppercase tracking-wider text-black/50 font-bold block">
                      Event Date
                    </label>
                    <input
                      type="date"
                      value={formData.date}
                      onChange={(e) => handleInputChange('date', e.target.value)}
                      className="w-full min-w-0 overflow-hidden px-5 py-3 rounded-full border border-black/5 bg-[#fbf9f6] text-[13px] outline-none focus:border-primary/45 transition-colors"
                      required
                    />
                  </div>

                  {/* Timing ranges */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <label className="font-label text-[10px] uppercase tracking-wider text-black/50 font-bold block">
                        Starts At
                      </label>
                      <input
                        type="text"
                        placeholder="08:00 AM"
                        value={formData.timing.start}
                        onChange={(e) => handleNestedInputChange('timing', 'start', e.target.value)}
                        className="w-full px-5 py-3 rounded-full border border-black/5 bg-[#fbf9f6] text-[13px] outline-none focus:border-primary/45 transition-colors"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="font-label text-[10px] uppercase tracking-wider text-black/50 font-bold block">
                        Ends At
                      </label>
                      <input
                        type="text"
                        placeholder="10:00 PM"
                        value={formData.timing.end}
                        onChange={(e) => handleNestedInputChange('timing', 'end', e.target.value)}
                        className="w-full px-5 py-3 rounded-full border border-black/5 bg-[#fbf9f6] text-[13px] outline-none focus:border-primary/45 transition-colors"
                      />
                    </div>
                  </div>

                  {/* Venue Address */}
                  <div className="space-y-2 md:col-span-2">
                    <label className="font-label text-[10px] uppercase tracking-wider text-black/50 font-bold block">
                      Venue Address
                    </label>
                    <textarea
                      placeholder="Enter the complete hotel, banquet hall, or estate destination address..."
                      value={formData.venue.address}
                      onChange={(e) => handleNestedInputChange('venue', 'address', e.target.value)}
                      className="w-full px-5 py-3 rounded-2xl border border-black/5 bg-[#fbf9f6] text-[13px] outline-none focus:border-primary/45 transition-colors h-20 resize-none"
                      required
                    />
                  </div>

                  {/* Google Maps and Outdoor toggle */}
                  <div className="space-y-2">
                    <label className="font-label text-[10px] uppercase tracking-wider text-black/50 font-bold block">
                      Google Maps Link (Optional)
                    </label>
                    <input
                      type="url"
                      placeholder="https://maps.google.com/..."
                      value={formData.venue.googleMapsLink}
                      onChange={(e) =>
                        handleNestedInputChange('venue', 'googleMapsLink', e.target.value)
                      }
                      className="w-full px-5 py-3 rounded-full border border-black/5 bg-[#fbf9f6] text-[13px] outline-none focus:border-primary/45 transition-colors"
                    />
                  </div>

                  <div className="flex items-center gap-3 pt-6">
                    <input
                      type="checkbox"
                      id="isOutdoor"
                      checked={formData.venue.isOutdoor}
                      onChange={(e) =>
                        handleNestedInputChange('venue', 'isOutdoor', e.target.checked)
                      }
                      className="w-5 h-5 accent-primary cursor-pointer"
                    />
                    <label
                      htmlFor="isOutdoor"
                      className="font-body text-[13px] text-black font-semibold cursor-pointer"
                    >
                      This is an Outdoor Open-Air Lawn Ceremony
                    </label>
                  </div>
                </div>
              </motion.div>
            )}

            {/* STEP 4: Extra Decorations & Setup Options */}
            {currentStep === 4 && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="space-y-8"
              >
                <div className="space-y-2">
                  <h3 className="font-display text-[20px] md:text-[28px] text-black font-semibold">
                    Extra Decorations & Setup Options
                  </h3>
                  <p className="font-body text-black/45 text-[12px] md:text-[13px]">
                    Define color swatches and lighting profiles or add standalone prop rentals.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Theme Colors */}
                  <div className="space-y-2">
                    <label className="font-label text-[10px] uppercase tracking-wider text-black/50 font-bold block">
                      Color Palette Preference
                    </label>
                    <input
                      type="text"
                      value={formData.customization.themeColor}
                      onChange={(e) =>
                        handleNestedInputChange('customization', 'themeColor', e.target.value)
                      }
                      className="w-full px-5 py-3 rounded-full border border-black/5 bg-[#fbf9f6] text-[13px] outline-none focus:border-primary/45 transition-colors"
                    />
                  </div>

                  {/* Floral preferences */}
                  <div className="space-y-2">
                    <label className="font-label text-[10px] uppercase tracking-wider text-black/50 font-bold block">
                      Floral Garlands Preference
                    </label>
                    <input
                      type="text"
                      value={formData.customization.floralPreference}
                      onChange={(e) =>
                        handleNestedInputChange('customization', 'floralPreference', e.target.value)
                      }
                      className="w-full px-5 py-3 rounded-full border border-black/5 bg-[#fbf9f6] text-[13px] outline-none focus:border-primary/45 transition-colors"
                    />
                  </div>

                  {/* Lighting profile */}
                  <div className="space-y-2">
                    <label className="font-label text-[10px] uppercase tracking-wider text-black/50 font-bold block">
                      Lighting Profile
                    </label>
                    <input
                      type="text"
                      value={formData.customization.lightingPreference}
                      onChange={(e) =>
                        handleNestedInputChange(
                          'customization',
                          'lightingPreference',
                          e.target.value,
                        )
                      }
                      className="w-full px-5 py-3 rounded-full border border-black/5 bg-[#fbf9f6] text-[13px] outline-none focus:border-primary/45 transition-colors"
                    />
                  </div>

                  {/* Stage dimensions */}
                  <div className="space-y-2">
                    <label className="font-label text-[10px] uppercase tracking-wider text-black/50 font-bold block">
                      Stage Size Dimensions
                    </label>
                    <input
                      type="text"
                      value={formData.customization.stageSize}
                      onChange={(e) =>
                        handleNestedInputChange('customization', 'stageSize', e.target.value)
                      }
                      className="w-full px-5 py-3 rounded-full border border-black/5 bg-[#fbf9f6] text-[13px] outline-none focus:border-primary/45 transition-colors"
                    />
                  </div>

                  {/* Add-ons Checklist */}
                  <div className="md:col-span-2 space-y-4 pt-4 border-t border-black/5">
                    <label className="font-label text-[10px] uppercase tracking-wider text-black/50 font-bold block">
                      Add-on Visual Prop Rentals
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {ADDON_PROPS.map((addon) => {
                        const isChecked = formData.selectedAddons?.some(
                          (a) => a.name === addon.name,
                        );
                        return (
                          <div
                            key={addon.name}
                            onClick={() => handleAddonChange(addon.name, addon.price, !isChecked)}
                            className={`p-4 rounded-xl border text-left cursor-pointer transition-all ${
                              isChecked
                                ? 'bg-primary/5 border-primary/30'
                                : 'border-black/5 hover:border-black/10'
                            }`}
                          >
                            <div className="flex justify-between items-start gap-2">
                              <span className="font-body text-[12px] text-black font-bold leading-tight">
                                {addon.name}
                              </span>
                              <input
                                type="checkbox"
                                checked={isChecked}
                                readOnly
                                className="accent-primary w-4 h-4 shrink-0"
                              />
                            </div>
                            <span className="font-display text-xs text-black/50 block mt-2 font-semibold">
                              + ₹{addon.price.toLocaleString('en-IN')}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* STEP 5: Custom Decor Recommendations & Moodboards */}
            {currentStep === 5 && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="space-y-8"
              >
                <div className="space-y-2">
                  <h3 className="font-display text-[20px] md:text-[28px] text-black font-semibold">
                    Custom Decor Recommendations & Moodboards
                  </h3>
                  <p className="font-body text-black/45 text-[12px] md:text-[13px]">
                    Upload your Pinterest moodboard, stage maps, or custom designs. Our AI model
                    will automatically analyze details, map color palettes, and draft preliminary
                    pricing ranges.
                  </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                  {/* File Upload zone */}
                  <div className="lg:col-span-5 space-y-4">
                    <div className="border-2 border-dashed border-black/10 rounded-[24px] p-8 text-center bg-[#fcfbf9] relative group hover:border-primary/30 transition-colors flex flex-col items-center justify-center min-h-[220px]">
                      <input
                        type="file"
                        onChange={handleFileUploadSim}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                        accept="image/*"
                      />
                      <div className="w-14 h-14 rounded-full bg-primary/5 text-primary flex items-center justify-center mb-4 group-hover:bg-primary group-hover:text-white transition-colors">
                        <span className="material-symbols-outlined text-[24px]">cloud_upload</span>
                      </div>
                      <span className="font-body text-xs text-black font-bold block">
                        Upload Pinterest Moodboard
                      </span>
                      <span className="font-body text-[10px] text-black/30 mt-1 block">
                        Supports PNG, JPG, or PDF blueprint up to 10MB
                      </span>
                      {uploadedFileName && (
                        <div className="mt-4 px-3 py-1.5 bg-stone-100 rounded-full font-mono text-[9px] text-stone-700 flex items-center gap-1.5 max-w-[200px] truncate">
                          <span className="material-symbols-outlined text-[12px]">description</span>
                          {uploadedFileName}
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={simulateAiAnalysis}
                      disabled={isAiAnalyzing}
                      className="w-full bg-stone-900 text-white py-3 rounded-full font-label text-[10px] uppercase tracking-widest font-bold hover:bg-primary hover:text-black transition-colors"
                    >
                      {isAiAnalyzing ? 'Analyzing Blueprints...' : 'Simulate AI Analysis'}
                    </button>
                  </div>

                  {/* AI Analysis Result Output */}
                  <div className="lg:col-span-7">
                    <div className="bg-[#FAF9F6] rounded-[24px] border border-black/5 p-6 min-h-[220px] flex flex-col justify-center relative overflow-hidden">
                      {isAiAnalyzing ? (
                        <div className="space-y-4 text-center py-6">
                          <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
                            <div className="skeleton-box inline-block w-8 h-8 rounded-md" />
                            <span className="material-symbols-outlined text-[20px] text-primary animate-pulse">
                              insights
                            </span>
                          </div>
                          <div className="space-y-1.5">
                            <span className="font-label text-[9px] uppercase tracking-[0.25em] text-primary font-bold block animate-pulse">
                              SIRI ARTS AI DESIGN ASSISTANT
                            </span>
                            <p className="font-body text-black/50 text-xs">
                              Analyzing spatial layers, garland structures, and color swatches...
                            </p>
                          </div>
                        </div>
                      ) : aiAnalysisResult ? (
                        <div className="space-y-5 animate-fade-in">
                          <div className="flex justify-between items-center border-b border-black/5 pb-3">
                            <span className="font-label text-[9px] uppercase tracking-[0.3em] text-primary font-bold">
                              Custom Decor Recommendations
                            </span>
                            <span className="bg-[#8B0000]/10 text-[#8B0000] px-2 py-0.5 rounded-full font-mono text-[8px] uppercase tracking-widest font-bold">
                              Matches catalog patterns
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-y-4 gap-x-4">
                            <div className="space-y-0.5">
                              <span className="font-label text-[8px] uppercase tracking-widest text-black/40 block">
                                Detected Theme Style
                              </span>
                              <span className="font-body text-xs text-black font-bold">
                                {aiAnalysisResult.detectedOccasion}
                              </span>
                            </div>
                            <div className="space-y-0.5">
                              <span className="font-label text-[8px] uppercase tracking-widest text-black/40 block">
                                Atmospheric Mood
                              </span>
                              <span className="font-body text-xs text-black font-semibold truncate block">
                                {aiAnalysisResult.mood}
                              </span>
                            </div>
                            <div className="space-y-0.5 md:col-span-2">
                              <span className="font-label text-[8px] uppercase tracking-widest text-black/40 block">
                                Theme Color Palette
                              </span>
                              <div className="flex gap-1.5 mt-1">
                                {aiAnalysisResult.palette.map((color, i) => (
                                  <div key={color} className="flex items-center gap-1 group/color">
                                    <div
                                      className="w-4 h-4 rounded-full border border-black/10"
                                      style={{ backgroundColor: color }}
                                    />
                                    <span className="font-mono text-[8px] text-black/45">
                                      {aiAnalysisResult.paletteLabels[i]}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                            <div className="space-y-0.5 md:col-span-2">
                              <span className="font-label text-[8px] uppercase tracking-widest text-black/40 block">
                                Estimated Rental Inclusions
                              </span>
                              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 mt-1">
                                {aiAnalysisResult.suggestedProps.map((prop, _i) => (
                                  <li
                                    key={prop}
                                    className="flex items-center gap-1 text-[10px] text-stone-700 font-medium"
                                  >
                                    <span className="w-1 h-1 rounded-full bg-primary" />
                                    {prop}
                                  </li>
                                ))}
                              </ul>
                            </div>
                            <div className="space-y-0.5">
                              <span className="font-label text-[8px] uppercase tracking-widest text-black/40 block">
                                Artisan Logistics Estimate
                              </span>
                              <span className="font-body text-xs text-stone-700 font-medium">
                                {aiAnalysisResult.estimatedSetupTime}
                              </span>
                            </div>
                            <div className="space-y-0.5">
                              <span className="font-label text-[8px] uppercase tracking-widest text-black/40 block">
                                Estimated Budget Range
                              </span>
                              <span className="font-display text-sm text-primary font-bold italic">
                                {aiAnalysisResult.estimatedPriceRange}
                              </span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-8 space-y-3">
                          <span className="material-symbols-outlined text-[36px] text-black/10">
                            upload_file
                          </span>
                          <p className="font-body text-xs text-black/40 max-w-xs mx-auto">
                            Upload an inspiration visual above to launch the AI catalog comparator
                            and auto-populate customizations.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* STEP 6: Summary & Invoice Estimations */}
            {currentStep === 6 && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="space-y-8"
              >
                <div className="space-y-2">
                  <h3 className="font-display text-[20px] md:text-[28px] text-black font-semibold">
                    Review Your Event Summary
                  </h3>
                  <p className="font-body text-black/45 text-[12px] md:text-[13px]">
                    Review your itemized package selection, logistics dates, and estimated initial
                    milestone deposit.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                  {/* Left: Summary */}
                  <div className="space-y-4 bg-stone-50 rounded-[20px] p-6 border border-black/5">
                    <h4 className="font-display text-base text-black font-bold border-b border-black/5 pb-2">
                      Operational Scope
                    </h4>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-black/45">Occasion Type:</span>
                        <span className="text-black font-semibold capitalize">
                          {formData.eventType === 'other'
                            ? formData.customOccasion || 'Other'
                            : formData.eventType}
                        </span>
                      </div>
                      {activePackage && (
                        <div className="flex justify-between">
                          <span className="text-black/45">Curated Theme:</span>
                          <span className="text-black font-semibold">{activePackage.title}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-black/45">Target Date:</span>
                        <span className="text-black font-semibold">
                          {formData.date || 'Not Selected'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-black/45">Target Timing:</span>
                        <span className="text-black font-semibold">
                          {formData.timing.start} - {formData.timing.end}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-black/45">Destination Address:</span>
                        <span className="text-black font-semibold text-right truncate max-w-[180px]">
                          {formData.venue.address || 'Not Entered'}
                        </span>
                      </div>
                    </div>

                    <h4 className="font-display text-base text-black font-bold border-b border-black/5 pt-4 pb-2">
                      Customizations
                    </h4>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-black/45">Floral Garlands:</span>
                        <span className="text-black font-semibold text-right truncate max-w-[180px]">
                          {formData.customization.floralPreference}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-black/45">Color Palette:</span>
                        <span className="text-black font-semibold text-right truncate max-w-[180px]">
                          {formData.customization.themeColor}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-black/45">Lighting Profile:</span>
                        <span className="text-black font-semibold text-right truncate max-w-[180px]">
                          {formData.customization.lightingPreference}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Itemized pricing estimates */}
                  <div className="space-y-6 bg-[#fcfbf9] rounded-[20px] p-6 border border-black/5">
                    <h4 className="font-display text-base text-black font-bold border-b border-black/5 pb-2">
                      Preliminary Estimate
                    </h4>
                    <div className="space-y-3 text-xs">
                      <div className="flex justify-between">
                        <span className="text-black/50">Decor Setup & Rental Fee:</span>
                        <span className="text-black font-semibold">
                          ₹
                          {(formData.eventPackageId
                            ? activePackage
                              ? parseInt(activePackage.pricing.replace(/[^0-9]/g, '')) || 35000
                              : 35000
                            : 25000
                          ).toLocaleString('en-IN')}
                        </span>
                      </div>
                      {formData.selectedAddons?.map((addon) => (
                        <div key={addon.name} className="flex justify-between">
                          <span className="text-black/50">+ {addon.name}:</span>
                          <span className="text-black font-semibold">
                            ₹{addon.price.toLocaleString('en-IN')}
                          </span>
                        </div>
                      ))}
                      <div className="flex justify-between">
                        <span className="text-black/50">+ Transportation & Setup:</span>
                        <span className="text-primary font-bold tracking-wider uppercase">
                          Calculated after admin review
                        </span>
                      </div>

                      <div className="border-t border-black/5 pt-4 flex justify-between items-end">
                        <span className="font-display text-base text-black font-bold">
                          Total Initial Price:
                        </span>
                        <span className="font-display text-xl text-black font-bold italic line-through opacity-50">
                          ₹
                          {(
                            (formData.eventPackageId
                              ? activePackage
                                ? parseInt(
                                    activePackage.pricing?.replace(/[^0-9]/g, '') ||
                                      activePackage.basePrice ||
                                      35000,
                                  )
                                : 35000
                              : 25000) +
                            formData.selectedAddons?.reduce((acc, curr) => acc + curr.price, 0)
                          ).toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div className="flex justify-between items-end mt-1">
                        <span className="font-display text-sm text-primary font-bold">
                          Advance Deposit to Reserve (50%):
                        </span>
                        <span className="font-display text-2xl text-primary font-bold italic">
                          ₹
                          {Math.round(
                            ((formData.eventPackageId
                              ? activePackage
                                ? parseInt(
                                    activePackage.pricing?.replace(/[^0-9]/g, '') ||
                                      activePackage.basePrice ||
                                      35000,
                                  )
                                : 35000
                              : 25000) +
                              formData.selectedAddons?.reduce((acc, curr) => acc + curr.price, 0)) *
                              0.5,
                          ).toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
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
              <button
                type="button"
                onClick={handleSubmitBooking}
                className="bg-black text-white px-8 py-3 rounded-full font-label text-[10px] uppercase tracking-widest font-bold shadow-xl shadow-black/20 hover:bg-primary hover:scale-105 transition-all flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[16px]">lock</span> Pay 50% Deposit
                & Reserve
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
